// Rotas de veterinários. Todas exigem token (o server.js aplica o middleware autenticar).
const express = require('express');
const router = express.Router();
const veterinarioService = require('../services/veterinarioService');
const { responderErro } = require('../utils/erroApi');

// GET /api/veterinarios            -> todos
// GET /api/veterinarios?status=ativo  (ou inativo)
router.get('/', (req, res) => {
    try {
        return res.status(200).json(veterinarioService.listar(req.query.status));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// GET /api/veterinarios/:id
router.get('/:id', (req, res) => {
    try {
        return res.status(200).json(veterinarioService.buscar(req.params.id));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// POST /api/veterinarios
// Corpo: { nome, cpf, crmv, ufCrmv, email, telefone (opcional), senha }
// O código de confirmação da senha aparece no console da API.
router.post('/', (req, res) => {
    try {
        return res.status(201).json(veterinarioService.criar(req.body));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// PUT /api/veterinarios/:id
// Envie só os campos que quer mudar: nome, cpf, crmv, ufCrmv, email, telefone, senha
router.put('/:id', (req, res) => {
    try {
        return res.status(200).json(veterinarioService.alterar(req.params.id, req.body));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// DELETE /api/veterinarios/:id  -> INATIVA (não apaga do banco)
router.delete('/:id', (req, res) => {
    try {
        return res.status(200).json(veterinarioService.inativar(req.params.id, req.veterinario.id));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

module.exports = router;
