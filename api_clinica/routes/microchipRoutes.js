// Rotas de microchip. O server.js aplica autenticação a todas elas.
const express = require('express');
const router = express.Router();
const microchipService = require('../services/microchipService');
const integracaoService = require('../services/integracaoService');
const { responderErro } = require('../utils/erroApi');

// POST /api/animais/:id/microchip
// Corpo: { microchip: "15 dígitos" }. O veterinário vem da sessão autenticada.
// Depois do vínculo a clínica já tenta cadastrar o animal no governo (teste 11).
router.post('/animais/:id/microchip', async (req, res) => {
    try {
        const vinculo = microchipService.vincular(req.params.id, req.body, req.veterinario.id);
        await integracaoService.enviarPendentesDoAnimal(vinculo.animalId);
        return res.status(201).json(vinculo);
    } catch (erro) {
        return responderErro(res, erro);
    }
});

module.exports = router;
