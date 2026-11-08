// Veterinários FICTÍCIOS usados nos testes de login (testes 1 a 4).
// Ficam fora do clinica_seed.sql porque a senha precisa virar hash bcrypt,
// o que só a API consegue fazer. Valores apenas para desenvolvimento.
const SENHA_TESTE = 'Senha@123';

const veterinariosTeste = [
    {
        // login deve PASSAR
        nome: 'Ana Teste (ativa e confirmada)',
        cpf: '52998224725',
        crmv: '10001',
        ufCrmv: 'SP',
        email: 'ativo@clinica.test',
        status: 'ativo',
        senhaConfirmada: true,
    },
    {
        // login deve ser BLOQUEADO: veterinário inativo
        nome: 'Bruno Teste (inativo)',
        cpf: '11144477735',
        crmv: '10002',
        ufCrmv: 'SP',
        email: 'inativo@clinica.test',
        status: 'inativo',
        senhaConfirmada: true,
    },
    {
        // login deve ser BLOQUEADO: senha ainda não confirmada
        nome: 'Carla Teste (senha não confirmada)',
        cpf: '12345678909',
        crmv: '10003',
        ufCrmv: 'SP',
        email: 'pendente@clinica.test',
        status: 'ativo',
        senhaConfirmada: false,
    },
];

module.exports = { SENHA_TESTE, veterinariosTeste };
