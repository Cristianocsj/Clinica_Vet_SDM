// Rotas de microchip. O server.js aplica autenticação a todas elas.
const express = require('express');
const router = express.Router();
const microchipService = require('../services/microchipService');
const { responderErro } = require('../utils/erroApi');

// POST /api/animais/:id/microchip
// Corpo: { microchip: "15 dígitos" }. O veterinário vem da sessão autenticada.
router.post('/animais/:id/microchip', (req, res) => {
    try {
        return res.status(201).json(
            microchipService.vincular(req.params.id, req.body, req.veterinario.id)
        );
    } catch (erro) {
        return responderErro(res, erro);
    }
});

module.exports = router;
