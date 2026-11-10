// Próximas doses (teste 10)
montarMenu();

const formFiltro = document.getElementById('formFiltro');

async function carregarDoses() {
    const { dias } = lerFormulario(formFiltro);
    try {
        const resposta = await api('GET', `/vacinas/proximas-doses?dias=${encodeURIComponent(dias || 30)}`);
        document.getElementById('resumo').textContent = `${resposta.total} dose(s) até ${formatarData(resposta.ate)}`;
        document.getElementById('tabelaDoses').innerHTML = resposta.doses.length ? resposta.doses.map((d) => `
            <tr>
                <td class="text-nowrap">${formatarData(d.dataPrevista)}</td>
                <td>${etiquetaSituacao(d.status)}</td>
                <td><a href="animal.html?id=${d.animalId}">${escapar(d.animalNome)}</a></td>
                <td>${escapar(d.vacina)}${d.antirrabica ? ' <span class="badge text-bg-dark">antirrábica</span>' : ''}</td>
                <td class="texto-pequeno">${d.origem === 'agendada' ? 'vacina agendada' : 'próxima dose'}</td>
                <td>${escapar(d.tutorNome)}</td>
                <td class="texto-pequeno">${escapar(d.tutorTelefone)}${d.tutorEmail ? `<br>${escapar(d.tutorEmail)}` : ''}</td>
            </tr>`).join('') : linhaAviso(7, 'Nenhuma dose no período.');
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

formFiltro.addEventListener('submit', (evento) => {
    evento.preventDefault();
    carregarDoses();
});

carregarDoses();
