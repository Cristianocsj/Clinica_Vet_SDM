// Rotas de vacinas. Todas exigem token (o server.js aplica o middleware autenticar).
const express = require('express');
const router = express.Router();
const vacinaService = require('../services/vacinaService');
const integracaoService = require('../services/integracaoService');
const { responderErro } = require('../utils/erroApi');

// POST /api/vacinas
// Aplicada: { animalId, nome, tipo, fabricante, lote, validadeLote, dose,
//             dataAplicacao?, via?, proximaDose?, antirrabica?, observacoes? }
// Agendada: { animalId, nome, tipo, situacao: "agendada", dataAplicacao, ... }
// Antirrábica aplicada: a clínica já tenta enviar ao governo na hora (RF24).
// Se o governo falhar, a vacina continua salva e o envio fica PENDENTE (campo integracaoGov).
router.post('/vacinas', async (req, res) => {
    try {
        const vacina = vacinaService.registrar(req.body, req.veterinario.id);
        if (!vacina.integracaoGov) return res.status(201).json(vacina);
        await integracaoService.enviarPendentesDoAnimal(vacina.animalId);
        return res.status(201).json(vacinaService.buscar(vacina.id));
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

// PUT /api/vacinas/:id   Corpo: { via?, proximaDose?, observacoes? }
router.put('/vacinas/:id', (req, res) => {
    try {
        return res.status(200).json(vacinaService.alterar(req.params.id, req.body));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// PUT /api/vacinas/:id/cancelar   Corpo: { motivo }
router.put('/vacinas/:id/cancelar', (req, res) => {
    try {
        return res.status(200).json(vacinaService.cancelar(req.params.id, req.body));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

module.exports = router;
