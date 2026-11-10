// Cadastro de tutores (teste 5) com busca de CEP pelo ViaCEP (teste 6)
montarMenu();

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const formulario = document.getElementById('formTutor');
const cartao = document.getElementById('cartaoFormulario');
const formFiltro = document.getElementById('formFiltro');
let idEmEdicao = null;
let tutoresNaTela = [];

formulario.uf.innerHTML = '<option value="">--</option>' + UFS.map((uf) => `<option>${uf}</option>`).join('');

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------

async function carregarTutores() {
    const filtro = lerFormulario(formFiltro);
    const parametros = new URLSearchParams();
    if (filtro.busca) parametros.set('busca', filtro.busca);
    if (filtro.situacao) parametros.set('situacao', filtro.situacao);

    const corpoTabela = document.getElementById('tabelaTutores');
    try {
        tutoresNaTela = await api('GET', `/tutores?${parametros}`);
        corpoTabela.innerHTML = tutoresNaTela.length ? tutoresNaTela.map((t) => `
            <tr>
                <td>${escapar(t.nome)}</td>
                <td class="text-nowrap">${formatarCpf(t.cpf)}</td>
                <td class="text-nowrap">${escapar(t.telefone)}</td>
                <td>${escapar(t.endereco.cidade)}/${escapar(t.endereco.uf)}</td>
                <td><a href="animais.html?tutorId=${t.id}">${t.qtdAnimaisAtivos}</a></td>
                <td>${etiquetaSituacao(t.situacao)}</td>
                <td class="text-nowrap text-end">
                    ${t.situacao === 'ativo' ? `
                        <a class="btn btn-sm btn-outline-success" href="animais.html?novo=1&tutorId=${t.id}">+ Animal</a>
                        <button class="btn btn-sm btn-outline-primary" data-editar="${t.id}">Editar</button>
                        <button class="btn btn-sm btn-outline-danger" data-inativar="${t.id}">Inativar</button>` : ''}
                </td>
            </tr>`).join('') : linhaAviso(7, 'Nenhum tutor encontrado.');
    } catch (erro) {
        corpoTabela.innerHTML = linhaAviso(7, 'Não foi possível carregar.');
        mostrarMensagem(erro.message);
    }
}

formFiltro.addEventListener('submit', (evento) => {
    evento.preventDefault();
    carregarTutores();
});

document.getElementById('tabelaTutores').addEventListener('click', async (evento) => {
    const idEditar = evento.target.dataset.editar;
    const idInativar = evento.target.dataset.inativar;
    if (idEditar) abrirFormulario(tutoresNaTela.find((t) => t.id === Number(idEditar)));
    if (idInativar && confirm('Inativar este tutor? Ele não some do sistema, só fica inativo.')) {
        try {
            await api('DELETE', `/tutores/${idInativar}`);
            mostrarMensagem('Tutor inativado.', 'success');
            carregarTutores();
        } catch (erro) {
            mostrarMensagem(erro.message);
        }
    }
});

// ---------------------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------------------

function abrirFormulario(tutor) {
    formulario.reset();
    idEmEdicao = tutor ? tutor.id : null;
    document.getElementById('tituloFormulario').textContent = tutor ? `Editar tutor: ${tutor.nome}` : 'Novo tutor';
    if (tutor) {
        preencherFormulario(formulario, { ...tutor, ...tutor.endereco, cpf: formatarCpf(tutor.cpf), cep: formatarCep(tutor.endereco.cep) });
    }
    document.getElementById('avisoCep').textContent = 'Digite o CEP e clique em Buscar (ViaCEP).';
    cartao.classList.remove('d-none');
    formulario.nome.focus();
}

document.getElementById('botaoNovo').addEventListener('click', () => abrirFormulario(null));
document.getElementById('botaoCancelar').addEventListener('click', () => cartao.classList.add('d-none'));

// Busca o CEP na API da clínica (que consulta o ViaCEP) e preenche o endereço
async function buscarCep() {
    const aviso = document.getElementById('avisoCep');
    const cep = somenteNumeros(formulario.cep.value);
    if (!cepValido(cep)) {
        aviso.textContent = 'O CEP tem 8 números.';
        aviso.className = 'form-text text-danger';
        return;
    }
    aviso.textContent = 'Buscando...';
    aviso.className = 'form-text';
    try {
        const endereco = await api('GET', `/cep/${cep}`);
        formulario.cep.value = formatarCep(cep);
        formulario.logradouro.value = endereco.logradouro || '';
        formulario.bairro.value = endereco.bairro || '';
        formulario.cidade.value = endereco.localidade || '';
        formulario.uf.value = endereco.uf || '';
        formulario.codigoIbge.value = endereco.ibge || '';
        aviso.textContent = 'Endereço encontrado. Complete o número e o complemento.';
        aviso.className = 'form-text text-success';
        formulario.numero.focus();
    } catch (erro) {
        // CEP inexistente, timeout ou ViaCEP fora do ar: a pessoa preenche à mão
        formulario.codigoIbge.value = '';
        aviso.textContent = `${erro.message} Você pode preencher o endereço à mão.`;
        aviso.className = 'form-text text-danger';
    }
}

document.getElementById('botaoCep').addEventListener('click', buscarCep);
formulario.cep.addEventListener('input', () => {
    formulario.codigoIbge.value = ''; // o código IBGE só vale para o CEP buscado
});
formulario.cep.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
        evento.preventDefault();
        buscarCep();
    }
});

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const d = lerFormulario(formulario);

    // Validação no navegador (a API valida de novo)
    const erros = [];
    if (d.nome.length < 3) erros.push('nome com pelo menos 3 letras');
    if (!cpfValido(d.cpf)) erros.push('CPF válido');
    if (d.email && !emailValido(d.email)) erros.push('e-mail válido (ou deixe vazio)');
    if (d.dataNascimento && d.dataNascimento > hojeISO()) erros.push('data de nascimento que não esteja no futuro');
    if (!cepValido(d.cep)) erros.push('CEP com 8 números');
    if (!d.cidade) erros.push('cidade');
    if (!d.uf) erros.push('UF');
    if (erros.length) return mostrarMensagem(`Confira: ${erros.join(', ')}.`, 'warning');

    const corpo = {
        nome: d.nome,
        cpf: somenteNumeros(d.cpf),
        telefone: vazioParaNull(d.telefone),
        email: vazioParaNull(d.email),
        dataNascimento: vazioParaNull(d.dataNascimento),
        endereco: {
            cep: somenteNumeros(d.cep),
            logradouro: vazioParaNull(d.logradouro),
            numero: vazioParaNull(d.numero),
            complemento: vazioParaNull(d.complemento),
            bairro: vazioParaNull(d.bairro),
            cidade: d.cidade,
            uf: d.uf,
            codigoIbge: vazioParaNull(d.codigoIbge),
        },
    };

    try {
        const salvo = await comBotaoOcupado(evento.submitter, () => idEmEdicao
            ? api('PUT', `/tutores/${idEmEdicao}`, corpo)
            : api('POST', '/tutores', corpo));
        mostrarMensagem(`Tutor ${salvo.nome} salvo.`, 'success');
        cartao.classList.add('d-none');
        carregarTutores();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
});

carregarTutores();
