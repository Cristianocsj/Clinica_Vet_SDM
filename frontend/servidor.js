// Servidor das telas (frontend) em http://localhost:8080
// Só entrega os arquivos desta pasta (HTML, CSS, JS). Quem conversa com a API é o navegador.
// Uso (na raiz do projeto):  npm run front
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORTA = process.env.PORTA_FRONT || 8080;
const PASTA = __dirname;

const TIPOS = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

const servidor = http.createServer((req, res) => {
    let caminhoUrl;
    try {
        caminhoUrl = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (erro) {
        res.writeHead(400);
        return res.end('Endereço inválido');
    }
    const arquivo = path.join(PASTA, caminhoUrl === '/' ? 'index.html' : caminhoUrl);

    // Não deixa sair da pasta do frontend (ex.: /../database/clinica.db)
    if (!arquivo.startsWith(PASTA + path.sep) || path.basename(arquivo) === 'servidor.js') {
        res.writeHead(403);
        return res.end('Acesso negado');
    }

    fs.readFile(arquivo, (erro, conteudo) => {
        if (erro) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('Página não encontrada');
        }
        res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arquivo)] || 'application/octet-stream' });
        res.end(conteudo);
    });
});

servidor.listen(PORTA, () => {
    console.log(`Telas da clínica em http://localhost:${PORTA}`);
    console.log('A API da clínica precisa estar rodando em http://localhost:3000 (npm start).');
});
