// Cadastro de veterinários: criar, consultar, alterar e inativar.
// A senha é guardada só como hash bcrypt e NUNCA volta nas respostas.
const bcrypt = require('bcryptjs');
const { db, transacao } = require('../database/conexao');
const { ErroApi } = require('../utils/erroApi');
const { validarCPF } = require('../utils/validadorCpf');
const { gerarCodigoConfirmacao, encerrarSessoesDoVeterinario } = require('./authService');

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const TAMANHO_MINIMO_SENHA = 8;

// Colunas devolvidas pela API (sem hash de senha e sem código de confirmação)
const COLUNAS = `
    VETE_ID_VETERINARIO      AS id,
    VETE_NM_VETERINARIO      AS nome,
    VETE_NR_CPF              AS cpf,
    VETE_NR_CRMV             AS crmv,
    VETE_SG_UF_CRMV          AS ufCrmv,
    VETE_DS_EMAIL            AS email,
    VETE_NR_TELEFONE         AS telefone,
    VETE_FL_INDICADOR_SENHA  AS senhaConfirmada,
    VETE_DS_STATUS           AS status,
    VETE_DT_CADASTRO         AS dataCadastro,
    VETE_DT_HR_CONFIRMACAO   AS dataConfirmacaoSenha,
    VETE_DT_HR_ULTIMO_ACESSO AS ultimoAcesso`;

const sqlBuscarPorId = db.prepare(`SELECT ${COLUNAS} FROM VET_VETERINARIO WHERE VETE_ID_VETERINARIO = ?`);
const sqlListarTodos = db.prepare(`SELECT ${COLUNAS} FROM VET_VETERINARIO ORDER BY VETE_NM_VETERINARIO`);
const sqlListarPorStatus = db.prepare(`SELECT ${COLUNAS} FROM VET_VETERINARIO WHERE VETE_DS_STATUS = ? ORDER BY VETE_NM_VETERINARIO`);

const sqlInserir = db.prepare(`
    INSERT INTO VET_VETERINARIO
        (VETE_NM_VETERINARIO, VETE_NR_CPF, VETE_NR_CRMV, VETE_SG_UF_CRMV,
         VETE_DS_EMAIL, VETE_NR_TELEFONE, VETE_DS_HASH_SENHA)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const sqlAlterar = db.prepare(`
    UPDATE VET_VETERINARIO
       SET VETE_NM_VETERINARIO = ?,
           VETE_NR_CPF         = ?,
           VETE_NR_CRMV        = ?,
           VETE_SG_UF_CRMV     = ?,
           VETE_DS_EMAIL       = ?,
           VETE_NR_TELEFONE    = ?
     WHERE VETE_ID_VETERINARIO = ?
`);

// Senha nova volta a ficar "não confirmada" até o veterinário usar o novo código
const sqlTrocarSenha = db.prepare(`
    UPDATE VET_VETERINARIO
       SET VETE_DS_HASH_SENHA      = ?,
           VETE_FL_INDICADOR_SENHA = 0,
           VETE_DT_HR_CONFIRMACAO  = NULL
     WHERE VETE_ID_VETERINARIO = ?
`);

const sqlInativar = db.prepare(`
    UPDATE VET_VETERINARIO SET VETE_DS_STATUS = 'inativo' WHERE VETE_ID_VETERINARIO = ?
`);

// Conferência de duplicados (ignora o próprio registro na alteração)
const sqlCpfEmUso = db.prepare(`SELECT 1 FROM VET_VETERINARIO WHERE VETE_NR_CPF = ? AND VETE_ID_VETERINARIO <> ?`);
const sqlEmailEmUso = db.prepare(`SELECT 1 FROM VET_VETERINARIO WHERE lower(VETE_DS_EMAIL) = lower(?) AND VETE_ID_VETERINARIO <> ?`);
const sqlCrmvEmUso = db.prepare(`SELECT 1 FROM VET_VETERINARIO WHERE VETE_SG_UF_CRMV = ? AND VETE_NR_CRMV = ? AND VETE_ID_VETERINARIO <> ?`);

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

function texto(valor) {
    return typeof valor === 'string' ? valor.trim() : valor;
}

// Recebe o corpo da requisição e devolve os campos limpos.
// "parcial = true" (alteração): só valida o que foi enviado.
function validarDados(corpo, parcial) {
    const erros = [];
    const dados = {};
    const enviado = (campo) => corpo[campo] !== undefined;

    if (!parcial || enviado('nome')) {
        dados.nome = texto(corpo.nome);
        if (typeof dados.nome !== 'string' || dados.nome.length < 3 || dados.nome.length > 150) {
            erros.push('nome: obrigatório, de 3 a 150 caracteres');
        }
    }
    if (!parcial || enviado('cpf')) {
        dados.cpf = typeof corpo.cpf === 'string' ? corpo.cpf.replace(/\D/g, '') : '';
        if (!validarCPF(dados.cpf)) erros.push('cpf: CPF inválido');
    }
    if (!parcial || enviado('crmv')) {
        dados.crmv = typeof corpo.crmv === 'string' || typeof corpo.crmv === 'number'
            ? String(corpo.crmv).replace(/\D/g, '') : '';
        if (dados.crmv.length < 1 || dados.crmv.length > 10) erros.push('crmv: obrigatório, só números (até 10 dígitos)');
    }
    if (!parcial || enviado('ufCrmv')) {
        dados.ufCrmv = typeof corpo.ufCrmv === 'string' ? corpo.ufCrmv.trim().toUpperCase() : '';
        if (!UFS.includes(dados.ufCrmv)) erros.push('ufCrmv: sigla de UF inválida');
    }
    if (!parcial || enviado('email')) {
        dados.email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase() : '';
        if (dados.email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) {
            erros.push('email: e-mail inválido');
        }
    }
    if (enviado('telefone')) {
        dados.telefone = corpo.telefone === null || corpo.telefone === '' ? null : texto(corpo.telefone);
        if (dados.telefone !== null && (typeof dados.telefone !== 'string' || !/^[\d\s()+-]{8,20}$/.test(dados.telefone))) {
            erros.push('telefone: use só números, espaços, parênteses, + e - (8 a 20 caracteres)');
        }
    } else if (!parcial) {
        dados.telefone = null;
    }
    if (!parcial || enviado('senha')) {
        dados.senha = corpo.senha;
        if (typeof dados.senha !== 'string' || dados.senha.length < TAMANHO_MINIMO_SENHA || dados.senha.length > 72) {
            erros.push(`senha: obrigatória, de ${TAMANHO_MINIMO_SENHA} a 72 caracteres`);
        }
    }

    if (erros.length) {
        const erro = new ErroApi(400, 'DADOS_INVALIDOS', 'Dados inválidos: ' + erros.join('; '));
        throw erro;
    }
    return dados;
}

// CPF, e-mail e CRMV+UF não podem se repetir (idProprio = 0 no cadastro)
function conferirDuplicados(dados, idProprio) {
    if (sqlCpfEmUso.get(dados.cpf, idProprio)) {
        throw new ErroApi(409, 'CPF_JA_CADASTRADO', 'Já existe um veterinário com este CPF.');
    }
    if (sqlEmailEmUso.get(dados.email, idProprio)) {
        throw new ErroApi(409, 'EMAIL_JA_CADASTRADO', 'Já existe um veterinário com este e-mail.');
    }
    if (sqlCrmvEmUso.get(dados.ufCrmv, dados.crmv, idProprio)) {
        throw new ErroApi(409, 'CRMV_JA_CADASTRADO', 'Já existe um veterinário com este CRMV nesta UF.');
    }
}

function lerId(id) {
    const numero = Number(id);
    if (!Number.isInteger(numero) || numero <= 0) {
        throw new ErroApi(400, 'ID_INVALIDO', 'O id do veterinário deve ser um número inteiro positivo.');
    }
    return numero;
}

// O banco devolve 0/1; na API fica true/false
function formatar(vet) {
    return { ...vet, senhaConfirmada: vet.senhaConfirmada === 1 };
}

// ---------------------------------------------------------------------------
// Operações
// ---------------------------------------------------------------------------

function buscar(id) {
    const vet = sqlBuscarPorId.get(lerId(id));
    if (!vet) throw new ErroApi(404, 'VETERINARIO_NAO_ENCONTRADO', 'Veterinário não encontrado.');
    return formatar(vet);
}

function listar(status) {
    if (status === undefined) return sqlListarTodos.all().map(formatar);
    if (status !== 'ativo' && status !== 'inativo') {
        throw new ErroApi(400, 'DADOS_INVALIDOS', 'status: use "ativo" ou "inativo".');
    }
    return sqlListarPorStatus.all(status).map(formatar);
}

// Cadastro: nasce ativo e com a senha NÃO confirmada.
// O código de confirmação aparece no console da API.
function criar(corpo) {
    const dados = validarDados(corpo || {}, false);
    conferirDuplicados(dados, 0);

    const hash = bcrypt.hashSync(dados.senha, 10);
    const id = transacao(() => {
        const resultado = sqlInserir.run(dados.nome, dados.cpf, dados.crmv, dados.ufCrmv,
            dados.email, dados.telefone, hash);
        const novoId = Number(resultado.lastInsertRowid);
        gerarCodigoConfirmacao(novoId, dados.email);
        return novoId;
    });
    return buscar(id);
}

// Alteração parcial: só os campos enviados mudam.
// Trocar a senha obriga a confirmar de novo e derruba as sessões abertas.
function alterar(id, corpo) {
    const atual = buscar(id);
    const novos = validarDados(corpo || {}, true);
    if (Object.keys(novos).length === 0) {
        throw new ErroApi(400, 'DADOS_INVALIDOS', 'Nenhum campo para alterar foi enviado.');
    }
    if (atual.status !== 'ativo') {
        throw new ErroApi(409, 'VETERINARIO_INATIVO', 'Não é possível alterar um veterinário inativo.');
    }

    const dados = { ...atual, ...novos };
    conferirDuplicados(dados, atual.id);

    transacao(() => {
        sqlAlterar.run(dados.nome, dados.cpf, dados.crmv, dados.ufCrmv, dados.email, dados.telefone, atual.id);
        if (novos.senha !== undefined) {
            sqlTrocarSenha.run(bcrypt.hashSync(novos.senha, 10), atual.id);
            gerarCodigoConfirmacao(atual.id, dados.email);
        }
    });
    if (novos.senha !== undefined) encerrarSessoesDoVeterinario(atual.id);

    return buscar(atual.id);
}

// Inativação (não apaga: consultas e vacinas continuam ligadas a ele).
function inativar(id, idLogado) {
    const vet = buscar(id);
    if (vet.id === idLogado) {
        throw new ErroApi(409, 'AUTO_INATIVACAO', 'Você não pode inativar o seu próprio cadastro.');
    }
    if (vet.status === 'inativo') {
        throw new ErroApi(409, 'VETERINARIO_JA_INATIVO', 'Este veterinário já está inativo.');
    }
    sqlInativar.run(vet.id);
    encerrarSessoesDoVeterinario(vet.id);
    return buscar(vet.id);
}

module.exports = { listar, buscar, criar, alterar, inativar };
