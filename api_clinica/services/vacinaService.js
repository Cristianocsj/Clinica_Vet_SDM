// Registro de vacinas, histórico de vacinas do animal e lista de próximas doses.
// Vacina ANTIRRÁBICA APLICADA gera, na mesma transação, um registro PENDENTE em
// VET_INTEGRACAO_GOV. Quem envia para o governo é a parte de integração (Cristiano).
const crypto = require('crypto');
const { db, transacao } = require('../database/conexao');
const v = require('../utils/validacao');
const { exigirAnimal } = require('./animalRegistro');
const { ErroApi } = require('../utils/erroApi');

const SITUACOES_NO_CADASTRO = ['aplicada', 'agendada'];
const DIAS_PADRAO_PROXIMAS = 30;

// Reconhece antirrábica pelo nome ou tipo (ex.: "Antirrábica", "Raiva", "antirrabica")
const PARECE_ANTIRRABICA = /anti-?rr?[aá]bic|raiva/i;

const COLUNAS = `
    va.VACI_ID_VACINA        AS id,
    va.ANIM_ID_ANIMAL        AS animalId,
    a.ANIM_NM_ANIMAL         AS animalNome,
    va.VETE_ID_VETERINARIO   AS veterinarioId,
    ve.VETE_NM_VETERINARIO   AS veterinarioNome,
    va.VACI_NM_VACINA        AS nome,
    va.VACI_DS_TIPO_VACINA   AS tipo,
    va.VACI_FL_ANTIRRABICA   AS antirrabica,
    va.VACI_NM_FABRICANTE    AS fabricante,
    va.VACI_NR_LOTE          AS lote,
    va.VACI_DT_VALIDADE_LOTE AS validadeLote,
    va.VACI_DT_APLICACAO     AS dataAplicacao,
    va.VACI_DS_DOSE          AS dose,
    va.VACI_DS_VIA_APLICACAO AS via,
    va.VACI_DT_PROX_DOSE     AS proximaDose,
    va.VACI_DS_OBS           AS observacoes,
    va.VACI_DS_SITUACAO      AS situacao,
    ig.INGO_ID_INTEGRACAO    AS integracaoId,
    ig.INGO_DS_SITUACAO      AS integracaoSituacao,
    ig.INGO_NR_PROTOCOLO_EXTERNO AS integracaoProtocolo`;

const JUNCOES = `
      FROM VET_VACINA va
      JOIN VET_ANIMAL a            ON a.ANIM_ID_ANIMAL       = va.ANIM_ID_ANIMAL
      LEFT JOIN VET_VETERINARIO ve ON ve.VETE_ID_VETERINARIO = va.VETE_ID_VETERINARIO
      LEFT JOIN VET_INTEGRACAO_GOV ig ON ig.VACI_ID_VACINA   = va.VACI_ID_VACINA`;

const sqlBuscar = db.prepare(`SELECT ${COLUNAS} ${JUNCOES} WHERE va.VACI_ID_VACINA = ?`);

const sqlHistorico = db.prepare(`
    SELECT ${COLUNAS} ${JUNCOES}
     WHERE va.ANIM_ID_ANIMAL = ?
     ORDER BY va.VACI_DT_APLICACAO DESC, va.VACI_ID_VACINA DESC
`);

const sqlInserir = db.prepare(`
    INSERT INTO VET_VACINA
        (ANIM_ID_ANIMAL, VETE_ID_VETERINARIO, VACI_NM_VACINA, VACI_DS_TIPO_VACINA, VACI_FL_ANTIRRABICA,
         VACI_NM_FABRICANTE, VACI_NR_LOTE, VACI_DT_VALIDADE_LOTE, VACI_DT_APLICACAO, VACI_DS_DOSE,
         VACI_DS_VIA_APLICACAO, VACI_DT_PROX_DOSE, VACI_DS_OBS, VACI_DS_SITUACAO)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Pendência para a integração com o governo.
// A chave de idempotência é gerada uma vez só e deve ser reaproveitada em todo reenvio.
const sqlCriarPendenciaGov = db.prepare(`
    INSERT INTO VET_INTEGRACAO_GOV
        (ANIM_ID_ANIMAL, VACI_ID_VACINA, INGO_DS_TIPO_OPERACAO, INGO_DS_CHAVE_IDEMPOTENCIA, INGO_DS_SITUACAO)
    VALUES (?, ?, 'VACINACAO_ANTIRRABICA', ?, 'pendente')
`);

// Próximas doses = duas fontes:
//   1. vacinas APLICADAS com data de próxima dose, que ainda não tiveram a dose seguinte
//      (não existe outra vacina de mesmo nome, aplicada ou agendada, depois dela);
//   2. vacinas AGENDADAS.
// Inclui as atrasadas (data já passou) e vai até "hoje + dias".
const sqlProximasDoses = db.prepare(`
    SELECT * FROM (
        SELECT 'proxima_dose'          AS origem,
               va.VACI_ID_VACINA       AS vacinaId,
               va.VACI_DT_PROX_DOSE    AS dataPrevista,
               va.VACI_NM_VACINA       AS vacina,
               va.VACI_FL_ANTIRRABICA  AS antirrabica,
               a.ANIM_ID_ANIMAL        AS animalId,
               a.ANIM_NM_ANIMAL        AS animalNome,
               t.TUTO_NM_TUTOR         AS tutorNome,
               t.TUTO_NR_TELEFONE      AS tutorTelefone,
               t.TUTO_DS_EMAIL         AS tutorEmail
          FROM VET_VACINA va
          JOIN VET_ANIMAL a ON a.ANIM_ID_ANIMAL = va.ANIM_ID_ANIMAL
          JOIN VET_TUTOR  t ON t.TUTO_ID_TUTOR  = a.TUTO_ID_TUTOR
         WHERE va.VACI_DS_SITUACAO = 'aplicada'
           AND va.VACI_DT_PROX_DOSE IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM VET_VACINA seguinte
                            WHERE seguinte.ANIM_ID_ANIMAL = va.ANIM_ID_ANIMAL
                              AND lower(seguinte.VACI_NM_VACINA) = lower(va.VACI_NM_VACINA)
                              AND seguinte.VACI_DS_SITUACAO IN ('aplicada', 'agendada')
                              AND seguinte.VACI_DT_APLICACAO > va.VACI_DT_APLICACAO)
        UNION ALL
        SELECT 'agendada', va.VACI_ID_VACINA, va.VACI_DT_APLICACAO, va.VACI_NM_VACINA, va.VACI_FL_ANTIRRABICA,
               a.ANIM_ID_ANIMAL, a.ANIM_NM_ANIMAL, t.TUTO_NM_TUTOR, t.TUTO_NR_TELEFONE, t.TUTO_DS_EMAIL
          FROM VET_VACINA va
          JOIN VET_ANIMAL a ON a.ANIM_ID_ANIMAL = va.ANIM_ID_ANIMAL
          JOIN VET_TUTOR  t ON t.TUTO_ID_TUTOR  = a.TUTO_ID_TUTOR
         WHERE va.VACI_DS_SITUACAO = 'agendada'
    ) doses
     WHERE doses.dataPrevista <= :limite
       AND (:animalId IS NULL OR doses.animalId = :animalId)
       AND doses.animalId IN (SELECT ANIM_ID_ANIMAL FROM VET_ANIMAL WHERE ANIM_DS_SITUACAO = 'ativo')
     ORDER BY doses.dataPrevista, doses.animalNome
`);

const sqlDataLimite = db.prepare(`SELECT date('now', 'localtime', '+' || ? || ' days') AS limite`);

// O banco devolve 0/1 e colunas da integração soltas; na API fica organizado
function formatar(vacina) {
    const { integracaoId, integracaoSituacao, integracaoProtocolo, ...resto } = vacina;
    return {
        ...resto,
        antirrabica: vacina.antirrabica === 1,
        integracaoGov: integracaoId
            ? { id: integracaoId, situacao: integracaoSituacao, protocolo: integracaoProtocolo }
            : null,
    };
}

// Decide se a vacina é antirrábica: o campo "antirrabica" (true/false) ou, se não vier,
// pelo nome/tipo. Contradição ("Antirrábica" com antirrabica:false) é recusada.
function definirAntirrabica(erros, corpo, nome, tipo) {
    const pareceAntirrabica = PARECE_ANTIRRABICA.test(`${nome || ''} ${tipo || ''}`);
    if (corpo.antirrabica === undefined || corpo.antirrabica === null) return pareceAntirrabica;
    if (typeof corpo.antirrabica !== 'boolean') {
        erros.push('antirrabica: use true ou false');
        return false;
    }
    if (corpo.antirrabica === false && pareceAntirrabica) {
        erros.push('antirrabica: o nome/tipo indica vacina antirrábica, mas foi enviado false');
    }
    return corpo.antirrabica;
}

// POST /api/vacinas
// Aplicada: o veterinário responsável é o que está logado.
// Agendada: ainda não tem veterinário nem dados do frasco.
function registrar(corpo, idVeterinario) {
    corpo = corpo || {};
    const animalId = v.id(corpo.animalId, 'animalId');
    const erros = [];

    const situacao = v.opcao(erros, corpo, 'situacao', SITUACOES_NO_CADASTRO, 'aplicada');
    v.lancarSeHouverErros(erros); // as regras abaixo dependem da situação
    const aplicada = situacao === 'aplicada';
    const d = {
        nome: v.texto(erros, corpo, 'nome', { obrigatorio: true, max: 150 }),
        tipo: v.texto(erros, corpo, 'tipo', { obrigatorio: true, max: 50 }),
        fabricante: v.texto(erros, corpo, 'fabricante', { obrigatorio: aplicada, max: 100 }),
        lote: v.texto(erros, corpo, 'lote', { obrigatorio: aplicada, max: 50 }),
        validadeLote: v.data(erros, corpo, 'validadeLote', { obrigatorio: aplicada }),
        dataAplicacao: v.data(erros, corpo, 'dataAplicacao', { obrigatorio: !aplicada }),
        dose: v.texto(erros, corpo, 'dose', { obrigatorio: aplicada, max: 30 }),
        via: v.texto(erros, corpo, 'via', { max: 30 }),
        proximaDose: v.data(erros, corpo, 'proximaDose'),
        observacoes: v.texto(erros, corpo, 'observacoes', { max: 1000 }),
    };
    const antirrabica = definirAntirrabica(erros, corpo, d.nome, d.tipo);

    // Aplicada sem data = aplicada hoje
    const hoje = v.hojeLocal();
    if (aplicada && !d.dataAplicacao && !corpo.dataAplicacao) d.dataAplicacao = hoje;

    if (d.dataAplicacao) {
        if (aplicada && d.dataAplicacao > hoje) erros.push('dataAplicacao: vacina aplicada não pode estar no futuro');
        if (!aplicada && d.dataAplicacao < hoje) erros.push('dataAplicacao: vacina agendada precisa ser de hoje em diante');
        if (d.validadeLote && d.validadeLote < d.dataAplicacao) {
            erros.push('validadeLote: o lote estava vencido na data da aplicação');
        }
        if (d.proximaDose && d.proximaDose <= d.dataAplicacao) {
            erros.push('proximaDose: precisa ser depois da data da aplicação');
        }
    }
    if (!aplicada && d.proximaDose) {
        erros.push('proximaDose: informe só quando a vacina for aplicada');
    }
    v.lancarSeHouverErros(erros);

    exigirAnimal(animalId, { exigirAtivo: true });

    const id = transacao(() => {
        const r = sqlInserir.run(animalId, aplicada ? idVeterinario : null, d.nome, d.tipo, antirrabica ? 1 : 0,
            d.fabricante, d.lote, d.validadeLote, d.dataAplicacao, d.dose, d.via, d.proximaDose,
            d.observacoes, situacao);
        const idVacina = Number(r.lastInsertRowid);

        if (antirrabica && aplicada) {
            sqlCriarPendenciaGov.run(animalId, idVacina, crypto.randomUUID());
        }
        return idVacina;
    });
    return formatar(sqlBuscar.get(id));
}

// GET /api/animais/:id/vacinas
function historico(idAnimal) {
    const animal = exigirAnimal(v.id(idAnimal, 'id do animal'));
    return {
        animal: { id: animal.id, nome: animal.nome, situacao: animal.situacao },
        vacinas: sqlHistorico.all(animal.id).map(formatar),
    };
}

// GET /api/vacinas/proximas-doses?dias=30&animalId=1
function proximasDoses(query) {
    const erros = [];
    let dias = DIAS_PADRAO_PROXIMAS;
    if (query.dias !== undefined) {
        dias = Number(query.dias);
        if (!/^\d+$/.test(String(query.dias)) || dias > 365) erros.push('dias: número inteiro de 0 a 365');
    }
    let animalId = null;
    if (query.animalId !== undefined) {
        animalId = Number(query.animalId);
        if (!/^\d+$/.test(String(query.animalId)) || animalId <= 0) erros.push('animalId: número inteiro positivo');
    }
    v.lancarSeHouverErros(erros);

    const hoje = v.hojeLocal();
    const { limite } = sqlDataLimite.get(dias);
    const doses = sqlProximasDoses.all({ limite, animalId }).map((dose) => ({
        ...dose,
        antirrabica: dose.antirrabica === 1,
        status: dose.dataPrevista < hoje ? 'atrasada' : 'prevista',
    }));
    return { ate: limite, total: doses.length, doses };
}

// Uma vacina pelo id (usada para devolver a situação do envio depois de tentar mandar ao governo)
function buscar(id) {
    return formatar(sqlBuscar.get(id));
}

const sqlAlterar = db.prepare(`
    UPDATE VET_VACINA
       SET VACI_DS_VIA_APLICACAO = ?,
           VACI_DT_PROX_DOSE     = ?,
           VACI_DS_OBS           = ?
     WHERE VACI_ID_VACINA = ?
`);

const sqlCancelar = db.prepare(`
    UPDATE VET_VACINA
       SET VACI_DS_SITUACAO = 'cancelada',
           VACI_DT_PROX_DOSE = NULL,
           VACI_DS_OBS = trim(coalesce(VACI_DS_OBS, '') || ' [Cancelada: ' || ? || ']')
     WHERE VACI_ID_VACINA = ?
`);

// Antirrábica cancelada antes de chegar ao governo: o envio pendente é encerrado
const sqlEncerrarEnvio = db.prepare(`
    UPDATE VET_INTEGRACAO_GOV
       SET INGO_DS_SITUACAO = 'com_falha',
           INGO_DS_MSG_ERRO = 'Vacina cancelada na clínica antes do envio: não será comunicada ao governo.'
     WHERE VACI_ID_VACINA = ?
       AND INGO_DS_SITUACAO IN ('pendente', 'com_falha')
`);

function exigirVacina(idVacina) {
    const id = v.id(idVacina, 'id da vacina');
    const vacina = sqlBuscar.get(id);
    if (!vacina) throw new ErroApi(404, 'VACINA_NAO_ENCONTRADA', 'Vacina não encontrada.');
    return formatar(vacina);
}

// PUT /api/vacinas/:id   Corpo: { via?, proximaDose?, observacoes? }
// Corrige os dados que não vão para o governo. Nome, fabricante, lote, datas e dose
// ficam como foram registrados (na antirrábica, são os dados comunicados ao governo).
function alterar(idVacina, corpo) {
    corpo = corpo || {};
    const vacina = exigirVacina(idVacina);
    if (vacina.situacao === 'cancelada') {
        throw new ErroApi(409, 'VACINA_CANCELADA', 'Vacina cancelada não pode ser alterada.');
    }
    const erros = [];
    const d = {
        via: 'via' in corpo ? v.texto(erros, corpo, 'via', { max: 30 }) : vacina.via,
        proximaDose: 'proximaDose' in corpo ? v.data(erros, corpo, 'proximaDose') : vacina.proximaDose,
        observacoes: 'observacoes' in corpo ? v.texto(erros, corpo, 'observacoes', { max: 1000 }) : vacina.observacoes,
    };
    if (d.proximaDose && vacina.situacao !== 'aplicada') {
        erros.push('proximaDose: informe só quando a vacina for aplicada');
    }
    if (d.proximaDose && d.proximaDose <= vacina.dataAplicacao) {
        erros.push('proximaDose: precisa ser depois da data da aplicação');
    }
    v.lancarSeHouverErros(erros);
    sqlAlterar.run(d.via, d.proximaDose, d.observacoes, vacina.id);
    return exigirVacina(vacina.id);
}

// PUT /api/vacinas/:id/cancelar   Corpo: { motivo }
// Antirrábica que o governo já recebeu não pode ser cancelada na clínica.
function cancelar(idVacina, corpo) {
    corpo = corpo || {};
    const vacina = exigirVacina(idVacina);
    const erros = [];
    const motivo = v.texto(erros, corpo, 'motivo', { obrigatorio: true, max: 300 });
    v.lancarSeHouverErros(erros);
    if (vacina.situacao === 'cancelada') {
        throw new ErroApi(409, 'VACINA_JA_CANCELADA', 'Esta vacina já está cancelada.');
    }
    const envio = vacina.integracaoGov;
    if (envio && (envio.situacao === 'enviada' || envio.situacao === 'confirmada')) {
        throw new ErroApi(409, 'VACINA_JA_COMUNICADA',
            'Esta antirrábica já foi comunicada ao governo e não pode ser cancelada.');
    }
    transacao(() => {
        sqlCancelar.run(motivo, vacina.id);
        sqlEncerrarEnvio.run(vacina.id);
    });
    return exigirVacina(vacina.id);
}

module.exports = { registrar, buscar, historico, proximasDoses, alterar, cancelar };
