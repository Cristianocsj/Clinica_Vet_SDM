// Erro "esperado" da API: já sabe qual status HTTP e qual mensagem devolver.
// Formato da resposta (mesmo padrão da rota de CEP):
//   { "erro": true, "codigo": "VETERINARIO_INATIVO", "mensagem": "..." }
class ErroApi extends Error {
    constructor(status, codigo, mensagem) {
        super(mensagem);
        this.status = status;
        this.codigo = codigo;
    }
}

// Envia qualquer erro como JSON. Erros inesperados viram 500 sem expor detalhes internos.
function responderErro(res, erro) {
    if (erro instanceof ErroApi) {
        return res.status(erro.status).json({ erro: true, codigo: erro.codigo, mensagem: erro.message });
    }
    console.error(erro);
    return res.status(500).json({ erro: true, codigo: 'ERRO_INTERNO', mensagem: 'Erro interno no servidor.' });
}

module.exports = { ErroApi, responderErro };
