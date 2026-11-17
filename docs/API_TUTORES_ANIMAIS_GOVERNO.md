# Tutores, espécies, raças, animais e envio ao governo

Rotas da API da clínica (porta 3000) feitas na revisão de 10/11, no mesmo padrão das rotas da Bia
(`docs/API_BANCO_AUTENTICACAO_REGISTROS.md`): todas pedem o token (`Authorization: Bearer <token>`),
os erros voltam como `{ "erro": true, "codigo": "...", "mensagem": "..." }` e o DELETE só **inativa**.

Testes no Postman: `postman/Clinica_Vet_Tutores_Animais_Microchip_Governo.postman_collection.json`.

## Tutores (teste 5)

| Rota | Resposta |
|---|---|
| GET /api/tutores | 200 lista (filtros opcionais: `?busca=` nome ou CPF, `?situacao=ativo` ou `inativo`) |
| GET /api/tutores/:id | 200 com o endereço e os animais, ou 404 |
| POST /api/tutores | 201 |
| PUT /api/tutores/:id | 200 (só os campos enviados mudam; o endereço também pode ir pela metade) |
| DELETE /api/tutores/:id | 200, inativa |

```json
{
  "nome": "Maria Silva",
  "cpf": "529.982.247-25",
  "telefone": "(11) 91234-5678",
  "email": "maria@exemplo.test",
  "dataNascimento": "1990-01-20",
  "endereco": { "cep": "01001-000", "logradouro": "Praça da Sé", "numero": "25", "complemento": null,
                "bairro": "Sé", "cidade": "São Paulo", "uf": "SP", "codigoIbge": "3550308" }
}
```

- Obrigatórios: nome (3 a 150 letras), CPF válido (dígitos verificadores) e endereço com CEP (8 números), cidade e UF.
- CPF repetido: 409 `CPF_JA_CADASTRADO`. Tutor inativo não pode ser alterado nem receber animal novo (409 `TUTOR_INATIVO`).
- O endereço vem da busca de CEP: `GET /api/cep/:cep` (rota do João) consulta o ViaCEP e devolve `logradouro`,
  `bairro`, `localidade` (cidade), `uf` e `ibge`. CEP inexistente, timeout e ViaCEP fora do ar voltam 400 com a mensagem; aí a pessoa preenche à mão (teste 6).

## Espécies e raças

| Rota | Resposta |
|---|---|
| GET /api/especies | 200 (`?situacao=ativo`) |
| POST /api/especies | 201 `{ nome, descricao? }`, e já cria a raça "Sem raça definida" dela |
| PUT /api/especies/:id | 200 `{ nome?, descricao? }` |
| DELETE /api/especies/:id | 200, inativa |
| GET /api/racas | 200 (`?especieId=1&situacao=ativo`; "Sem raça definida" vem primeiro) |
| POST /api/racas | 201 `{ nome, especieId, descricao? }` |
| PUT /api/racas/:id | 200 `{ nome?, descricao? }` (a espécie de uma raça não muda) |
| DELETE /api/racas/:id | 200, inativa |

Nome repetido: 409 `ESPECIE_JA_CADASTRADA` ou `RACA_JA_CADASTRADA` (a raça é única dentro da espécie, sem diferença de maiúsculas).

## Animais

| Rota | Resposta |
|---|---|
| GET /api/animais | 200 (`?busca=` animal, tutor ou microchip; `?tutorId=`, `?especieId=`, `?situacao=`) |
| GET /api/animais/:id | 200 ficha: dados, tutor, `microchips` (histórico) e `integracoesGov` (situação no governo) |
| POST /api/animais | 201 |
| PUT /api/animais/:id | 200 (só os campos enviados mudam) |
| DELETE /api/animais/:id | 200, inativa |

```json
{ "nome": "Tico", "tutorId": 1, "especieId": 1, "racaId": 4, "sexo": "M", "cor": "Branco", "peso": 12.5,
  "dataNascimento": "2024-05-10" }
```

- Data de nascimento **ou** idade estimada: troque `dataNascimento` por `"idadeAnos": 2, "idadeMeses": 6`.
  A API calcula a data e devolve `"nascimentoEstimado": true`.
- Raça é opcional (`null`), mas precisa ser da mesma espécie: senão 400 `RACA_INCOMPATIVEL`.
- Sexo `"M"`, `"F"` ou `null`. Peso em kg, maior que zero.
- Histórico de consultas e vacinas: `GET /api/animais/:id/consultas` e `GET /api/animais/:id/vacinas` (rotas da Bia).

## Integração com o governo

| Rota | Resposta |
|---|---|
| GET /api/integracoes | 200 lista (`?situacao=pendente`, `enviada`, `confirmada` ou `com_falha`; `?animalId=`) |
| POST /api/integracoes/:id/enviar | 200 com a situação depois da tentativa (botão Enviar/Reenviar) |

- A linha é criada sozinha quando uma vacina **antirrábica aplicada** é registrada (`POST /api/vacinas`).
- O primeiro vínculo de microchip cria o cadastro do animal; trocas de chip e alterações cadastrais criam atualizações.
- O envio chama `POST /api/governo/vacinacoes-antirrabicas` e confirma com `GET /api/governo/operacoes/{protocolo}`.
- Sem microchip ativo o governo não aceita: o envio fica `pendente` com o aviso "Aguardando vínculo de microchip" e não conta tentativa.
- Governo fora do ar ou timeout (5 s): `pendente`. Governo recusou (4xx): `com_falha`. Já confirmada: 409 `INTEGRACAO_JA_CONFIRMADA`.
- Cadastros, atualizações e vacinações pendentes são reenviados automaticamente a cada minuto, por até cinco tentativas; depois ficam `com_falha` e podem ser reenviados manualmente.
- Endereço do governo: variável `GOV_API_URL` (padrão `http://localhost:8001/api/governo`).
- Vínculo de microchip: rota do Cristiano, `POST /api/animais/:id/microchip` com `{ "microchip": "076000000000001" }`
  (ver `docs/API_BANCO_AUTENTICACAO_REGISTROS.md`).
- Na troca, informe também `motivo`; o chip antigo permanece no histórico e o governo atualiza o mesmo animal, preservando suas vacinações.
