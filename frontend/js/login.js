// Tela de login (testes 1 a 4)
if (lerSessao()) window.location.href = 'painel.html';

if (parametroDaUrl('sessao') === 'expirada') {
    mostrarMensagem('Sua sessão terminou. Faça login de novo.', 'warning');
}

document.getElementById('formLogin').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const dados = lerFormulario(evento.target);

    if (!emailValido(dados.email) || !dados.senha) {
        return mostrarMensagem('Informe um e-mail válido e a senha.');
    }

    const botao = evento.target.querySelector('button[type=submit]');
    try {
        const resposta = await comBotaoOcupado(botao, () => api('POST', '/auth/login', dados));
        salvarSessao(resposta);
        window.location.href = 'painel.html';
    } catch (erro) {
        if (erro.codigo === 'SENHA_NAO_CONFIRMADA') {
            mostrarMensagem(`${erro.message} Vá em "Confirmar senha" (o código aparece no terminal da API).`, 'warning');
        } else {
            mostrarMensagem(erro.message);
        }
    }
});
