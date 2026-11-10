# Guia da integração com o governo (Cristiano)

Revisão de 10/11, atualizada depois do seu push do vínculo de microchip.
Este guia mostra o que já liga a API da clínica à API do governo e o que falta na sua parte.
Todo o código abaixo foi testado com as duas APIs rodando, em cima do seu `microchipService.js`.

## 0. O que já funciona

```text
Vínculo de microchip (seu push)        ->  POST /api/animais/:id/microchip   { "microchip": "076000000000001" }

Vacina antirrábica APLICADA            (vacinaService, da Bia)
  └─ cria linha "pendente" em VET_INTEGRACAO_GOV, com uma chave de idempotência

Botão "Enviar/Reenviar" no frontend   ->  POST /api/integracoes/:id/enviar
  └─ integracaoService.enviar()        ->  POST http://localhost:8001/api/governo/vacinacoes-antirrabicas
       └─ confirma o protocolo         ->  GET  http://localhost:8001/api/governo/operacoes/{protocolo}
```

- A sua rota já está ligada no `server.js` e na tela (ficha do animal → "Vincular / trocar"). Testes 7 e 8 passam.
- Com o chip vinculado, a antirrábica chega no governo e volta `confirmada` (testes 12, 14, 15 e 16 passam pela tela e pelo Postman).
- Ponte: `api_clinica/services/integracaoService.js` e `api_clinica/routes/integracaoRoutes.js`.

| O governo respondeu | Situação na clínica | Conta tentativa? |
|---|---|---|
| Animal sem microchip ativo (nem chamou o governo) | `pendente`, com o aviso "Aguardando vínculo de microchip" | não |
| 201 ou 200 com protocolo, e a consulta do protocolo deu `concluida` | `confirmada` | sim |
| 201/200, mas a consulta do protocolo falhou | `enviada` (enviar de novo confirma) | sim |
| Sem resposta, timeout de 5 s ou 5xx (ex.: 503 simulado) | `pendente` | sim |
| 4xx (ex.: 422) | `com_falha`, com a mensagem do governo | sim |

- Todas as tentativas usam a **mesma chave de idempotência**: o governo devolve o mesmo protocolo e não duplica (teste 16).
- O endereço do governo vem de `GOV_API_URL` (padrão `http://localhost:8001/api/governo`).
- Na sua documentação está "200/201 → confirmada". A ponte passa por `enviada` e consulta o protocolo
  para chegar em `confirmada`, porque o enunciado pede as quatro situações (pendente, enviada, confirmada, com falha).

**O que falta é com você:** troca de chip (passo 1), reenvio automático (passo 2) e cadastro/atualização do animal no governo (passo 3).

---

## Passo 1. Troca de microchip (enunciado 3.7, regra 5)

Hoje a sua rota responde 409 `ANIMAL_JA_POSSUI_MICROCHIP` quando o animal já tem chip. O enunciado pede que a
substituição guarde o chip antigo no histórico. A tela já manda `{ "microchip": "...", "motivo": "..." }` na troca.
São 4 mudanças no seu `api_clinica/services/microchipService.js`:

**1.1** Depois do `sqlVinculoAtivo`, acrescente:

```js
const sqlSubstituir = db.prepare(`
    UPDATE VET_VINCULO_MICROCHIP
       SET VIMI_DS_SITUACAO            = 'substituido',
           VIMI_DT_SUBSTITUICAO        = datetime('now', 'localtime'),
           VIMI_DS_MOTIVO_SUBSTITUICAO = ?
     WHERE VIMI_ID_VINCULO = ?
`);
```

**1.2** Troque a função `exigirMicrochipDisponivel` por esta (ela passa a devolver o chip que vai ser substituído):

```js
// Devolve o vínculo ativo que vai ser substituído (ou undefined no primeiro chip)
function exigirMicrochipDisponivel(animalId, microchip, motivo) {
    if (sqlMicrochipExistente.get(microchip)) {
        throw new ErroApi(409, 'MICROCHIP_JA_UTILIZADO',
            'Este microchip já foi vinculado e não pode ser reutilizado.');
    }
    const ativo = sqlVinculoAtivo.get(animalId);
    if (ativo && !motivo) {
        throw new ErroApi(409, 'ANIMAL_JA_POSSUI_MICROCHIP',
            'Este animal já possui um microchip ativo. Para trocar, informe o motivo.');
    }
    return ativo;
}
```

**1.3** Em `vincular`, logo depois da linha do `microchip`:

```js
    const motivo = v.texto(erros, corpo, 'motivo', { max: 500 });
```

**1.4** Ainda em `vincular`, o `transacao` e o `catch` ficam assim:

```js
        vinculoId = transacao(() => {
            const ativo = exigirMicrochipDisponivel(animalId, microchip, motivo);
            if (ativo) sqlSubstituir.run(motivo, ativo.VIMI_ID_VINCULO);
            return Number(sqlInserir.run(animalId, idVeterinario, microchip).lastInsertRowid);
        });
    } catch (erro) {
        if (erro.errcode !== 2067) throw erro;

        exigirMicrochipDisponivel(animalId, microchip, motivo);
```

**1.5** Na tela (`frontend/js/animal.js`, envio do formulário de microchip), o aviso especial do erro
`ANIMAL_JA_POSSUI_MICROCHIP` ("a troca ainda não foi feita na API") pode sair: deixe só `mostrarMensagem(erro.message);`.

**Como testar** (ficha do animal no frontend, ou Postman com o token):

| Requisição | Esperado |
|---|---|
| `POST /api/animais/1/microchip` com `{ "microchip": "076000000000011" }` | 201 |
| Outro chip no animal 1, sem `motivo` | 409, pede o motivo |
| Outro chip no animal 1 com `"motivo": "chip parou de ler"` | 201; na ficha o antigo aparece como `substituído`, com data e motivo |
| O chip antigo em outro animal | 409 `MICROCHIP_JA_UTILIZADO` (nunca é reutilizado) |

---

## Passo 2. Reenvio automático (1 minuto, 5 tentativas), pronto

**2.1** Crie o arquivo `api_clinica/services/reenvioAutomatico.js`:

```js
// Reenvio automático das comunicações com o governo.
// A cada 1 minuto tenta enviar o que está "pendente" (ou "enviada" sem confirmação).
// Depois de 5 tentativas sem sucesso, vira "com_falha" e só sai pelo botão "Reenviar".
// Vacina de animal sem microchip fica esperando SEM gastar tentativa.
const { db } = require('../database/conexao');
const integracaoService = require('./integracaoService');

const INTERVALO_MS = 60 * 1000;
const MAX_TENTATIVAS = 5;

const sqlParaEnviar = db.prepare(`
    SELECT ig.INGO_ID_INTEGRACAO AS id
      FROM VET_INTEGRACAO_GOV ig
     WHERE ig.INGO_DS_SITUACAO IN ('pendente', 'enviada')
       AND ig.INGO_DS_TIPO_OPERACAO = 'VACINACAO_ANTIRRABICA'
       AND EXISTS (SELECT 1 FROM VET_VINCULO_MICROCHIP mc
                    WHERE mc.ANIM_ID_ANIMAL = ig.ANIM_ID_ANIMAL AND mc.VIMI_DS_SITUACAO = 'ativo')
     ORDER BY ig.INGO_DT_HR_SOLICITACAO
`);

const sqlDesistir = db.prepare(`
    UPDATE VET_INTEGRACAO_GOV
       SET INGO_DS_SITUACAO = 'com_falha',
           INGO_DS_MSG_ERRO = 'Reenvio automático parou depois de ' || INGO_QT_TENTATIVAS
                              || ' tentativas. Use o botão Reenviar. Último erro: ' || coalesce(INGO_DS_MSG_ERRO, '-')
     WHERE INGO_ID_INTEGRACAO = ? AND INGO_DS_SITUACAO = 'pendente' AND INGO_QT_TENTATIVAS >= ?
`);

let rodando = false;

async function rodarUmaVez() {
    if (rodando) return; // não deixa duas rodadas ao mesmo tempo
    rodando = true;
    try {
        for (const { id } of sqlParaEnviar.all()) {
            const resultado = await integracaoService.enviar(id);
            if (resultado.situacao === 'pendente') sqlDesistir.run(id, MAX_TENTATIVAS);
            console.log(`[reenvio automático] envio ${id}: ${resultado.situacao} (tentativas: ${resultado.tentativas})`);
        }
    } catch (erro) {
        console.error('[reenvio automático] erro:', erro.message);
    } finally {
        rodando = false;
    }
}

function iniciar() {
    console.log(`Reenvio automático ligado: a cada ${INTERVALO_MS / 1000} s, até ${MAX_TENTATIVAS} tentativas.`);
    setInterval(rodarUmaVez, INTERVALO_MS);
}

module.exports = { iniciar, rodarUmaVez };
```

**2.2** No `api_clinica/server.js`, ligue o reenvio quando a API subir:

```js
app.listen(PORTA, () => {
    console.log(`API da Clínica rodando na porta ${PORTA}`);
    require('./services/reenvioAutomatico').iniciar();
});
```

**Como testar sem esperar 5 minutos:** troque `60 * 1000` por `5 * 1000` só enquanto testa.

1. No Swagger do governo (`http://localhost:8001/docs`), `PUT /api/governo/simulacao` com `{"indisponivel": true, "erro_validacao": false}`.
2. Registre uma antirrábica num animal **com microchip** (ficha do animal no frontend).
3. No terminal da API aparece `[reenvio automático] envio N: pendente (tentativas: 1)` ... até 5. Depois disso fica `com_falha` (teste 14).
4. Volte a simulação para `false` e clique em **Reenviar** na tela "Governo": fica `confirmada` (teste 15).
5. Animal **sem** chip: o envio fica `pendente` com 0 tentativas e vai sozinho assim que o chip for vinculado.

---

## Passo 3. Cadastro e atualização do animal no governo (teste 11)

O enunciado pede "cadastro e atualização de animal na API governamental". O governo já tem
`POST /animais` e `PUT /animais/{microchip}`; falta a clínica mandar. Os trechos abaixo funcionaram
nos testes (com os passos 1 e 2 já feitos), mas **antes leia as decisões em aberto** no fim deste passo.

**3.1** Em `integracaoService.js`, função `montarChamada`, acrescente os dois tipos:

```js
    if (d.tipo === 'CADASTRO_ANIMAL') {
        return { metodo: 'POST', caminho: '/animais', corpo: { microchip: d.microchip, ...montarAnimal(d) } };
    }
    if (d.tipo === 'ATUALIZACAO_ANIMAL') {
        return { metodo: 'PUT', caminho: `/animais/${d.microchip}`, corpo: montarAnimal(d) };
    }
```

**3.2** Ainda em `integracaoService.js`, a vacinação e a atualização esperam o cadastro do animal ser confirmado
(regra combinada pelo grupo: "a clínica cadastra o animal antes de enviar"). Junto dos outros `db.prepare`:

```js
const sqlCadastroNaoConfirmado = db.prepare(`
    SELECT 1 FROM VET_INTEGRACAO_GOV
     WHERE ANIM_ID_ANIMAL = ? AND INGO_DS_TIPO_OPERACAO = 'CADASTRO_ANIMAL' AND INGO_DS_SITUACAO <> 'confirmada'
`);
const sqlAguardarCadastro = db.prepare(`
    UPDATE VET_INTEGRACAO_GOV
       SET INGO_DS_MSG_ERRO = 'Aguardando o cadastro do animal no governo (CADASTRO_ANIMAL) ser confirmado.'
     WHERE INGO_ID_INTEGRACAO = ?
`);
```

E na função `enviar`, logo depois do bloco `if (!d.microchip) { ... }`:

```js
    if (d.tipo !== 'CADASTRO_ANIMAL' && sqlCadastroNaoConfirmado.get(d.animalId)) {
        sqlAguardarCadastro.run(id);
        return buscar(id);
    }
```

**3.3** No seu `microchipService.js`, crie a pendência de cadastro no **primeiro** chip.
No topo: `const crypto = require('crypto');` e junto dos `db.prepare`:

```js
const sqlCriarPendencia = db.prepare(`
    INSERT INTO VET_INTEGRACAO_GOV (ANIM_ID_ANIMAL, INGO_DS_TIPO_OPERACAO, INGO_DS_CHAVE_IDEMPOTENCIA)
    VALUES (?, ?, ?)
`);
```

O `transacao` do `vincular` (já com o passo 1) fica assim:

```js
        vinculoId = transacao(() => {
            const ativo = exigirMicrochipDisponivel(animalId, microchip, motivo);
            if (ativo) sqlSubstituir.run(motivo, ativo.VIMI_ID_VINCULO);
            const id = Number(sqlInserir.run(animalId, idVeterinario, microchip).lastInsertRowid);
            // primeiro chip: o animal precisa ser cadastrado no governo
            if (!ativo) sqlCriarPendencia.run(animalId, 'CADASTRO_ANIMAL', crypto.randomUUID());
            return id;
        });
```

**3.4** Item 6 do João (dados alterados → avisar o governo), em `animalService.js`.
No topo: `const crypto = require('crypto');` e junto dos `db.prepare`:

```js
const sqlAtualizacaoEmAberto = db.prepare(`
    SELECT 1 FROM VET_INTEGRACAO_GOV
     WHERE ANIM_ID_ANIMAL = ? AND INGO_DS_TIPO_OPERACAO = 'ATUALIZACAO_ANIMAL'
       AND INGO_DS_SITUACAO IN ('pendente', 'com_falha')
`);
const sqlCriarPendencia = db.prepare(`
    INSERT INTO VET_INTEGRACAO_GOV (ANIM_ID_ANIMAL, INGO_DS_TIPO_OPERACAO, INGO_DS_CHAVE_IDEMPOTENCIA)
    VALUES (?, ?, ?)
`);
```

Na função `alterar`, logo depois do `sqlAlterar.run(...)`:

```js
    if (atual.microchip && !sqlAtualizacaoEmAberto.get(atual.id)) {
        sqlCriarPendencia.run(atual.id, 'ATUALIZACAO_ANIMAL', crypto.randomUUID());
    }
```

**3.5** Em `reenvioAutomatico.js` (passo 2), envie todos os tipos, com os cadastros primeiro.
Apague a linha `AND ig.INGO_DS_TIPO_OPERACAO = 'VACINACAO_ANTIRRABICA'` e troque o `ORDER BY` por:

```sql
     ORDER BY CASE ig.INGO_DS_TIPO_OPERACAO WHEN 'CADASTRO_ANIMAL' THEN 0 ELSE 1 END,
              ig.INGO_DT_HR_SOLICITACAO
```

**Como testar:** vincule um chip → aparece `CADASTRO_ANIMAL` e fica `confirmada` (o animal aparece em
`GET /api/governo/animais/{chip}`). Altere o nome do animal → `ATUALIZACAO_ANIMAL` confirmada e o nome muda no governo.

**Decisões em aberto (combinem antes de fechar o passo 3):**

1. **Troca de chip no governo.** O grupo decidiu mandar a troca como `ATUALIZACAO_ANIMAL`, mas hoje o `PUT /animais/{microchip}`
   do governo não troca o microchip (ele vem na rota). Opções: (a) o PUT do governo aceitar um campo `novo_microchip`;
   ou (b) a troca virar um `CADASTRO_ANIMAL` com o chip novo. Por isso o 3.3 só trata o **primeiro** chip.
2. **Cadastro repetido.** Se o governo já tiver o chip (por exemplo, uma vacinação enviada antes do passo 3 cria o animal
   sozinha), o `POST /animais` responde 409 e a ponte marca `com_falha`. Decidam se 409 conta como "já cadastrado".
3. **Tutor alterado.** Mudar nome/CPF do tutor também muda dados que o governo guarda. Hoje só a alteração do animal gera aviso.

---

## Avisos da revisão (10/11)

| Onde | O quê | O que fazer |
|---|---|---|
| `api_gov/app/schemas.py` e `models.py` | **Sexo passou a ser opcional** (M, F ou vazio), porque a clínica aceita animal sem sexo (ex.: aves) e o governo recusava a antirrábica deles. | Cristiano e João: decidir a regra final. Quem já tinha `governo.db` precisa **apagar o arquivo** (ele é recriado). |
| `api_gov/app/schemas.py` | A classe `VacinacaoCreate` está escrita duas vezes; só a segunda vale. | Apagar a primeira (sem `chave_idempotencia`) para não confundir. |
| `api_clinica/services/microchipService.js` | Sobrou a linha comentada `//exigirAnimal(animalId);`. Microchip com espaços (`"076 000 ..."`) recebe duas mensagens de erro juntas. | Apagar a linha comentada. Os espaços não atrapalham a tela (ela tira antes de mandar). |
| Tamanhos dos campos | Clínica aceita espécie com 100, raça com 100 e nome da vacina com 150 caracteres; o governo aceita 50, 80 e 100. | Alinhar os tamanhos, senão o governo recusa (422) nomes compridos. |
| `api_gov/requirements.txt` | Estava em UTF-16 (o `>` do PowerShell grava assim). Foi convertido para UTF-8, com as mesmas versões. | Para gerar de novo no Windows, use o Prompt de Comando (cmd): `pip freeze > requirements.txt`. |
| Postman | A coleção `Clinica_Vet_Tutores_Animais_Microchip_Governo` já testa o seu microchip e os testes 12, 14, 15 e 16 pela clínica. | Falta a coleção só da API do governo (pendência da sua documentação). |

## Checklist dos seus testes

| Teste | Como mostrar | Situação |
|---|---|---|
| 7 e 8 | Ficha do animal → Vincular / trocar | Pronto (seu push) |
| 11 | Passo 3 (vincular chip e alterar o animal; conferir no Swagger do governo) | Falta o passo 3 |
| 12 | Antirrábica em animal com chip → tela "Governo" → Enviar: `confirmada` com protocolo | Pronto |
| 13 | Registrar V10 → não aparece envio | Pronto |
| 14 | Simulação `indisponivel: true` → Enviar: `pendente` (com o passo 2, `com_falha` depois de 5 tentativas) | Pronto |
| 15 | Simulação de volta → Reenviar → `confirmada` | Pronto |
| 16 | Pegar a `chaveIdempotencia` de um envio confirmado (`GET /api/integracoes`) e repetir o `POST /api/governo/vacinacoes-antirrabicas` no Swagger com ela → 200, `repetida: true`, mesmo protocolo | Pronto |
