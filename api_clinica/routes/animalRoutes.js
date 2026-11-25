
// O histórico de consultas e de vacinas fica nas rotas da Bia:
//   GET /api/animais/:id/consultas  e  GET /api/animais/:id/vacinas
const express = require('express');
const router = express.Router();
const animalService = require('../services/animalService');
const integracaoService = require('../services/integracaoService');
const { responderErro } = require('../utils/erroApi');

// GET /api/animais?busca=rex&tutorId=1&especieId=1&situacao=ativo  (filtros opcionais)
router.get('/animais', (req, res) => {
    try {
        return res.status(200).json(animalService.listar(req.query));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// GET /api/animais/:id  -> ficha: dados, tutor, microchips e comunicações com o governo
router.get('/animais/:id', (req, res) => {
    try {
        return res.status(200).json(animalService.buscar(req.params.id));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// POST /api/animais
// Corpo: { nome, tutorId, especieId, racaId?, sexo? ("M"/"F"), cor?, peso?,
//          dataNascimento ("AAAA-MM-DD")  OU  idadeAnos? / idadeMeses? (idade estimada) }
router.post('/animais', (req, res) => {
    try {
        return res.status(201).json(animalService.criar(req.body));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// PUT /api/animais/:id  -> envie só os campos que quer mudar
// Animal com chip: a alteração já é enviada ao governo (teste 11).
router.put('/animais/:id', async (req, res) => {
    try {
        const animal = animalService.alterar(req.params.id, req.body);
        await integracaoService.enviarPendentesDoAnimal(animal.id);
        return res.status(200).json(animalService.buscar(animal.id));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// DELETE /api/animais/:id  -> INATIVA (não apaga do banco)
router.delete('/animais/:id', (req, res) => {
    try {
        return res.status(200).json(animalService.inativar(req.params.id));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

module.exports = router;
