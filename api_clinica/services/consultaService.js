// Registro de consultas e histórico de consultas do animal.
const { db, transacao } = require('../database/conexao');
const v = require('../utils/validacao');
const { exigirAnimal } = require('./animalRegistro');
const { ErroApi } = require('../utils/erroApi');

const STATUS = ['realizada', 'agendada', 'cancelada', 'nao_compareceu'];

const COLUNAS = `
    c.CONS_ID_CONSULTA             AS id,
    c.ANIM_ID_ANIMAL               AS animalId,
    a.ANIM_NM_ANIMAL               AS animalNome,
    c.VETE_ID_VETERINARIO          AS veterinarioId,
    v.VETE_NM_VETERINARIO          AS veterinarioNome,
    c.CONS_DT_HR_CONSULTA          AS dataHora,
    c.CONS_DS_MOTIVO               AS motivo,
    c.CONS_DS_ANAMNESE             AS anamnese,
    c.CONS_DS_SINTOMAS             AS sintomas,
    c.CONS_DS_DIAGNOSTICO          AS diagnostico,
    c.CONS_DS_TRATAMENTO_PRESCRITO AS tratamento,
    c.CONS_DS_PRESCRICAO_MED       AS prescricao,
    c.CONS_VL_PESO_REGISTRADO      AS peso,
    c.CONS_VL_TEMPERATURA          AS temperatura,
    c.CONS_DS_OBS                  AS observacoes,
    c.CONS_DS_STATUS               AS status`;

const JUNCOES = `
      FROM VET_CONSULTA c
      JOIN VET_ANIMAL a      ON a.ANIM_ID_ANIMAL      = c.ANIM_ID_ANIMAL
      JOIN VET_VETERINARIO v ON v.VETE_ID_VETERINARIO = c.VETE_ID_VETERINARIO`;

const sqlBuscar = db.prepare(`SELECT ${COLUNAS} ${JUNCOES} WHERE c.CONS_ID_CONSULTA = ?`);

// Histórico: da mais recente para a mais antiga
const sqlHistorico = db.prepare(`
    SELECT ${COLUNAS} ${JUNCOES}
     WHERE c.ANIM_ID_ANIMAL = ?
     ORDER BY c.CONS_DT_HR_CONSULTA DESC, c.CONS_ID_CONSULTA DESC
`);

const sqlInserir = db.prepare(`
    INSERT INTO VET_CONSULTA
        (ANIM_ID_ANIMAL, VETE_ID_VETERINARIO, CONS_DT_HR_CONSULTA, CONS_DS_MOTIVO, CONS_DS_ANAMNESE,
         CONS_DS_SINTOMAS, CONS_DS_DIAGNOSTICO, CONS_DS_TRATAMENTO_PRESCRITO, CONS_DS_PRESCRICAO_MED,
         CONS_VL_PESO_REGISTRADO, CONS_VL_TEMPERATURA, CONS_DS_OBS, CONS_DS_STATUS)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// O peso da consulta realizada vira o peso atual do animal,
// a menos que já exista uma consulta realizada mais nova com peso.
const sqlAtualizarPeso = db.prepare(`
    UPDATE VET_ANIMAL
       SET ANIM_VL_PESO_ATUAL = ?
     WHERE ANIM_ID_ANIMAL = ?
       AND NOT EXISTS (SELECT 1 FROM VET_CONSULTA
                        WHERE ANIM_ID_ANIMAL = ?
                          AND CONS_DS_STATUS = 'realizada'
                          AND CONS_VL_PESO_REGISTRADO IS NOT NULL
                          AND CONS_DT_HR_CONSULTA > ?)
`);

// POST /api/consultas
// O veterinário da consulta é quem está logado (vem do token).
function registrar(corpo, idVeterinario) {
    corpo = corpo || {};
    const animalId = v.id(corpo.animalId, 'animalId');
    const erros = [];

    const status = v.opcao(erros, corpo, 'status', STATUS, 'realizada');
    v.lancarSeHouverErros(erros); // as regras abaixo dependem do status
    const dados = {
        dataHora: v.dataHora(erros, corpo, 'dataHora'),
        motivo: v.texto(erros, corpo, 'motivo', { obrigatorio: true, max: 500 }),
        anamnese: v.texto(erros, corpo, 'anamnese'),
        sintomas: v.texto(erros, corpo, 'sintomas'),
        diagnostico: v.texto(erros, corpo, 'diagnostico'),
        tratamento: v.texto(erros, corpo, 'tratamento'),
        prescricao: v.texto(erros, corpo, 'prescricao'),
        peso: v.numero(erros, corpo, 'peso', { min: 0.01, max: 9999.99, mensagem: 'peso em kg, maior que zero' }),
        temperatura: v.numero(erros, corpo, 'temperatura', { min: 30, max: 45, mensagem: 'temperatura em °C, entre 30 e 45' }),
        observacoes: v.texto(erros, corpo, 'observacoes', { max: 1000 }),
    };

    // Sem data/hora: consulta realizada agora. Agendada precisa dizer quando.
    if (!dados.dataHora && !corpo.dataHora) {
        if (status === 'agendada') erros.push('dataHora: obrigatória para consulta agendada');
        dados.dataHora = v.agoraLocal();
    }
    if (dados.dataHora) {
        const agora = v.agoraLocal();
        if (status === 'realizada' && dados.dataHora > agora) {
            erros.push('dataHora: consulta realizada não pode estar no futuro');
        }
        if (status === 'agendada' && dados.dataHora < agora) {
            erros.push('dataHora: consulta agendada precisa estar no futuro');
        }
    }
    if (status !== 'realizada' && (dados.peso !== null || dados.temperatura !== null)) {
        erros.push('peso/temperatura: só podem ser registrados em consulta realizada');
    }
    v.lancarSeHouverErros(erros);

    exigirAnimal(animalId, { exigirAtivo: true });

    const id = transacao(() => {
        const r = sqlInserir.run(animalId, idVeterinario, dados.dataHora, dados.motivo, dados.anamnese,
            dados.sintomas, dados.diagnostico, dados.tratamento, dados.prescricao,
            dados.peso, dados.temperatura, dados.observacoes, status);
        if (status === 'realizada' && dados.peso !== null) {
            sqlAtualizarPeso.run(dados.peso, animalId, animalId, dados.dataHora);
        }
        return Number(r.lastInsertRowid);
    });
    return sqlBuscar.get(id);
}

// GET /api/animais/:id/consultas
function historico(idAnimal) {
    const animal = exigirAnimal(v.id(idAnimal, 'id do animal'));
    return {
        animal: { id: animal.id, nome: animal.nome, situacao: animal.situacao },
        consultas: sqlHistorico.all(animal.id),
    };
}

const sqlAlterarSituacao = db.prepare(`
    UPDATE VET_CONSULTA
       SET CONS_DS_STATUS = ?,
           CONS_DS_OBS    = coalesce(?, CONS_DS_OBS)
     WHERE CONS_ID_CONSULTA = ?
`);

// PUT /api/consultas/:id/situacao   Corpo: { status, observacoes? }
// Só a consulta AGENDADA muda de situação: vira realizada, cancelada ou não compareceu.
// Realizada, cancelada e não compareceu já são situações finais.
function alterarSituacao(idConsulta, corpo) {
    corpo = corpo || {};
    const id = v.id(idConsulta, 'id da consulta');
    const erros = [];
    const status = v.opcao(erros, corpo, 'status', ['realizada', 'cancelada', 'nao_compareceu'], null);
    if (!status && !erros.length) erros.push('status: obrigatório (realizada, cancelada ou nao_compareceu)');
    const observacoes = v.texto(erros, corpo, 'observacoes', { max: 1000 });
    v.lancarSeHouverErros(erros);

    const consulta = sqlBuscar.get(id);
    if (!consulta) throw new ErroApi(404, 'CONSULTA_NAO_ENCONTRADA', 'Consulta não encontrada.');
    if (consulta.status !== 'agendada') {
        throw new ErroApi(409, 'CONSULTA_JA_ENCERRADA',
            `Só consulta agendada muda de situação. Esta já está "${consulta.status}".`);
    }
    if (status !== 'cancelada' && consulta.dataHora > v.agoraLocal()) {
        throw new ErroApi(409, 'CONSULTA_NO_FUTURO',
            'A consulta ainda não chegou na data marcada: só dá para cancelar.');
    }
    sqlAlterarSituacao.run(status, observacoes, id);
    return sqlBuscar.get(id);
}

module.exports = { registrar, historico, alterarSituacao };
