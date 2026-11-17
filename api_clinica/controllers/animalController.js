const pool = require('../config/db');

async function cadastrarAnimal(req, res) {
    try {
        const { nome, especie_id, raca_id, tutor_id, microchip_id, sexo, cor, peso_atual, dt_nascimento, idade_estimada } = req.body;

        if (!nome || !especie_id || !tutor_id || !microchip_id) {
            return res.status(400).json({ erro: true, mensagem: 'Nome, espécie, tutor e microchip são obrigatórios.' });
        }

        let dataNascimentoFinal = dt_nascimento || null;
        let nascimentoEstimado = 0;

        if (!dt_nascimento && idade_estimada) {
            const anoAtual = new Date().getFullYear();
            const anoEstimado = anoAtual - parseInt(idade_estimada);
            dataNascimentoFinal = `${anoEstimado}-01-01`;
            nascimentoEstimado = 1;
        }

        const [resultado] = await pool.execute(
            `INSERT INTO animal (nome, especie_id, raca_id, tutor_id, microchip_id, sexo, cor, peso_atual, dt_nascimento, dt_nascimento_estimada) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nome,
                especie_id,
                raca_id || null,
                tutor_id,
                microchip_id,
                sexo || null,
                cor || null,
                peso_atual || null,
                dataNascimentoFinal,
                nascimentoEstimado
            ]
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Animal cadastrado com sucesso!',
            animal_id: resultado.insertId
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ erro: true, mensagem: 'Este microchip RFID já está cadastrado no sistema.' });
        }
        return res.status(500).json({ erro: true, mensagem: 'Erro interno: ' + error.message });
    }
}

module.exports = { cadastrarAnimal };