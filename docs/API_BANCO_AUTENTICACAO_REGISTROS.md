# Banco, login e registros clínicos - Bia

Banco de dados, login, confirmação de senha, logout, cadastro de veterinários, consultas e vacinas.
Testes 1, 2, 3, 4, 9 e 10.

## Como rodar

Precisa do Node 22.13 ou mais novo (o banco usa o SQLite que já vem no Node).

```bash
npm install
npm run banco
npm start
```

A API sobe em http://localhost:3000.

Comandos do banco:

- `npm run banco`: cria as tabelas, as espécies/raças e os veterinários de teste. Pode rodar mais de uma vez, ele só cria o que falta.
- `npm run banco:recriar`: apaga o clinica.db e cria tudo de novo (parar a API antes).
- `npm run banco:demo`: mesma coisa do `banco`, mas coloca também tutores, animais, consultas e vacinas de exemplo.
- `npm run banco:recriar:demo`: apaga e cria de novo já com os dados de exemplo.

Arquivos:

- `database/clinica_changelog.sql`: as 10 tabelas VET_ com as regras (chaves, checks, únicos).
- `database/clinica_seed.sql`: espécies e raças.
- `database/clinica_demo.sql`: dados de exemplo para testar e apresentar (não é obrigatório).

Para usar o banco no código:

```js
const { db, transacao } = require('../database/conexao');
```

A conexão já liga o `PRAGMA foreign_keys = ON`.

## Usuários de teste

A senha é a mesma para os três e está em `api_clinica/database/veterinariosTeste.js` (SENHA_TESTE).

| E-mail | Situação | Login |
|---|---|---|
| ativo@clinica.test | ativo e senha confirmada | 200 |
| inativo@clinica.test | inativo | 403 VETERINARIO_INATIVO |
| pendente@clinica.test | ativo, senha não confirmada | 403 SENHA_NAO_CONFIRMADA |

## Dados de exemplo (banco:demo)

| Id | Animal | Espécie | Tutor | O que tem |
|---|---|---|---|---|
| 1 | Rex | Cão (Labrador) | Carlos Almeida | 2 consultas, V10 com próxima dose em 10 dias |
| 2 | Mel | Cão (SRD) | Carlos Almeida | consulta e V10 agendadas |
| 3 | Luna | Gato (Siamês) | Fernanda Lima | V4 com a próxima dose atrasada |
| 4 | Piu | Ave (Calopsita) | Fernanda Lima | nada |
| 5 | Bidu | Cão (Poodle) | Roberto Nunes | inativo |

Não tem microchip nem envio para o governo, isso fica para os testes da integração.

## Login e token

Primeiro faz `POST /api/auth/login` e pega o `token` da resposta. Nas outras rotas manda o cabeçalho:

```
Authorization: Bearer <token>
```

Todas as rotas /api pedem token, até a do CEP. Só não pedem: login, confirmar-senha e reenviar-codigo.
O token vale 8 horas ou até fazer logout. Se reiniciar a API, precisa logar de novo.

Os erros voltam assim:

```json
{ "erro": true, "codigo": "VETERINARIO_INATIVO", "mensagem": "Acesso bloqueado: veterinário inativo." }
```

- 400: dados errados (DADOS_INVALIDOS, ID_INVALIDO, JSON_INVALIDO, CODIGO_INVALIDO)
- 401: sem token (TOKEN_AUSENTE), token inválido (SESSAO_INVALIDA), e-mail ou senha errados (CREDENCIAIS_INVALIDAS)
- 403: VETERINARIO_INATIVO, SENHA_NAO_CONFIRMADA
- 404: VETERINARIO_NAO_ENCONTRADO, ANIMAL_NAO_ENCONTRADO
- 409: dado repetido ou não permitido (CPF_JA_CADASTRADO, ANIMAL_INATIVO...)

## Rotas

### Autenticação

| Rota | Token | Corpo | Resposta |
|---|---|---|---|
| POST /api/auth/login | não | email, senha | 200 com o token |
| POST /api/auth/reenviar-codigo | não | email | 200, o código aparece no terminal da API |
| POST /api/auth/confirmar-senha | não | email, codigo | 200, senha confirmada |
| POST /api/auth/logout | sim | | 200, o token para de funcionar |
| GET /api/auth/sessao | sim | | 200 com o veterinário logado |

O código de confirmação tem 6 números, vale 15 minutos e depois de 5 erros precisa pedir outro.
O e-mail é simulado: o código aparece no terminal onde a API está rodando.

### Veterinários

| Rota | Corpo | Resposta |
|---|---|---|
| GET /api/veterinarios | | 200 lista (dá para filtrar com ?status=ativo ou ?status=inativo) |
| GET /api/veterinarios/:id | | 200 ou 404 |
| POST /api/veterinarios | nome, cpf, crmv, ufCrmv, email, telefone (opcional), senha | 201 |
| PUT /api/veterinarios/:id | só os campos que vão mudar | 200 |
| DELETE /api/veterinarios/:id | | 200, inativa o veterinário |

- A senha é salva com bcrypt e nunca volta na resposta.
- CPF, e-mail e CRMV+UF não podem repetir (409).
- Veterinário novo precisa confirmar a senha antes de logar. Se trocar a senha, precisa confirmar de novo.
- O DELETE não apaga, só inativa, porque as consultas e vacinas dele continuam no histórico. Ninguém pode inativar o próprio cadastro.

### Consultas (teste 9)

| Rota | Resposta |
|---|---|
| POST /api/consultas | 201 |
| GET /api/animais/:id/consultas | 200 com o histórico, da mais nova para a mais antiga |

Exemplo:

```json
{
  "animalId": 1,
  "motivo": "Vômito há dois dias",
  "sintomas": "Vômito e apatia",
  "diagnostico": "Gastrite leve",
  "tratamento": "Dieta leve por 5 dias",
  "prescricao": "Omeprazol 10mg 1x ao dia",
  "peso": 31.8,
  "temperatura": 39.1
}
```

- Obrigatórios: animalId e motivo.
- O veterinário da consulta é quem está logado.
- Sem dataHora, fica a data e hora de agora. Formato: AAAA-MM-DD HH:MM.
- status pode ser realizada (padrão), agendada, cancelada ou nao_compareceu.
- Temperatura entre 30 e 45. O peso da consulta atualiza o peso do animal.
- Animal inativo não recebe consulta nova, mas o histórico dele continua aparecendo.

### Microchips

| Rota | Corpo | Resposta |
|---|---|---|
| POST /api/animais/:id/microchip | microchip (texto com 15 dígitos) | 201 com o vínculo criado |

- A rota exige token de veterinário; o responsável pelo vínculo é obtido da sessão, nunca do corpo.
- O animal precisa existir e só pode ter um microchip ativo.
- Um código de microchip não pode ser reutilizado, mesmo após uma futura substituição (409 `MICROCHIP_JA_UTILIZADO`).
- O código precisa conter exatamente 15 dígitos; animal inexistente retorna 404 e animal com chip ativo retorna 409.

### Vacinas (teste 10)

| Rota | Resposta |
|---|---|
| POST /api/vacinas | 201 |
| GET /api/animais/:id/vacinas | 200 com o histórico de vacinas |
| GET /api/vacinas/proximas-doses | 200 com as próximas doses (?dias=30 e ?animalId= são opcionais) |

Vacina aplicada:

```json
{
  "animalId": 1,
  "nome": "V10",
  "tipo": "polivalente",
  "fabricante": "Zoetis",
  "lote": "L2026",
  "validadeLote": "2027-11-08",
  "dose": "reforço anual",
  "via": "subcutânea",
  "proximaDose": "2026-11-28"
}
```

Vacina agendada:

```json
{ "animalId": 2, "nome": "V10", "tipo": "polivalente", "situacao": "agendada", "dataAplicacao": "2026-11-23" }
```

- Aplicada precisa de fabricante, lote, validade do lote e dose. Sem dataAplicacao, fica a data de hoje.
- Não aceita lote vencido nem aplicação com data no futuro.
- A próxima dose tem que ser depois da aplicação.
- Antirrábica: manda "antirrabica": true ou coloca no nome/tipo (Antirrábica, raiva).
- Próximas doses mostra as doses que vão vencer e as vacinas agendadas. Quando aplica a dose seguinte, a anterior sai da lista. As que já passaram aparecem como atrasada.

## Integração com o governo

Quando registra uma vacina antirrábica aplicada, a API já cria uma linha na tabela VET_INTEGRACAO_GOV:

- INGO_DS_TIPO_OPERACAO = VACINACAO_ANTIRRABICA
- VACI_ID_VACINA e ANIM_ID_ANIMAL da vacina
- INGO_DS_CHAVE_IDEMPOTENCIA = um UUID, que deve ser usado de novo em todo reenvio
- INGO_DS_SITUACAO = pendente
- INGO_QT_TENTATIVAS = 0

Vacina comum, ou antirrábica só agendada, não cria linha (teste 13).
O banco não deixa duas linhas para a mesma vacina, e enviada/confirmada precisam ter o protocolo.

## Testes no Postman

No Postman: Import e escolher `postman/Clinica_Vet_Bia.postman_collection.json`.

1. Rodar `npm run banco:recriar:demo` e depois `npm start`.
2. Rodar a collection inteira no Runner, ou as pastas em ordem.
3. O Teste 1 já salva o token, as outras requisições usam ele.

Pastas:

1. Login: testes 1, 2, 3 e 4
2. Proteção das rotas e logout
3. Veterinários
4. Consultas: teste 9
5. Vacinas: teste 10
6. Confirmação de senha: precisa copiar o código do terminal da API e colar na variável `codigo`

Também dá para rodar pelo terminal com o Postman CLI:

```bash
postman collection run postman/Clinica_Vet_Bia.postman_collection.json
```
