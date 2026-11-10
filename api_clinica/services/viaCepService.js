const https = require('https');

async function consultarCep(cep) {
    // Remove caracteres não numéricos do CEP
    const cepLimpo = cep.replace(/[^\d]/g, '');

    if (cepLimpo.length !== 8) {
        throw new Error('CEP inválido. Deve conter exatamente 8 dígitos.');
    }

    return new Promise((resolve, reject) => {
        const url = `https://viacep.com.br/ws/${cepLimpo}/json/`;

        const req = https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const resultado = JSON.parse(data);
                    
                    // Tratamento para CEP inexistente
                    if (resultado.erro) {
                        return reject(new Error('CEP não encontrado na base do ViaCEP.'));
                    }
                    
                    resolve(resultado);
                } catch (e) {
                    reject(new Error('Erro ao processar a resposta do ViaCEP.'));
                }
            });
        });

        // Tratamento de Timeout
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Timeout: O ViaCEP demorou muito para responder. Preencha manualmente.'));
        });

        // Tratamento de Erro de Conexão (Fora do ar)
        req.on('error', (err) => {
            reject(new Error('Serviço ViaCEP indisponível no momento. Preencha o endereço manualmente.'));
        });
    });
}

module.exports = { consultarCep };