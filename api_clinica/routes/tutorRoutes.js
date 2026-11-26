// Rotas de tutores. Todas exigem token (o server.js aplica o middleware autenticar).
const express = require('express');
const router = express.Router();
const tutorService = require('../services/tutorService');
const { responderErro } = require('../utils/erroApi');

// GET /api/tutores?busca=carlos&situacao=ativo  (os dois filtros são opcionais)
router.get('/tutores', (req, res) => {
    try {
        return res.status(200).json(tutorService.listar(req.query));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// GET /api/tutores/:id  -> tutor, endereço e animais
router.get('/tutores/:id', (req, res) => {
    try {
        return res.status(200).json(tutorService.buscar(req.params.id));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// POST /api/tutores
// Corpo: { nome, cpf, telefone?, email?, dataNascimento?,
//          endereco: { cep, logradouro?, numero?, complemento?, bairro?, cidade, uf, codigoIbge?, cadastroManual? ('S'/'N', padrão 'N') } }
router.post('/tutores', (req, res) => {
    try {
        return res.status(201).json(tutorService.criar(req.body));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// PUT /api/tutores/:id  -> envie só os campos que quer mudar (o endereço também pode ser parcial)
router.put('/tutores/:id', (req, res) => {
    try {
        return res.status(200).json(tutorService.alterar(req.params.id, req.body));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// DELETE /api/tutores/:id  -> INATIVA (não apaga do banco)
router.delete('/tutores/:id', (req, res) => {
    try {
        return res.status(200).json(tutorService.inativar(req.params.id));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

module.exports = router;
