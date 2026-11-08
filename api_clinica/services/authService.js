// Login do veterinário e controle das sessões (tokens).
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db } = require('../database/conexao');
const { ErroApi } = require('../utils/erroApi');

// Tempo de vida de uma sessão: 8 horas (um turno de trabalho)
const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000;

// Sessões ativas: token -> { idVeterinario, expiraEm }
// Ficam na memória do servidor: reiniciar a API desconecta todo mundo.
const sessoes = new Map();

// Hash usado quando o e-mail não existe, para o login demorar o mesmo tempo
// nos dois casos (assim não dá para descobrir quais e-mails estão cadastrados).
const HASH_FALSO = bcrypt.hashSync('senha-que-nao-existe', 10);

const buscarPorEmail = db.prepare(`
    SELECT VETE_ID_VETERINARIO     AS id,
           VETE_NM_VETERINARIO     AS nome,
           VETE_DS_EMAIL           AS email,
           VETE_DS_HASH_SENHA      AS hashSenha,
           VETE_FL_INDICADOR_SENHA AS senhaConfirmada,
           VETE_DS_STATUS          AS status
      FROM VET_VETERINARIO
     WHERE lower(VETE_DS_EMAIL) = lower(?)
`);

const buscarPorId = db.prepare(`
    SELECT VETE_ID_VETERINARIO AS id,
           VETE_NM_VETERINARIO AS nome,
           VETE_DS_EMAIL       AS email,
           VETE_DS_STATUS      AS status
      FROM VET_VETERINARIO
     WHERE VETE_ID_VETERINARIO = ?
`);

const atualizarUltimoAcesso = db.prepare(`
    UPDATE VET_VETERINARIO
       SET VETE_DT_HR_ULTIMO_ACESSO = datetime('now', 'localtime')
     WHERE VETE_ID_VETERINARIO = ?
`);

// Ordem das verificações:
//   1. e-mail e senha corretos   -> senão 401 (mesma mensagem para os dois casos)
//   2. veterinário ativo         -> senão 403 VETERINARIO_INATIVO
//   3. senha confirmada          -> senão 403 SENHA_NAO_CONFIRMADA
// A senha é conferida ANTES da situação: assim só quem sabe a senha
// descobre se o cadastro está inativo ou pendente.
function login(email, senha) {
    if (typeof email !== 'string' || !email.trim() || typeof senha !== 'string' || !senha) {
        throw new ErroApi(400, 'DADOS_INVALIDOS', 'Informe o e-mail e a senha.');
    }

    const vet = buscarPorEmail.get(email.trim());
    const senhaConfere = bcrypt.compareSync(senha, vet ? vet.hashSenha : HASH_FALSO);

    if (!vet || !senhaConfere) {
        throw new ErroApi(401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.');
    }
    if (vet.status !== 'ativo') {
        throw new ErroApi(403, 'VETERINARIO_INATIVO', 'Acesso bloqueado: veterinário inativo.');
    }
    if (vet.senhaConfirmada !== 1) {
        throw new ErroApi(403, 'SENHA_NAO_CONFIRMADA',
            'Acesso bloqueado: a senha ainda não foi confirmada. Use o código de confirmação.');
    }

    atualizarUltimoAcesso.run(vet.id);

    const token = crypto.randomBytes(32).toString('hex');
    const expiraEm = Date.now() + DURACAO_SESSAO_MS;
    sessoes.set(token, { idVeterinario: vet.id, expiraEm });

    return {
        token,
        tipo: 'Bearer',
        expiraEm: new Date(expiraEm).toISOString(),
        veterinario: { id: vet.id, nome: vet.nome, email: vet.email },
    };
}

// Confere o token de uma requisição e devolve o veterinário logado.
// Também barra quem foi inativado depois de ter feito login.
function validarSessao(token) {
    const sessao = sessoes.get(token);
    if (!sessao || sessao.expiraEm < Date.now()) {
        sessoes.delete(token);
        throw new ErroApi(401, 'SESSAO_INVALIDA', 'Sessão inválida ou expirada. Faça login novamente.');
    }

    const vet = buscarPorId.get(sessao.idVeterinario);
    if (!vet || vet.status !== 'ativo') {
        sessoes.delete(token);
        throw new ErroApi(403, 'VETERINARIO_INATIVO', 'Acesso bloqueado: veterinário inativo.');
    }

    return { id: vet.id, nome: vet.nome, email: vet.email };
}

module.exports = { login, validarSessao };
