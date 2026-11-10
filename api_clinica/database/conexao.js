// Conexão única com o banco da clínica (SQLite).
// Usa o SQLite que já vem embutido no Node (node:sqlite, Node 22.13 ou mais novo):
// não precisa instalar nem compilar nenhuma biblioteca.
//
// Todo arquivo que fizer require deste módulo recebe a MESMA conexão,
// então o PRAGMA foreign_keys roda uma vez e vale para a API inteira.
//
// Uso:
//   const { db, transacao } = require('../database/conexao');
//   const vet = db.prepare('SELECT ... WHERE VETE_DS_EMAIL = ?').get(email);
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

// database/clinica.db na raiz do projeto (funciona de qualquer pasta de execução)
const CAMINHO_BANCO = path.join(__dirname, '..', '..', 'database', 'clinica.db');

const db = new DatabaseSync(CAMINHO_BANCO);

db.exec('PRAGMA foreign_keys = ON');   // obrigatório: sem isso o SQLite ignora as chaves estrangeiras
// modo padrão do SQLite (arquivo único). Não usar WAL: extensões como o
// SQLite Viewer do VS Code não conseguem abrir bancos em modo WAL.
db.exec('PRAGMA journal_mode = DELETE');
db.exec('PRAGMA busy_timeout = 5000'); // espera até 5 s se o banco estiver ocupado

// Executa várias gravações como uma coisa só: ou todas são salvas, ou nenhuma.
// Se a função lançar erro, tudo o que ela gravou é desfeito (ROLLBACK).
function transacao(funcao) {
    db.exec('BEGIN');
    try {
        const resultado = funcao();
        db.exec('COMMIT');
        return resultado;
    } catch (erro) {
        db.exec('ROLLBACK');
        throw erro;
    }
}

module.exports = { db, transacao };
