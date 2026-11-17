const pool = require('../config/db');
const { validarCPF } = require('../utils/validadorCpf');

async function cadastrarTutor(req, res) {
    try {
        const { nome, cpf, telefone, email, dt_nascimento, endereco } = req.body;

        // 1. Validar CPF
        if (!cpf || !validarCPF(cpf)) {
            return res.status(400).json({ erro: true, mensagem: 'CPF inválido ou não fornecido.' });
        }

        if (!nome || !email || !telefone || !endereco) {
            return res.status(400).json({ erro: true, mensagem: 'Preencha todos os campos obrigatórios.' });
        }

        const conexao = await pool.getConnection();

        try {
            await conexao.beginTransaction();

            // 2. Inserir Endereço
            const [resultEndereco] = await conexao.execute(
                `INSERT INTO endereco (cep, logradouro, numero, complemento, bairro, cidade, uf, codigo_ibge) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    endereco.cep,
                    endereco.logradouro,
                    endereco.numero || '',
                    endereco.complemento || '',
                    endereco.bairro,
                    endereco.cidade,
                    endereco.uf,
                    endereco.codigo_ibge || null
                ]
            );
            const enderecoId = resultEndereco.insertId;

            // 3. Inserir Tutor
            await conexao.execute(
                `INSERT INTO tutor (nome_completo, cpf, email, telefone, dt_nascimento, endereco_id) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [nome, cpf, email, telefone, dt_nascimento || null, enderecoId]
            );

            await conexao.commit();
            conexao.release();

            return res.status(201).json({
                sucesso: true,
                mensagem: 'Tutor e endereço cadastrados com sucesso!'
            });

        } catch (erroSql) {
            await conexao.rollback();
            conexao.release();

            if (erroSql.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ erro: true, mensagem: 'Este CPF ou E-mail já está cadastrado no sistema.' });
            }
            throw erroSql;
        }

    } catch (error) {
        return res.status(500).json({ erro: true, mensagem: 'Erro interno: ' + error.message });
    }
}

module.exports = { cadastrarTutor };
