-- =====================================================================
-- PROJETO : Clínica Veterinária (SDM)
-- SGBD    : SQLite 3
-- OBS     : dados iniciais (fictícios). Rodar DEPOIS de clinica_changelog.sql.
--           O veterinário de teste NÃO entra aqui: o hash da senha precisa
--           ser gerado pela API (bcrypt), então ele é criado pelo
--           endpoint/script da API.
-- =====================================================================
PRAGMA foreign_keys = ON;


--changeset bia.portela:20261108-011
--comment: Carga inicial de VET_ESPECIE

insert into VET_ESPECIE (ESPE_NM_ESPECIE, ESPE_DS_ESPECIE) values
    ('Cão',  'Canis lupus familiaris'),
    ('Gato', 'Felis catus'),
    ('Ave',  'Aves domésticas');

--ROLLBACK DELETE FROM VET_ESPECIE WHERE ESPE_NM_ESPECIE IN ('Cão','Gato','Ave');


--changeset bia.portela:20261108-012
--comment: Carga inicial de VET_RACA ("Sem raça definida" existe uma vez para cada espécie)

insert into VET_RACA (ESPE_ID_ESPECIE, RACA_NM_RACA)
select ESPE_ID_ESPECIE, 'Sem raça definida' from VET_ESPECIE;

insert into VET_RACA (ESPE_ID_ESPECIE, RACA_NM_RACA) values
    ((select ESPE_ID_ESPECIE from VET_ESPECIE where ESPE_NM_ESPECIE = 'Cão'),  'Labrador Retriever'),
    ((select ESPE_ID_ESPECIE from VET_ESPECIE where ESPE_NM_ESPECIE = 'Cão'),  'Poodle'),
    ((select ESPE_ID_ESPECIE from VET_ESPECIE where ESPE_NM_ESPECIE = 'Gato'), 'Siamês'),
    ((select ESPE_ID_ESPECIE from VET_ESPECIE where ESPE_NM_ESPECIE = 'Gato'), 'Persa'),
    ((select ESPE_ID_ESPECIE from VET_ESPECIE where ESPE_NM_ESPECIE = 'Ave'),  'Calopsita');

--ROLLBACK DELETE FROM VET_RACA WHERE RACA_NM_RACA IN ('Sem raça definida','Labrador Retriever','Poodle','Siamês','Persa','Calopsita');
