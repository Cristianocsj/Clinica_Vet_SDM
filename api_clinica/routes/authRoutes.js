const express = require('express');
const router = express.Router();
const { login, encerrarSessao, reenviarCodigo, confirmarSenha } = require('../services/authService');
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

// POST /api/auth/confirmar-senha  (pública: quem ainda não confirmou não consegue logar)
// Corpo: { "email": "...", "codigo": "123456" }  -> o código aparece no console da API
router.post('/confirmar-senha', (req, res) => {
    try {
        confirmarSenha(req.body?.email, req.body?.codigo);
        return res.status(200).json({ mensagem: 'Senha confirmada. Já é possível fazer login.' });
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// POST /api/auth/reenviar-codigo  (pública)
// Corpo: { "email": "..." }  -> gera um código novo e mostra no console da API
router.post('/reenviar-codigo', (req, res) => {
    try {
        reenviarCodigo(req.body?.email);
        return res.status(200).json({
            mensagem: 'Se o e-mail estiver cadastrado e com a senha pendente, um novo código foi enviado.',
        });
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// POST /api/auth/logout  (protegida)
// O token enviado deixa de valer imediatamente.
router.post('/logout', autenticar, (req, res) => {
    encerrarSessao(req.token);
    return res.status(200).json({ mensagem: 'Logout realizado.' });
});

// GET /api/auth/sessao  (protegida)
// Devolve o veterinário dono do token; útil para o frontend saber quem está logado.
router.get('/sessao', autenticar, (req, res) => {
    return res.status(200).json({ veterinario: req.veterinario });
});

module.exports = router;
