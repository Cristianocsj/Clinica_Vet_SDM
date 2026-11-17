# API do Governo (simulada): documentação

Projeto A3 SDM, Sistema de Clínica Veterinária. Responsável: Cristiano.
Última atualização: 16/11/2026.

> Esta API é uma **simulação acadêmica**. Não é uma integração oficial com
> sistemas governamentais reais e usa apenas dados fictícios.

## 1. Visão geral

A API do governo é um serviço independente que simula um registro nacional de
animais identificados por microchip. Ela recebe da clínica:

- o cadastro e a atualização de animais;
- as vacinações antirrábicas, que o enunciado torna de comunicação obrigatória;

e devolve um **protocolo** de processamento para cada operação.

Ela tem banco de dados próprio (`governo.db`), separado do banco da clínica, e
se comunica com a API da clínica apenas por HTTP.

## 2. Tecnologias

| Item | Tecnologia |
|---|---|
| Linguagem | Python 3.10 |
| Framework | FastAPI |
| Servidor | Uvicorn |
| Banco de dados | SQLite (`governo.db`) |
| Acesso ao banco | SQLAlchemy |
| Validação dos dados | Pydantic |
| Documentação interativa | Swagger (`/docs`) |
| Endereço local | `http://localhost:8001` |

## 3. Como executar

Na pasta `api_gov`:

```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

- Swagger: `http://localhost:8001/docs`
- Teste de saúde: `http://localhost:8001/api/governo/saude`
- O arquivo `governo.db` é criado automaticamente na primeira execução e não
  é versionado (está no `.gitignore`).

## 4. Estrutura de arquivos

```
api_gov/
├── app/
│   ├── __init__.py
│   ├── database.py       conexão com o governo.db
│   ├── models.py         tabelas do banco
│   ├── schemas.py        formato e validação dos dados de entrada e saída
│   ├── protocolo.py      geração do número de protocolo
│   ├── simulacao.py      chaves de simulação de falhas
│   ├── main.py           criação da API, middleware e registro das rotas
│   └── routers/
│       ├── __init__.py
│       ├── animais.py        cadastro, consulta e atualização de animal
│       ├── vacinacoes.py     recebimento de vacinação antirrábica
│       └── operacoes.py      consulta de operação por protocolo
├── requirements.txt
└── governo.db            (gerado, não versionado)
```

## 5. Banco de dados (`governo.db`)

### `animal_governo`
| Coluna | Tipo | Observação |
|---|---|---|
| id | inteiro | chave primária |
| microchip | texto (15) | **único**, identifica o animal |
| nome | texto (100) | |
| especie | texto (100) | texto livre |
| raca | texto (100) | opcional, texto livre |
| sexo | texto (1) | M, F ou vazio (opcional desde a revisão de 10/11, ver AVISO em `schemas.py`) |
| data_nascimento | data | opcional |
| tutor_nome | texto (150) | |
| tutor_cpf | texto (11) | |
| criado_em | data e hora | |
| atualizado_em | data e hora | atualiza a cada alteração |

### `operacao`
Registra cada pedido recebido e o protocolo gerado.

| Coluna | Tipo | Observação |
|---|---|---|
| id | inteiro | chave primária |
| protocolo | texto (30) | **único** |
| chave_idempotencia | texto (100) | único; usada em cadastros, atualizações e vacinações para impedir duplicidade |
| tipo | texto (30) | CADASTRO_ANIMAL, ATUALIZACAO_ANIMAL ou VACINACAO_ANTIRRABICA |
| situacao | texto (20) | sempre `concluida`: só operações processadas com sucesso são gravadas |
| mensagem | texto (255) | descrição do resultado |
| criado_em | data e hora | |

### `vacinacao_antirrabica`
| Coluna | Tipo | Observação |
|---|---|---|
| id | inteiro | chave primária |
| animal_id | inteiro | chave estrangeira para `animal_governo` |
| operacao_id | inteiro | chave estrangeira para `operacao` |
| nome_vacina | texto (150) | |
| fabricante | texto (100) | |
| lote | texto (50) | |
| data_aplicacao | data | |
| veterinario_nome | texto (150) | |
| veterinario_crmv | texto (20) | |

## 6. Endpoints

| Método | Rota | Função |
|---|---|---|
| GET | `/api/governo/saude` | Verifica se a API está no ar |
| POST | `/api/governo/animais` | Cadastra um animal |
| GET | `/api/governo/animais/{microchip}` | Consulta um animal pelo microchip |
| PUT | `/api/governo/animais/{microchip}` | Atualiza os dados de um animal |
| POST | `/api/governo/vacinacoes-antirrabicas` | Recebe uma vacinação antirrábica |
| GET | `/api/governo/operacoes/{protocolo}` | Consulta uma operação pelo protocolo |
| GET | `/api/governo/simulacao` | Mostra o estado da simulação de falhas |
| PUT | `/api/governo/simulacao` | Liga ou desliga a simulação de falhas |

### 6.1 Cadastrar animal
`POST /api/governo/animais`

```json
{
  "chave_idempotencia": "CADASTRO-1",
  "microchip": "985112345678901",
  "nome": "Rex",
  "especie": "Cão",
  "raca": "Labrador",
  "sexo": "M",
  "data_nascimento": "2022-03-15",
  "tutor_nome": "Maria Silva",
  "tutor_cpf": "12345678909"
}
```

| Código | Quando |
|---|---|
| 201 | Animal cadastrado. Retorna o protocolo e os dados do animal |
| 200 | Animal já existia ou a mesma chave foi reenviada; retorna o protocolo e os dados |
| 422 | Dados inválidos (por exemplo, microchip sem 15 números) |

Cada cadastro exige uma chave de idempotência. Repetir a mesma chave devolve a operação anterior sem criar outro registro.
Se o microchip já existir (por exemplo, incluído junto com uma vacinação), os dados são sincronizados no mesmo animal.

### 6.2 Consultar animal
`GET /api/governo/animais/{microchip}`

| Código | Quando |
|---|---|
| 200 | Retorna os dados do animal |
| 404 | Nenhum animal com esse microchip |

### 6.3 Atualizar animal
`PUT /api/governo/animais/{microchip}`

O corpo tem os dados do cadastro, a chave de idempotência e, opcionalmente,
`novo_microchip`. Quando presente, o registro do mesmo animal recebe o novo
microchip; as vacinações continuam relacionadas ao registro existente.
Repetir a mesma chave devolve o protocolo anterior sem aplicar a atualização de novo.
Se a chave já tiver cadastrado o animal pela recuperação da clínica, a repetição da atualização
devolve esse mesmo cadastro quando `novo_microchip` identifica o animal, sem criar outro registro.

Se a clínica receber 404 ao atualizar porque o chip anterior não está cadastrado, ela envia o cadastro
normal do animal pela rota `POST /api/governo/animais`, usando o chip atual e a mesma chave de idempotência.

| Código | Quando |
|---|---|
| 200 | Animal atualizado. Retorna o novo protocolo e os dados |
| 404 | Nenhum animal com esse microchip |
| 409 | O novo microchip já pertence a outro animal ou a chave foi usada em outra operação |
| 422 | Dados inválidos |

### 6.4 Receber vacinação antirrábica
`POST /api/governo/vacinacoes-antirrabicas`

```json
{
  "chave_idempotencia": "VACINA-1",
  "microchip": "985000000000001",
  "animal": {
    "nome": "Mel",
    "especie": "Gato",
    "raca": "Siamês",
    "sexo": "F",
    "data_nascimento": "2021-08-10",
    "tutor_nome": "João Pereira",
    "tutor_cpf": "98765432100"
  },
  "vacina": {
    "nome_vacina": "Antirrábica Inativada",
    "fabricante": "Zoetis",
    "lote": "L2026-045",
    "data_aplicacao": "2026-11-04"
  },
  "veterinario": {
    "nome": "Dra. Ana Lima",
    "crmv": "RJ-12345"
  }
}
```

Resposta (201):

```json
{
  "protocolo": "GOV-20261108-A1B2C3D4",
  "situacao": "concluida",
  "mensagem": "Vacinação antirrábica registrada. O animal não estava cadastrado e foi criado automaticamente.",
  "microchip": "985000000000001",
  "animal_criado": true,
  "repetida": false,
  "vacinacao": { "...": "dados da vacinação gravada" }
}
```

| Código | Quando |
|---|---|
| 201 | Vacinação registrada, com o protocolo (`repetida: false`) |
| 200 | Solicitação repetida (mesma `chave_idempotencia`): devolve o **mesmo protocolo**, sem gravar nada novo (`repetida: true`) |
| 422 | Dados inválidos (campo faltando, chave ausente, data futura, microchip inválido) |

A `chave_idempotencia` é obrigatória e deve ser a **mesma em todas as
tentativas de envio da mesma vacina** (sugestão: `VACINA-<id_vacina>`). Em
uma repetição, o governo ignora os demais campos e devolve o resultado da
primeira vez.

### 6.5 Consultar operação
`GET /api/governo/operacoes/{protocolo}`

| Código | Quando |
|---|---|
| 200 | Retorna tipo, situação, mensagem e data da operação |
| 404 | Nenhuma operação com esse protocolo |

## 7. Regras implementadas

1. **Microchip único.** Dois animais não podem ter o mesmo microchip (409).
2. **Validação dos dados de entrada.**
   - Microchip com exatamente 15 números.
   - Sexo M ou F, ou vazio. **Aviso (revisão 10/11):** o sexo ficou opcional porque a
     clínica aceita animal sem sexo (ex.: aves). Falta o grupo decidir a regra final.
   - CPF com 11 números (a conferência dos dígitos não foi implementada).
   - Data de aplicação da vacina não pode estar no futuro.
   - Campos obrigatórios preenchidos.
3. **Protocolo de processamento.** Toda operação gera um protocolo no formato
   `GOV-AAAAMMDD-XXXXXXXX`, onde as letras finais são sorteadas.
4. **Comunicação independente do cadastro prévio.** Se a vacinação chega para
   um microchip que ainda não existe, o animal é **criado automaticamente**
   com os dados da mensagem (exigência do enunciado). Se o animal já existe,
   os dados dele **não são sobrescritos**: a alteração é feita pelo PUT.
5. **Gravação única.** O animal, a operação e a vacinação são gravados juntos.
   Se algo falhar no meio, nada fica gravado.
6. **Confiança nos dados da clínica.** Espécie e raça são texto livre. A
   validação de que a raça combina com a espécie é responsabilidade da
   clínica, para o governo não recusar um animal válido quando o catálogo da
   clínica crescer.
7. **Idempotência na vacinação antirrábica.** Cada envio traz uma
   `chave_idempotencia`. Se a mesma chave chegar de novo (reenvio manual ou
   automático), o governo devolve o protocolo da primeira vez, com código 200
   e `repetida: true`, e **não cria** nova operação nem nova vacinação. Os
   demais casos já são seguros contra repetição: o cadastro repetido de animal
   é recusado pelo microchip único (409) e o PUT repetido apenas reaplica os
   mesmos dados.

## 8. Simulação de falhas

Para demonstrar o tratamento de falhas de comunicação (testes 14 e 15 do
enunciado), a API consegue "fingir" que está fora do ar ou que recusou os
dados.

Corpo do `PUT /api/governo/simulacao`:

```json
{"indisponivel": false, "erro_validacao": false}
```

| indisponivel | erro_validacao | Resultado |
|---|---|---|
| false | false | Funcionamento normal |
| true | false | Todas as rotas respondem **503** |
| false | true | POST e PUT respondem **422** simulado; GET continua normal |
| true | true | O **503** prevalece |

**Como funciona:** o middleware `simular_falhas` (em `app/main.py`) roda antes
de toda rota e consulta o estado guardado em `app/simulacao.py`. Se uma chave
está ligada, ele responde o erro direto e a rota não é executada, então nada é
gravado durante a falha. As rotas de simulação e o Swagger nunca são
bloqueados.

**Observações**
- O estado fica na memória: reiniciar a API (inclusive o `--reload` ao salvar
  um arquivo) volta tudo para "disponível".
- Desligar o servidor de verdade também simula a queda. Nesse caso a clínica
  recebe erro de conexão em vez de 503.

## 9. Integração com a clínica

A API do governo e a da clínica **não compartilham banco nem chaves
estrangeiras**. O que liga os dois lados é o número do microchip e as
mensagens HTTP.

| Clínica | Governo | Relação |
|---|---|---|
| `VinculoMicrochip.cod_microchip` (vínculo ativo) | `animal_governo.microchip` | Mesmo número nos dois lados |
| Animal, Espécie, Raça e Tutor | `animal_governo` | A clínica copia os dados na mensagem |
| Vacina e Veterinário | `vacinacao_antirrabica` | A clínica copia os dados na mensagem |
| `Integracao_gov.chave_idempotencia` | `operacao.chave_idempotencia` | Mesma chave nos dois lados, enviada em toda tentativa da mesma vacina (sugestão: `VACINA-<id_vacina>`) |
| `Integracao_gov.protocolo_externo` | `operacao.protocolo` | O governo devolve, a clínica guarda |
| `Integracao_gov.situacao`, `qtd_tentativas`, `msg_erro` | (não existe) | Só a clínica controla |

**Como a clínica deve tratar cada resposta**

| Resposta do governo | Situação da integração na clínica |
|---|---|
| 200 ou 201 | confirmada (guarda o protocolo) |
| 503 ou sem resposta | pendente (será reenviada) |
| 422 | falha (guarda a mensagem de erro) |

## 10. Testes executados

Todos pelo Swagger, com dados fictícios.

| Teste | Resultado |
|---|---|
| Cadastrar animal novo | 201 com protocolo |
| Cadastrar o mesmo microchip de novo | 409 |
| Cadastrar com microchip inválido | 422 |
| Consultar animal existente | 200 |
| Consultar microchip inexistente | 404 |
| Atualizar animal | 200 com novo protocolo |
| Vacinação antirrábica com microchip novo | 201, animal criado automaticamente |
| Vacinação antirrábica com microchip já cadastrado | 201, vacina registrada, animal não recriado |
| Consultar operação pelo protocolo | 200 |
| Simulação `indisponivel: true` | 503 |
| Simulação `erro_validacao: true` | 422 simulado |
| Vacinação antirrábica com chave de idempotência nova | 201, `repetida: false` |
| Mesmo envio repetido, com a mesma chave | 200, mesmo protocolo, `repetida: true`, sem novo registro (teste 16 do enunciado) |
| Mesma vacinação com outra chave | 201, protocolo novo |
| Envio sem `chave_idempotencia` | 422 |

Os mesmos testes ainda precisam ser repetidos no **Postman**, com prints, para
o relatório de testes. A coleção deve ser salva em `postman/`.

## 11. Pendências

| Item | Etapa |
|---|---|
| Repetir os testes no Postman e salvar a coleção | pendente |
| Envio, reenvio automático e botão "Reenviar" na API da clínica | integração |
| Vínculo e troca de microchip na API da clínica | Milestone 3 |
| Conferência dos dígitos do CPF (opcional) | opcional |