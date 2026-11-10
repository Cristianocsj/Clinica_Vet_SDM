// Ponte entre a API da clínica e a API do governo (simulada, em Python, porta 8001).
//
// O que já funciona (ponte mínima):
//   - listar as comunicações com o governo (tabela VET_INTEGRACAO_GOV);
//   - enviar / reenviar MANUALMENTE uma VACINACAO_ANTIRRABICA, que é a pendência
//     criada automaticamente pelo registro de vacina (vacinaService).
//
// Sem microchip ativo o governo não aceita: o envio fica "pendente" com o aviso
// "aguardando vínculo de microchip" (o vínculo é a rota do Cristiano, microchipRoutes.js).
//
// O que falta (parte do Cristiano, com exemplos prontos em docs/GUIA_INTEGRACAO_CRISTIANO.md):
//   - reenvio automático (a cada 1 minuto, até 5 tentativas);
//   - enviar CADASTRO_ANIMAL e ATUALIZACAO_ANIMAL.
//
// Situações (enunciado, seção 5):
//   pendente   -> ainda não chegou no governo (sem chip, governo fora do ar, timeout)
//   enviada    -> o governo recebeu e devolveu o protocolo
//   confirmada -> a consulta do protocolo (GET /operacoes/{protocolo}) confirmou
//   com_falha  -> o governo recusou os dados (4xx); corrija e reenvie
const { db } = require('../database/conexao');
const { ErroApi } = require('../utils/erroApi');
const v = require('../utils/validacao');

// Endereço da API do governo. Para trocar sem mexer no código:
//   GOV_API_URL=http://outro-endereco:8001/api/governo npm start
const URL_GOVERNO = process.env.GOV_API_URL || 'http://localhost:8001/api/governo';
const TEMPO_LIMITE_MS = 5000;

const COLUNAS = `
    ig.INGO_ID_INTEGRACAO         AS id,
    ig.INGO_DS_TIPO_OPERACAO      AS tipo,
    ig.INGO_DS_SITUACAO           AS situacao,
    ig.INGO_NR_PROTOCOLO_EXTERNO  AS protocolo,
    ig.INGO_DS_CHAVE_IDEMPOTENCIA AS chaveIdempotencia,
    ig.INGO_QT_TENTATIVAS         AS tentativas,
    ig.INGO_DS_MSG_ERRO           AS mensagem,
    ig.INGO_DT_HR_SOLICITACAO     AS dataSolicitacao,
    ig.INGO_DT_HR_RESPOSTA        AS dataResposta,
    ig.ANIM_ID_ANIMAL             AS animalId,
    a.ANIM_NM_ANIMAL              AS animalNome,
    ig.VACI_ID_VACINA             AS vacinaId,
    va.VACI_NM_VACINA             AS vacinaNome,
    va.VACI_DT_APLICACAO          AS dataAplicacao,
    mc.VIMI_CD_MICROCHIP          AS microchip`;

const JUNCOES = `
      FROM VET_INTEGRACAO_GOV ig
      JOIN VET_ANIMAL a       ON a.ANIM_ID_ANIMAL  = ig.ANIM_ID_ANIMAL
      LEFT JOIN VET_VACINA va ON va.VACI_ID_VACINA = ig.VACI_ID_VACINA
      LEFT JOIN VET_VINCULO_MICROCHIP mc
             ON mc.ANIM_ID_ANIMAL = ig.ANIM_ID_ANIMAL AND mc.VIMI_DS_SITUACAO = 'ativo'`;

const sqlBuscar = db.prepare(`SELECT ${COLUNAS} ${JUNCOES} WHERE ig.INGO_ID_INTEGRACAO = ?`);

const sqlListar = db.prepare(`
    SELECT ${COLUNAS} ${JUNCOES}
     WHERE (:situacao IS NULL OR ig.INGO_DS_SITUACAO = :situacao)
       AND (:animalId IS NULL OR ig.ANIM_ID_ANIMAL = :animalId)
     ORDER BY ig.INGO_DT_HR_SOLICITACAO DESC, ig.INGO_ID_INTEGRACAO DESC
`);

// Tudo o que o governo pode pedir: animal, tutor, vacina, veterinário e microchip ativo
// (os dados mínimos da vacinação estão no enunciado, seção 4)
const sqlDadosEnvio = db.prepare(`
    SELECT ig.INGO_ID_INTEGRACAO         AS id,
           ig.INGO_DS_TIPO_OPERACAO      AS tipo,
           ig.INGO_DS_SITUACAO           AS situacao,
           ig.INGO_DS_CHAVE_IDEMPOTENCIA AS chave,
           ig.INGO_NR_PROTOCOLO_EXTERNO  AS protocolo,
           mc.VIMI_CD_MICROCHIP          AS microchip,
           a.ANIM_ID_ANIMAL              AS animalId,
           a.ANIM_NM_ANIMAL              AS animalNome,
           a.ANIM_FL_SEXO                AS sexo,
           a.ANIM_DT_NASCIMENTO          AS dataNascimento,
           es.ESPE_NM_ESPECIE            AS especie,
           r.RACA_NM_RACA                AS raca,
           t.TUTO_NM_TUTOR               AS tutorNome,
           t.TUTO_NR_CPF                 AS tutorCpf,
           va.VACI_NM_VACINA             AS vacinaNome,
           va.VACI_NM_FABRICANTE         AS fabricante,
           va.VACI_NR_LOTE               AS lote,
           va.VACI_DT_APLICACAO          AS dataAplicacao,
           ve.VETE_NM_VETERINARIO        AS veterinarioNome,
           ve.VETE_NR_CRMV               AS crmv,
           ve.VETE_SG_UF_CRMV            AS ufCrmv
      FROM VET_INTEGRACAO_GOV ig
      JOIN VET_ANIMAL a       ON a.ANIM_ID_ANIMAL   = ig.ANIM_ID_ANIMAL
      JOIN VET_TUTOR t        ON t.TUTO_ID_TUTOR    = a.TUTO_ID_TUTOR
      JOIN VET_ESPECIE es     ON es.ESPE_ID_ESPECIE = a.ESPE_ID_ESPECIE
      LEFT JOIN VET_RACA r    ON r.RACA_ID_RACA     = a.RACA_ID_RACA
      LEFT JOIN VET_VACINA va ON va.VACI_ID_VACINA  = ig.VACI_ID_VACINA
      LEFT JOIN VET_VETERINARIO ve ON ve.VETE_ID_VETERINARIO = va.VETE_ID_VETERINARIO
      LEFT JOIN VET_VINCULO_MICROCHIP mc
             ON mc.ANIM_ID_ANIMAL = a.ANIM_ID_ANIMAL AND mc.VIMI_DS_SITUACAO = 'ativo'
     WHERE ig.INGO_ID_INTEGRACAO = ?
`);

// Sem chip: continua pendente e NÃO conta tentativa (decisão do grupo)
const sqlAguardarMicrochip = db.prepare(`
    UPDATE VET_INTEGRACAO_GOV
       SET INGO_DS_SITUACAO = 'pendente',
           INGO_DS_MSG_ERRO = 'Aguardando vínculo de microchip: o governo exige o microchip do animal.'
     WHERE INGO_ID_INTEGRACAO = ?
`);

// Resultado de uma tentativa de envio (sempre conta +1 tentativa)
const sqlRegistrarTentativa = db.prepare(`
    UPDATE VET_INTEGRACAO_GOV
       SET INGO_DS_SITUACAO          = :situacao,
           INGO_NR_PROTOCOLO_EXTERNO = :protocolo,
           INGO_DS_MSG_ERRO          = :mensagem,
           INGO_QT_TENTATIVAS        = INGO_QT_TENTATIVAS + 1,
           INGO_DT_HR_RESPOSTA       = CASE WHEN :respondeu = 1 THEN datetime('now', 'localtime')
                                            ELSE INGO_DT_HR_RESPOSTA END
     WHERE INGO_ID_INTEGRACAO = :id
`);

// ---------------------------------------------------------------------------
// Chamada HTTP ao governo
// ---------------------------------------------------------------------------

// Devolve { status, corpo }. Sem resposta (fora do ar / timeout): status 0 e "motivo".
async function chamarGoverno(metodo, caminho, corpo) {
    try {
        const resposta = await fetch(URL_GOVERNO + caminho, {
            method: metodo,
            headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
            body: corpo ? JSON.stringify(corpo) : undefined,
            signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
        });
        let json = null;
        try {
            json = await resposta.json();
        } catch (erro) {
            // resposta sem JSON: fica só o status
        }
        return { status: resposta.status, corpo: json };
    } catch (erro) {
        const motivo = erro.name === 'TimeoutError'
            ? `o governo não respondeu em ${TEMPO_LIMITE_MS / 1000} segundos`
            : `não foi possível conectar em ${URL_GOVERNO}`;
        return { status: 0, corpo: null, motivo };
    }
}

// O FastAPI devolve { detail: "texto" } ou { detail: [ { loc, msg }, ... ] }
function mensagemDoGoverno(resposta) {
    const detalhe = resposta.corpo && resposta.corpo.detail;
    if (Array.isArray(detalhe)) {
        return detalhe.map((d) => `${(d.loc || []).slice(1).join('.')}: ${d.msg}`).join('; ');
    }
    if (typeof detalhe === 'string') return detalhe;
    return resposta.motivo || `resposta HTTP ${resposta.status}`;
}

// Dados do animal no formato do governo (ver api_gov/docs_gov)
function montarAnimal(d) {
    return {
        nome: d.animalNome,
        especie: d.especie,
        raca: d.raca,
        sexo: d.sexo, // pode ser null (ver AVISO em api_gov/app/schemas.py)
        data_nascimento: d.dataNascimento,
        tutor_nome: d.tutorNome,
        tutor_cpf: d.tutorCpf,
    };
}

// Corpo do POST /api/governo/vacinacoes-antirrabicas
function montarVacinacao(d) {
    return {
        chave_idempotencia: d.chave, // a mesma em todas as tentativas: o governo não duplica
        microchip: d.microchip,
        animal: montarAnimal(d),
        vacina: {
            nome_vacina: d.vacinaNome,
            fabricante: d.fabricante,
            lote: d.lote,
            data_aplicacao: d.dataAplicacao,
        },
        veterinario: {
            nome: d.veterinarioNome,
            crmv: `${d.ufCrmv}-${d.crmv}`,
        },
    };
}

// Qual rota do governo chamar para cada tipo de operação.
// Hoje só a vacinação. CADASTRO_ANIMAL e ATUALIZACAO_ANIMAL: ver o passo 3 do guia do Cristiano.
function montarChamada(d) {
    if (d.tipo === 'VACINACAO_ANTIRRABICA') {
        return { metodo: 'POST', caminho: '/vacinacoes-antirrabicas', corpo: montarVacinacao(d) };
    }
    return null;
}

// ---------------------------------------------------------------------------
// Operações
// ---------------------------------------------------------------------------

function buscar(id) {
    const integracao = sqlBuscar.get(id);
    if (!integracao) throw new ErroApi(404, 'INTEGRACAO_NAO_ENCONTRADA', 'Comunicação com o governo não encontrada.');
    return integracao;
}

// GET /api/integracoes?situacao=pendente&animalId=1
function listar(query) {
    const erros = [];
    const situacao = v.opcao(erros, query, 'situacao', ['pendente', 'enviada', 'confirmada', 'com_falha'], null);
    v.lancarSeHouverErros(erros);
    const animalId = query.animalId === undefined ? null : v.id(query.animalId, 'animalId');
    return sqlListar.all({ situacao, animalId });
}

// POST /api/integracoes/:id/enviar  (envio manual ou "Reenviar")
async function enviar(idIntegracao) {
    const id = v.id(idIntegracao, 'id da integração');
    const d = sqlDadosEnvio.get(id);
    if (!d) throw new ErroApi(404, 'INTEGRACAO_NAO_ENCONTRADA', 'Comunicação com o governo não encontrada.');
    if (d.situacao === 'confirmada') {
        throw new ErroApi(409, 'INTEGRACAO_JA_CONFIRMADA', 'Esta comunicação já foi confirmada pelo governo.');
    }
    const chamada = montarChamada(d);
    if (!chamada) {
        throw new ErroApi(409, 'TIPO_NAO_IMPLEMENTADO',
            `O envio de ${d.tipo} ainda não foi feito (parte do Cristiano, ver docs/GUIA_INTEGRACAO_CRISTIANO.md).`);
    }
    if (!d.microchip) {
        sqlAguardarMicrochip.run(id);
        return buscar(id);
    }

    const resposta = await chamarGoverno(chamada.metodo, chamada.caminho, chamada.corpo);
    const resultado = { id, protocolo: d.protocolo, mensagem: null, respondeu: 1 };

    if (resposta.status === 200 || resposta.status === 201) {
        // 201 = registrou agora; 200 = mesma chave de novo (o governo devolve o mesmo protocolo) ou atualização
        resultado.protocolo = resposta.corpo.protocolo;
        resultado.situacao = 'enviada';
        const consulta = await chamarGoverno('GET', `/operacoes/${encodeURIComponent(resultado.protocolo)}`);
        if (consulta.status === 200 && consulta.corpo && consulta.corpo.situacao === 'concluida') {
            resultado.situacao = 'confirmada';
        } else {
            resultado.mensagem = 'O governo recebeu, mas a confirmação pelo protocolo falhou. Envie de novo para confirmar.';
        }
    } else if (resposta.status === 0 || resposta.status >= 500) {
        // Fora do ar / timeout / 503: a vacina continua registrada e o envio fica pendente
        resultado.situacao = 'pendente';
        resultado.respondeu = resposta.status === 0 ? 0 : 1;
        resultado.mensagem = `Governo indisponível: ${mensagemDoGoverno(resposta)}. Tente de novo mais tarde.`;
    } else {
        // 4xx: o governo recusou os dados (ex.: 422)
        resultado.situacao = 'com_falha';
        resultado.mensagem = `Recusado pelo governo (HTTP ${resposta.status}): ${mensagemDoGoverno(resposta)}`;
    }

    sqlRegistrarTentativa.run(resultado);
    return buscar(id);
}

module.exports = { listar, buscar, enviar };
