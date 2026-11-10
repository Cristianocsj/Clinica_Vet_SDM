const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const clinicaRoutes = require('./routes/clinicaRoutes');
const veterinarioRoutes = require('./routes/veterinarioRoutes');
const consultaRoutes = require('./routes/consultaRoutes');
const vacinaRoutes = require('./routes/vacinaRoutes');
const microchipRoutes = require('./routes/microchipRoutes');
const autenticar = require('./middlewares/autenticar');

const app = express();
const PORTA = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rotas de autenticação (o login é público; as demais se protegem lá dentro)
app.use('/api/auth', authRoutes);

// Daqui para baixo, TODA rota /api exige token válido
app.use('/api/veterinarios', autenticar, veterinarioRoutes);
app.use('/api', autenticar, consultaRoutes, vacinaRoutes, microchipRoutes);
app.use('/api', autenticar, clinicaRoutes);

// Corpo da requisição com JSON mal formado
app.use((erro, req, res, next) => {
    if (erro.type === 'entity.parse.failed') {
        return res.status(400).json({ erro: true, codigo: 'JSON_INVALIDO', mensagem: 'O corpo da requisição não é um JSON válido.' });
    }
    console.error(erro);
    return res.status(500).json({ erro: true, codigo: 'ERRO_INTERNO', mensagem: 'Erro interno no servidor.' });
});

app.listen(PORTA, () => {
    console.log(`API da Clínica rodando na porta ${PORTA}`);
});
