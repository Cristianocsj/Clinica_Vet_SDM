const express = require('express');
const router = express.Router();

const { consultarCep } = require('../services/viaCepService');

// --- ROTA DE CEP (Já existente) ---
router.get('/cep/:cep', async (req, res) => {
    try {
        const { cep } = req.params;
        const dadosEndereco = await consultarCep(cep);
        return res.status(200).json(dadosEndereco);
    } catch (error) {
        return res.status(400).json({
            erro: true,
            mensagem: error.message
        });
    }
});

// Tutores, espécies, raças e animais ficam em tutorRoutes.js, especieRacaRoutes.js e
// animalRoutes.js (banco SQLite). Os controllers em MySQL foram retirados: o projeto não usa MySQL.

module.exports = router;
