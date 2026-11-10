// Rotas de consultas. Todas exigem token (o server.js aplica o middleware autenticar).
const express = require('express');
const router = express.Router();
const consultaService = require('../services/consultaService');
const { responderErro } = require('../utils/erroApi');

// POST /api/consultas
// Corpo: { animalId, motivo, dataHora?, anamnese?, sintomas?, diagnostico?, tratamento?,
//          prescricao?, peso?, temperatura?, observacoes?, status? }
// O veterinário da consulta é o que está logado.
router.post('/consultas', (req, res) => {
    try {
        return res.status(201).json(consultaService.registrar(req.body, req.veterinario.id));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// GET /api/animais/:id/consultas  -> histórico, da mais recente para a mais antiga
router.get('/animais/:id/consultas', (req, res) => {
    try {
        return res.status(200).json(consultaService.historico(req.params.id));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

module.exports = router;
