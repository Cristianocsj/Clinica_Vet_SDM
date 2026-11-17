// Ficha do animal: dados, microchip, consultas (teste 9), vacinas (teste 10) e envios ao governo
montarMenu();

const idAnimal = parametroDaUrl('id');
let animal = null;

// Botões "Registrar ..." mostram/escondem o formulário correspondente
document.querySelectorAll('[data-abrir]').forEach((botao) => {
    botao.addEventListener('click', () => document.getElementById(botao.dataset.abrir).classList.toggle('d-none'));
});

// ---------------------------------------------------------------------------
// Carregar a ficha
// ---------------------------------------------------------------------------

async function carregarFicha() {
    if (!idAnimal) return mostrarMensagem('Abra a ficha pela lista de animais.');
    try {
        const [ficha, consultas, vacinas] = await Promise.all([
            api('GET', `/animais/${idAnimal}`),
            api('GET', `/animais/${idAnimal}/consultas`),
            api('GET', `/animais/${idAnimal}/vacinas`),
        ]);
        animal = ficha;
        mostrarDados(ficha);
        mostrarMicrochips(ficha.microchips);
        mostrarConsultas(consultas.consultas);
        mostrarVacinas(vacinas.vacinas);
        mostrarIntegracoes(ficha.integracoesGov);
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

function mostrarDados(a) {
    document.title = `${a.nome} - Clínica Vet`;
    const sexo = a.sexo === 'M' ? 'Macho' : a.sexo === 'F' ? 'Fêmea' : 'Não informado';
    document.getElementById('dadosAnimal').innerHTML = `
        <div class="d-flex flex-wrap justify-content-between gap-2">
            <h1 class="h4 mb-1">${escapar(a.nome)} ${etiquetaSituacao(a.situacao)}</h1>
            <span class="text-muted texto-pequeno">Ficha nº ${a.id}</span>
        </div>
        <div class="row texto-pequeno g-2 mt-1">
            <div class="col-6 col-md-3"><strong>Espécie:</strong> ${escapar(a.especieNome)}</div>
            <div class="col-6 col-md-3"><strong>Raça:</strong> ${escapar(a.racaNome) || 'não informada'}</div>
            <div class="col-6 col-md-3"><strong>Sexo:</strong> ${sexo}</div>
            <div class="col-6 col-md-3"><strong>Cor:</strong> ${escapar(a.cor) || '-'}</div>
            <div class="col-6 col-md-3"><strong>Nascimento:</strong> ${formatarData(a.dataNascimento)}${a.nascimentoEstimado ? ' (estimado)' : ''}</div>
            <div class="col-6 col-md-3"><strong>Peso atual:</strong> ${a.peso ? `${a.peso} kg` : '-'}</div>
            <div class="col-12 col-md-6"><strong>Microchip:</strong> ${a.microchip ? escapar(a.microchip) : '<span class="text-danger">sem microchip</span>'}</div>
            <div class="col-12"><strong>Tutor:</strong> ${escapar(a.tutor.nome)} (CPF ${formatarCpf(a.tutor.cpf)})
                ${a.tutor.telefone ? ` - ${escapar(a.tutor.telefone)}` : ''}
                <a href="animais.html?tutorId=${a.tutorId}" class="ms-1">outros animais do tutor</a></div>
        </div>`;
}

function mostrarMicrochips(lista) {
    document.getElementById('tabelaMicrochips').innerHTML = lista.length ? lista.map((m) => `
        <tr>
            <td class="text-nowrap">${escapar(m.codigo)}</td>
            <td>${etiquetaSituacao(m.situacao)}</td>
            <td>${formatarDataHora(m.dataVinculo)}</td>
            <td>${escapar(m.veterinarioNome)}</td>
            <td>${formatarDataHora(m.dataSubstituicao)}</td>
            <td>${escapar(m.motivoSubstituicao)}</td>
        </tr>`).join('') : linhaAviso(6, 'Nenhum microchip vinculado.');
}

function mostrarConsultas(lista) {
    document.getElementById('tabelaConsultas').innerHTML = lista.length ? lista.map((c) => `
        <tr>
            <td class="text-nowrap">${formatarDataHora(c.dataHora)}</td>
            <td>${etiquetaSituacao(c.status)}</td>
            <td>${escapar(c.motivo)}</td>
            <td>${escapar(c.diagnostico)}</td>
            <td>${escapar(c.tratamento)}${c.prescricao ? `<div class="text-muted">${escapar(c.prescricao)}</div>` : ''}</td>
            <td>${c.peso ? `${c.peso} kg` : ''}</td>
            <td>${c.temperatura ? `${c.temperatura} °C` : ''}</td>
            <td>${escapar(c.veterinarioNome)}</td>
        </tr>`).join('') : linhaAviso(8, 'Nenhuma consulta registrada.');
}

function mostrarVacinas(lista) {
    document.getElementById('tabelaVacinas').innerHTML = lista.length ? lista.map((v) => `
        <tr>
            <td class="text-nowrap">${formatarData(v.dataAplicacao)}</td>
            <td>${escapar(v.nome)} <span class="text-muted">(${escapar(v.tipo)})</span>
                ${v.antirrabica ? '<span class="badge text-bg-dark">antirrábica</span>' : ''}</td>
            <td>${escapar(v.dose)}</td>
            <td>${escapar(v.lote)}</td>
            <td>${formatarData(v.proximaDose)}</td>
            <td>${etiquetaSituacao(v.situacao)}</td>
            <td>${v.integracaoGov ? etiquetaSituacao(v.integracaoGov.situacao) : '<span class="text-muted">-</span>'}</td>
        </tr>`).join('') : linhaAviso(7, 'Nenhuma vacina registrada.');
}

function mostrarIntegracoes(lista) {
    document.getElementById('tabelaIntegracoes').innerHTML = lista.length ? lista.map((i) => `
        <tr>
            <td class="text-nowrap">${formatarDataHora(i.dataSolicitacao)}</td>
            <td class="texto-pequeno">${escapar(i.tipo)}</td>
            <td>${escapar(i.vacinaNome)}</td>
            <td>${etiquetaSituacao(i.situacao)}</td>
            <td>${i.tentativas}</td>
            <td class="texto-pequeno">${escapar(i.protocolo)}</td>
            <td class="texto-pequeno">${escapar(i.mensagem)}</td>
            <td>${i.situacao !== 'confirmada'
                ? `<button class="btn btn-sm btn-outline-primary" data-enviar="${i.id}">${i.tentativas ? 'Reenviar' : 'Enviar'}</button>` : ''}</td>
        </tr>`).join('') : linhaAviso(8, 'Nenhuma comunicação com o governo (só vacina antirrábica aplicada gera envio).');
}

// ---------------------------------------------------------------------------
// Microchip: POST /api/animais/:id/microchip (rota do Cristiano)
// ---------------------------------------------------------------------------

document.getElementById('formMicrochip').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const d = lerFormulario(evento.target);
    const microchip = d.microchip.replace(/[\s-]/g, '');
    if (!microchipValido(microchip)) return mostrarMensagem('O microchip precisa ter exatamente 15 números.', 'warning');
    if (animal.microchip && !d.motivo) return mostrarMensagem('Este animal já tem microchip: informe o motivo da troca.', 'warning');

    const corpo = { microchip };
    if (d.motivo) corpo.motivo = d.motivo;
    try {
        await comBotaoOcupado(evento.submitter, () => api('POST', `/animais/${idAnimal}/microchip`, corpo));
        mostrarMensagem('Microchip vinculado. O cadastro ou a troca será enviado ao governo automaticamente.', 'success');
        evento.target.reset();
        evento.target.classList.add('d-none');
        carregarFicha();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
});

// ---------------------------------------------------------------------------
// Consulta
// ---------------------------------------------------------------------------

document.getElementById('formConsulta').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const d = lerFormulario(evento.target);
    const peso = d.peso ? Number(d.peso.replace(',', '.')) : null;
    const temperatura = d.temperatura ? Number(d.temperatura.replace(',', '.')) : null;

    const erros = [];
    if (!d.motivo) erros.push('motivo');
    if (d.status === 'agendada' && !d.dataHora) erros.push('data e hora da consulta agendada');
    if (peso !== null && !(peso > 0)) erros.push('peso maior que zero');
    if (temperatura !== null && !(temperatura >= 30 && temperatura <= 45)) erros.push('temperatura entre 30 e 45 °C');
    if (d.status !== 'realizada' && (peso !== null || temperatura !== null)) erros.push('peso e temperatura só em consulta realizada');
    if (erros.length) return mostrarMensagem(`Confira: ${erros.join(', ')}.`, 'warning');

    const corpo = {
        animalId: Number(idAnimal),
        status: d.status,
        dataHora: vazioParaNull(d.dataHora),
        motivo: d.motivo,
        anamnese: vazioParaNull(d.anamnese),
        sintomas: vazioParaNull(d.sintomas),
        diagnostico: vazioParaNull(d.diagnostico),
        tratamento: vazioParaNull(d.tratamento),
        prescricao: vazioParaNull(d.prescricao),
        peso,
        temperatura,
        observacoes: vazioParaNull(d.observacoes),
    };
    try {
        await comBotaoOcupado(evento.submitter, () => api('POST', '/consultas', corpo));
        mostrarMensagem('Consulta registrada.', 'success');
        evento.target.reset();
        evento.target.classList.add('d-none');
        carregarFicha();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
});

// ---------------------------------------------------------------------------
// Vacina
// ---------------------------------------------------------------------------

document.getElementById('formVacina').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const d = lerFormulario(evento.target);
    const aplicada = d.situacao === 'aplicada';
    const hoje = hojeISO();

    const erros = [];
    if (!d.nome) erros.push('nome da vacina');
    if (!d.tipo) erros.push('tipo');
    if (aplicada && (!d.fabricante || !d.lote || !d.validadeLote || !d.dose)) erros.push('fabricante, lote, validade do lote e dose (vacina aplicada)');
    if (aplicada && d.dataAplicacao > hoje) erros.push('data de aplicação que não esteja no futuro');
    if (!aplicada && (!d.dataAplicacao || d.dataAplicacao < hoje)) erros.push('data da vacina agendada (de hoje em diante)');
    if (!aplicada && d.proximaDose) erros.push('próxima dose só para vacina aplicada');
    const dataBase = d.dataAplicacao || hoje;
    if (d.validadeLote && d.validadeLote < dataBase) erros.push('lote que não esteja vencido');
    if (d.proximaDose && d.proximaDose <= dataBase) erros.push('próxima dose depois da aplicação');
    if (erros.length) return mostrarMensagem(`Confira: ${erros.join(', ')}.`, 'warning');

    const corpo = {
        animalId: Number(idAnimal),
        situacao: d.situacao,
        nome: d.nome,
        tipo: d.tipo,
        fabricante: vazioParaNull(d.fabricante),
        lote: vazioParaNull(d.lote),
        validadeLote: vazioParaNull(d.validadeLote),
        dataAplicacao: vazioParaNull(d.dataAplicacao),
        dose: vazioParaNull(d.dose),
        via: vazioParaNull(d.via),
        proximaDose: vazioParaNull(d.proximaDose),
        observacoes: vazioParaNull(d.observacoes),
    };
    // Marcado = antirrábica. Desmarcado: a API decide pelo nome/tipo ("Antirrábica", "raiva").
    if (d.antirrabica) corpo.antirrabica = true;

    try {
        const vacina = await comBotaoOcupado(evento.submitter, () => api('POST', '/vacinas', corpo));
        mostrarMensagem(vacina.integracaoGov
            ? 'Vacina antirrábica registrada. O envio ao governo ficou PENDENTE: use o botão Enviar em "Envios ao governo".'
            : 'Vacina registrada.', 'success');
        evento.target.reset();
        evento.target.classList.add('d-none');
        carregarFicha();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
});

// ---------------------------------------------------------------------------
// Enviar / reenviar ao governo
// ---------------------------------------------------------------------------

document.getElementById('tabelaIntegracoes').addEventListener('click', async (evento) => {
    const id = evento.target.dataset.enviar;
    if (!id) return;
    try {
        const resultado = await comBotaoOcupado(evento.target, () => api('POST', `/integracoes/${id}/enviar`));
        mostrarMensagem(`Situação do envio: ${resultado.situacao}. ${resultado.mensagem || ''}`,
            resultado.situacao === 'confirmada' ? 'success' : 'warning');
        carregarFicha();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
});

carregarFicha();
