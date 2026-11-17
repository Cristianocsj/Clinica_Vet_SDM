// Vincula um microchip único a um animal existente.
const crypto = require('crypto');
const { db, transacao } = require('../database/conexao');
const v = require('../utils/validacao');
const { exigirAnimal } = require('./animalRegistro');
const { ErroApi } = require('../utils/erroApi');

const sqlMicrochipExistente = db.prepare(`
    SELECT VIMI_ID_VINCULO
      FROM VET_VINCULO_MICROCHIP
     WHERE VIMI_CD_MICROCHIP = ?
`);

const sqlVinculoAtivo = db.prepare(`
    SELECT VIMI_ID_VINCULO,
           VIMI_CD_MICROCHIP AS microchip
      FROM VET_VINCULO_MICROCHIP
     WHERE ANIM_ID_ANIMAL = ?
       AND VIMI_DS_SITUACAO = 'ativo'
`);

const sqlSubstituir = db.prepare(`
    UPDATE VET_VINCULO_MICROCHIP
       SET VIMI_DS_SITUACAO            = 'substituido',
           VIMI_DT_SUBSTITUICAO        = datetime('now', 'localtime'),
           VIMI_DS_MOTIVO_SUBSTITUICAO = ?
     WHERE VIMI_ID_VINCULO = ?
`);

const sqlInserir = db.prepare(`
    INSERT INTO VET_VINCULO_MICROCHIP
        (ANIM_ID_ANIMAL, VETE_ID_VETERINARIO, VIMI_CD_MICROCHIP)
    VALUES (?, ?, ?)
`);

const sqlCriarPendencia = db.prepare(`
    INSERT INTO VET_INTEGRACAO_GOV
        (ANIM_ID_ANIMAL, INGO_DS_TIPO_OPERACAO, INGO_DS_CHAVE_IDEMPOTENCIA,
         INGO_CD_MICROCHIP, INGO_CD_MICROCHIP_ANTERIOR)
    VALUES (?, ?, ?, ?, ?)
`);

const sqlBuscar = db.prepare(`
    SELECT m.VIMI_ID_VINCULO     AS id,
           m.ANIM_ID_ANIMAL      AS animalId,
           a.ANIM_NM_ANIMAL      AS animalNome,
           m.VETE_ID_VETERINARIO AS veterinarioId,
           v.VETE_NM_VETERINARIO AS veterinarioNome,
           m.VIMI_CD_MICROCHIP   AS microchip,
           m.VIMI_DS_SITUACAO    AS situacao,
           m.VIMI_DT_VINCULO     AS dataVinculo
      FROM VET_VINCULO_MICROCHIP m
      JOIN VET_ANIMAL a      ON a.ANIM_ID_ANIMAL = m.ANIM_ID_ANIMAL
      JOIN VET_VETERINARIO v ON v.VETE_ID_VETERINARIO = m.VETE_ID_VETERINARIO
     WHERE m.VIMI_ID_VINCULO = ?
`);

function exigirMicrochipDisponivel(animalId, microchip, motivo) {
    if (sqlMicrochipExistente.get(microchip)) {
        throw new ErroApi(409, 'MICROCHIP_JA_UTILIZADO',
            'Este microchip já foi vinculado e não pode ser reutilizado.');
    }
    const ativo = sqlVinculoAtivo.get(animalId);
    if (ativo && !motivo) {
        throw new ErroApi(409, 'ANIMAL_JA_POSSUI_MICROCHIP',
            'Este animal já possui um microchip ativo. Para trocar, informe o motivo.');
    }
    return ativo;
}

function vincular(idAnimal, corpo, idVeterinario) {
    corpo = corpo || {};
    const animalId = v.id(idAnimal, 'id do animal');
    const erros = [];
    const microchip = v.texto(erros, corpo, 'microchip', { obrigatorio: true, max: 15 });
    const motivo = v.texto(erros, corpo, 'motivo', { max: 500 });

    if (microchip !== null && !/^\d{15}$/.test(microchip)) {
        erros.push('microchip: informe exatamente 15 números');
    }
    v.lancarSeHouverErros(erros);

    exigirAnimal(animalId, { exigirAtivo: true });

    let vinculoId;
    try {
        vinculoId = transacao(() => {
            const ativo = exigirMicrochipDisponivel(animalId, microchip, motivo);
            if (ativo) sqlSubstituir.run(motivo, ativo.VIMI_ID_VINCULO);
            const id = Number(sqlInserir.run(animalId, idVeterinario, microchip).lastInsertRowid);
            sqlCriarPendencia.run(
                animalId,
                ativo ? 'ATUALIZACAO_ANIMAL' : 'CADASTRO_ANIMAL',
                crypto.randomUUID(),
                microchip,
                ativo ? ativo.microchip : null
            );
            return id;
        });
    } catch (erro) {
        if (erro.errcode !== 2067) throw erro;

        const ativo = exigirMicrochipDisponivel(animalId, microchip, motivo);
        if (ativo) {
            throw new ErroApi(409, 'ANIMAL_JA_POSSUI_MICROCHIP',
                'Este animal já está passando por uma troca de microchip. Tente novamente.');
        }
        throw erro;
    }

    return sqlBuscar.get(vinculoId);
}

module.exports = { vincular };
