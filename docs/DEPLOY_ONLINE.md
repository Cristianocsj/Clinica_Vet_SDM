# 🌐 Teste online (Firebase + Render)

Para mostrar o sistema funcionando fora da máquina local:

| Parte | Onde | Endereço |
|---|---|---|
| 🖥️ Telas (Angular) | Firebase Hosting | `https://<id-do-projeto>.web.app` |
| ⚙️ API da clínica (Node) | Render, plano grátis | `https://clinica-vet-sdm-api.onrender.com` |
| 🏛️ API do governo (FastAPI) | Render, plano grátis | `https://clinica-vet-sdm-gov.onrender.com/docs` |

> [!WARNING]
> No plano grátis do Render o serviço **dorme** depois de 15 minutos sem uso. O primeiro acesso depois disso leva cerca de 1 minuto, e o banco **volta aos dados de exemplo** (o disco é apagado). Para o teste e a apresentação isso não atrapalha: abra o site 2 minutos antes.

## 1️⃣ APIs no Render (uma vez só)

1. Entre em <https://render.com> com a sua conta do GitHub.
2. **New › Blueprint** e escolha o repositório `Clinica_Vet_SDM`.
   - Se o repositório não aparecer (ele é do Cristiano), faça um *fork* para a sua conta no GitHub, desmarcando "Copy the main branch only", e escolha o fork.
3. Branch: a que tem o arquivo `render.yaml` (hoje `revisao-final-angular`; depois do merge, `dev`).
4. Clique em **Apply**. O Render cria os dois serviços do `render.yaml` e leva uns 5 minutos.
5. Confira:
   - <https://clinica-vet-sdm-gov.onrender.com/api/governo/saude> mostra `{"status":"ok", ...}`
   - <https://clinica-vet-sdm-api.onrender.com/api/especies> mostra `TOKEN_AUSENTE` (está no ar e pedindo login, certo)

> [!NOTE]
> Se o Render der outro nome a algum serviço (porque o nome já existia), troque o endereço em
> `frontend-angular/src/environments/environment.online.ts` (API da clínica) e na variável `GOV_API_URL` do serviço `clinica-vet-sdm-api` no painel do Render (API do governo).

O código de confirmação de senha (e-mail simulado) aparece em **Logs** do serviço `clinica-vet-sdm-api`.

## 2️⃣ Telas no Firebase

1. Em <https://console.firebase.google.com> clique em **Criar projeto** (pode desligar o Analytics) e anote o **ID do projeto**.
2. No terminal, uma vez só:

   ```bash
   npm install -g firebase-tools
   firebase login
   ```

3. Para publicar (e sempre que mudar o front):

   ```bash
   cd frontend-angular
   npm install
   npm run build:online
   firebase deploy --only hosting --project <id-do-projeto>
   ```

4. Abra `https://<id-do-projeto>.web.app` e entre com `ativo@clinica.test` / `Senha@123`.

## Como funciona

- `npm run build:online` usa `src/environments/environment.online.ts`, que aponta as telas para a API no Render. O `npm run front` continua usando `http://localhost:3000`.
- `frontend-angular/firebase.json` publica `dist/frontend-angular/browser` e manda qualquer rota para o `index.html` (necessário para as rotas do Angular).
- `render.yaml` sobe a API do governo (`uvicorn` na porta do Render) e a API da clínica (recria o banco de exemplo e roda `npm start`), já ligando uma na outra pela variável `GOV_API_URL`.
- O CEP funciona online, porque o Render tem internet para falar com o ViaCEP.
