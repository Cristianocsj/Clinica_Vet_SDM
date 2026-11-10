// Rotas da comunicação com a API do governo. Todas exigem token (o server.js aplica o middleware autenticar).
// Ponte mínima: listar e enviar/reenviar manualmente. O reenvio automático é parte do Cristiano
// (ver docs/GUIA_INTEGRACAO_CRISTIANO.md).
const express = require('express');
const router = express.Router();
const integracaoService = require('../services/integracaoService');
const { responderErro } = require('../utils/erroApi');

// GET /api/integracoes?situacao=pendente&animalId=1  (filtros opcionais)
router.get('/integracoes', (req, res) => {
    try {
        return res.status(200).json(integracaoService.listar(req.query));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

// POST /api/integracoes/:id/enviar  -> tenta enviar agora (botão "Enviar" / "Reenviar")
// Responde 200 com a comunicação atualizada: veja o campo "situacao" e a "mensagem".
router.post('/integracoes/:id/enviar', async (req, res) => {
    try {
        return res.status(200).json(await integracaoService.enviar(req.params.id));
    } catch (erro) {
        return responderErro(res, erro);
    }
});

module.exports = router;
