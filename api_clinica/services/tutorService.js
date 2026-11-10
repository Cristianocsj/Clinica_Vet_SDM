// Cadastro de tutores (donos dos animais) e do endereço de cada um.
// O frontend busca o CEP em GET /api/cep/:cep (ViaCEP), preenche o endereço e
// a pessoa pode completar à mão. Aqui só validamos e gravamos.
// Exclusão é lógica: o DELETE só inativa (os animais e o histórico continuam).
const { db, transacao } = require('../database/conexao');
const { ErroApi } = require('../utils/erroApi');
const { validarCPF } = require('../utils/validadorCpf');
const v = require('../utils/validacao');

// Mesma lista usada no cadastro de veterinários
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const COLUNAS = `
    t.TUTO_ID_TUTOR       AS id,
    t.TUTO_NM_TUTOR       AS nome,
    t.TUTO_NR_CPF         AS cpf,
    t.TUTO_NR_TELEFONE    AS telefone,
    t.TUTO_DS_EMAIL       AS email,
    t.TUTO_DT_NASCIMENTO  AS dataNascimento,
    t.TUTO_DT_CADASTRO    AS dataCadastro,
    t.TUTO_DS_SITUACAO    AS situacao,
    e.ENDE_ID_ENDERECO    AS enderecoId,
    e.ENDE_NR_CEP         AS cep,
    e.ENDE_DS_LOGRADOURO  AS logradouro,
    e.ENDE_NR_ENDERECO    AS numero,
    e.ENDE_DS_COMPLEMENTO AS complemento,
    e.ENDE_NM_BAIRRO      AS bairro,
    e.ENDE_NM_CIDADE      AS cidade,
    e.ENDE_SG_UF          AS uf,
    e.ENDE_CD_IBGE        AS codigoIbge`;

const JUNCOES = `
      FROM VET_TUTOR t
      JOIN VET_ENDERECO e ON e.ENDE_ID_ENDERECO = t.ENDE_ID_ENDERECO`;

const sqlBuscar = db.prepare(`SELECT ${COLUNAS} ${JUNCOES} WHERE t.TUTO_ID_TUTOR = ?`);

// Busca por parte do nome ou do CPF (só números)
const sqlListar = db.prepare(`
    SELECT ${COLUNAS},
           (SELECT COUNT(*) FROM VET_ANIMAL a
             WHERE a.TUTO_ID_TUTOR = t.TUTO_ID_TUTOR AND a.ANIM_DS_SITUACAO = 'ativo') AS qtdAnimaisAtivos
      ${JUNCOES}
     WHERE (:situacao IS NULL OR t.TUTO_DS_SITUACAO = :situacao)
       AND (:busca IS NULL
            OR t.TUTO_NM_TUTOR LIKE '%' || :busca || '%'
            OR (:buscaCpf IS NOT NULL AND t.TUTO_NR_CPF LIKE '%' || :buscaCpf || '%'))
     ORDER BY t.TUTO_NM_TUTOR
`);

const sqlAnimaisDoTutor = db.prepare(`
    SELECT a.ANIM_ID_ANIMAL   AS id,
           a.ANIM_NM_ANIMAL   AS nome,
           es.ESPE_NM_ESPECIE AS especie,
           r.RACA_NM_RACA     AS raca,
           a.ANIM_DS_SITUACAO AS situacao
      FROM VET_ANIMAL a
      JOIN VET_ESPECIE es ON es.ESPE_ID_ESPECIE = a.ESPE_ID_ESPECIE
      LEFT JOIN VET_RACA r ON r.RACA_ID_RACA = a.RACA_ID_RACA
     WHERE a.TUTO_ID_TUTOR = ?
     ORDER BY a.ANIM_NM_ANIMAL
`);

const sqlInserirEndereco = db.prepare(`
    INSERT INTO VET_ENDERECO
        (ENDE_NR_CEP, ENDE_DS_LOGRADOURO, ENDE_NR_ENDERECO, ENDE_DS_COMPLEMENTO,
         ENDE_NM_BAIRRO, ENDE_NM_CIDADE, ENDE_SG_UF, ENDE_CD_IBGE)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const sqlAlterarEndereco = db.prepare(`
    UPDATE VET_ENDERECO
       SET ENDE_NR_CEP         = ?,
           ENDE_DS_LOGRADOURO  = ?,
           ENDE_NR_ENDERECO    = ?,
           ENDE_DS_COMPLEMENTO = ?,
           ENDE_NM_BAIRRO      = ?,
           ENDE_NM_CIDADE      = ?,
           ENDE_SG_UF          = ?,
           ENDE_CD_IBGE        = ?
     WHERE ENDE_ID_ENDERECO = ?
`);

const sqlInserir = db.prepare(`
    INSERT INTO VET_TUTOR
        (ENDE_ID_ENDERECO, TUTO_NM_TUTOR, TUTO_NR_CPF, TUTO_NR_TELEFONE, TUTO_DS_EMAIL, TUTO_DT_NASCIMENTO)
    VALUES (?, ?, ?, ?, ?, ?)
`);

const sqlAlterar = db.prepare(`
    UPDATE VET_TUTOR
       SET TUTO_NM_TUTOR      = ?,
           TUTO_NR_CPF        = ?,
           TUTO_NR_TELEFONE   = ?,
           TUTO_DS_EMAIL      = ?,
           TUTO_DT_NASCIMENTO = ?
     WHERE TUTO_ID_TUTOR = ?
`);

const sqlInativar = db.prepare(`UPDATE VET_TUTOR SET TUTO_DS_SITUACAO = 'inativo' WHERE TUTO_ID_TUTOR = ?`);

// CPF não pode repetir (ignora o próprio registro na alteração)
const sqlCpfEmUso = db.prepare(`SELECT 1 FROM VET_TUTOR WHERE TUTO_NR_CPF = ? AND TUTO_ID_TUTOR <> ?`);

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

function textoOpcional(erros, valor, campo, max) {
    if (valor === undefined || valor === null) return null;
    if (typeof valor !== 'string') {
        erros.push(`${campo}: deve ser texto`);
        return null;
    }
    const limpo = valor.trim();
    if (limpo.length > max) erros.push(`${campo}: no máximo ${max} caracteres`);
    return limpo === '' ? null : limpo;
}

// Endereço completo (no cadastro) ou já misturado com o atual (na alteração)
function validarEndereco(erros, end) {
    if (!end || typeof end !== 'object' || Array.isArray(end)) {
        erros.push('endereco: obrigatório (cep, cidade, uf e o que mais tiver)');
        return null;
    }
    const dados = {
        cep: typeof end.cep === 'string' || typeof end.cep === 'number' ? String(end.cep).replace(/\D/g, '') : '',
        logradouro: textoOpcional(erros, end.logradouro, 'endereco.logradouro', 200),
        numero: textoOpcional(erros, end.numero, 'endereco.numero', 10),
        complemento: textoOpcional(erros, end.complemento, 'endereco.complemento', 100),
        bairro: textoOpcional(erros, end.bairro, 'endereco.bairro', 100),
        cidade: textoOpcional(erros, end.cidade, 'endereco.cidade', 100),
        uf: typeof end.uf === 'string' ? end.uf.trim().toUpperCase() : '',
        codigoIbge: end.codigoIbge === undefined || end.codigoIbge === null || end.codigoIbge === ''
            ? null : String(end.codigoIbge).trim(),
    };
    if (dados.cep.length !== 8) erros.push('endereco.cep: deve ter 8 números');
    if (!dados.cidade) erros.push('endereco.cidade: obrigatória');
    if (!UFS.includes(dados.uf)) erros.push('endereco.uf: sigla de UF inválida');
    if (dados.codigoIbge !== null && !/^\d{7}$/.test(dados.codigoIbge)) {
        erros.push('endereco.codigoIbge: deve ter 7 números');
    }
    return dados;
}

// Recebe o corpo da requisição e devolve os campos limpos.
// "parcial = true" (alteração): só valida o que foi enviado.
function validarDados(corpo, parcial) {
    const erros = [];
    const dados = {};
    const enviado = (campo) => corpo[campo] !== undefined;

    if (!parcial || enviado('nome')) {
        dados.nome = typeof corpo.nome === 'string' ? corpo.nome.trim() : '';
        if (dados.nome.length < 3 || dados.nome.length > 150) erros.push('nome: obrigatório, de 3 a 150 caracteres');
    }
    if (!parcial || enviado('cpf')) {
        dados.cpf = typeof corpo.cpf === 'string' ? corpo.cpf.replace(/\D/g, '') : '';
        if (!validarCPF(dados.cpf)) erros.push('cpf: CPF inválido');
    }
    if (!parcial || enviado('telefone')) {
        dados.telefone = textoOpcional(erros, corpo.telefone, 'telefone', 20);
        if (dados.telefone !== null && !/^[\d\s()+-]{8,20}$/.test(dados.telefone)) {
            erros.push('telefone: use só números, espaços, parênteses, + e - (8 a 20 caracteres)');
        }
    }
    if (!parcial || enviado('email')) {
        dados.email = textoOpcional(erros, corpo.email, 'email', 150);
        if (dados.email !== null) {
            dados.email = dados.email.toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) erros.push('email: e-mail inválido');
        }
    }
    if (!parcial || enviado('dataNascimento')) {
        dados.dataNascimento = v.data(erros, corpo, 'dataNascimento');
        if (dados.dataNascimento && dados.dataNascimento > v.hojeLocal()) {
            erros.push('dataNascimento: não pode estar no futuro');
        }
    }
    if (!parcial || enviado('endereco')) {
        dados.endereco = corpo.endereco; // validado depois (na alteração é misturado com o atual)
    }

    return { dados, erros };
}

function lerId(id) {
    return v.id(id, 'id do tutor');
}

function formatar(linha) {
    const { enderecoId, cep, logradouro, numero, complemento, bairro, cidade, uf, codigoIbge, ...tutor } = linha;
    return {
        ...tutor,
        endereco: { id: enderecoId, cep, logradouro, numero, complemento, bairro, cidade, uf, codigoIbge },
    };
}

// ---------------------------------------------------------------------------
// Operações
// ---------------------------------------------------------------------------

function buscarSemAnimais(id) {
    const tutor = sqlBuscar.get(lerId(id));
    if (!tutor) throw new ErroApi(404, 'TUTOR_NAO_ENCONTRADO', 'Tutor não encontrado.');
    return formatar(tutor);
}

// GET /api/tutores/:id  -> tutor, endereço e animais
function buscar(id) {
    const tutor = buscarSemAnimais(id);
    return { ...tutor, animais: sqlAnimaisDoTutor.all(tutor.id) };
}

// GET /api/tutores?busca=...&situacao=ativo
function listar(query) {
    const erros = [];
    const situacao = v.opcao(erros, query, 'situacao', ['ativo', 'inativo'], null);
    v.lancarSeHouverErros(erros);
    const busca = typeof query.busca === 'string' && query.busca.trim() ? query.busca.trim() : null;
    const buscaCpf = busca && busca.replace(/\D/g, '') ? busca.replace(/\D/g, '') : null;
    return sqlListar.all({ situacao, busca, buscaCpf }).map(formatar);
}

// POST /api/tutores
function criar(corpo) {
    corpo = corpo || {};
    const { dados, erros } = validarDados(corpo, false);
    const endereco = validarEndereco(erros, dados.endereco);
    v.lancarSeHouverErros(erros);

    if (sqlCpfEmUso.get(dados.cpf, 0)) {
        throw new ErroApi(409, 'CPF_JA_CADASTRADO', 'Já existe um tutor com este CPF.');
    }

    const id = transacao(() => {
        const e = sqlInserirEndereco.run(endereco.cep, endereco.logradouro, endereco.numero, endereco.complemento,
            endereco.bairro, endereco.cidade, endereco.uf, endereco.codigoIbge);
        const t = sqlInserir.run(Number(e.lastInsertRowid), dados.nome, dados.cpf, dados.telefone,
            dados.email, dados.dataNascimento);
        return Number(t.lastInsertRowid);
    });
    return buscar(id);
}

// PUT /api/tutores/:id  (só os campos enviados mudam; o endereço enviado é misturado com o atual)
function alterar(id, corpo) {
    corpo = corpo || {};
    const atual = buscarSemAnimais(id);
    const { dados: novos, erros } = validarDados(corpo, true);
    if (Object.keys(novos).length === 0) {
        throw new ErroApi(400, 'DADOS_INVALIDOS', 'Nenhum campo para alterar foi enviado.');
    }
    const enviado = novos.endereco;
    const ehObjeto = enviado && typeof enviado === 'object' && !Array.isArray(enviado);
    const endereco = validarEndereco(erros, enviado === undefined ? atual.endereco
        : ehObjeto ? { ...atual.endereco, ...enviado } : enviado);
    v.lancarSeHouverErros(erros);

    if (atual.situacao !== 'ativo') {
        throw new ErroApi(409, 'TUTOR_INATIVO', 'Não é possível alterar um tutor inativo.');
    }
    const dados = { ...atual, ...novos };
    if (sqlCpfEmUso.get(dados.cpf, atual.id)) {
        throw new ErroApi(409, 'CPF_JA_CADASTRADO', 'Já existe um tutor com este CPF.');
    }

    transacao(() => {
        sqlAlterar.run(dados.nome, dados.cpf, dados.telefone, dados.email, dados.dataNascimento, atual.id);
        sqlAlterarEndereco.run(endereco.cep, endereco.logradouro, endereco.numero, endereco.complemento,
            endereco.bairro, endereco.cidade, endereco.uf, endereco.codigoIbge, atual.endereco.id);
    });
    return buscar(atual.id);
}

// DELETE /api/tutores/:id  -> INATIVA (não apaga do banco)
function inativar(id) {
    const tutor = buscarSemAnimais(id);
    if (tutor.situacao === 'inativo') {
        throw new ErroApi(409, 'TUTOR_JA_INATIVO', 'Este tutor já está inativo.');
    }
    sqlInativar.run(tutor.id);
    return buscar(tutor.id);
}

module.exports = { listar, buscar, criar, alterar, inativar };
