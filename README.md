# Clinica_Vet_SDM

Sistema web para gestão de clínica veterinária com integração de APIs (A3 de Sistemas Distribuídos e Mobile).
Tudo roda na sua máquina (`localhost`). Só a consulta de CEP usa a internet (ViaCEP real).

```text
Telas (Angular)   ── REST ──>  API da clínica (Node)  ── HTTP ──>  API do governo (Python, simulada)
localhost:8080                 localhost:3000                      localhost:8001
                                 │        └── HTTP ──> ViaCEP (internet)
                                 └── clinica.db (SQLite)            └── governo.db (SQLite, separado)
```

## Tecnologias e por quê

| Parte | Tecnologia | Por quê |
|---|---|---|
| Telas | Angular 21 + Bootstrap 5.3 (pasta `frontend-angular/`) | Uma tela = um componente (`.ts` + `.html`), rotas com proteção por login e tema próprio de clínica veterinária. Funciona no celular. O front antigo em HTML puro continua em `frontend/` (`npm run front:antigo`). |
| API da clínica | Node.js 22+ com Express 5 | Mesma linguagem das telas, simples e muito usada. |
| Banco da clínica | SQLite que já vem no Node (`node:sqlite`) | Banco relacional sem instalar servidor nem compilar biblioteca. |
| Senha e sessão | bcryptjs + token de sessão (8 h) | A senha nunca é guardada pura. |
| API do governo | Python 3.10+ com FastAPI, SQLAlchemy e Uvicorn | Swagger automático em `/docs` e validação automática dos dados. |
| Banco do governo | SQLite (`governo.db`) | Banco próprio, separado do da clínica (exigência do enunciado). |
| CEP | ViaCEP (API pública real) | Exigência do enunciado. |
| Testes | Postman (pasta `postman/`) e Swagger do governo | Coleções prontas para rodar no Runner. |

> No plano inicial (`docs/DIVISAO_DO_TRABALHO.pdf`) a API da clínica seria em Python. O grupo fez em Node.js (porta 3000); vale o que está aqui.

## Como rodar na sua máquina

### 1. Instale (uma vez só)

- **Node.js 22 LTS ou mais novo** (https://nodejs.org). Confira no terminal: `node -v` precisa mostrar `v22.13` ou maior.
- **Python 3.10 ou mais novo** (https://www.python.org). No Windows, marque **"Add python.exe to PATH"** na instalação. Confira: `python --version`.
- **Postman** (opcional, para rodar as coleções de teste).

### 2. Abra a pasta do projeto

Descompacte o zip (ou `git clone`) e abra **3 terminais** dentro da pasta `Clinica_Vet_SDM-dev`.
No VS Code: menu *Terminal > Novo terminal* três vezes.

### 3. Terminal 1: API da clínica (porta 3000)

```bash
npm install
npm run banco:recriar:demo
npm start
```

Pronto quando aparecer `API da Clínica rodando na porta 3000`. Deixe esse terminal aberto:
o **código de confirmação de senha** (e-mail simulado) aparece nele.

### 4. Terminal 2: API do governo (porta 8001)

Windows:

```bash
cd api_gov
python -m venv venv
venv\Scripts\python -m pip install -r requirements.txt
venv\Scripts\python -m uvicorn app.main:app --port 8001
```

Linux ou Mac:

```bash
cd api_gov
python3 -m venv venv
venv/bin/python -m pip install -r requirements.txt
venv/bin/python -m uvicorn app.main:app --port 8001
```

Pronto quando aparecer `Uvicorn running on http://127.0.0.1:8001`. Swagger: http://localhost:8001/docs

### 5. Terminal 3: telas (porta 8080)

```bash
npm run front:instalar   # só na primeira vez
npm run front
```

Abra **http://localhost:8080** e entre com `ativo@clinica.test` e a senha `Senha@123`.

### Das próximas vezes

Não precisa instalar de novo. Basta: `npm start` (terminal 1), o comando do `uvicorn` dentro de `api_gov` (terminal 2) e `npm run front` (terminal 3).
Para voltar o banco da clínica aos dados de exemplo: pare a API (Ctrl+C) e rode `npm run banco:recriar:demo`.

## Contas e dados de teste (fictícios)

Senha das três contas: `Senha@123` (fica em `api_clinica/database/veterinariosTeste.js`).

| E-mail | Situação | Serve para |
|---|---|---|
| `ativo@clinica.test` | ativo e senha confirmada | entrar (teste 1) |
| `inativo@clinica.test` | inativo | teste 2 (bloqueado) |
| `pendente@clinica.test` | senha não confirmada | teste 3 (bloqueado) |

O `banco:recriar:demo` também cria 3 tutores e 5 animais (Rex, Mel, Luna, Piu e Bidu, este inativo), consultas e vacinas.

## Testes

- **Postman:** *Import* dos arquivos da pasta `postman/` e *Run collection* (com as APIs rodando e o banco recém-recriado).
  - `Clinica_Vet_Bia.postman_collection.json`: login, veterinários, consultas e vacinas (testes 1 a 4, 9 e 10).
  - `Clinica_Vet_Tutores_Animais_Microchip_Governo.postman_collection.json`: tutores, CEP, espécies, raças, animais, microchip e envio ao governo (testes 5 a 8 e 12 a 16). Precisa das duas APIs rodando.
- **Governo:** pelo Swagger em http://localhost:8001/docs.
- **Pelas telas:** o roteiro de cada um dos 16 testes obrigatórios está em `docs/RELATORIO_DE_TESTES.md`, com os prints em `docs/prints/`.

## Problemas comuns

| Aparece | O que fazer |
|---|---|
| `npm.ps1 não pode ser carregado` (PowerShell) | No VS Code, abra o terminal do tipo *Command Prompt* (cmd), ou rode uma vez no PowerShell: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| `No such built-in module: node:sqlite` | Node antigo. Instale o Node 22 LTS ou mais novo. |
| `ExperimentalWarning: SQLite is an experimental feature` | Normal, pode ignorar. |
| `EADDRINUSE` (porta em uso) | Já tem uma cópia rodando em outro terminal. Feche a antiga. |
| `python` não é reconhecido (Windows) | Use `py` no lugar de `python` (ex.: `py -m venv venv`). |
| `EBUSY` ao recriar o banco (Windows) | Pare a API da clínica (Ctrl+C) antes do `npm run banco:recriar:demo`. |
| Erro do governo sobre a coluna `sexo` | Você tinha um `governo.db` antigo. Pare a API do governo, apague `api_gov/governo.db` e suba de novo (ele é recriado). |
| Telas: "Não foi possível falar com a API da clínica" | O terminal 1 (`npm start`) não está rodando. |
| Login caiu sozinho | Reiniciar a API da clínica encerra as sessões. Entre de novo. |
| CEP "indisponível" ou "demorou muito" | Sem internet ou ViaCEP fora do ar. Preencha o endereço à mão. |

## Pastas

```text
api_clinica/   API da clínica (Node): routes/ (rotas), services/ (regras), database/ (conexão e carga do banco)
api_gov/       API do governo simulada (Python/FastAPI) e a documentação dela em docs_gov/
database/      scripts SQL do banco da clínica (tabelas, espécies/raças e dados de exemplo)
frontend-angular/  telas em Angular (porta 8080); veja frontend-angular/README.md
frontend/      telas antigas em HTML/JS (reserva: npm run front:antigo)
postman/       coleções de teste
docs/          enunciado, requisitos, MER, arquitetura, cronograma e os guias abaixo
```

## Documentação

| Arquivo | Conteúdo |
|---|---|
| `docs/API_BANCO_AUTENTICACAO_REGISTROS.md` | Rotas de login, veterinários, consultas e vacinas (Bia) e de microchip (Cristiano) |
| `docs/API_TUTORES_ANIMAIS_GOVERNO.md` | Rotas de tutores, espécies, raças, animais e envio ao governo |
| `api_gov/docs_gov/api_governo_documentacao.md` | API do governo simulada (Cristiano) |
| `docs/GUIA_INTEGRACAO_CRISTIANO.md` | O que falta na integração (troca de microchip, reenvio automático, cadastro no governo), com código pronto |
| `docs/RELATORIO_DE_TESTES.md` | Situação dos 16 testes obrigatórios e o que a revisão encontrou |
