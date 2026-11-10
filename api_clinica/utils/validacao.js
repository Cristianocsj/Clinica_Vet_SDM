// Funções de validação usadas no registro de consultas e vacinas.
// Cada função recebe a lista "erros" e acrescenta uma mensagem quando o campo está errado,
// para a API devolver todos os problemas de uma vez.
const { ErroApi } = require('./erroApi');

// Data/hora local no formato do banco: "AAAA-MM-DD HH:MM:SS"
function agoraLocal() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function hojeLocal() {
    return agoraLocal().slice(0, 10);
}

// Confere se a data existe de verdade (ex.: 2026-02-30 não existe)
function dataExiste(ano, mes, dia) {
    const d = new Date(Date.UTC(ano, mes - 1, dia));
    return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

// Texto obrigatório ou opcional, com tamanho máximo. Devolve o texto limpo (ou null).
function texto(erros, corpo, campo, { obrigatorio = false, max = 4000 } = {}) {
    const valor = corpo[campo];
    if (valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '')) {
        if (obrigatorio) erros.push(`${campo}: obrigatório`);
        return null;
    }
    if (typeof valor !== 'string') {
        erros.push(`${campo}: deve ser texto`);
        return null;
    }
    const limpo = valor.trim();
    if (limpo.length > max) erros.push(`${campo}: no máximo ${max} caracteres`);
    return limpo;
}

// Número opcional dentro de um intervalo (aceita "12,5" ou 12.5)
function numero(erros, corpo, campo, { min, max, mensagem }) {
    const valor = corpo[campo];
    if (valor === undefined || valor === null || valor === '') return null;
    const n = typeof valor === 'string' ? Number(valor.replace(',', '.')) : valor;
    if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) {
        erros.push(`${campo}: ${mensagem}`);
        return null;
    }
    return n;
}

// Data "AAAA-MM-DD". Devolve a string ou null.
function data(erros, corpo, campo, { obrigatorio = false } = {}) {
    const valor = corpo[campo];
    if (valor === undefined || valor === null || valor === '') {
        if (obrigatorio) erros.push(`${campo}: obrigatória (AAAA-MM-DD)`);
        return null;
    }
    const m = typeof valor === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
    if (!m || !dataExiste(+m[1], +m[2], +m[3])) {
        erros.push(`${campo}: data inválida, use AAAA-MM-DD`);
        return null;
    }
    return valor.trim();
}

// Data e hora "AAAA-MM-DD HH:MM" (ou com T no meio, ou com segundos).
// Devolve no formato do banco "AAAA-MM-DD HH:MM:SS".
function dataHora(erros, corpo, campo) {
    const valor = corpo[campo];
    if (valor === undefined || valor === null || valor === '') return null;
    const m = typeof valor === 'string' &&
        /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(valor.trim());
    if (!m || !dataExiste(+m[1], +m[2], +m[3]) || +m[4] > 23 || +m[5] > 59 || +(m[6] || 0) > 59) {
        erros.push(`${campo}: data/hora inválida, use AAAA-MM-DD HH:MM`);
        return null;
    }
    return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6] || '00'}`;
}

// Valor que precisa estar numa lista (ex.: situação)
function opcao(erros, corpo, campo, opcoes, padrao) {
    const valor = corpo[campo];
    if (valor === undefined || valor === null || valor === '') return padrao;
    if (!opcoes.includes(valor)) {
        erros.push(`${campo}: use ${opcoes.map((o) => `"${o}"`).join(', ')}`);
        return padrao;
    }
    return valor;
}

// Id inteiro positivo (de rota ou do corpo)
function id(valor, nome) {
    const n = typeof valor === 'string' && /^\d+$/.test(valor) ? Number(valor) : valor;
    if (!Number.isInteger(n) || n <= 0) {
        throw new ErroApi(400, 'ID_INVALIDO', `${nome}: deve ser um número inteiro positivo.`);
    }
    return n;
}

function lancarSeHouverErros(erros) {
    if (erros.length) throw new ErroApi(400, 'DADOS_INVALIDOS', 'Dados inválidos: ' + erros.join('; '));
}

module.exports = { agoraLocal, hojeLocal, texto, numero, data, dataHora, opcao, id, lancarSeHouverErros };
