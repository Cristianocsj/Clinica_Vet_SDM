// Confirmação de senha com o código "enviado por e-mail" (aparece no terminal da API)
const formulario = document.getElementById('formConfirmar');
if (parametroDaUrl('email')) formulario.email.value = parametroDaUrl('email');

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const dados = lerFormulario(formulario);
    if (!emailValido(dados.email)) return mostrarMensagem('Informe um e-mail válido.');
    if (!/^\d{6}$/.test(dados.codigo)) return mostrarMensagem('O código tem 6 números.');

    try {
        const resposta = await comBotaoOcupado(evento.submitter, () => api('POST', '/auth/confirmar-senha', dados));
        mostrarMensagem(`${resposta.mensagem} Volte para o login.`, 'success');
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
});

document.getElementById('botaoReenviar').addEventListener('click', async (evento) => {
    const email = formulario.email.value.trim();
    if (!emailValido(email)) return mostrarMensagem('Informe o e-mail para receber o código.');
    try {
        const resposta = await comBotaoOcupado(evento.target, () => api('POST', '/auth/reenviar-codigo', { email }));
        mostrarMensagem(`${resposta.mensagem} Olhe o terminal da API.`, 'info');
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
});
