-- =====================================================================
-- PROJETO : Clínica Veterinária (SDM)
-- SGBD    : SQLite 3
-- OBS     : dados de DEMONSTRAÇÃO (fictícios), para testar e apresentar.
--           NÃO é obrigatório. Rode com:  npm run banco:demo
--           Precisa de clinica_changelog.sql, clinica_seed.sql e dos
--           veterinários de teste (o script da API cria tudo na ordem).
--           As datas são relativas a "hoje", então as próximas doses
--           sempre aparecem na lista, em qualquer dia que rodar.
--           Não cria envios ao governo (VET_INTEGRACAO_GOV) nem microchips:
--           esses ficam para os testes da integração.
-- =====================================================================
PRAGMA foreign_keys = ON;


--changeset bia.portela:20261108-013
--comment: Demonstração: VET_ENDERECO

insert into VET_ENDERECO (ENDE_NR_CEP, ENDE_DS_LOGRADOURO, ENDE_NR_ENDERECO, ENDE_DS_COMPLEMENTO, ENDE_NM_BAIRRO, ENDE_NM_CIDADE, ENDE_SG_UF, ENDE_CD_IBGE) values
    ('01001000', 'Praça da Sé',         '100', 'apto 12', 'Sé',            'São Paulo',      'SP', '3550308'),
    ('20040002', 'Rua da Assembleia',   '45',  null,      'Centro',        'Rio de Janeiro', 'RJ', '3304557'),
    ('30130010', 'Praça Sete de Setembro', '8', 'casa 2', 'Centro',        'Belo Horizonte', 'MG', '3106200');

--ROLLBACK DELETE FROM VET_ENDERECO WHERE ENDE_NR_CEP IN ('01001000','20040002','30130010');


--changeset bia.portela:20261108-014
--comment: Demonstração: VET_TUTOR (CPFs fictícios, mas com dígitos verificadores válidos)

insert into VET_TUTOR (ENDE_ID_ENDERECO, TUTO_NM_TUTOR, TUTO_NR_CPF, TUTO_NR_TELEFONE, TUTO_DS_EMAIL, TUTO_DT_NASCIMENTO) values
    ((select ENDE_ID_ENDERECO from VET_ENDERECO where ENDE_NR_CEP = '01001000'), 'Carlos Almeida',  '28475916309', '(11) 98888-1111', 'carlos@exemplo.test',   '1985-04-12'),
    ((select ENDE_ID_ENDERECO from VET_ENDERECO where ENDE_NR_CEP = '20040002'), 'Fernanda Lima',   '67192038431', '(21) 97777-2222', 'fernanda@exemplo.test', '1992-09-30'),
    ((select ENDE_ID_ENDERECO from VET_ENDERECO where ENDE_NR_CEP = '30130010'), 'Roberto Nunes',   '90531764893', '(31) 96666-3333', null,                    null);

--ROLLBACK DELETE FROM VET_TUTOR WHERE TUTO_NR_CPF IN ('28475916309','67192038431','90531764893');


--changeset bia.portela:20261108-015
--comment: Demonstração: VET_ANIMAL (raça sempre da mesma espécie; Bidu fica inativo)

insert into VET_ANIMAL (TUTO_ID_TUTOR, ESPE_ID_ESPECIE, RACA_ID_RACA, ANIM_NM_ANIMAL, ANIM_DT_NASCIMENTO, ANIM_FL_NASC_ESTIMADA, ANIM_FL_SEXO, ANIM_DS_COR, ANIM_VL_PESO_ATUAL, ANIM_DS_SITUACAO)
select t.TUTO_ID_TUTOR, e.ESPE_ID_ESPECIE, r.RACA_ID_RACA, d.nome, d.nascimento, d.estimada, d.sexo, d.cor, d.peso, d.situacao
  from (select 1 ordem, 'Rex' nome, '28475916309' cpf, 'Cão' especie, 'Labrador Retriever' raca, '2021-03-15' nascimento, 0 estimada, 'M' sexo, 'Caramelo' cor, 31.5 peso, 'ativo' situacao union all
        select 2, 'Mel',  '28475916309', 'Cão',  'Sem raça definida', '2023-07-01', 1, 'F',  'Preta',  12.0, 'ativo'   union all
        select 3, 'Luna', '67192038431', 'Gato', 'Siamês',            '2022-11-20', 0, 'F',  'Creme',   4.2, 'ativo'   union all
        select 4, 'Piu',  '67192038431', 'Ave',  'Calopsita',         '2024-02-10', 1, null, 'Cinza',   0.09, 'ativo'  union all
        select 5, 'Bidu', '90531764893', 'Cão',  'Poodle',            '2012-05-05', 0, 'M',  'Branco',  8.0, 'inativo') d
  join VET_TUTOR   t on t.TUTO_NR_CPF     = d.cpf
  join VET_ESPECIE e on e.ESPE_NM_ESPECIE = d.especie
  join VET_RACA    r on r.ESPE_ID_ESPECIE = e.ESPE_ID_ESPECIE and r.RACA_NM_RACA = d.raca
 order by d.ordem;

--ROLLBACK DELETE FROM VET_ANIMAL WHERE ANIM_NM_ANIMAL IN ('Rex','Mel','Luna','Piu','Bidu');


--changeset bia.portela:20261108-016
--comment: Demonstração: VET_CONSULTA (feitas pelo veterinário ativo@clinica.test)

insert into VET_CONSULTA (ANIM_ID_ANIMAL, VETE_ID_VETERINARIO, CONS_DT_HR_CONSULTA, CONS_DS_MOTIVO, CONS_DS_ANAMNESE, CONS_DS_SINTOMAS, CONS_DS_DIAGNOSTICO, CONS_DS_TRATAMENTO_PRESCRITO, CONS_DS_PRESCRICAO_MED, CONS_VL_PESO_REGISTRADO, CONS_VL_TEMPERATURA, CONS_DS_OBS, CONS_DS_STATUS)
select a.ANIM_ID_ANIMAL, v.VETE_ID_VETERINARIO, d.dataHora, d.motivo, d.anamnese, d.sintomas, d.diagnostico, d.tratamento, d.prescricao, d.peso, d.temperatura, d.obs, d.status
  from (select 'Rex' animal, datetime('now','localtime','-90 days','start of day','+10 hours') dataHora, 'Check-up anual' motivo, 'Sem queixas' anamnese, null sintomas, 'Saudável' diagnostico, null tratamento, null prescricao, 30.8 peso, 38.6 temperatura, null obs, 'realizada' status union all
        select 'Rex',  datetime('now','localtime','-20 days','start of day','+15 hours'), 'Coceira na orelha', 'Coça a orelha direita há 1 semana', 'Prurido e secreção', 'Otite externa', 'Limpeza diária por 10 dias', 'Otomax 5 gotas 2x ao dia', 31.5, 38.9, 'Retornar se não melhorar', 'realizada' union all
        select 'Luna', datetime('now','localtime','-30 days','start of day','+9 hours'),  'Vacinação e avaliação', null, null, 'Saudável', null, null, 4.2, 38.4, null, 'realizada' union all
        select 'Mel',  datetime('now','localtime','+7 days','start of day','+11 hours'),  'Retorno de castração', null, null, null, null, null, null, null, null, 'agendada') d
  join VET_ANIMAL      a on a.ANIM_NM_ANIMAL = d.animal
  join VET_VETERINARIO v on v.VETE_DS_EMAIL  = 'ativo@clinica.test';

--ROLLBACK DELETE FROM VET_CONSULTA WHERE ANIM_ID_ANIMAL IN (SELECT ANIM_ID_ANIMAL FROM VET_ANIMAL WHERE ANIM_NM_ANIMAL IN ('Rex','Mel','Luna'));


--changeset bia.portela:20261108-017
--comment: Demonstração: VET_VACINA (sem antirrábica: a antirrábica é criada nos testes, para gerar a pendência ao governo)
--         Rex: V10 com próxima dose em 10 dias | Luna: V4 com próxima dose ATRASADA | Mel: V10 agendada

insert into VET_VACINA (ANIM_ID_ANIMAL, VETE_ID_VETERINARIO, VACI_NM_VACINA, VACI_DS_TIPO_VACINA, VACI_FL_ANTIRRABICA, VACI_NM_FABRICANTE, VACI_NR_LOTE, VACI_DT_VALIDADE_LOTE, VACI_DT_APLICACAO, VACI_DS_DOSE, VACI_DS_VIA_APLICACAO, VACI_DT_PROX_DOSE, VACI_DS_OBS, VACI_DS_SITUACAO)
select a.ANIM_ID_ANIMAL, case when d.situacao = 'aplicada' then v.VETE_ID_VETERINARIO end, d.nome, d.tipo, 0, d.fabricante, d.lote, d.validade, d.aplicacao, d.dose, d.via, d.proxima, null, d.situacao
  from (select 'Rex' animal, 'V10' nome, 'polivalente' tipo, 'Zoetis' fabricante, 'ZT2025A' lote, date('now','localtime','+300 days') validade, date('now','localtime','-355 days') aplicacao, 'reforço anual' dose, 'subcutânea' via, date('now','localtime','+10 days') proxima, 'aplicada' situacao union all
        select 'Luna', 'V4', 'felina', 'Boehringer', 'BI7781', date('now','localtime','+200 days'), date('now','localtime','-30 days'), '1ª dose', 'subcutânea', date('now','localtime','-5 days'), 'aplicada' union all
        select 'Mel',  'V10', 'polivalente', null, null, null, date('now','localtime','+15 days'), null, null, null, 'agendada') d
  join VET_ANIMAL      a on a.ANIM_NM_ANIMAL = d.animal
  join VET_VETERINARIO v on v.VETE_DS_EMAIL  = 'ativo@clinica.test';

--ROLLBACK DELETE FROM VET_VACINA WHERE ANIM_ID_ANIMAL IN (SELECT ANIM_ID_ANIMAL FROM VET_ANIMAL WHERE ANIM_NM_ANIMAL IN ('Rex','Mel','Luna'));
