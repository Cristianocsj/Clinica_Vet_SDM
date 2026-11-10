# Relatório de testes

Revisão de 10/11/2026 (Caio), atualizada depois do push do Cristiano (vínculo de microchip).
Ambiente: Node 22.23, Python 3.10, Chromium. As duas APIs e as telas rodando juntas em `localhost`,
com o banco criado por `npm run banco:recriar:demo`.

## 1. Execuções automáticas

| O que rodou | Resultado |
|---|---|
| Postman `Clinica_Vet_Bia` (login, veterinários, consultas, vacinas) | 35 requisições, 71 verificações, 0 falhas |
| Postman `Clinica_Vet_Tutores_Animais_Microchip_Governo` (tutores, CEP, espécies, raças, animais, microchip, envio ao governo) | 44 requisições, 82 verificações, 0 falhas (rodada 2 vezes seguidas) |
| Testes da API do governo da documentação do Cristiano, repetidos | todos com o código esperado (201, 409, 422, 404, 200, 503) |
| Telas no navegador (login, tutor com CEP, animal, consulta, vacina, microchip, envio, governo fora do ar, celular) | 34 verificações, 0 falhas, sem erro de JavaScript |
| Código do guia do Cristiano (troca de chip, reenvio automático, cadastro no governo), em cima do código dele, numa cópia do projeto | 21 verificações, 0 falhas |

A instalação da API do governo (`requirements.txt`) foi testada no Python 3.10, 3.12, 3.13 e 3.14.

## 2. Os 16 testes obrigatórios (enunciado, seção 9)

| Nº | Teste | Quem | Como mostrar | Situação |
|---|---|---|---|---|
| 1 | Login de veterinário ativo e com senha confirmada | Bia | Tela de login com `ativo@clinica.test` | Passou |
| 2 | Bloqueio de veterinário inativo | Bia | Login com `inativo@clinica.test` | Passou |
| 3 | Bloqueio de senha não confirmada | Bia | Login com `pendente@clinica.test` | Passou |
| 4 | Rejeição de senha incorreta | Bia | Login com senha errada | Passou |
| 5 | Cadastro de tutor e CPF duplicado | João | Tela Tutores: cadastrar e repetir o CPF | Passou |
| 6 | CEP válido e CEP inexistente | João | Tela Tutores: buscar `01001-000` e `99999-999` | Passou (precisa de internet) |
| 7 | Cadastro de animal e vínculo de microchip | Cristiano | Tela Animais → ficha → Vincular / trocar | Passou |
| 8 | Rejeição de microchip já utilizado | Cristiano | Vincular o mesmo código em outro animal | Passou |
| 9 | Registro de consulta e histórico | Bia | Ficha do animal → Registrar consulta | Passou |
| 10 | Registro de vacina e próximas doses | Bia | Ficha do animal → Registrar vacina; tela Doses | Passou |
| 11 | Cadastro e atualização do animal no governo | Cristiano / João | Swagger do governo; pela clínica, guia passo 3 | Passou na API do governo. **Falta a clínica enviar** (guia, passo 3). |
| 12 | Envio obrigatório da antirrábica | Cristiano | Antirrábica aplicada em animal com chip → Enviar → `confirmada` | Passou |
| 13 | Vacina não antirrábica não é enviada | Cristiano | Registrar V10: não aparece envio | Passou |
| 14 | Governo indisponível: fica pendente | Cristiano | Swagger: `PUT /api/governo/simulacao` `indisponivel: true` → Enviar | Passou |
| 15 | Reenvio da pendência e confirmação | Cristiano | Simulação de volta para `false` → Reenviar | Passou |
| 16 | Repetição sem duplicar no governo | Cristiano | Repetir no Swagger o POST com a mesma `chave_idempotencia` | Passou (200, `repetida: true`, o mesmo protocolo) |

Para o relatório final: cada pessoa roda os próprios testes, tira print da tela (ou do Postman) e coloca aqui.

## 3. O que a revisão encontrou e o que foi feito

| Parte | Encontrado | Feito |
|---|---|---|
| Bia (banco, login, consultas, vacinas) | Funcionando e documentado. A sessão fica na memória: reiniciar a API derruba os logins. | Nada a corrigir. Comportamento explicado no README. |
| João (tutores, espécies, raças, animais) | Só existiam a busca de CEP e o validador de CPF. Não havia rotas de tutores, espécies, raças e animais, e sem elas as telas não funcionavam. | Rotas criadas no padrão da Bia (`docs/API_TUTORES_ANIMAIS_GOVERNO.md`). |
| João (CEP) | Funciona, mas todos os erros voltam 400 e sem `codigo`, diferente do padrão de erros da Bia. | Mantido (funciona). Sugestão: 503/504 com `codigo` para indisponível e timeout. |
| Cristiano (API do governo) | Funciona como documentado. O governo exigia sexo M/F, mas a clínica aceita animal sem sexo (ex.: ave), então essa antirrábica seria recusada. | Sexo opcional no governo, com **AVISO** no código para o grupo decidir. Quem tinha `governo.db` antigo precisa apagar. |
| Cristiano (API do governo) | `requirements.txt` em UTF-16; classe `VacinacaoCreate` escrita duas vezes; tamanhos de espécie, raça e nome da vacina menores que os da clínica. | `requirements.txt` convertido para UTF-8 (mesmas versões). Os outros ficaram anotados no guia. |
| Cristiano (microchip, push de 10/11) | Vínculo funcionando (15 números, único, veterinário logado, animal ativo). Ainda não faz a troca de chip. Sobrou uma linha comentada. | Código dele usado como está. A tela passou a mandar o campo `microchip`. A troca ficou no guia, em cima do código dele. |
| Cristiano (integração) | A API da clínica não falava com a do governo. | Ponte (listar e enviar/reenviar) e guia com o reenvio automático e o cadastro do animal no governo. |
| Caio (telas e documentação) | Pasta `frontend/` vazia e README de uma linha. | Telas feitas (`npm run front`), README com o passo a passo, este relatório. |
| Projeto | O plano dizia API da clínica em Python na porta 8000; o grupo fez em Node na porta 3000. A pasta `node_modules` estava no primeiro zip. | README com a stack real. O zip de entrega vai sem `node_modules`, `venv` e bancos (cada um gera os seus). |
