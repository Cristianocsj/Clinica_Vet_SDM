// Vincula um microchip único a um animal existente.
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
    SELECT VIMI_ID_VINCULO
      FROM VET_VINCULO_MICROCHIP
     WHERE ANIM_ID_ANIMAL = ?
       AND VIMI_DS_SITUACAO = 'ativo'
`);

const sqlInserir = db.prepare(`
    INSERT INTO VET_VINCULO_MICROCHIP
        (ANIM_ID_ANIMAL, VETE_ID_VETERINARIO, VIMI_CD_MICROCHIP)
    VALUES (?, ?, ?)
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

function exigirMicrochipDisponivel(animalId, microchip) {
    if (sqlMicrochipExistente.get(microchip)) {
        throw new ErroApi(409, 'MICROCHIP_JA_UTILIZADO',
            'Este microchip já foi vinculado e não pode ser reutilizado.');
    }
    if (sqlVinculoAtivo.get(animalId)) {
        throw new ErroApi(409, 'ANIMAL_JA_POSSUI_MICROCHIP',
            'Este animal já possui um microchip ativo.');
    }
}

function vincular(idAnimal, corpo, idVeterinario) {
    corpo = corpo || {};
    const animalId = v.id(idAnimal, 'id do animal');
    const erros = [];
    const microchip = v.texto(erros, corpo, 'microchip', { obrigatorio: true, max: 15 });

    if (microchip !== null && !/^\d{15}$/.test(microchip)) {
        erros.push('microchip: informe exatamente 15 números');
    }
    v.lancarSeHouverErros(erros);

    //exigirAnimal(animalId);
    exigirAnimal(animalId, { exigirAtivo: true });

    let vinculoId;
    try {
        vinculoId = transacao(() => {
            exigirMicrochipDisponivel(animalId, microchip);
            return Number(sqlInserir.run(animalId, idVeterinario, microchip).lastInsertRowid);
        });
    } catch (erro) {
        if (erro.errcode !== 2067) throw erro;

        exigirMicrochipDisponivel(animalId, microchip);
        throw erro;
    }

    return sqlBuscar.get(vinculoId);
}

module.exports = { vincular };
