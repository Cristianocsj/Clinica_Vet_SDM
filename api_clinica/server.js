const express = require('express');
const cors = require('cors');
const clinicaRoutes = require('./routes/clinicaRoutes');

const app = express();
const PORTA = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Prefixo das rotas da API
app.use('/api', clinicaRoutes);

app.listen(PORTA, () => {
    console.log(`API da Clínica rodando na porta ${PORTA}`);
});