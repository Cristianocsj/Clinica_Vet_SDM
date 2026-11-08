const express = require('express');
const router = express.Router();
const { login } = require('../services/authService');
const autenticar = require('../middlewares/autenticar');
const { responderErro } = require('../utils/erroApi');

// POST /api/auth/login  (pública)
// Corpo: { "email": "...", "senha": "..." }
router.post('/login', (req, res) => {
    try {
        const resultado = login(req.body?.email, req.body?.senha);
        return res.status(200).json(resultado);
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// GET /api/auth/sessao  (protegida)
// Devolve o veterinário dono do token; útil para o frontend saber quem está logado.
router.get('/sessao', autenticar, (req, res) => {
    return res.status(200).json({ veterinario: req.veterinario });
});

module.exports = router;
