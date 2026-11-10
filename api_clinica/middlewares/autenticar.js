// Protege as rotas: só deixa passar quem enviar um token válido no cabeçalho
//   Authorization: Bearer <token>
// Se passar, req.veterinario fica com { id, nome, email } do veterinário logado.
const { validarSessao } = require('../services/authService');
const { responderErro } = require('../utils/erroApi');

function autenticar(req, res, next) {
    const [tipo, token] = (req.headers.authorization || '').split(' ');

    if (tipo !== 'Bearer' || !token) {
        return res.status(401).json({
            erro: true,
            codigo: 'TOKEN_AUSENTE',
            mensagem: 'Acesso negado: faça login e envie o token no cabeçalho Authorization.',
        });
    }

    try {
        req.veterinario = validarSessao(token);
        req.token = token;
        return next();
    } catch (erro) {
        return responderErro(res, erro);
    }
}

module.exports = autenticar;
