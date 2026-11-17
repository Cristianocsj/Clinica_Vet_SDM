# API do Governo (simulada) e integração com a clínica: documentação
 
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
se comunica com a API da clínica apenas por HTTP. O lado da clínica (vínculo e
troca de microchip, criação das pendências, envio e reenvio) está descrito na
seção 9.
 
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
 
A API da clínica, que conversa com esta, é Node.js (Express) na porta 3000. O
endereço do governo usado por ela vem da variável `GOV_API_URL` (padrão
`http://localhost:8001/api/governo`).
 
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
- `Base.metadata.create_all()` cria tabelas ausentes, mas não migra tabelas
  existentes. Se um banco antigo tiver `sexo` como obrigatório, faça backup e
  migre/recrie esse banco local para aceitar o campo opcional. SQLite não
  aplica os limites declarados em `VARCHAR`; os limites também são validados
  pelos schemas da API.
- Para gerar o `requirements.txt` no Windows, use o Prompt de Comando (`cmd`):
  `pip freeze > requirements.txt`. No PowerShell o arquivo sai em UTF-16.
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
| sexo | texto (1) | **opcional**: M, F ou vazio (a clínica aceita animal sem sexo informado, como aves) |
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
| chave_idempotencia | texto (100) | única; usada em cadastros, atualizações e vacinações para idempotência |
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
 
**Tamanhos alinhados com a clínica.** O governo aceita pelo menos o que a
clínica aceita (espécie 100, raça 100, nome da vacina 150), para nunca recusar
com 422 um dado que a clínica considera válido.
 
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
| 201 | Animal novo cadastrado. Retorna o protocolo e os dados do animal |
| 200 | Microchip já existia e os dados foram sincronizados, ou a mesma chave foi reenviada |
| 409 | A chave de idempotência foi usada em outra operação ou não corresponde ao animal encontrado |
| 422 | Dados inválidos (por exemplo, microchip sem 15 números) |

`chave_idempotencia` é obrigatória. Se o microchip já existir, a API sincroniza
os dados no registro existente e responde 200; não cria um segundo animal.
 
### 6.2 Consultar animal
`GET /api/governo/animais/{microchip}`
 
| Código | Quando |
|---|---|
| 200 | Retorna os dados do animal |
| 404 | Nenhum animal com esse microchip |
 
### 6.3 Atualizar animal
`PUT /api/governo/animais/{microchip}`
 
O corpo exige `chave_idempotencia` e os mesmos dados cadastrais do animal. O
campo `novo_microchip` é opcional; quando enviado, o registro localizado pelo
microchip da rota recebe o novo chip e preserva as vacinações relacionadas.
Cada atualização nova gera um protocolo; reenviar a mesma chave devolve o
resultado anterior.
 
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
  "chave_idempotencia": "3f2b8c1e-9d4a-4b7e-8a61-5c0d2e7f9a10",
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
  "protocolo": "GOV-20261116-A1B2C3D4",
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
 
A `chave_idempotencia` é obrigatória. A clínica a gera **uma única vez** (um
UUID), quando cria a pendência, e a usa **em todas as tentativas de envio da
mesma vacina**. Em uma repetição, o governo ignora os demais campos e devolve
o resultado da primeira vez.
 
### 6.5 Consultar operação
`GET /api/governo/operacoes/{protocolo}`
 
| Código | Quando |
|---|---|
| 200 | Retorna tipo, situação, mensagem e data da operação |
| 404 | Nenhuma operação com esse protocolo |
 
## 7. Regras implementadas no governo
 
1. **Microchip único.** Dois animais não podem ter o mesmo microchip (409).
2. **Validação dos dados de entrada.**
   - Microchip com exatamente 15 números.
   - Sexo M ou F, quando informado (é opcional).
   - CPF com 11 números (a conferência dos dígitos não foi implementada).
   - Data de aplicação da vacina não pode estar no futuro.
   - Campos obrigatórios preenchidos, respeitando os tamanhos da seção 5.
3. **Protocolo de processamento.** Toda operação processada com sucesso gera um protocolo no formato
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
7. **Idempotência.** Cadastros, atualizações e vacinações recebem uma
   `chave_idempotencia` única por operação. Repetir a mesma chave e operação
   devolve o protocolo anterior sem criar nova operação. A clínica gera uma
   chave diferente para cada integração e não deve reutilizá-la entre tipos de
   operação. Um cadastro com uma nova chave e um microchip já existente
   sincroniza os dados no registro existente e responde 200; não cria um
   segundo animal.
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
| true | false | Rotas de negócio respondem **503**; Swagger e simulação continuam disponíveis |
| false | true | POST e PUT respondem **422** simulado; GET continua normal |
| true | true | O **503** prevalece |
 
**Como funciona:** o middleware `simular_falhas` (em `app/main.py`) roda antes
das rotas e consulta o estado guardado em `app/simulacao.py`. Se uma falha
está ligada, ele responde o erro direto e a rota de negócio não é executada,
então nada é gravado durante a falha. As rotas de simulação e o Swagger nunca
são bloqueados.
 
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
| Vínculo de microchip ativo (`VET_VINCULO_MICROCHIP`) | `animal_governo.microchip` | Mesmo número nos dois lados |
| Animal, Espécie, Raça e Tutor | `animal_governo` | A clínica copia os dados na mensagem |
| Vacina e Veterinário | `vacinacao_antirrabica` | A clínica copia os dados na mensagem |
| `VET_INTEGRACAO_GOV` (chave de idempotência) | `operacao.chave_idempotencia` | Mesma chave nos dois lados, em todas as tentativas |
| `VET_INTEGRACAO_GOV` (protocolo externo) | `operacao.protocolo` | O governo devolve, a clínica guarda |
| `VET_INTEGRACAO_GOV` (situação, tentativas, erro) | (não existe) | Só a clínica controla |
 
### 9.1 Microchip
 
- **Vínculo** (`POST /api/animais/:id/microchip`): o código tem 15 números, o
  veterinário vem da sessão e o animal só pode ter um microchip ativo.
- **Código não reutilizável:** um microchip já usado é recusado (409
  `MICROCHIP_JA_UTILIZADO`), **inclusive um chip que tenha sido substituído**.
- **Troca com motivo:** se o animal já tem chip, a troca exige o `motivo`. O
  chip anterior passa para `substituido`, com data e motivo, e o novo vira o
  ativo. O histórico do chip anterior é preservado.
- **Migração do banco:** `VET_INTEGRACAO_GOV` passou a guardar o **chip da
  operação** e o **chip anterior**. Quem já tinha o `clinica.db` local deve
  parar a API e rodar `npm run banco` na raiz do projeto antes de iniciá-la.
  Esse comando adiciona as colunas sem recriar o banco. Não use
  `npm run banco:recriar:demo` se quiser preservar os dados locais.
### 9.2 Quando nasce uma pendência de envio
 
| Evento na clínica | Operação criada |
|---|---|
| Primeiro microchip vinculado ao animal | `CADASTRO_ANIMAL` |
| Dados do animal alterados (animal com chip) | `ATUALIZACAO_ANIMAL` |
| Troca de microchip | `ATUALIZACAO_ANIMAL` |
| Vacina antirrábica **aplicada** | `VACINACAO_ANTIRRABICA` |
| Vacina comum, ou antirrábica só agendada | nenhuma (teste 13) |
 
Toda pendência nasce `pendente`, com uma chave de idempotência (UUID) gerada
uma única vez.
 
Antes de enviar uma atualização ou vacinação, a clínica aguarda a confirmação
de qualquer operação anterior de cadastro ou atualização daquele animal.
Enquanto ela não for confirmada, a seguinte permanece pendente sem envio.
 
### 9.3 Envio e situações
 
O envio sai por `POST /api/integracoes/:id/enviar` (botão **Enviar/Reenviar**
da tela "Governo") e pelo reenvio automático. A troca de chip é enviada como
`ATUALIZACAO_ANIMAL`, usando o chip anterior para localizar o animal no governo
e, na troca, informa o chip novo pelo campo `novo_microchip` do PUT.
 
**Se o governo responder 404 na atualização da troca** (o chip anterior não
existe lá), a clínica tenta cadastrar o animal com o chip novo pela rota normal
`POST /api/governo/animais`.
 
| O governo respondeu | Situação na clínica | Conta tentativa? |
|---|---|---|
| Animal sem microchip ativo (o governo nem é chamado) | `pendente`, com o aviso "Aguardando vínculo de microchip" | não |
| 201 ou 200 com protocolo, e a consulta do protocolo deu `concluida` | `confirmada` | sim |
| 201 ou 200, mas a consulta do protocolo falhou | `enviada` (enviar de novo confirma) | sim |
| Sem resposta, timeout de 5 s ou 5xx (por exemplo, 503 simulado) | `pendente` | sim |
| 4xx (por exemplo, 422) | `com_falha`, com a mensagem do governo | sim |
 
A ponte passa por `enviada` e consulta o protocolo antes de marcar
`confirmada`, porque o enunciado pede as quatro situações: pendente, enviada,
confirmada e com falha.
 
### 9.4 Reenvio automático
 
- A cada **1 minuto**, a clínica tenta enviar o que está `pendente` (ou
  `enviada` sem confirmação).
- Cada tentativa soma 1 em `qtd_tentativas`. O botão **Enviar/Reenviar**
  também faz uma tentativa e incrementa o contador.
- Depois de **5 tentativas** sem sucesso, a integração passa para `com_falha`
  e o automático para. Dali em diante só o botão tenta de novo.
- Os cadastros (`CADASTRO_ANIMAL`) são enviados antes dos demais.
- Animal **sem microchip** fica esperando, **sem gastar tentativa**, e é
  enviado assim que o chip for vinculado.
- Um erro 4xx (por exemplo, 422) leva direto a `com_falha`, porque repetir os
  mesmos dados daria o mesmo erro.
- Para testar sem esperar minutos, a duração do intervalo pode ser reduzida
  temporariamente no arquivo `api_clinica/services/reenvioAutomatico.js`.
### 9.5 Idempotência no reenvio
 
Todas as tentativas de uma mesma vacina usam a **mesma chave**. Se o governo
recebeu a mensagem mas a resposta se perdeu, o reenvio devolve o mesmo
protocolo e **não duplica** a vacinação (teste 16).
 
## 10. Testes
 
### 10.1 API do governo (direto no Swagger)
 
| Teste | Resultado esperado |
|---|---|
| Cadastrar animal novo | 201 com protocolo |
| Cadastrar o mesmo microchip com uma nova chave | 200, sincroniza os dados sem criar outro animal |
| Repetir cadastro com a mesma chave | 200, devolve o mesmo protocolo |
| Reutilizar chave de idempotência em outro tipo de operação | 409 |
| Cadastrar com microchip inválido | 422 |
| Consultar animal existente | 200 |
| Consultar microchip inexistente | 404 |
| Atualizar animal | 200 com novo protocolo |
| Vacinação antirrábica com microchip novo | 201, animal criado automaticamente |
| Vacinação antirrábica com microchip já cadastrado | 201, vacina registrada, animal não recriado |
| Consultar operação pelo protocolo | 200 |
| Simulação `indisponivel: true` | 503 |
| Simulação `erro_validacao: true` | 422 simulado |
| Vacinação com chave de idempotência nova | 201, `repetida: false` |
| Mesmo envio repetido, com a mesma chave | 200, mesmo protocolo, `repetida: true`, sem novo registro |
| Mesma vacinação com outra chave | 201, protocolo novo |
| Envio sem `chave_idempotencia` | 422 |
 
### 10.2 Pela clínica (testes do enunciado)
 
| Teste | Como mostrar | Resultado esperado |
|---|---|---|
| 7 | Vincular microchip de 15 números a um animal | 201, com veterinário e data |
| 8 | Vincular um chip já usado (inclusive substituído) | 409 `MICROCHIP_JA_UTILIZADO` |
| Troca de chip | Outro chip no mesmo animal, com e sem `motivo` | Sem motivo, 409; com motivo, 201 e o antigo vira `substituido` |
| 11 | Vincular o primeiro chip e depois alterar o animal; conferir `GET /api/governo/animais/{chip}` | Cadastro e atualização chegam ao governo (`confirmada`); atualização e vacinação aguardam operações anteriores do animal |
| 12 | Antirrábica em animal com chip, enviar | `confirmada`, com protocolo |
| 13 | Registrar vacina comum | Nenhum envio é criado |
| 14 | Simulação `indisponivel: true`, sem cliques manuais | `pendente` nas primeiras tentativas automáticas; `com_falha` após a quinta |
| 15 | Desligar a simulação e clicar em **Reenviar** | `confirmada` |
| 16 | Repetir o envio com a mesma chave | 200, `repetida: true`, mesmo protocolo |
 
Os prints de cada teste ficam em `docs/RELATORIO_DE_TESTES.md`.
 
## 11. Pendências e limitações conhecidas
 
| Item | Situação |
|---|---|
| Coleção do Postman só da API do governo, salva em `postman/` | pendente |
| Prints dos testes 7, 8, 11 e 12 a 16 para o relatório | pendente |
| Alterar o nome ou o CPF do **tutor** não gera aviso ao governo (só a alteração do animal gera) | limitação conhecida |
| Conferência dos dígitos do CPF | opcional |
 