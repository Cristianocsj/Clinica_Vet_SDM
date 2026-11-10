// Cadastro de veterinários (quem pode entrar no sistema)
const sessao = exigirLogin();
montarMenu();

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const formulario = document.getElementById('formVeterinario');
const cartao = document.getElementById('cartaoFormulario');
const formFiltro = document.getElementById('formFiltro');
let idEmEdicao = null;
let veterinariosNaTela = [];

formulario.ufCrmv.innerHTML = '<option value="">--</option>' + UFS.map((uf) => `<option>${uf}</option>`).join('');

async function carregarVeterinarios() {
    const { status } = lerFormulario(formFiltro);
    const corpoTabela = document.getElementById('tabelaVeterinarios');
    try {
        veterinariosNaTela = await api('GET', `/veterinarios${status ? `?status=${status}` : ''}`);
        corpoTabela.innerHTML = veterinariosNaTela.map((v) => `
            <tr>
                <td>${escapar(v.nome)}</td>
                <td class="text-nowrap">${escapar(v.ufCrmv)}-${escapar(v.crmv)}</td>
                <td>${escapar(v.email)}</td>
                <td class="text-nowrap">${escapar(v.telefone)}</td>
                <td>${v.senhaConfirmada ? '<span class="badge text-bg-success">confirmada</span>'
                    : `<a class="badge text-bg-warning text-decoration-none" href="confirmar-senha.html?email=${encodeURIComponent(v.email)}">confirmar</a>`}</td>
                <td>${etiquetaSituacao(v.status)}</td>
                <td class="texto-pequeno">${formatarDataHora(v.ultimoAcesso)}</td>
                <td class="text-nowrap text-end">${v.status === 'ativo' ? `
                    <button class="btn btn-sm btn-outline-primary" data-editar="${v.id}">Editar</button>
                    ${v.id !== sessao.veterinario.id ? `<button class="btn btn-sm btn-outline-danger" data-inativar="${v.id}">Inativar</button>` : ''}` : ''}
                </td>
            </tr>`).join('') || linhaAviso(8, 'Nenhum veterinário encontrado.');
    } catch (erro) {
        corpoTabela.innerHTML = linhaAviso(8, 'Não foi possível carregar.');
        mostrarMensagem(erro.message);
    }
}

formFiltro.addEventListener('submit', (evento) => {
    evento.preventDefault();
    carregarVeterinarios();
});

document.getElementById('tabelaVeterinarios').addEventListener('click', async (evento) => {
    const idEditar = evento.target.dataset.editar;
    const idInativar = evento.target.dataset.inativar;
    if (idEditar) abrirFormulario(veterinariosNaTela.find((v) => v.id === Number(idEditar)));
    if (idInativar && confirm('Inativar este veterinário? Ele não conseguirá mais entrar no sistema.')) {
        try {
            await api('DELETE', `/veterinarios/${idInativar}`);
            mostrarMensagem('Veterinário inativado.', 'success');
            carregarVeterinarios();
        } catch (erro) {
            mostrarMensagem(erro.message);
        }
    }
});

function abrirFormulario(vet) {
    formulario.reset();
    idEmEdicao = vet ? vet.id : null;
    document.getElementById('tituloFormulario').textContent = vet ? `Editar veterinário: ${vet.nome}` : 'Novo veterinário';
    document.getElementById('obsSenha').textContent = vet ? '(deixe vazio para não trocar)' : '*';
    if (vet) preencherFormulario(formulario, { ...vet, cpf: formatarCpf(vet.cpf) });
    cartao.classList.remove('d-none');
    formulario.nome.focus();
}

document.getElementById('botaoNovo').addEventListener('click', () => abrirFormulario(null));
document.getElementById('botaoCancelar').addEventListener('click', () => cartao.classList.add('d-none'));

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const d = lerFormulario(formulario);

    const erros = [];
    if (d.nome.length < 3) erros.push('nome com pelo menos 3 letras');
    if (!cpfValido(d.cpf)) erros.push('CPF válido');
    if (!/^\d{1,10}$/.test(somenteNumeros(d.crmv))) erros.push('CRMV (só números)');
    if (!d.ufCrmv) erros.push('UF do CRMV');
    if (!emailValido(d.email)) erros.push('e-mail válido');
    if ((!idEmEdicao || d.senha) && d.senha.length < 8) erros.push('senha com pelo menos 8 caracteres');
    if (erros.length) return mostrarMensagem(`Confira: ${erros.join(', ')}.`, 'warning');

    const corpo = {
        nome: d.nome,
        cpf: somenteNumeros(d.cpf),
        crmv: somenteNumeros(d.crmv),
        ufCrmv: d.ufCrmv,
        email: d.email,
        telefone: vazioParaNull(d.telefone),
    };
    if (d.senha) corpo.senha = d.senha;

    try {
        const salvo = await comBotaoOcupado(evento.submitter, () => idEmEdicao
            ? api('PUT', `/veterinarios/${idEmEdicao}`, corpo)
            : api('POST', '/veterinarios', corpo));
        mostrarMensagem(salvo.senhaConfirmada
            ? `Veterinário ${salvo.nome} salvo.`
            : `Veterinário ${salvo.nome} salvo. Antes de entrar, ele precisa confirmar a senha com o código que apareceu no terminal da API.`,
        'success');
        cartao.classList.add('d-none');
        carregarVeterinarios();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
});

carregarVeterinarios();
