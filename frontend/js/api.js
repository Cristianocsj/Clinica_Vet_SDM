// Comunicação com a API da clínica. O frontend só fala com ela (nunca com o banco,
// com o governo ou com o ViaCEP direto).
const API_URL = 'http://localhost:3000/api';

// ---------------------------------------------------------------------------
// Sessão (token do login guardado no navegador)
// ---------------------------------------------------------------------------

function lerSessao() {
    try {
        return JSON.parse(localStorage.getItem('sessao')) || null;
    } catch (erro) {
        return null;
    }
}

function salvarSessao(login) {
    localStorage.setItem('sessao', JSON.stringify({ token: login.token, veterinario: login.veterinario }));
}

function limparSessao() {
    localStorage.removeItem('sessao');
}

// ---------------------------------------------------------------------------
// Chamada à API
// ---------------------------------------------------------------------------

// Faz a requisição e devolve o JSON da resposta.
// Em caso de erro lança um Error com a "mensagem" da API (e .status / .codigo).
async function api(metodo, caminho, corpo) {
    const sessao = lerSessao();
    const cabecalhos = { 'Content-Type': 'application/json' };
    if (sessao) cabecalhos.Authorization = `Bearer ${sessao.token}`;

    let resposta;
    try {
        resposta = await fetch(API_URL + caminho, {
            method: metodo,
            headers: cabecalhos,
            body: corpo === undefined ? undefined : JSON.stringify(corpo),
        });
    } catch (erro) {
        throw new Error('Não foi possível falar com a API da clínica (http://localhost:3000). '
            + 'Confira se ela está rodando com "npm start".');
    }

    const texto = await resposta.text();
    let dados = null;
    try {
        dados = texto ? JSON.parse(texto) : null;
    } catch (erro) {
        dados = null; // resposta que não é JSON (ex.: rota que ainda não existe)
    }

    // Sessão expirou, foi encerrada ou o veterinário foi inativado: volta para o login
    const rotaDeLogin = caminho.startsWith('/auth/login') || caminho.startsWith('/auth/confirmar')
        || caminho.startsWith('/auth/reenviar');
    if (!rotaDeLogin && (resposta.status === 401 || (resposta.status === 403 && dados && dados.codigo === 'VETERINARIO_INATIVO'))) {
        limparSessao();
        window.location.href = 'index.html?sessao=expirada';
        throw new Error('Sessão encerrada. Faça login de novo.');
    }

    if (!resposta.ok) {
        const mensagem = dados && dados.mensagem
            ? dados.mensagem
            : resposta.status === 404 ? 'Rota não encontrada na API (ainda não foi implementada?).'
                : `Erro ${resposta.status} na API.`;
        const erro = new Error(mensagem);
        erro.status = resposta.status;
        erro.codigo = dados && dados.codigo;
        throw erro;
    }
    return dados;
}
