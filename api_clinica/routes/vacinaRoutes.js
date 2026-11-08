// Rotas de vacinas. Todas exigem token (o server.js aplica o middleware autenticar).
const express = require('express');
const router = express.Router();
const vacinaService = require('../services/vacinaService');
const { responderErro } = require('../utils/erroApi');

// POST /api/vacinas
// Aplicada: { animalId, nome, tipo, fabricante, lote, validadeLote, dose,
//             dataAplicacao?, via?, proximaDose?, antirrabica?, observacoes? }
// Agendada: { animalId, nome, tipo, situacao: "agendada", dataAplicacao, ... }
// Antirrábica aplicada fica com o envio ao governo PENDENTE (campo integracaoGov).
router.post('/vacinas', (req, res) => {
    try {
        return res.status(201).json(vacinaService.registrar(req.body, req.veterinario.id));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// GET /api/vacinas/proximas-doses?dias=30&animalId=1  (os dois filtros são opcionais)
router.get('/vacinas/proximas-doses', (req, res) => {
    try {
        return res.status(200).json(vacinaService.proximasDoses(req.query));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// GET /api/animais/:id/vacinas  -> histórico, da mais recente para a mais antiga
router.get('/animais/:id/vacinas', (req, res) => {
    try {
        return res.status(200).json(vacinaService.historico(req.params.id));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

module.exports = router;
