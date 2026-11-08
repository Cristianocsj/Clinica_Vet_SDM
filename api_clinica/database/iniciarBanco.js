// Cria (ou atualiza) o banco da clínica: database/clinica.db
//
// Uso:
//   npm run banco            -> cria o que faltar (pode rodar quantas vezes quiser)
//   npm run banco:recriar    -> apaga o clinica.db e cria tudo do zero
//
// Passos:
//   1. clinica_changelog.sql  (tabelas; usa "if not exists", então é seguro repetir)
//   2. clinica_seed.sql       (espécies e raças; só roda se VET_ESPECIE estiver vazia)
//   3. veterinários de teste  (senha com hash bcrypt; só cria os que ainda não existem)
const fs = require('fs');
const path = require('path');

const PASTA_DATABASE = path.join(__dirname, '..', '..', 'database');
const CAMINHO_BANCO = path.join(PASTA_DATABASE, 'clinica.db');

// --recriar precisa apagar o arquivo ANTES de abrir a conexão
if (process.argv.includes('--recriar')) {
    for (const sufixo of ['', '-wal', '-shm']) {
        fs.rmSync(CAMINHO_BANCO + sufixo, { force: true });
    }
    console.log('Banco antigo apagado.');
}

const bcrypt = require('bcryptjs');
const { db, transacao } = require('./conexao');
const { SENHA_TESTE, veterinariosTeste } = require('./veterinariosTeste');

function lerSql(nomeArquivo) {
    return fs.readFileSync(path.join(PASTA_DATABASE, nomeArquivo), 'utf-8');
}

// 1. Tabelas
db.exec(lerSql('clinica_changelog.sql'));
console.log('Tabelas verificadas/criadas (clinica_changelog.sql).');

// 2. Dados iniciais
const qtdEspecies = db.prepare('SELECT COUNT(*) AS qtd FROM VET_ESPECIE').get().qtd;
if (qtdEspecies === 0) {
    db.exec(lerSql('clinica_seed.sql'));
    console.log('Dados iniciais inseridos (clinica_seed.sql).');
} else {
    console.log('Dados iniciais já existiam; seed não foi executado de novo.');
}

// 3. Veterinários de teste
const buscarPorEmail = db.prepare(
    'SELECT VETE_ID_VETERINARIO FROM VET_VETERINARIO WHERE VETE_DS_EMAIL = ?'
);
const inserirVeterinario = db.prepare(`
    INSERT INTO VET_VETERINARIO (
        VETE_NM_VETERINARIO, VETE_NR_CPF, VETE_NR_CRMV, VETE_SG_UF_CRMV,
        VETE_DS_EMAIL, VETE_DS_HASH_SENHA, VETE_FL_INDICADOR_SENHA,
        VETE_DT_HR_CONFIRMACAO, VETE_DS_STATUS
    ) VALUES (?, ?, ?, ?, ?, ?, ?,
              CASE WHEN ? = 1 THEN datetime('now', 'localtime') END, ?)
`);

const criarVeterinariosTeste = () => transacao(() => {
    let criados = 0;
    const hash = bcrypt.hashSync(SENHA_TESTE, 10);
    for (const vet of veterinariosTeste) {
        if (buscarPorEmail.get(vet.email)) continue;
        inserirVeterinario.run(
            vet.nome, vet.cpf, vet.crmv, vet.ufCrmv,
            vet.email, hash, vet.senhaConfirmada ? 1 : 0,
            vet.senhaConfirmada ? 1 : 0, // data/hora da confirmação só para quem já confirmou
            vet.status
        );
        criados++;
    }
    return criados;
});
console.log(`Veterinários de teste criados: ${criarVeterinariosTeste()}.`);

// Resumo
const tabelas = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'VET\\_%' ESCAPE '\\' ORDER BY name"
).all();
console.log(`\nBanco pronto em ${CAMINHO_BANCO}`);
for (const { name } of tabelas) {
    const { qtd } = db.prepare(`SELECT COUNT(*) AS qtd FROM ${name}`).get();
    console.log(`  ${name.padEnd(24)} ${qtd} registro(s)`);
}

db.close();
