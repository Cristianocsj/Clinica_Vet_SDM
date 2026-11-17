const pool = require('../config/db');

// Listar todas as espécies (ex: Cachorro, Gato)
async function listarEspecies(req, res) {
    try {
        const [linhas] = await pool.execute('SELECT * FROM especie');
        return res.status(200).json(linhas);
    } catch (error) {
        return res.status(500).json({ erro: true, mensagem: 'Erro ao buscar espécies: ' + error.message });
    }
}

// Listar raças vinculadas a uma espécie específica (ex: Raças de Cachorro)
async function listarRacasPorEsp(req, res) {
    try {
        const { especie_id } = req.params;
        const [linhas] = await pool.execute('SELECT * FROM raca WHERE especie_id = ?', [especie_id]);
        return res.status(200).json(linhas);
    } catch (error) {
        return res.status(500).json({ erro: true, mensagem: 'Erro ao buscar raças: ' + error.message });
    }
}

module.exports = { listarEspecies, listarRacasPorEsp };