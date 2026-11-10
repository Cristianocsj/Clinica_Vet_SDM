// Funções usadas por todas as telas: menu, mensagens, formatação e validações.

// ---------------------------------------------------------------------------
// Login obrigatório e menu
// ---------------------------------------------------------------------------

// Telas internas chamam no início: sem login, volta para a tela de login.
function exigirLogin() {
    const sessao = lerSessao();
    if (!sessao) {
        window.location.href = 'index.html';
        // Para o resto do script desta tela (é esperado aparecer no console)
        throw new Error('Sem login: voltando para a tela de login.');
    }
    return sessao;
}

const PAGINAS_MENU = [
    ['painel.html', 'Início'],
    ['tutores.html', 'Tutores'],
    ['animais.html', 'Animais'],
    ['vacinas.html', 'Doses'],
    ['integracoes.html', 'Governo'],
    ['veterinarios.html', 'Veterinários'],
    ['especies.html', 'Espécies'],
];

function montarMenu() {
    const sessao = exigirLogin();
    const atual = window.location.pathname.split('/').pop() || 'painel.html';
    const links = PAGINAS_MENU.map(([pagina, nome]) => `
        <li class="nav-item">
            <a class="nav-link text-nowrap ${pagina === atual ? 'active' : ''}" href="${pagina}">${nome}</a>
        </li>`).join('');

    document.getElementById('menu').innerHTML = `
        <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
            <div class="container">
                <a class="navbar-brand" href="painel.html">Clínica Vet</a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menuLinks"
                        aria-label="Abrir menu">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="menuLinks">
                    <ul class="navbar-nav me-auto">${links}</ul>
                    <span class="navbar-text text-white me-3 text-truncate nome-logado">${escapar(sessao.veterinario.nome)}</span>
                    <button id="botaoSair" class="btn btn-outline-light btn-sm">Sair</button>
                </div>
            </div>
        </nav>`;

    document.getElementById('botaoSair').addEventListener('click', async () => {
        try {
            await api('POST', '/auth/logout');
        } catch (erro) {
            // mesmo se a API não responder, sai do navegador
        }
        limparSessao();
        window.location.href = 'index.html';
    });
}

// ---------------------------------------------------------------------------
// Mensagens na tela
// ---------------------------------------------------------------------------

// tipo: success, danger, warning, info
function mostrarMensagem(texto, tipo = 'danger', idArea = 'mensagens') {
    const area = document.getElementById(idArea);
    if (!area) return alert(texto);
    area.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${escapar(texto)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
        </div>`;
    area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function limparMensagem(idArea = 'mensagens') {
    const area = document.getElementById(idArea);
    if (area) area.innerHTML = '';
}

// Evita que um texto vindo do banco vire HTML (ex.: nome com "<script>")
function escapar(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

function formatarData(data) {
    if (!data) return '';
    const [ano, mes, dia] = data.slice(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(dataHora) {
    if (!dataHora) return '';
    return `${formatarData(dataHora)} ${dataHora.slice(11, 16)}`;
}

function formatarCpf(cpf) {
    const n = somenteNumeros(cpf);
    return n.length === 11 ? `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}` : (cpf || '');
}

function formatarCep(cep) {
    const n = somenteNumeros(cep);
    return n.length === 8 ? `${n.slice(0, 5)}-${n.slice(5)}` : (cep || '');
}

function somenteNumeros(valor) {
    return String(valor || '').replace(/\D/g, '');
}

// Cor da etiqueta conforme a situação
function etiquetaSituacao(situacao) {
    const cores = {
        ativo: 'success', inativo: 'secondary',
        realizada: 'success', agendada: 'info', cancelada: 'secondary', nao_compareceu: 'warning',
        aplicada: 'success',
        pendente: 'warning', enviada: 'info', confirmada: 'success', com_falha: 'danger',
        prevista: 'info', atrasada: 'danger', substituido: 'secondary',
    };
    const textos = { nao_compareceu: 'não compareceu', com_falha: 'com falha', substituido: 'substituído' };
    const texto = textos[situacao] || situacao;
    return `<span class="badge text-bg-${cores[situacao] || 'secondary'}">${escapar(texto)}</span>`;
}

// ---------------------------------------------------------------------------
// Validações (as mesmas regras da API: o navegador avisa antes de enviar)
// ---------------------------------------------------------------------------

function cpfValido(cpf) {
    const n = somenteNumeros(cpf);
    if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
    for (const tamanho of [9, 10]) {
        let soma = 0;
        for (let i = 0; i < tamanho; i++) soma += Number(n[i]) * (tamanho + 1 - i);
        const digito = (soma * 10) % 11 % 10;
        if (digito !== Number(n[tamanho])) return false;
    }
    return true;
}

function cepValido(cep) {
    return somenteNumeros(cep).length === 8;
}

function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Microchip ISO 11784: exatamente 15 números
function microchipValido(codigo) {
    return /^\d{15}$/.test(String(codigo || '').replace(/[\s-]/g, ''));
}

function hojeISO() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// Formulários e telas
// ---------------------------------------------------------------------------

// Lê os campos do formulário (pelo "name") e devolve um objeto com os textos sem espaços nas pontas
function lerFormulario(formulario) {
    const dados = {};
    for (const [campo, valor] of new FormData(formulario).entries()) {
        dados[campo] = typeof valor === 'string' ? valor.trim() : valor;
    }
    return dados;
}

// Preenche os campos do formulário com os valores do objeto (mesmos nomes)
function preencherFormulario(formulario, dados) {
    for (const [campo, valor] of Object.entries(dados)) {
        const elemento = formulario.elements.namedItem(campo);
        if (elemento && elemento.type !== 'radio') elemento.value = valor === null || valor === undefined ? '' : valor;
    }
}

// Texto vazio vira null (para a API entender "sem valor")
function vazioParaNull(valor) {
    return valor === '' || valor === undefined ? null : valor;
}

function parametroDaUrl(nome) {
    return new URLSearchParams(window.location.search).get(nome);
}

// Linha de tabela com uma mensagem (carregando, nenhum registro...)
function linhaAviso(colunas, texto) {
    return `<tr><td colspan="${colunas}" class="text-center text-muted py-3">${escapar(texto)}</td></tr>`;
}

// Desliga o botão enquanto espera a API (evita clique duplo)
async function comBotaoOcupado(botao, funcao) {
    const textoOriginal = botao.innerHTML;
    botao.disabled = true;
    botao.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Aguarde...';
    try {
        return await funcao();
    } finally {
        botao.disabled = false;
        botao.innerHTML = textoOriginal;
    }
}
