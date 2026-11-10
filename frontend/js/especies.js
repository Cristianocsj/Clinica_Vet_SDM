// Catálogo de espécies e raças ("sem raça definida" e raça compatível com a espécie)
montarMenu();

const formEspecie = document.getElementById('formEspecie');
const formRaca = document.getElementById('formRaca');
const filtroRacas = document.getElementById('filtroRacas');
let especies = [];
let racas = [];
let especieEmEdicao = null;
let racaEmEdicao = null;

async function carregarEspecies() {
    especies = await api('GET', '/especies');
    document.getElementById('tabelaEspecies').innerHTML = especies.map((e) => `
        <tr>
            <td>${escapar(e.nome)}<div class="text-muted texto-pequeno">${escapar(e.descricao)}</div></td>
            <td>${etiquetaSituacao(e.situacao)}</td>
            <td class="text-nowrap text-end">${e.situacao === 'ativo' ? `
                <button class="btn btn-sm btn-outline-primary" data-editar-especie="${e.id}">Editar</button>
                <button class="btn btn-sm btn-outline-danger" data-inativar-especie="${e.id}">Inativar</button>` : ''}</td>
        </tr>`).join('') || linhaAviso(3, 'Nenhuma espécie.');

    const ativas = especies.filter((e) => e.situacao === 'ativo');
    formRaca.especieId.innerHTML = '<option value="">Espécie *</option>'
        + ativas.map((e) => `<option value="${e.id}">${escapar(e.nome)}</option>`).join('');
    const filtroAtual = filtroRacas.value;
    filtroRacas.innerHTML = '<option value="">Raças de todas as espécies</option>'
        + especies.map((e) => `<option value="${e.id}">Raças de: ${escapar(e.nome)}</option>`).join('');
    filtroRacas.value = filtroAtual;
}

async function carregarRacas() {
    racas = await api('GET', `/racas${filtroRacas.value ? `?especieId=${filtroRacas.value}` : ''}`);
    document.getElementById('tabelaRacas').innerHTML = racas.map((r) => `
        <tr>
            <td>${escapar(r.nome)}<div class="text-muted texto-pequeno">${escapar(r.descricao)}</div></td>
            <td>${escapar(r.especieNome)}</td>
            <td>${etiquetaSituacao(r.situacao)}</td>
            <td class="text-nowrap text-end">${r.situacao === 'ativo' ? `
                <button class="btn btn-sm btn-outline-primary" data-editar-raca="${r.id}">Editar</button>
                <button class="btn btn-sm btn-outline-danger" data-inativar-raca="${r.id}">Inativar</button>` : ''}</td>
        </tr>`).join('') || linhaAviso(4, 'Nenhuma raça.');
}

async function recarregar() {
    try {
        await carregarEspecies();
        await carregarRacas();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

filtroRacas.addEventListener('change', () => carregarRacas().catch((e) => mostrarMensagem(e.message)));

// ---------------------------------------------------------------------------
// Espécie
// ---------------------------------------------------------------------------

function limparEspecie() {
    formEspecie.reset();
    especieEmEdicao = null;
    document.getElementById('tituloEspecie').textContent = 'Nova espécie (já ganha a raça "Sem raça definida")';
}
document.getElementById('cancelarEspecie').addEventListener('click', limparEspecie);

formEspecie.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const d = lerFormulario(formEspecie);
    if (!d.nome) return mostrarMensagem('Informe o nome da espécie.', 'warning');
    const corpo = { nome: d.nome, descricao: vazioParaNull(d.descricao) };
    try {
        await comBotaoOcupado(evento.submitter, () => especieEmEdicao
            ? api('PUT', `/especies/${especieEmEdicao}`, corpo)
            : api('POST', '/especies', corpo));
        mostrarMensagem('Espécie salva.', 'success');
        limparEspecie();
        recarregar();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
});

document.getElementById('tabelaEspecies').addEventListener('click', async (evento) => {
    const { editarEspecie, inativarEspecie } = evento.target.dataset;
    if (editarEspecie) {
        const e = especies.find((x) => x.id === Number(editarEspecie));
        especieEmEdicao = e.id;
        preencherFormulario(formEspecie, { nome: e.nome, descricao: e.descricao });
        document.getElementById('tituloEspecie').textContent = `Editando: ${e.nome}`;
    }
    if (inativarEspecie && confirm('Inativar esta espécie? Ela não aparece mais em animais novos.')) {
        try {
            await api('DELETE', `/especies/${inativarEspecie}`);
            mostrarMensagem('Espécie inativada.', 'success');
            recarregar();
        } catch (erro) {
            mostrarMensagem(erro.message);
        }
    }
});

// ---------------------------------------------------------------------------
// Raça
// ---------------------------------------------------------------------------

function limparRaca() {
    formRaca.reset();
    racaEmEdicao = null;
    formRaca.especieId.disabled = false;
    document.getElementById('tituloRaca').textContent = 'Nova raça';
}
document.getElementById('cancelarRaca').addEventListener('click', limparRaca);

formRaca.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const d = lerFormulario(formRaca);
    if (!racaEmEdicao && !d.especieId) return mostrarMensagem('Escolha a espécie da raça.', 'warning');
    if (!d.nome) return mostrarMensagem('Informe o nome da raça.', 'warning');
    const corpo = { nome: d.nome, descricao: vazioParaNull(d.descricao) };
    try {
        await comBotaoOcupado(evento.submitter, () => racaEmEdicao
            ? api('PUT', `/racas/${racaEmEdicao}`, corpo)
            : api('POST', '/racas', { ...corpo, especieId: Number(d.especieId) }));
        mostrarMensagem('Raça salva.', 'success');
        limparRaca();
        carregarRacas();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
});

document.getElementById('tabelaRacas').addEventListener('click', async (evento) => {
    const { editarRaca, inativarRaca } = evento.target.dataset;
    if (editarRaca) {
        const r = racas.find((x) => x.id === Number(editarRaca));
        racaEmEdicao = r.id;
        preencherFormulario(formRaca, { especieId: r.especieId, nome: r.nome, descricao: r.descricao });
        formRaca.especieId.disabled = true; // a espécie de uma raça não muda
        document.getElementById('tituloRaca').textContent = `Editando: ${r.nome} (${r.especieNome})`;
    }
    if (inativarRaca && confirm('Inativar esta raça? Ela não aparece mais em animais novos.')) {
        try {
            await api('DELETE', `/racas/${inativarRaca}`);
            mostrarMensagem('Raça inativada.', 'success');
            carregarRacas();
        } catch (erro) {
            mostrarMensagem(erro.message);
        }
    }
});

recarregar();
