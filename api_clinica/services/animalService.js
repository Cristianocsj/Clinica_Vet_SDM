// Cadastro de animais.
// Regras (enunciado 3.7 e decisões do grupo):
//   - todo animal tem um tutor (ativo no momento do cadastro);
//   - a raça é opcional, mas se vier precisa ser da mesma espécie
//     (o banco também garante isso com a FK composta ANIM_FK_03);
//   - data de nascimento OU idade estimada: com a idade, a API calcula uma data
//     aproximada e marca ANIM_FL_NASC_ESTIMADA = 1;
//   - DELETE só inativa (consultas, vacinas e integrações continuam no histórico).
// A ficha (GET /api/animais/:id) também mostra o microchip e a situação da
// integração com o governo (enunciado 3.7, item 6).
const crypto = require('crypto');
const { db, transacao } = require('../database/conexao');
const { ErroApi } = require('../utils/erroApi');
const v = require('../utils/validacao');
const integracaoService = require('./integracaoService');

const COLUNAS = `
    a.ANIM_ID_ANIMAL        AS id,
    a.ANIM_NM_ANIMAL        AS nome,
    a.ANIM_DT_NASCIMENTO    AS dataNascimento,
    a.ANIM_FL_NASC_ESTIMADA AS nascimentoEstimado,
    a.ANIM_FL_SEXO          AS sexo,
    a.ANIM_DS_COR           AS cor,
    a.ANIM_VL_PESO_ATUAL    AS peso,
    a.ANIM_DS_SITUACAO      AS situacao,
    a.TUTO_ID_TUTOR         AS tutorId,
    t.TUTO_NM_TUTOR         AS tutorNome,
    a.ESPE_ID_ESPECIE       AS especieId,
    es.ESPE_NM_ESPECIE      AS especieNome,
    a.RACA_ID_RACA          AS racaId,
    r.RACA_NM_RACA          AS racaNome,
    mc.VIMI_CD_MICROCHIP    AS microchip`;

const JUNCOES = `
      FROM VET_ANIMAL a
      JOIN VET_TUTOR   t  ON t.TUTO_ID_TUTOR    = a.TUTO_ID_TUTOR
      JOIN VET_ESPECIE es ON es.ESPE_ID_ESPECIE = a.ESPE_ID_ESPECIE
      LEFT JOIN VET_RACA r ON r.RACA_ID_RACA    = a.RACA_ID_RACA
      LEFT JOIN VET_VINCULO_MICROCHIP mc
             ON mc.ANIM_ID_ANIMAL = a.ANIM_ID_ANIMAL AND mc.VIMI_DS_SITUACAO = 'ativo'`;

const sqlBuscar = db.prepare(`SELECT ${COLUNAS} ${JUNCOES} WHERE a.ANIM_ID_ANIMAL = ?`);

// Busca por parte do nome do animal, do nome do tutor ou do microchip
const sqlListar = db.prepare(`
    SELECT ${COLUNAS} ${JUNCOES}
     WHERE (:situacao  IS NULL OR a.ANIM_DS_SITUACAO = :situacao)
       AND (:tutorId   IS NULL OR a.TUTO_ID_TUTOR = :tutorId)
       AND (:especieId IS NULL OR a.ESPE_ID_ESPECIE = :especieId)
       AND (:busca IS NULL
            OR a.ANIM_NM_ANIMAL LIKE '%' || :busca || '%'
            OR t.TUTO_NM_TUTOR  LIKE '%' || :busca || '%'
            OR mc.VIMI_CD_MICROCHIP LIKE '%' || :busca || '%')
     ORDER BY a.ANIM_NM_ANIMAL, a.ANIM_ID_ANIMAL
`);

const sqlTutor = db.prepare(`
    SELECT TUTO_ID_TUTOR AS id, TUTO_NM_TUTOR AS nome, TUTO_NR_CPF AS cpf,
           TUTO_NR_TELEFONE AS telefone, TUTO_DS_EMAIL AS email, TUTO_DS_SITUACAO AS situacao
      FROM VET_TUTOR WHERE TUTO_ID_TUTOR = ?
`);
const sqlEspecie = db.prepare(`
    SELECT ESPE_ID_ESPECIE AS id, ESPE_NM_ESPECIE AS nome, ESPE_DS_SITUACAO AS situacao
      FROM VET_ESPECIE WHERE ESPE_ID_ESPECIE = ?
`);
const sqlRaca = db.prepare(`
    SELECT RACA_ID_RACA AS id, RACA_NM_RACA AS nome, ESPE_ID_ESPECIE AS especieId, RACA_DS_SITUACAO AS situacao
      FROM VET_RACA WHERE RACA_ID_RACA = ?
`);

// Histórico de microchips do animal (o vínculo é feito pela rota do Cristiano)
const sqlMicrochips = db.prepare(`
    SELECT m.VIMI_ID_VINCULO             AS id,
           m.VIMI_CD_MICROCHIP           AS codigo,
           m.VIMI_DS_SITUACAO            AS situacao,
           m.VIMI_DT_VINCULO             AS dataVinculo,
           m.VIMI_DT_SUBSTITUICAO        AS dataSubstituicao,
           m.VIMI_DS_MOTIVO_SUBSTITUICAO AS motivoSubstituicao,
           v.VETE_NM_VETERINARIO         AS veterinarioNome
      FROM VET_VINCULO_MICROCHIP m
      JOIN VET_VETERINARIO v ON v.VETE_ID_VETERINARIO = m.VETE_ID_VETERINARIO
     WHERE m.ANIM_ID_ANIMAL = ?
     ORDER BY m.VIMI_DT_VINCULO DESC, m.VIMI_ID_VINCULO DESC
`);

const sqlInserir = db.prepare(`
    INSERT INTO VET_ANIMAL
        (TUTO_ID_TUTOR, ESPE_ID_ESPECIE, RACA_ID_RACA, ANIM_NM_ANIMAL, ANIM_DT_NASCIMENTO,
         ANIM_FL_NASC_ESTIMADA, ANIM_FL_SEXO, ANIM_DS_COR, ANIM_VL_PESO_ATUAL)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const sqlAlterar = db.prepare(`
    UPDATE VET_ANIMAL
       SET TUTO_ID_TUTOR         = ?,
           ESPE_ID_ESPECIE       = ?,
           RACA_ID_RACA          = ?,
           ANIM_NM_ANIMAL        = ?,
           ANIM_DT_NASCIMENTO    = ?,
           ANIM_FL_NASC_ESTIMADA = ?,
           ANIM_FL_SEXO          = ?,
           ANIM_DS_COR           = ?,
           ANIM_VL_PESO_ATUAL    = ?
     WHERE ANIM_ID_ANIMAL = ?
`);

const sqlCriarPendenciaGov = db.prepare(`
    INSERT INTO VET_INTEGRACAO_GOV
        (ANIM_ID_ANIMAL, INGO_DS_TIPO_OPERACAO, INGO_DS_CHAVE_IDEMPOTENCIA, INGO_CD_MICROCHIP)
    VALUES (?, 'ATUALIZACAO_ANIMAL', ?, ?)
`);

const sqlInativar = db.prepare(`UPDATE VET_ANIMAL SET ANIM_DS_SITUACAO = 'inativo' WHERE ANIM_ID_ANIMAL = ?`);

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

// Data aproximada a partir da idade estimada (anos + meses): mesmo dia de hoje,
// tantos meses atrás (se o mês não tiver esse dia, usa o último dia do mês).
function dataPelaIdade(anos, meses) {
    const hoje = new Date();
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (anos * 12 + meses), 1);
    const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(hoje.getDate(), ultimoDia));
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function inteiro(erros, corpo, campo, max) {
    const valor = corpo[campo];
    if (valor === undefined || valor === null || valor === '') return 0;
    const n = Number(valor);
    if (!Number.isInteger(n) || n < 0 || n > max) {
        erros.push(`${campo}: número inteiro de 0 a ${max}`);
        return 0;
    }
    return n;
}

// Recebe o corpo da requisição e devolve os campos limpos.
// "parcial = true" (alteração): só valida o que foi enviado.
function validarDados(corpo, parcial) {
    const erros = [];
    const dados = {};
    const enviado = (campo) => corpo[campo] !== undefined;

    if (!parcial || enviado('nome')) {
        dados.nome = v.texto(erros, corpo, 'nome', { obrigatorio: true, max: 100 });
    }
    for (const campo of ['tutorId', 'especieId']) {
        if (!parcial || enviado(campo)) {
            try {
                dados[campo] = v.id(corpo[campo], campo);
            } catch (erro) {
                erros.push(`${campo}: obrigatório, número inteiro positivo`);
            }
        }
    }
    if (!parcial || enviado('racaId')) {
        if (corpo.racaId === undefined || corpo.racaId === null || corpo.racaId === '') {
            dados.racaId = null;
        } else {
            try {
                dados.racaId = v.id(corpo.racaId, 'racaId');
            } catch (erro) {
                erros.push('racaId: número inteiro positivo (ou vazio para "sem raça")');
            }
        }
    }
    if (!parcial || enviado('sexo')) {
        const sexo = typeof corpo.sexo === 'string' ? corpo.sexo.trim().toUpperCase() : corpo.sexo;
        if (sexo === undefined || sexo === null || sexo === '') dados.sexo = null;
        else if (sexo === 'M' || sexo === 'F') dados.sexo = sexo;
        else erros.push('sexo: use "M", "F" ou deixe vazio');
    }
    if (!parcial || enviado('cor')) {
        dados.cor = v.texto(erros, corpo, 'cor', { max: 50 });
    }
    if (!parcial || enviado('peso')) {
        dados.peso = v.numero(erros, corpo, 'peso', { min: 0.01, max: 9999.99, mensagem: 'peso em kg, maior que zero' });
    }

    // Data de nascimento OU idade estimada (idadeAnos / idadeMeses)
    const temData = corpo.dataNascimento !== undefined && corpo.dataNascimento !== null && corpo.dataNascimento !== '';
    const temIdade = ['idadeAnos', 'idadeMeses'].some((c) => corpo[c] !== undefined && corpo[c] !== null && corpo[c] !== '');
    if (temData && temIdade) {
        erros.push('dataNascimento: informe a data de nascimento OU a idade estimada, não os dois');
    } else if (temData) {
        dados.dataNascimento = v.data(erros, corpo, 'dataNascimento');
        dados.nascimentoEstimado = 0;
        if (dados.dataNascimento && dados.dataNascimento > v.hojeLocal()) {
            erros.push('dataNascimento: não pode estar no futuro');
        }
    } else if (temIdade) {
        const anos = inteiro(erros, corpo, 'idadeAnos', 50);
        const meses = inteiro(erros, corpo, 'idadeMeses', 11);
        if (anos === 0 && meses === 0) erros.push('idadeAnos/idadeMeses: informe uma idade maior que zero');
        dados.dataNascimento = dataPelaIdade(anos, meses);
        dados.nascimentoEstimado = 1;
    } else if (!parcial) {
        erros.push('dataNascimento: obrigatória (AAAA-MM-DD) ou informe idadeAnos/idadeMeses');
    }

    v.lancarSeHouverErros(erros);
    return dados;
}

// Confere tutor, espécie e raça no banco. "mudou" diz o que foi enviado agora:
// só exige "ativo" de quem está sendo colocado no animal.
function conferirRelacionamentos(dados, mudou) {
    const tutor = sqlTutor.get(dados.tutorId);
    if (!tutor) throw new ErroApi(404, 'TUTOR_NAO_ENCONTRADO', 'Tutor não encontrado.');
    if (mudou.tutor && tutor.situacao !== 'ativo') {
        throw new ErroApi(409, 'TUTOR_INATIVO', 'O tutor está inativo. Escolha um tutor ativo.');
    }

    const especie = sqlEspecie.get(dados.especieId);
    if (!especie) throw new ErroApi(404, 'ESPECIE_NAO_ENCONTRADA', 'Espécie não encontrada.');
    if (mudou.especie && especie.situacao !== 'ativo') {
        throw new ErroApi(409, 'ESPECIE_INATIVA', 'A espécie está inativa.');
    }

    if (dados.racaId !== null) {
        const raca = sqlRaca.get(dados.racaId);
        if (!raca) throw new ErroApi(404, 'RACA_NAO_ENCONTRADA', 'Raça não encontrada.');
        if (raca.especieId !== especie.id) {
            throw new ErroApi(400, 'RACA_INCOMPATIVEL',
                `A raça "${raca.nome}" não é da espécie "${especie.nome}". Escolha uma raça da mesma espécie.`);
        }
        if (mudou.raca && raca.situacao !== 'ativo') {
            throw new ErroApi(409, 'RACA_INATIVA', 'A raça está inativa.');
        }
    }
}

function formatar(animal) {
    return { ...animal, nascimentoEstimado: animal.nascimentoEstimado === 1 };
}

// ---------------------------------------------------------------------------
// Operações
// ---------------------------------------------------------------------------

function buscarSimples(id) {
    const animal = sqlBuscar.get(v.id(id, 'id do animal'));
    if (!animal) throw new ErroApi(404, 'ANIMAL_NAO_ENCONTRADO', 'Animal não encontrado.');
    return formatar(animal);
}

// GET /api/animais/:id  -> ficha: dados, tutor, microchips e integrações com o governo
function buscar(id) {
    const animal = buscarSimples(id);
    return {
        ...animal,
        tutor: sqlTutor.get(animal.tutorId),
        microchips: sqlMicrochips.all(animal.id),
        integracoesGov: integracaoService.listar({ animalId: String(animal.id) }),
    };
}

// GET /api/animais?busca=&tutorId=&especieId=&situacao=
function listar(query) {
    const erros = [];
    const situacao = v.opcao(erros, query, 'situacao', ['ativo', 'inativo'], null);
    v.lancarSeHouverErros(erros);
    const tutorId = query.tutorId === undefined ? null : v.id(query.tutorId, 'tutorId');
    const especieId = query.especieId === undefined ? null : v.id(query.especieId, 'especieId');
    const busca = typeof query.busca === 'string' && query.busca.trim() ? query.busca.trim() : null;
    return sqlListar.all({ situacao, tutorId, especieId, busca }).map(formatar);
}

// POST /api/animais
function criar(corpo) {
    const dados = validarDados(corpo || {}, false);
    conferirRelacionamentos(dados, { tutor: true, especie: true, raca: true });

    const r = sqlInserir.run(dados.tutorId, dados.especieId, dados.racaId, dados.nome, dados.dataNascimento,
        dados.nascimentoEstimado, dados.sexo, dados.cor, dados.peso);
    return buscar(Number(r.lastInsertRowid));
}

// PUT /api/animais/:id  (só os campos enviados mudam)
function alterar(id, corpo) {
    corpo = corpo || {};
    const atual = buscarSimples(id);
    const novos = validarDados(corpo, true);
    if (Object.keys(novos).length === 0) {
        throw new ErroApi(400, 'DADOS_INVALIDOS', 'Nenhum campo para alterar foi enviado.');
    }
    if (atual.situacao !== 'ativo') {
        throw new ErroApi(409, 'ANIMAL_INATIVO', 'Não é possível alterar um animal inativo.');
    }

    const dados = { ...atual, nascimentoEstimado: atual.nascimentoEstimado ? 1 : 0, ...novos };
    conferirRelacionamentos(dados, {
        tutor: novos.tutorId !== undefined && novos.tutorId !== atual.tutorId,
        especie: novos.especieId !== undefined && novos.especieId !== atual.especieId,
        raca: novos.racaId !== undefined && novos.racaId !== atual.racaId,
    });

    transacao(() => {
        sqlAlterar.run(dados.tutorId, dados.especieId, dados.racaId, dados.nome, dados.dataNascimento,
            dados.nascimentoEstimado, dados.sexo, dados.cor, dados.peso, atual.id);
        // A new key preserves edits made while an earlier request is still in flight.
        if (atual.microchip) {
            sqlCriarPendenciaGov.run(atual.id, crypto.randomUUID(), atual.microchip);
        }
    });
    return buscar(atual.id);
}

// DELETE /api/animais/:id  -> INATIVA (não apaga do banco)
function inativar(id) {
    const animal = buscarSimples(id);
    if (animal.situacao === 'inativo') {
        throw new ErroApi(409, 'ANIMAL_JA_INATIVO', 'Este animal já está inativo.');
    }
    sqlInativar.run(animal.id);
    return buscar(animal.id);
}

module.exports = { listar, buscar, criar, alterar, inativar };
