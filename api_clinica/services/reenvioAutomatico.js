// Reenvia integrações pendentes ou sem confirmação a cada minuto.
const { db } = require('../database/conexao');
const integracaoService = require('./integracaoService');

const INTERVALO_MS = 60 * 1000;
const MAX_TENTATIVAS = 5;

const sqlParaEnviar = db.prepare(`
    SELECT ig.INGO_ID_INTEGRACAO AS id
      FROM VET_INTEGRACAO_GOV ig
     WHERE ig.INGO_DS_SITUACAO IN ('pendente', 'enviada')
       AND ig.INGO_QT_TENTATIVAS < ?
       AND EXISTS (
           SELECT 1
             FROM VET_VINCULO_MICROCHIP mc
            WHERE mc.ANIM_ID_ANIMAL = ig.ANIM_ID_ANIMAL
              AND mc.VIMI_DS_SITUACAO = 'ativo'
       )
     ORDER BY CASE ig.INGO_DS_TIPO_OPERACAO
                  WHEN 'CADASTRO_ANIMAL' THEN 0
                  WHEN 'ATUALIZACAO_ANIMAL' THEN 1
                  ELSE 2
              END,
              ig.INGO_DT_HR_SOLICITACAO,
              ig.INGO_ID_INTEGRACAO
`);

const sqlEncerrarTentativas = db.prepare(`
    UPDATE VET_INTEGRACAO_GOV
       SET INGO_DS_SITUACAO = 'com_falha',
           INGO_DS_MSG_ERRO = 'Reenvio automático parou depois de ' || INGO_QT_TENTATIVAS
                              || ' tentativas. Use o botão Reenviar. Último erro: '
                              || coalesce(INGO_DS_MSG_ERRO, '-')
     WHERE INGO_DS_SITUACAO IN ('pendente', 'enviada')
       AND INGO_QT_TENTATIVAS >= ?
`);

let rodando = false;

async function rodarUmaVez() {
    if (rodando) return;
    rodando = true;
    try {
        for (const { id } of sqlParaEnviar.all(MAX_TENTATIVAS)) {
            try {
                const resultado = await integracaoService.enviar(id);
                console.log(
                    `[reenvio automático] envio ${id}: ${resultado.situacao} `
                    + `(tentativas: ${resultado.tentativas})`
                );
            } catch (erro) {
                console.error(`[reenvio automático] envio ${id} falhou:`, erro);
            }
        }
        sqlEncerrarTentativas.run(MAX_TENTATIVAS);
    } finally {
        rodando = false;
    }
}

function iniciar() {
    console.log(`Reenvio automático ligado: a cada ${INTERVALO_MS / 1000} s, até ${MAX_TENTATIVAS} tentativas.`);
    setInterval(() => {
        rodarUmaVez().catch((erro) => {
            console.error('[reenvio automático] não foi possível concluir a rodada:', erro);
        });
    }, INTERVALO_MS);
}

module.exports = { iniciar, rodarUmaVez };
