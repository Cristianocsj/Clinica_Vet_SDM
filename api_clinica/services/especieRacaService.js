// Catálogo de espécies e raças.
// - Nome da espécie é único; nome da raça é único DENTRO da espécie.
// - Toda espécie nova já ganha a raça "Sem raça definida" (igual ao clinica_seed.sql).
// - A espécie de uma raça não muda (os animais dependem dela: raça x espécie).
// - DELETE só inativa: espécie/raça inativa não entra em animal novo, mas o histórico continua.
const { db, transacao } = require('../database/conexao');
const { ErroApi } = require('../utils/erroApi');
const v = require('../utils/validacao');

const SEM_RACA_DEFINIDA = 'Sem raça definida';

// ---------------------------------------------------------------------------
// Espécies
// ---------------------------------------------------------------------------

const COLUNAS_ESPECIE = `
    ESPE_ID_ESPECIE  AS id,
    ESPE_NM_ESPECIE  AS nome,
    ESPE_DS_ESPECIE  AS descricao,
    ESPE_DS_SITUACAO AS situacao`;

const sqlBuscarEspecie = db.prepare(`SELECT ${COLUNAS_ESPECIE} FROM VET_ESPECIE WHERE ESPE_ID_ESPECIE = ?`);
const sqlListarEspecies = db.prepare(`
    SELECT ${COLUNAS_ESPECIE} FROM VET_ESPECIE
     WHERE (:situacao IS NULL OR ESPE_DS_SITUACAO = :situacao)
     ORDER BY ESPE_NM_ESPECIE
`);
const sqlNomeEspecieEmUso = db.prepare(`
    SELECT 1 FROM VET_ESPECIE WHERE lower(ESPE_NM_ESPECIE) = lower(?) AND ESPE_ID_ESPECIE <> ?
`);
const sqlInserirEspecie = db.prepare(`INSERT INTO VET_ESPECIE (ESPE_NM_ESPECIE, ESPE_DS_ESPECIE) VALUES (?, ?)`);
const sqlAlterarEspecie = db.prepare(`
    UPDATE VET_ESPECIE SET ESPE_NM_ESPECIE = ?, ESPE_DS_ESPECIE = ? WHERE ESPE_ID_ESPECIE = ?
`);
const sqlInativarEspecie = db.prepare(`UPDATE VET_ESPECIE SET ESPE_DS_SITUACAO = 'inativo' WHERE ESPE_ID_ESPECIE = ?`);

function buscarEspecie(id) {
    const especie = sqlBuscarEspecie.get(v.id(id, 'id da espécie'));
    if (!especie) throw new ErroApi(404, 'ESPECIE_NAO_ENCONTRADA', 'Espécie não encontrada.');
    return especie;
}

// GET /api/especies?situacao=ativo
function listarEspecies(query) {
    const erros = [];
    const situacao = v.opcao(erros, query, 'situacao', ['ativo', 'inativo'], null);
    v.lancarSeHouverErros(erros);
    return sqlListarEspecies.all({ situacao });
}

// POST /api/especies  { nome, descricao? }
function criarEspecie(corpo) {
    corpo = corpo || {};
    const erros = [];
    const nome = v.texto(erros, corpo, 'nome', { obrigatorio: true, max: 100 });
    const descricao = v.texto(erros, corpo, 'descricao', { max: 500 });
    v.lancarSeHouverErros(erros);
    if (sqlNomeEspecieEmUso.get(nome, 0)) {
        throw new ErroApi(409, 'ESPECIE_JA_CADASTRADA', 'Já existe uma espécie com este nome.');
    }

    const id = transacao(() => {
        const r = sqlInserirEspecie.run(nome, descricao);
        const idEspecie = Number(r.lastInsertRowid);
        sqlInserirRaca.run(idEspecie, SEM_RACA_DEFINIDA, null);
        return idEspecie;
    });
    return buscarEspecie(id);
}

// PUT /api/especies/:id  { nome?, descricao? }
function alterarEspecie(id, corpo) {
    corpo = corpo || {};
    const atual = buscarEspecie(id);
    const erros = [];
    const nome = corpo.nome === undefined ? atual.nome : v.texto(erros, corpo, 'nome', { obrigatorio: true, max: 100 });
    const descricao = corpo.descricao === undefined ? atual.descricao : v.texto(erros, corpo, 'descricao', { max: 500 });
    v.lancarSeHouverErros(erros);
    if (atual.situacao !== 'ativo') {
        throw new ErroApi(409, 'ESPECIE_INATIVA', 'Não é possível alterar uma espécie inativa.');
    }
    if (sqlNomeEspecieEmUso.get(nome, atual.id)) {
        throw new ErroApi(409, 'ESPECIE_JA_CADASTRADA', 'Já existe uma espécie com este nome.');
    }
    sqlAlterarEspecie.run(nome, descricao, atual.id);
    return buscarEspecie(atual.id);
}

// DELETE /api/especies/:id  -> INATIVA
function inativarEspecie(id) {
    const especie = buscarEspecie(id);
    if (especie.situacao === 'inativo') {
        throw new ErroApi(409, 'ESPECIE_JA_INATIVA', 'Esta espécie já está inativa.');
    }
    sqlInativarEspecie.run(especie.id);
    return buscarEspecie(especie.id);
}

// ---------------------------------------------------------------------------
// Raças
// ---------------------------------------------------------------------------

const COLUNAS_RACA = `
    r.RACA_ID_RACA     AS id,
    r.RACA_NM_RACA     AS nome,
    r.RACA_DS_RACA     AS descricao,
    r.RACA_DS_SITUACAO AS situacao,
    r.ESPE_ID_ESPECIE  AS especieId,
    e.ESPE_NM_ESPECIE  AS especieNome`;

const JUNCOES_RACA = `
      FROM VET_RACA r
      JOIN VET_ESPECIE e ON e.ESPE_ID_ESPECIE = r.ESPE_ID_ESPECIE`;

const sqlBuscarRaca = db.prepare(`SELECT ${COLUNAS_RACA} ${JUNCOES_RACA} WHERE r.RACA_ID_RACA = ?`);

// "Sem raça definida" aparece primeiro dentro de cada espécie
const sqlListarRacas = db.prepare(`
    SELECT ${COLUNAS_RACA} ${JUNCOES_RACA}
     WHERE (:especieId IS NULL OR r.ESPE_ID_ESPECIE = :especieId)
       AND (:situacao IS NULL OR r.RACA_DS_SITUACAO = :situacao)
     ORDER BY e.ESPE_NM_ESPECIE, r.RACA_NM_RACA <> '${SEM_RACA_DEFINIDA}', r.RACA_NM_RACA
`);
const sqlNomeRacaEmUso = db.prepare(`
    SELECT 1 FROM VET_RACA
     WHERE ESPE_ID_ESPECIE = ? AND lower(RACA_NM_RACA) = lower(?) AND RACA_ID_RACA <> ?
`);
const sqlInserirRaca = db.prepare(`INSERT INTO VET_RACA (ESPE_ID_ESPECIE, RACA_NM_RACA, RACA_DS_RACA) VALUES (?, ?, ?)`);
const sqlAlterarRaca = db.prepare(`UPDATE VET_RACA SET RACA_NM_RACA = ?, RACA_DS_RACA = ? WHERE RACA_ID_RACA = ?`);
const sqlInativarRaca = db.prepare(`UPDATE VET_RACA SET RACA_DS_SITUACAO = 'inativo' WHERE RACA_ID_RACA = ?`);

function buscarRaca(id) {
    const raca = sqlBuscarRaca.get(v.id(id, 'id da raça'));
    if (!raca) throw new ErroApi(404, 'RACA_NAO_ENCONTRADA', 'Raça não encontrada.');
    return raca;
}

// GET /api/racas?especieId=1&situacao=ativo
function listarRacas(query) {
    const erros = [];
    const situacao = v.opcao(erros, query, 'situacao', ['ativo', 'inativo'], null);
    v.lancarSeHouverErros(erros);
    const especieId = query.especieId === undefined ? null : v.id(query.especieId, 'especieId');
    return sqlListarRacas.all({ especieId, situacao });
}

// POST /api/racas  { nome, especieId, descricao? }
function criarRaca(corpo) {
    corpo = corpo || {};
    const especieId = v.id(corpo.especieId, 'especieId');
    const erros = [];
    const nome = v.texto(erros, corpo, 'nome', { obrigatorio: true, max: 100 });
    const descricao = v.texto(erros, corpo, 'descricao', { max: 500 });
    v.lancarSeHouverErros(erros);

    const especie = buscarEspecie(especieId);
    if (especie.situacao !== 'ativo') {
        throw new ErroApi(409, 'ESPECIE_INATIVA', 'Não é possível cadastrar raça em uma espécie inativa.');
    }
    if (sqlNomeRacaEmUso.get(especie.id, nome, 0)) {
        throw new ErroApi(409, 'RACA_JA_CADASTRADA', 'Já existe uma raça com este nome nesta espécie.');
    }
    const r = sqlInserirRaca.run(especie.id, nome, descricao);
    return buscarRaca(Number(r.lastInsertRowid));
}

// PUT /api/racas/:id  { nome?, descricao? }  (a espécie da raça não muda)
function alterarRaca(id, corpo) {
    corpo = corpo || {};
    const atual = buscarRaca(id);
    if (corpo.especieId !== undefined && Number(corpo.especieId) !== atual.especieId) {
        throw new ErroApi(400, 'DADOS_INVALIDOS',
            'especieId: a espécie de uma raça não pode ser trocada. Cadastre a raça na outra espécie.');
    }
    const erros = [];
    const nome = corpo.nome === undefined ? atual.nome : v.texto(erros, corpo, 'nome', { obrigatorio: true, max: 100 });
    const descricao = corpo.descricao === undefined ? atual.descricao : v.texto(erros, corpo, 'descricao', { max: 500 });
    v.lancarSeHouverErros(erros);
    if (atual.situacao !== 'ativo') {
        throw new ErroApi(409, 'RACA_INATIVA', 'Não é possível alterar uma raça inativa.');
    }
    if (sqlNomeRacaEmUso.get(atual.especieId, nome, atual.id)) {
        throw new ErroApi(409, 'RACA_JA_CADASTRADA', 'Já existe uma raça com este nome nesta espécie.');
    }
    sqlAlterarRaca.run(nome, descricao, atual.id);
    return buscarRaca(atual.id);
}

// DELETE /api/racas/:id  -> INATIVA
function inativarRaca(id) {
    const raca = buscarRaca(id);
    if (raca.situacao === 'inativo') {
        throw new ErroApi(409, 'RACA_JA_INATIVA', 'Esta raça já está inativa.');
    }
    sqlInativarRaca.run(raca.id);
    return buscarRaca(raca.id);
}

module.exports = {
    listarEspecies, buscarEspecie, criarEspecie, alterarEspecie, inativarEspecie,
    listarRacas, buscarRaca, criarRaca, alterarRaca, inativarRaca,
};
