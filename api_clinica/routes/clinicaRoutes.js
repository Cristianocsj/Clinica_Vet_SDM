const express = require('express');
const router = express.Router();
const { consultarCep } = require('../services/viaCepService');

// Rota para consultar o CEP (consumida pelo frontend)
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

module.exports = router;