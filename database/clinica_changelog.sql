-- =====================================================================
-- PROJETO : Clínica Veterinária (SDM)
-- SGBD    : SQLite 3
-- OBS     : PRAGMA foreign_keys vale por conexão; a API deve executar
--           "PRAGMA foreign_keys = ON;" sempre que abrir o banco.
-- BASE    : estrutura do clinica.sql (MER lógico docs/logico_mer_vet.png)
--           com as correções aprovadas pela equipe:
--             1. Animal: data de nascimento estimada (idade estimada)
--             2. Veterinário: código de confirmação + expiração do código
--             3. Veterinário: UNIQUE (UF do CRMV, número do CRMV)
--             4. Raça: nome único dentro da espécie + FK composta
--                Animal -> Raça (raça compatível com a espécie)
-- DATAS   : gravadas como texto ISO 8601 (AAAA-MM-DD / AAAA-MM-DD HH:MM:SS)
-- ORDEM   : tabelas criadas na ordem das dependências (pais antes dos filhos)
-- =====================================================================
PRAGMA foreign_keys = ON;


--changeset bia.portela:20261108-001
--comment: Criando tabela VET_ESPECIE

create table if not exists VET_ESPECIE
(
   ESPE_ID_ESPECIE          	INTEGER              	 constraint ESPE_PK primary key autoincrement not null,
   ESPE_NM_ESPECIE          	VARCHAR(100)         	 NOT NULL,
   ESPE_DS_ESPECIE          	VARCHAR(500),
   ESPE_DS_SITUACAO         	VARCHAR(10)          	 default 'ativo' not null,
   constraint ESPE_UK_01 unique (ESPE_NM_ESPECIE),
   constraint ESPE_CK_01 check (ESPE_DS_SITUACAO in ('ativo','inativo'))
);

--ROLLBACK DROP TABLE VET_ESPECIE;
--comment on table  VET_ESPECIE                          is 'Tabela de espécies';
--comment on column VET_ESPECIE.ESPE_ID_ESPECIE          is 'Identificador da espécie';
--comment on column VET_ESPECIE.ESPE_NM_ESPECIE          is 'Nome da espécie (único)';
--comment on column VET_ESPECIE.ESPE_DS_ESPECIE          is 'Descrição da espécie';
--comment on column VET_ESPECIE.ESPE_DS_SITUACAO         is 'Situação do registro.(ativo/inativo)';


--changeset bia.portela:20261108-002
--comment: Criando tabela VET_RACA

create table if not exists VET_RACA
(
   RACA_ID_RACA             	INTEGER              	 constraint RACA_PK primary key autoincrement not null,
   ESPE_ID_ESPECIE          	INTEGER              	 NOT NULL,
   RACA_NM_RACA             	VARCHAR(100)         	 NOT NULL,
   RACA_DS_RACA             	VARCHAR(500),
   RACA_DS_SITUACAO         	VARCHAR(10)          	 default 'ativo' not null,
   constraint RACA_FK_01 foreign key (ESPE_ID_ESPECIE) references VET_ESPECIE (ESPE_ID_ESPECIE),
   -- nome da raça é único DENTRO da espécie
   constraint RACA_UK_01 unique (ESPE_ID_ESPECIE, RACA_NM_RACA),
   -- chave usada pela FK composta de VET_ANIMAL (raça compatível com a espécie)
   constraint RACA_UK_02 unique (RACA_ID_RACA, ESPE_ID_ESPECIE),
   constraint RACA_CK_01 check (RACA_DS_SITUACAO in ('ativo','inativo'))
);

create index if not exists RACA_IX_01 on VET_RACA (ESPE_ID_ESPECIE);

--ROLLBACK DROP TABLE VET_RACA;
--comment on table  VET_RACA                             is 'Tabela de raças';
--comment on column VET_RACA.RACA_ID_RACA                is 'Identificador da raça';
--comment on column VET_RACA.ESPE_ID_ESPECIE             is 'Identificador da espécie à qual a raça pertence';
--comment on column VET_RACA.RACA_NM_RACA                is 'Nome da raça (único dentro da espécie)';
--comment on column VET_RACA.RACA_DS_RACA                is 'Descrição da raça';
--comment on column VET_RACA.RACA_DS_SITUACAO            is 'Situação do registro.(ativo/inativo)';


--changeset bia.portela:20261108-003
--comment: Criando tabela VET_ENDERECO (preenchido pelo ViaCEP + complemento manual)

create table if not exists VET_ENDERECO
(
   ENDE_ID_ENDERECO         	INTEGER              	 constraint ENDE_PK primary key autoincrement not null,
   ENDE_NR_CEP              	CHAR(8)              	 NOT NULL,
   ENDE_DS_LOGRADOURO       	VARCHAR(200),
   ENDE_NR_ENDERECO         	VARCHAR(10),
   ENDE_DS_COMPLEMENTO      	VARCHAR(100),
   ENDE_NM_BAIRRO           	VARCHAR(100),
   ENDE_NM_CIDADE           	VARCHAR(100)         	 NOT NULL,
   ENDE_SG_UF               	CHAR(2)              	 NOT NULL,
   ENDE_CD_IBGE             	CHAR(7),
   ENDE_FL_CADASTRO_MANUAL  	CHAR(1)              	 default 'N' not null,
   constraint ENDE_CK_01 check (length(ENDE_NR_CEP) = 8 and ENDE_NR_CEP not glob '*[^0-9]*'),
   constraint ENDE_CK_02 check (length(ENDE_SG_UF) = 2),
   constraint ENDE_CK_03 check (ENDE_FL_CADASTRO_MANUAL in ('S','N'))
);

--ROLLBACK DROP TABLE VET_ENDERECO;
--comment on table  VET_ENDERECO                         is 'Tabela de endereços';
--comment on column VET_ENDERECO.ENDE_ID_ENDERECO        is 'Identificador do endereço';
--comment on column VET_ENDERECO.ENDE_NR_CEP             is 'CEP do endereço (somente números, 8 dígitos)';
--comment on column VET_ENDERECO.ENDE_DS_LOGRADOURO      is 'Logradouro (opcional: CEP geral de cidade não tem logradouro)';
--comment on column VET_ENDERECO.ENDE_NR_ENDERECO        is 'Número do endereço';
--comment on column VET_ENDERECO.ENDE_DS_COMPLEMENTO     is 'Complemento do endereço';
--comment on column VET_ENDERECO.ENDE_NM_BAIRRO          is 'Bairro do endereço';
--comment on column VET_ENDERECO.ENDE_NM_CIDADE          is 'Cidade do endereço';
--comment on column VET_ENDERECO.ENDE_SG_UF              is 'Sigla da UF do endereço';
--comment on column VET_ENDERECO.ENDE_CD_IBGE            is 'Código IBGE do município (quando disponível)';
--comment on column VET_ENDERECO.ENDE_FL_CADASTRO_MANUAL is 'Indicador de cadastro manual do endereço.(S - Sim, digitado manualmente/N - Não, preenchido pelo ViaCEP)';


--changeset bia.portela:20261108-004
--comment: Criando tabela VET_TUTOR

create table if not exists VET_TUTOR
(
   TUTO_ID_TUTOR            	INTEGER              	 constraint TUTO_PK primary key autoincrement not null,
   ENDE_ID_ENDERECO         	INTEGER              	 NOT NULL,
   TUTO_NM_TUTOR            	VARCHAR(150)         	 NOT NULL,
   TUTO_NR_CPF              	CHAR(11)             	 NOT NULL,
   TUTO_NR_TELEFONE         	VARCHAR(20),
   TUTO_DS_EMAIL            	VARCHAR(150),
   TUTO_DT_NASCIMENTO       	DATE,
   TUTO_DT_CADASTRO         	DATETIME             	 default (datetime('now','localtime')) not null,
   TUTO_DS_SITUACAO         	VARCHAR(10)          	 default 'ativo' not null,
   constraint TUTO_FK_01 foreign key (ENDE_ID_ENDERECO) references VET_ENDERECO (ENDE_ID_ENDERECO),
   constraint TUTO_UK_01 unique (TUTO_NR_CPF),
   constraint TUTO_CK_01 check (length(TUTO_NR_CPF) = 11 and TUTO_NR_CPF not glob '*[^0-9]*'),
   constraint TUTO_CK_02 check (TUTO_DS_SITUACAO in ('ativo','inativo'))
);

create index if not exists TUTO_IX_01 on VET_TUTOR (ENDE_ID_ENDERECO);

--ROLLBACK DROP TABLE VET_TUTOR;
--comment on table  VET_TUTOR                            is 'Tabela de tutores dos animais';
--comment on column VET_TUTOR.TUTO_ID_TUTOR              is 'Identificador do tutor';
--comment on column VET_TUTOR.ENDE_ID_ENDERECO           is 'Identificador do endereço onde o tutor reside';
--comment on column VET_TUTOR.TUTO_NM_TUTOR              is 'Nome do tutor';
--comment on column VET_TUTOR.TUTO_NR_CPF                is 'CPF do tutor (somente números; dígitos verificadores validados na API)';
--comment on column VET_TUTOR.TUTO_NR_TELEFONE           is 'Telefone do tutor';
--comment on column VET_TUTOR.TUTO_DS_EMAIL              is 'E-mail do tutor';
--comment on column VET_TUTOR.TUTO_DT_NASCIMENTO         is 'Data de nascimento do tutor';
--comment on column VET_TUTOR.TUTO_DT_CADASTRO           is 'Data de cadastro do tutor';
--comment on column VET_TUTOR.TUTO_DS_SITUACAO           is 'Situação do cadastro.(ativo/inativo)';


--changeset bia.portela:20261108-005
--comment: Criando tabela VET_VETERINARIO (login, confirmação de senha e CRMV)

create table if not exists VET_VETERINARIO
(
   VETE_ID_VETERINARIO          	INTEGER              	 constraint VETE_PK primary key autoincrement not null,
   VETE_NM_VETERINARIO          	VARCHAR(150)         	 NOT NULL,
   VETE_NR_CPF                  	CHAR(11)             	 NOT NULL,
   VETE_NR_CRMV                 	VARCHAR(10)          	 NOT NULL,
   VETE_SG_UF_CRMV              	CHAR(2)              	 NOT NULL,
   VETE_DS_EMAIL                	VARCHAR(150)         	 NOT NULL,
   VETE_NR_TELEFONE             	VARCHAR(20),
   VETE_DS_HASH_SENHA           	VARCHAR(255)         	 NOT NULL,
   VETE_FL_INDICADOR_SENHA      	INTEGER              	 default 0 not null,
   VETE_DS_CODIGO_CONFIRMACAO   	VARCHAR(255),
   VETE_DT_HR_EXPIRACAO_CODIGO  	DATETIME,
   VETE_DT_HR_CONFIRMACAO       	DATETIME,
   VETE_DT_CADASTRO             	DATETIME             	 default (datetime('now','localtime')) not null,
   VETE_DS_STATUS               	VARCHAR(10)          	 default 'ativo' not null,
   VETE_DT_HR_ULTIMO_ACESSO     	DATETIME,
   constraint VETE_UK_01 unique (VETE_NR_CPF),
   constraint VETE_UK_02 unique (VETE_DS_EMAIL),
   -- nenhum dos dois é único sozinho: o mesmo número pode existir em UFs diferentes
   constraint VETE_UK_03 unique (VETE_SG_UF_CRMV, VETE_NR_CRMV),
   constraint VETE_CK_01 check (length(VETE_NR_CPF) = 11 and VETE_NR_CPF not glob '*[^0-9]*'),
   constraint VETE_CK_02 check (length(VETE_SG_UF_CRMV) = 2),
   constraint VETE_CK_03 check (VETE_FL_INDICADOR_SENHA in (0,1)),
   constraint VETE_CK_04 check (VETE_DS_STATUS in ('ativo','inativo')),
   -- senha confirmada precisa ter a data/hora da confirmação
   constraint VETE_CK_05 check (VETE_FL_INDICADOR_SENHA = 0 or VETE_DT_HR_CONFIRMACAO is not null)
);

--ROLLBACK DROP TABLE VET_VETERINARIO;
--comment on table  VET_VETERINARIO                              is 'Tabela de médicos veterinários (usuários do sistema)';
--comment on column VET_VETERINARIO.VETE_ID_VETERINARIO          is 'Identificador do veterinário';
--comment on column VET_VETERINARIO.VETE_NM_VETERINARIO          is 'Nome do veterinário';
--comment on column VET_VETERINARIO.VETE_NR_CPF                  is 'CPF do veterinário (somente números)';
--comment on column VET_VETERINARIO.VETE_NR_CRMV                 is 'Número de registro no CRMV';
--comment on column VET_VETERINARIO.VETE_SG_UF_CRMV              is 'UF do registro no CRMV';
--comment on column VET_VETERINARIO.VETE_DS_EMAIL                is 'E-mail do veterinário (login)';
--comment on column VET_VETERINARIO.VETE_NR_TELEFONE             is 'Telefone do veterinário';
--comment on column VET_VETERINARIO.VETE_DS_HASH_SENHA           is 'Hash bcrypt da senha (nunca a senha pura)';
--comment on column VET_VETERINARIO.VETE_FL_INDICADOR_SENHA      is 'Indicador de senha confirmada.(0 - Não confirmada/1 - Confirmada)';
--comment on column VET_VETERINARIO.VETE_DS_CODIGO_CONFIRMACAO   is 'Hash do código de confirmação enviado (simulado no console)';
--comment on column VET_VETERINARIO.VETE_DT_HR_EXPIRACAO_CODIGO  is 'Data e hora de expiração do código de confirmação';
--comment on column VET_VETERINARIO.VETE_DT_HR_CONFIRMACAO       is 'Data e hora da confirmação da senha';
--comment on column VET_VETERINARIO.VETE_DT_CADASTRO             is 'Data de cadastro do veterinário';
--comment on column VET_VETERINARIO.VETE_DS_STATUS               is 'Status do cadastro.(ativo/inativo)';
--comment on column VET_VETERINARIO.VETE_DT_HR_ULTIMO_ACESSO     is 'Data e hora do último login';


--changeset bia.portela:20261108-006
--comment: Criando tabela VET_ANIMAL (FK composta garante raça compatível com a espécie)

create table if not exists VET_ANIMAL
(
   ANIM_ID_ANIMAL           	INTEGER              	 constraint ANIM_PK primary key autoincrement not null,
   TUTO_ID_TUTOR            	INTEGER              	 NOT NULL,
   ESPE_ID_ESPECIE          	INTEGER              	 NOT NULL,
   RACA_ID_RACA             	INTEGER,
   ANIM_NM_ANIMAL           	VARCHAR(100)         	 NOT NULL,
   ANIM_DT_NASCIMENTO       	DATE                 	 NOT NULL,
   ANIM_FL_NASC_ESTIMADA    	INTEGER              	 default 0 not null,
   ANIM_FL_SEXO             	CHAR(1),
   ANIM_DS_COR              	VARCHAR(50),
   ANIM_VL_PESO_ATUAL       	DECIMAL(6,2),
   ANIM_DS_SITUACAO         	VARCHAR(10)          	 default 'ativo' not null,
   constraint ANIM_FK_01 foreign key (TUTO_ID_TUTOR)   references VET_TUTOR   (TUTO_ID_TUTOR),
   constraint ANIM_FK_02 foreign key (ESPE_ID_ESPECIE) references VET_ESPECIE (ESPE_ID_ESPECIE),
   -- FK composta: a raça informada precisa pertencer à mesma espécie do animal
   -- (raça é opcional; com RACA_ID_RACA nulo a FK não é verificada)
   constraint ANIM_FK_03 foreign key (RACA_ID_RACA, ESPE_ID_ESPECIE) references VET_RACA (RACA_ID_RACA, ESPE_ID_ESPECIE),
   constraint ANIM_CK_01 check (ANIM_FL_SEXO in ('M','F')),
   constraint ANIM_CK_02 check (ANIM_VL_PESO_ATUAL is null or ANIM_VL_PESO_ATUAL > 0),
   constraint ANIM_CK_03 check (ANIM_DS_SITUACAO in ('ativo','inativo')),
   constraint ANIM_CK_04 check (ANIM_FL_NASC_ESTIMADA in (0,1))
);

create index if not exists ANIM_IX_01 on VET_ANIMAL (TUTO_ID_TUTOR);
create index if not exists ANIM_IX_02 on VET_ANIMAL (ESPE_ID_ESPECIE);
create index if not exists ANIM_IX_03 on VET_ANIMAL (RACA_ID_RACA);

--ROLLBACK DROP TABLE VET_ANIMAL;
--comment on table  VET_ANIMAL                           is 'Tabela de animais';
--comment on column VET_ANIMAL.ANIM_ID_ANIMAL            is 'Identificador do animal';
--comment on column VET_ANIMAL.TUTO_ID_TUTOR             is 'Identificador do tutor responsável pelo animal';
--comment on column VET_ANIMAL.ESPE_ID_ESPECIE           is 'Identificador da espécie do animal';
--comment on column VET_ANIMAL.RACA_ID_RACA              is 'Identificador da raça do animal (opcional; precisa ser da mesma espécie)';
--comment on column VET_ANIMAL.ANIM_NM_ANIMAL            is 'Nome do animal';
--comment on column VET_ANIMAL.ANIM_DT_NASCIMENTO        is 'Data de nascimento do animal (obrigatória: exata ou calculada pela idade estimada)';
--comment on column VET_ANIMAL.ANIM_FL_NASC_ESTIMADA     is 'Indicador de data de nascimento estimada.(0 - Exata/1 - Calculada pela idade estimada)';
--comment on column VET_ANIMAL.ANIM_FL_SEXO              is 'Sexo do animal.(M - Macho/F - Fêmea)';
--comment on column VET_ANIMAL.ANIM_DS_COR               is 'Cor do animal';
--comment on column VET_ANIMAL.ANIM_VL_PESO_ATUAL        is 'Peso atual do animal em kg';
--comment on column VET_ANIMAL.ANIM_DS_SITUACAO          is 'Situação do animal.(ativo/inativo)';


--changeset bia.portela:20261108-007
--comment: Criando tabela VET_VINCULO_MICROCHIP (relacionamento Vincula — histórico de microchips)

create table if not exists VET_VINCULO_MICROCHIP
(
   VIMI_ID_VINCULO              	INTEGER              	 constraint VIMI_PK primary key autoincrement not null,
   ANIM_ID_ANIMAL               	INTEGER              	 NOT NULL,
   VETE_ID_VETERINARIO          	INTEGER              	 NOT NULL,
   VIMI_CD_MICROCHIP            	CHAR(15)             	 NOT NULL,
   VIMI_DS_SITUACAO             	VARCHAR(12)          	 default 'ativo' not null,
   VIMI_DT_VINCULO              	DATETIME             	 default (datetime('now','localtime')) not null,
   VIMI_DT_SUBSTITUICAO         	DATETIME,
   VIMI_DS_MOTIVO_SUBSTITUICAO  	VARCHAR(500),
   constraint VIMI_FK_01 foreign key (ANIM_ID_ANIMAL)      references VET_ANIMAL      (ANIM_ID_ANIMAL),
   constraint VIMI_FK_02 foreign key (VETE_ID_VETERINARIO) references VET_VETERINARIO (VETE_ID_VETERINARIO),
   -- único para sempre: chip substituído não volta a ser usado
   constraint VIMI_UK_01 unique (VIMI_CD_MICROCHIP),
   -- código ISO 11784: 15 dígitos numéricos
   constraint VIMI_CK_01 check (length(VIMI_CD_MICROCHIP) = 15 and VIMI_CD_MICROCHIP not glob '*[^0-9]*'),
   constraint VIMI_CK_02 check (
        (VIMI_DS_SITUACAO = 'ativo'       and VIMI_DT_SUBSTITUICAO is null) or
        (VIMI_DS_SITUACAO = 'substituido' and VIMI_DT_SUBSTITUICAO is not null
                                          and VIMI_DS_MOTIVO_SUBSTITUICAO is not null)
   ),
   constraint VIMI_CK_03 check (VIMI_DT_SUBSTITUICAO is null or VIMI_DT_SUBSTITUICAO >= VIMI_DT_VINCULO)
);

create index if not exists VIMI_IX_01 on VET_VINCULO_MICROCHIP (ANIM_ID_ANIMAL);
create index if not exists VIMI_IX_02 on VET_VINCULO_MICROCHIP (VETE_ID_VETERINARIO);
-- garante no máximo UM microchip ativo por animal
create unique index if not exists VIMI_UK_02 on VET_VINCULO_MICROCHIP (ANIM_ID_ANIMAL) where VIMI_DS_SITUACAO = 'ativo';

--ROLLBACK DROP TABLE VET_VINCULO_MICROCHIP;
--comment on table  VET_VINCULO_MICROCHIP                              is 'Tabela de vínculo de microchip ao animal';
--comment on column VET_VINCULO_MICROCHIP.VIMI_ID_VINCULO              is 'Identificador do vínculo';
--comment on column VET_VINCULO_MICROCHIP.ANIM_ID_ANIMAL               is 'Identificador do animal';
--comment on column VET_VINCULO_MICROCHIP.VETE_ID_VETERINARIO          is 'Identificador do veterinário responsável pelo vínculo';
--comment on column VET_VINCULO_MICROCHIP.VIMI_CD_MICROCHIP            is 'Código do microchip (15 dígitos, ISO 11784)';
--comment on column VET_VINCULO_MICROCHIP.VIMI_DS_SITUACAO             is 'Situação do vínculo.(ativo/substituido)';
--comment on column VET_VINCULO_MICROCHIP.VIMI_DT_VINCULO              is 'Data do vínculo do microchip';
--comment on column VET_VINCULO_MICROCHIP.VIMI_DT_SUBSTITUICAO         is 'Data da substituição do microchip';
--comment on column VET_VINCULO_MICROCHIP.VIMI_DS_MOTIVO_SUBSTITUICAO  is 'Motivo da substituição do microchip';


--changeset bia.portela:20261108-008
--comment: Criando tabela VET_CONSULTA (relacionamento Atende)

create table if not exists VET_CONSULTA
(
   CONS_ID_CONSULTA             	INTEGER              	 constraint CONS_PK primary key autoincrement not null,
   ANIM_ID_ANIMAL               	INTEGER              	 NOT NULL,
   VETE_ID_VETERINARIO          	INTEGER              	 NOT NULL,
   CONS_DT_HR_CONSULTA          	DATETIME             	 NOT NULL,
   CONS_DS_MOTIVO               	VARCHAR(500)         	 NOT NULL,
   CONS_DS_ANAMNESE             	VARCHAR(4000),
   CONS_DS_SINTOMAS             	VARCHAR(4000),
   CONS_DS_DIAGNOSTICO          	VARCHAR(4000),
   CONS_DS_TRATAMENTO_PRESCRITO 	VARCHAR(4000),
   CONS_DS_PRESCRICAO_MED       	VARCHAR(4000),
   CONS_VL_PESO_REGISTRADO      	DECIMAL(6,2),
   CONS_VL_TEMPERATURA          	DECIMAL(4,1),
   CONS_DS_OBS                  	VARCHAR(1000),
   CONS_DS_STATUS               	VARCHAR(15)          	 default 'agendada' not null,
   constraint CONS_FK_01 foreign key (ANIM_ID_ANIMAL)      references VET_ANIMAL      (ANIM_ID_ANIMAL),
   constraint CONS_FK_02 foreign key (VETE_ID_VETERINARIO) references VET_VETERINARIO (VETE_ID_VETERINARIO),
   constraint CONS_CK_01 check (CONS_DS_STATUS in ('agendada','realizada','cancelada','nao_compareceu')),
   constraint CONS_CK_02 check (CONS_VL_PESO_REGISTRADO is null or CONS_VL_PESO_REGISTRADO > 0),
   constraint CONS_CK_03 check (CONS_VL_TEMPERATURA is null or CONS_VL_TEMPERATURA between 30 and 45)
);

create index if not exists CONS_IX_01 on VET_CONSULTA (ANIM_ID_ANIMAL);
create index if not exists CONS_IX_02 on VET_CONSULTA (VETE_ID_VETERINARIO);
create index if not exists CONS_IX_03 on VET_CONSULTA (CONS_DT_HR_CONSULTA);

--ROLLBACK DROP TABLE VET_CONSULTA;
--comment on table  VET_CONSULTA                               is 'Tabela de consultas veterinárias';
--comment on column VET_CONSULTA.CONS_ID_CONSULTA              is 'Identificador da consulta';
--comment on column VET_CONSULTA.ANIM_ID_ANIMAL                is 'Identificador do animal atendido';
--comment on column VET_CONSULTA.VETE_ID_VETERINARIO           is 'Identificador do veterinário responsável pelo atendimento';
--comment on column VET_CONSULTA.CONS_DT_HR_CONSULTA           is 'Data e hora da consulta';
--comment on column VET_CONSULTA.CONS_DS_MOTIVO                is 'Motivo da consulta';
--comment on column VET_CONSULTA.CONS_DS_ANAMNESE              is 'Anamnese do animal';
--comment on column VET_CONSULTA.CONS_DS_SINTOMAS              is 'Sintomas apresentados';
--comment on column VET_CONSULTA.CONS_DS_DIAGNOSTICO           is 'Diagnóstico da consulta';
--comment on column VET_CONSULTA.CONS_DS_TRATAMENTO_PRESCRITO  is 'Tratamento prescrito';
--comment on column VET_CONSULTA.CONS_DS_PRESCRICAO_MED        is 'Prescrição de medicamentos (quando aplicável)';
--comment on column VET_CONSULTA.CONS_VL_PESO_REGISTRADO       is 'Peso registrado na consulta em kg';
--comment on column VET_CONSULTA.CONS_VL_TEMPERATURA           is 'Temperatura registrada na consulta em °C (quando aferida)';
--comment on column VET_CONSULTA.CONS_DS_OBS                   is 'Observações da consulta';
--comment on column VET_CONSULTA.CONS_DS_STATUS                is 'Status da consulta.(agendada/realizada/cancelada/nao_compareceu)';


--changeset bia.portela:20261108-009
--comment: Criando tabela VET_VACINA (relacionamento Imuniza)

create table if not exists VET_VACINA
(
   VACI_ID_VACINA           	INTEGER              	 constraint VACI_PK primary key autoincrement not null,
   ANIM_ID_ANIMAL           	INTEGER              	 NOT NULL,
   VETE_ID_VETERINARIO      	INTEGER,
   VACI_NM_VACINA           	VARCHAR(150)         	 NOT NULL,
   VACI_DS_TIPO_VACINA      	VARCHAR(50)          	 NOT NULL,
   VACI_FL_ANTIRRABICA      	INTEGER              	 default 0 not null,
   VACI_NM_FABRICANTE       	VARCHAR(100),
   VACI_NR_LOTE             	VARCHAR(50),
   VACI_DT_VALIDADE_LOTE    	DATE,
   VACI_DT_APLICACAO        	DATE                 	 NOT NULL,
   VACI_DS_DOSE             	VARCHAR(30),
   VACI_DS_VIA_APLICACAO    	VARCHAR(30),
   VACI_DT_PROX_DOSE        	DATE,
   VACI_DS_OBS              	VARCHAR(1000),
   VACI_DS_SITUACAO         	VARCHAR(10)          	 default 'aplicada' not null,
   constraint VACI_FK_01 foreign key (ANIM_ID_ANIMAL)      references VET_ANIMAL      (ANIM_ID_ANIMAL),
   constraint VACI_FK_02 foreign key (VETE_ID_VETERINARIO) references VET_VETERINARIO (VETE_ID_VETERINARIO),
   -- antirrábica é classificação estruturada (0/1), não texto livre
   constraint VACI_CK_01 check (VACI_FL_ANTIRRABICA in (0,1)),
   constraint VACI_CK_02 check (VACI_DS_SITUACAO in ('agendada','aplicada','cancelada')),
   -- vacina aplicada precisa do veterinário responsável
   constraint VACI_CK_03 check (VACI_DS_SITUACAO <> 'aplicada' or VETE_ID_VETERINARIO is not null),
   constraint VACI_CK_04 check (VACI_DT_VALIDADE_LOTE is null or VACI_DT_VALIDADE_LOTE >= VACI_DT_APLICACAO),
   constraint VACI_CK_05 check (VACI_DT_PROX_DOSE is null or VACI_DT_PROX_DOSE > VACI_DT_APLICACAO),
   -- vacina aplicada precisa dos dados do frasco usado (na agendada ainda podem ser desconhecidos)
   constraint VACI_CK_06 check (
        VACI_DS_SITUACAO <> 'aplicada' or (
            VACI_NM_FABRICANTE    is not null and
            VACI_NR_LOTE          is not null and
            VACI_DT_VALIDADE_LOTE is not null and
            VACI_DS_DOSE          is not null
        )
   )
);

create index if not exists VACI_IX_01 on VET_VACINA (ANIM_ID_ANIMAL);
create index if not exists VACI_IX_02 on VET_VACINA (VETE_ID_VETERINARIO);
-- usado na lista de próximas doses
create index if not exists VACI_IX_03 on VET_VACINA (VACI_DT_PROX_DOSE);

--ROLLBACK DROP TABLE VET_VACINA;
--comment on table  VET_VACINA                           is 'Tabela de vacinas aplicadas/agendadas nos animais';
--comment on column VET_VACINA.VACI_ID_VACINA            is 'Identificador da aplicação da vacina';
--comment on column VET_VACINA.ANIM_ID_ANIMAL            is 'Identificador do animal imunizado';
--comment on column VET_VACINA.VETE_ID_VETERINARIO       is 'Identificador do veterinário responsável (obrigatório quando aplicada)';
--comment on column VET_VACINA.VACI_NM_VACINA            is 'Nome da vacina';
--comment on column VET_VACINA.VACI_DS_TIPO_VACINA       is 'Tipo da vacina';
--comment on column VET_VACINA.VACI_FL_ANTIRRABICA       is 'Indicador de vacina antirrábica.(0 - Não/1 - Sim)';
--comment on column VET_VACINA.VACI_NM_FABRICANTE        is 'Nome do fabricante da vacina (obrigatório quando aplicada)';
--comment on column VET_VACINA.VACI_NR_LOTE              is 'Número do lote da vacina (obrigatório quando aplicada)';
--comment on column VET_VACINA.VACI_DT_VALIDADE_LOTE     is 'Data de validade do lote (obrigatória quando aplicada)';
--comment on column VET_VACINA.VACI_DT_APLICACAO         is 'Data da aplicação (ou data prevista, quando agendada)';
--comment on column VET_VACINA.VACI_DS_DOSE              is 'Dose ou etapa do esquema vacinal (obrigatória quando aplicada)';
--comment on column VET_VACINA.VACI_DS_VIA_APLICACAO     is 'Via de aplicação da vacina';
--comment on column VET_VACINA.VACI_DT_PROX_DOSE         is 'Data prevista para a próxima dose (quando aplicável)';
--comment on column VET_VACINA.VACI_DS_OBS               is 'Observações da aplicação';
--comment on column VET_VACINA.VACI_DS_SITUACAO          is 'Situação da vacina.(agendada/aplicada/cancelada)';


--changeset bia.portela:20261108-010
--comment: Criando tabela VET_INTEGRACAO_GOV (relacionamentos Registra e Comunica — envio, reenvio e idempotência)

create table if not exists VET_INTEGRACAO_GOV
(
   INGO_ID_INTEGRACAO         	INTEGER              	 constraint INGO_PK primary key autoincrement not null,
   ANIM_ID_ANIMAL             	INTEGER              	 NOT NULL,
   VACI_ID_VACINA             	INTEGER,
   INGO_DS_TIPO_OPERACAO      	VARCHAR(30)          	 NOT NULL,
   INGO_DS_CHAVE_IDEMPOTENCIA 	VARCHAR(100)         	 NOT NULL,
   INGO_CD_MICROCHIP          	CHAR(15),
   INGO_CD_MICROCHIP_ANTERIOR 	CHAR(15),
   INGO_NR_PROTOCOLO_EXTERNO  	VARCHAR(100),
   INGO_DS_SITUACAO           	VARCHAR(12)          	 default 'pendente' not null,
   INGO_QT_TENTATIVAS         	INTEGER              	 default 0 not null,
   INGO_DT_HR_SOLICITACAO     	DATETIME             	 default (datetime('now','localtime')) not null,
   INGO_DT_HR_RESPOSTA        	DATETIME,
   INGO_DS_MSG_ERRO           	VARCHAR(4000),
   constraint INGO_FK_01 foreign key (ANIM_ID_ANIMAL) references VET_ANIMAL (ANIM_ID_ANIMAL),
   constraint INGO_FK_02 foreign key (VACI_ID_VACINA) references VET_VACINA (VACI_ID_VACINA),
   -- a mesma chave em todas as tentativas de envio
   constraint INGO_UK_01 unique (INGO_DS_CHAVE_IDEMPOTENCIA),
   -- cada vacina é comunicada no máximo uma vez
   constraint INGO_UK_02 unique (VACI_ID_VACINA),
   constraint INGO_CK_01 check (INGO_DS_TIPO_OPERACAO in ('CADASTRO_ANIMAL','ATUALIZACAO_ANIMAL','VACINACAO_ANTIRRABICA')),
   constraint INGO_CK_02 check (INGO_DS_SITUACAO in ('pendente','enviada','confirmada','com_falha')),
   constraint INGO_CK_03 check (INGO_QT_TENTATIVAS >= 0),
   -- só a operação de vacinação aponta para uma vacina
   constraint INGO_CK_04 check ((INGO_DS_TIPO_OPERACAO = 'VACINACAO_ANTIRRABICA') = (VACI_ID_VACINA is not null)),
   -- enviada/confirmada sempre têm protocolo do governo
   constraint INGO_CK_05 check (INGO_DS_SITUACAO not in ('enviada','confirmada') or INGO_NR_PROTOCOLO_EXTERNO is not null),
   constraint INGO_CK_06 check (INGO_DT_HR_RESPOSTA is null or INGO_DT_HR_RESPOSTA >= INGO_DT_HR_SOLICITACAO)
);

create index if not exists INGO_IX_01 on VET_INTEGRACAO_GOV (ANIM_ID_ANIMAL);
-- usado no reenvio de pendências
create index if not exists INGO_IX_02 on VET_INTEGRACAO_GOV (INGO_DS_SITUACAO);

--ROLLBACK DROP TABLE VET_INTEGRACAO_GOV;
--comment on table  VET_INTEGRACAO_GOV                             is 'Tabela de integrações com a API do governo';
--comment on column VET_INTEGRACAO_GOV.INGO_ID_INTEGRACAO          is 'Identificador da integração';
--comment on column VET_INTEGRACAO_GOV.ANIM_ID_ANIMAL              is 'Identificador do animal registrado';
--comment on column VET_INTEGRACAO_GOV.VACI_ID_VACINA              is 'Identificador da vacina comunicada (somente em VACINACAO_ANTIRRABICA)';
--comment on column VET_INTEGRACAO_GOV.INGO_DS_TIPO_OPERACAO       is 'Tipo da operação.(CADASTRO_ANIMAL/ATUALIZACAO_ANIMAL/VACINACAO_ANTIRRABICA)';
--comment on column VET_INTEGRACAO_GOV.INGO_DS_CHAVE_IDEMPOTENCIA  is 'Chave de idempotência da requisição (a mesma em todas as tentativas)';
--comment on column VET_INTEGRACAO_GOV.INGO_CD_MICROCHIP           is 'Microchip enviado nesta operação';
--comment on column VET_INTEGRACAO_GOV.INGO_CD_MICROCHIP_ANTERIOR  is 'Microchip anterior, usado ao sincronizar uma troca';
--comment on column VET_INTEGRACAO_GOV.INGO_NR_PROTOCOLO_EXTERNO   is 'Número do protocolo retornado pela API do governo';
--comment on column VET_INTEGRACAO_GOV.INGO_DS_SITUACAO            is 'Situação da integração.(pendente/enviada/confirmada/com_falha)';
--comment on column VET_INTEGRACAO_GOV.INGO_QT_TENTATIVAS          is 'Quantidade de tentativas de envio';
--comment on column VET_INTEGRACAO_GOV.INGO_DT_HR_SOLICITACAO      is 'Data e hora da solicitação';
--comment on column VET_INTEGRACAO_GOV.INGO_DT_HR_RESPOSTA         is 'Data e hora da resposta';
--comment on column VET_INTEGRACAO_GOV.INGO_DS_MSG_ERRO            is 'Mensagem de erro retornada';
