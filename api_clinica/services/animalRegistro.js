// Busca do animal usada pelos registros clínicos (consultas e vacinas).
const { db } = require('../database/conexao');
const { ErroApi } = require('../utils/erroApi');

const sqlBuscarAnimal = db.prepare(`
    SELECT ANIM_ID_ANIMAL   AS id,
           ANIM_NM_ANIMAL   AS nome,
           ANIM_DS_SITUACAO AS situacao
      FROM VET_ANIMAL
     WHERE ANIM_ID_ANIMAL = ?
`);

// Animal precisa existir (404). Para registrar algo novo, precisa estar ativo (409).
function exigirAnimal(idAnimal, { exigirAtivo = false } = {}) {
    const animal = sqlBuscarAnimal.get(idAnimal);
    if (!animal) throw new ErroApi(404, 'ANIMAL_NAO_ENCONTRADO', 'Animal não encontrado.');
    if (exigirAtivo && animal.situacao !== 'ativo') {
        throw new ErroApi(409, 'ANIMAL_INATIVO', 'Não é possível registrar para um animal inativo.');
    }
    return animal;
}

module.exports = { exigirAnimal };
