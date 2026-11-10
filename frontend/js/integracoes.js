// Painel de envios ao governo (testes 12 a 16): lista e botão Enviar/Reenviar
montarMenu();

const formFiltro = document.getElementById('formFiltro');

async function carregarIntegracoes() {
    const { situacao } = lerFormulario(formFiltro);
    const corpoTabela = document.getElementById('tabelaIntegracoes');
    try {
        const lista = await api('GET', `/integracoes${situacao ? `?situacao=${situacao}` : ''}`);
        corpoTabela.innerHTML = lista.length ? lista.map((i) => `
            <tr>
                <td>${i.id}</td>
                <td class="text-nowrap">${formatarDataHora(i.dataSolicitacao)}</td>
                <td><a href="animal.html?id=${i.animalId}">${escapar(i.animalNome)}</a></td>
                <td>${escapar(i.vacinaNome)} <span class="text-muted texto-pequeno">${formatarData(i.dataAplicacao)}</span></td>
                <td class="text-nowrap">${i.microchip ? escapar(i.microchip) : '<span class="text-danger">sem chip</span>'}</td>
                <td>${etiquetaSituacao(i.situacao)}</td>
                <td>${i.tentativas}</td>
                <td class="texto-pequeno text-nowrap">${escapar(i.protocolo)}</td>
                <td class="texto-pequeno">${escapar(i.mensagem)}</td>
                <td>${i.situacao !== 'confirmada'
                    ? `<button class="btn btn-sm btn-outline-primary" data-enviar="${i.id}">${i.tentativas ? 'Reenviar' : 'Enviar'}</button>` : ''}</td>
            </tr>`).join('') : linhaAviso(10, 'Nenhum envio encontrado.');
    } catch (erro) {
        corpoTabela.innerHTML = linhaAviso(10, 'Não foi possível carregar.');
        mostrarMensagem(erro.message);
    }
}

formFiltro.addEventListener('submit', (evento) => {
    evento.preventDefault();
    carregarIntegracoes();
});

document.getElementById('tabelaIntegracoes').addEventListener('click', async (evento) => {
    const id = evento.target.dataset.enviar;
    if (!id) return;
    try {
        const resultado = await comBotaoOcupado(evento.target, () => api('POST', `/integracoes/${id}/enviar`));
        mostrarMensagem(`Envio nº ${id}: ${resultado.situacao}. ${resultado.mensagem || ''}`,
            resultado.situacao === 'confirmada' ? 'success' : 'warning');
        carregarIntegracoes();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
});

carregarIntegracoes();
