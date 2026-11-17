const mysql = mysql2 = require('mysql2/promise');

// Configuração da conexão com o banco de dados MySQL criado no schema.sql
const pool = mysql2.createPool({
    host: 'localhost',
    user: 'root',      // Altere para o seu usuário do MySQL se for diferente
    password: '',      // Insira a sua senha do MySQL aqui, se houver
    database: 'clinica_vet_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;