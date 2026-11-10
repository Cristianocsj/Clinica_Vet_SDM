// Rotas do catálogo de espécies e raças. Todas exigem token (o server.js aplica o middleware autenticar).
const express = require('express');
const router = express.Router();
const service = require('../services/especieRacaService');
const { responderErro } = require('../utils/erroApi');

// ---------------------------------------------------------------------------
// Espécies
// ---------------------------------------------------------------------------

// GET /api/especies?situacao=ativo
router.get('/especies', (req, res) => {
    try {
        return res.status(200).json(service.listarEspecies(req.query));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// GET /api/especies/:id
router.get('/especies/:id', (req, res) => {
    try {
        return res.status(200).json(service.buscarEspecie(req.params.id));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// POST /api/especies  { nome, descricao? }  -> já cria a raça "Sem raça definida"
router.post('/especies', (req, res) => {
    try {
        return res.status(201).json(service.criarEspecie(req.body));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// PUT /api/especies/:id  { nome?, descricao? }
router.put('/especies/:id', (req, res) => {
    try {
        return res.status(200).json(service.alterarEspecie(req.params.id, req.body));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// DELETE /api/especies/:id  -> INATIVA (não apaga do banco)
router.delete('/especies/:id', (req, res) => {
    try {
        return res.status(200).json(service.inativarEspecie(req.params.id));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// ---------------------------------------------------------------------------
// Raças
// ---------------------------------------------------------------------------

// GET /api/racas?especieId=1&situacao=ativo  (filtros opcionais)
router.get('/racas', (req, res) => {
    try {
        return res.status(200).json(service.listarRacas(req.query));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// GET /api/racas/:id
router.get('/racas/:id', (req, res) => {
    try {
        return res.status(200).json(service.buscarRaca(req.params.id));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// POST /api/racas  { nome, especieId, descricao? }
router.post('/racas', (req, res) => {
    try {
        return res.status(201).json(service.criarRaca(req.body));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// PUT /api/racas/:id  { nome?, descricao? }  (a espécie da raça não muda)
router.put('/racas/:id', (req, res) => {
    try {
        return res.status(200).json(service.alterarRaca(req.params.id, req.body));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// DELETE /api/racas/:id  -> INATIVA (não apaga do banco)
router.delete('/racas/:id', (req, res) => {
    try {
        return res.status(200).json(service.inativarRaca(req.params.id));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

module.exports = router;
