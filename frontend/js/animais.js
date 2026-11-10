// Cadastro de animais: tutor obrigatório, raça da mesma espécie, data OU idade estimada
montarMenu();

const formulario = document.getElementById('formAnimal');
const cartao = document.getElementById('cartaoFormulario');
const formFiltro = document.getElementById('formFiltro');
const tutorDaUrl = parametroDaUrl('tutorId');
let idEmEdicao = null;
let animalEmEdicao = null;
let animaisNaTela = [];

// ---------------------------------------------------------------------------
// Listas dos campos de escolha
// ---------------------------------------------------------------------------

async function carregarEscolhas() {
    const [tutores, especies] = await Promise.all([
        api('GET', '/tutores?situacao=ativo'),
        api('GET', '/especies?situacao=ativo'),
    ]);
    formulario.tutorId.innerHTML = '<option value="">Escolha o tutor</option>'
        + tutores.map((t) => `<option value="${t.id}">${escapar(t.nome)} (CPF ${formatarCpf(t.cpf)})</option>`).join('');
    const opcoesEspecie = especies.map((e) => `<option value="${e.id}">${escapar(e.nome)}</option>`).join('');
    formulario.especieId.innerHTML = '<option value="">Escolha a espécie</option>' + opcoesEspecie;
    document.getElementById('filtroEspecie').innerHTML = '<option value="">Todas as espécies</option>' + opcoesEspecie;
}

// As raças dependem da espécie escolhida
async function carregarRacas(especieId, racaSelecionada) {
    const campo = formulario.racaId;
    if (!especieId) {
        campo.innerHTML = '<option value="">Escolha a espécie primeiro</option>';
        return;
    }
    const racas = await api('GET', `/racas?especieId=${especieId}&situacao=ativo`);
    campo.innerHTML = '<option value="">Não informada</option>'
        + racas.map((r) => `<option value="${r.id}">${escapar(r.nome)}</option>`).join('');
    campo.value = racaSelecionada || '';
}

formulario.especieId.addEventListener('change', () => carregarRacas(formulario.especieId.value).catch((e) => mostrarMensagem(e.message)));

// Data de nascimento OU idade estimada
function mostrarCamposNascimento() {
    const porIdade = document.getElementById('porIdade').checked;
    document.getElementById('campoData').classList.toggle('d-none', porIdade);
    document.querySelectorAll('.campoIdade').forEach((c) => c.classList.toggle('d-none', !porIdade));
}
document.querySelectorAll('input[name=tipoNascimento]').forEach((r) => r.addEventListener('change', mostrarCamposNascimento));

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------

async function carregarAnimais() {
    const filtro = lerFormulario(formFiltro);
    const parametros = new URLSearchParams();
    if (filtro.busca) parametros.set('busca', filtro.busca);
    if (filtro.especieId) parametros.set('especieId', filtro.especieId);
    if (filtro.situacao) parametros.set('situacao', filtro.situacao);
    if (tutorDaUrl) parametros.set('tutorId', tutorDaUrl);

    const corpoTabela = document.getElementById('tabelaAnimais');
    try {
        animaisNaTela = await api('GET', `/animais?${parametros}`);
        corpoTabela.innerHTML = animaisNaTela.length ? animaisNaTela.map((a) => `
            <tr>
                <td><a href="animal.html?id=${a.id}">${escapar(a.nome)}</a></td>
                <td>${escapar(a.especieNome)}${a.racaNome ? ` / ${escapar(a.racaNome)}` : ''}</td>
                <td>${a.sexo === 'M' ? 'Macho' : a.sexo === 'F' ? 'Fêmea' : '-'}</td>
                <td>${escapar(a.tutorNome)}</td>
                <td class="text-nowrap">${a.microchip ? escapar(a.microchip) : '<span class="text-muted">sem chip</span>'}</td>
                <td>${etiquetaSituacao(a.situacao)}</td>
                <td class="text-nowrap text-end">
                    <a class="btn btn-sm btn-outline-secondary" href="animal.html?id=${a.id}">Ficha</a>
                    ${a.situacao === 'ativo' ? `
                        <button class="btn btn-sm btn-outline-primary" data-editar="${a.id}">Editar</button>
                        <button class="btn btn-sm btn-outline-danger" data-inativar="${a.id}">Inativar</button>` : ''}
                </td>
            </tr>`).join('') : linhaAviso(7, 'Nenhum animal encontrado.');
    } catch (erro) {
        corpoTabela.innerHTML = linhaAviso(7, 'Não foi possível carregar.');
        mostrarMensagem(erro.message);
    }
}

formFiltro.addEventListener('submit', (evento) => {
    evento.preventDefault();
    carregarAnimais();
});

document.getElementById('tabelaAnimais').addEventListener('click', async (evento) => {
    const idEditar = evento.target.dataset.editar;
    const idInativar = evento.target.dataset.inativar;
    if (idEditar) abrirFormulario(animaisNaTela.find((a) => a.id === Number(idEditar)));
    if (idInativar && confirm('Inativar este animal? O histórico continua guardado.')) {
        try {
            await api('DELETE', `/animais/${idInativar}`);
            mostrarMensagem('Animal inativado.', 'success');
            carregarAnimais();
        } catch (erro) {
            mostrarMensagem(erro.message);
        }
    }
});

// ---------------------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------------------

async function abrirFormulario(animal) {
    formulario.reset();
    idEmEdicao = animal ? animal.id : null;
    animalEmEdicao = animal;
    document.getElementById('tituloFormulario').textContent = animal
        ? `Editar animal: ${animal.nome}${animal.nascimentoEstimado ? ' (data de nascimento estimada)' : ''}`
        : 'Novo animal';
    try {
        if (animal) {
            // tutor inativo não aparece na lista de escolha: mostra o atual mesmo assim
            if (!formulario.tutorId.querySelector(`option[value="${animal.tutorId}"]`)) {
                formulario.tutorId.insertAdjacentHTML('beforeend', `<option value="${animal.tutorId}">${escapar(animal.tutorNome)}</option>`);
            }
            preencherFormulario(formulario, {
                nome: animal.nome, tutorId: animal.tutorId, especieId: animal.especieId,
                sexo: animal.sexo, cor: animal.cor, peso: animal.peso, dataNascimento: animal.dataNascimento,
            });
            await carregarRacas(animal.especieId, animal.racaId);
        } else {
            if (tutorDaUrl) formulario.tutorId.value = tutorDaUrl;
            await carregarRacas('');
        }
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
    document.getElementById('porData').checked = true;
    mostrarCamposNascimento();
    cartao.classList.remove('d-none');
    formulario.nome.focus();
}

document.getElementById('botaoNovo').addEventListener('click', () => abrirFormulario(null));
document.getElementById('botaoCancelar').addEventListener('click', () => cartao.classList.add('d-none'));

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const d = lerFormulario(formulario);
    const porIdade = d.tipoNascimento === 'idade';
    const peso = d.peso ? Number(d.peso.replace(',', '.')) : null;

    const erros = [];
    if (!d.nome) erros.push('nome');
    if (!d.tutorId) erros.push('tutor');
    if (!d.especieId) erros.push('espécie');
    if (peso !== null && !(peso > 0)) erros.push('peso maior que zero');
    if (!porIdade && !d.dataNascimento) erros.push('data de nascimento (ou marque "Idade estimada")');
    if (!porIdade && d.dataNascimento > hojeISO()) erros.push('data de nascimento que não esteja no futuro');
    if (porIdade && !(Number(d.idadeAnos) > 0 || Number(d.idadeMeses) > 0)) erros.push('idade em anos e/ou meses');
    if (erros.length) return mostrarMensagem(`Confira: ${erros.join(', ')}.`, 'warning');

    const corpo = {
        nome: d.nome,
        tutorId: Number(d.tutorId),
        especieId: Number(d.especieId),
        racaId: d.racaId ? Number(d.racaId) : null,
        sexo: vazioParaNull(d.sexo),
        cor: vazioParaNull(d.cor),
        peso,
    };
    if (porIdade) {
        corpo.idadeAnos = Number(d.idadeAnos || 0);
        corpo.idadeMeses = Number(d.idadeMeses || 0);
    } else if (!animalEmEdicao || d.dataNascimento !== animalEmEdicao.dataNascimento) {
        // na alteração só manda a data se ela mudou (assim uma data estimada continua marcada como estimada)
        corpo.dataNascimento = d.dataNascimento;
    }

    try {
        const salvo = await comBotaoOcupado(evento.submitter, () => idEmEdicao
            ? api('PUT', `/animais/${idEmEdicao}`, corpo)
            : api('POST', '/animais', corpo));
        mostrarMensagem(`Animal ${salvo.nome} salvo.`, 'success');
        cartao.classList.add('d-none');
        carregarAnimais();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
});

// ---------------------------------------------------------------------------
// Início
// ---------------------------------------------------------------------------

(async () => {
    try {
        await carregarEscolhas();
        if (tutorDaUrl) {
            const tutor = await api('GET', `/tutores/${tutorDaUrl}`);
            document.getElementById('avisoTutor').innerHTML = `
                <div class="alert alert-info py-2 mb-0">Mostrando os animais de <strong>${escapar(tutor.nome)}</strong>.
                <a href="animais.html">Ver todos</a></div>`;
        }
        await carregarAnimais();
        if (parametroDaUrl('novo')) abrirFormulario(null);
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
})();
