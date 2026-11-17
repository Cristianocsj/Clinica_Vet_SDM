const express = require('express');
const router = express.Router();

// 1. Importamos o serviço de CEP que você já tinha criado antes
const { consultarCep } = require('../services/viaCepService');

// 2. IMPORTANTE: Importamos a função de cadastrar tutor que acabamos de criar no passo anterior
const { cadastrarTutor } = require('../controllers/tutorController');

// --- ROTA DE CEP (Já existente) ---
router.get('/cep/:cep', async (req, res) => {
    try {
        const { cep } = req.params;
        const dadosEndereco = await consultarCep(cep);
        return res.status(200).json(dadosEndereco);
    } catch (error) {
        return res.status(400).json({
            erro: true,
            mensagem: error.message
        });
    }
});

// --- NOVA ROTA DE TUTORES (Ligando o controlador aqui!) ---
// Quando baterem em POST /api/tutores, o Express executa a função 'cadastrarTutor'
router.post('/tutores', cadastrarTutor);

module.exports = router;

// Importar a função do novo controlador de animais
const { cadastrarAnimal } = require('../controllers/animalController');

// --- NOVA ROTA DE ANIMAIS ---
router.post('/animais', cadastrarAnimal);

// Importar o novo controlador
const { listarEspecies, listarRacasPorEsp } = require('../controllers/especieRacaController');

// --- ROTAS DE ESPÉCIES E RAÇAS ---
router.get('/especies', listarEspecies);
router.get('/especies/:especie_id/racas', listarRacasPorEsp);