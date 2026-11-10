// Tela inicial: números rápidos e próximas doses
montarMenu();

async function carregarPainel() {
    try {
        const [tutores, animais, doses, integracoes] = await Promise.all([
            api('GET', '/tutores?situacao=ativo'),
            api('GET', '/animais?situacao=ativo'),
            api('GET', '/vacinas/proximas-doses?dias=30'),
            api('GET', '/integracoes'),
        ]);

        document.getElementById('qtdTutores').textContent = tutores.length;
        document.getElementById('qtdAnimais').textContent = animais.length;
        document.getElementById('qtdAtrasadas').textContent = doses.doses.filter((d) => d.status === 'atrasada').length;
        document.getElementById('qtdPendencias').textContent =
            integracoes.filter((i) => i.situacao === 'pendente' || i.situacao === 'com_falha').length;

        document.getElementById('tabelaDoses').innerHTML = doses.doses.length
            ? doses.doses.map((d) => `
                <tr>
                    <td>${formatarData(d.dataPrevista)}</td>
                    <td>${etiquetaSituacao(d.status)}</td>
                    <td><a href="animal.html?id=${d.animalId}">${escapar(d.animalNome)}</a></td>
                    <td>${escapar(d.vacina)}${d.antirrabica ? ' <span class="badge text-bg-dark">antirrábica</span>' : ''}</td>
                    <td>${escapar(d.tutorNome)}</td>
                    <td>${escapar(d.tutorTelefone)}</td>
                </tr>`).join('')
            : linhaAviso(6, 'Nenhuma dose prevista nos próximos 30 dias.');
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

carregarPainel();
