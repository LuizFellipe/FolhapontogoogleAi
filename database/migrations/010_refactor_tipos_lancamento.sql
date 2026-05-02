-- Migration 010: Refatorar tipos de lançamento
-- Data: 2026-05-01
--
-- O que esta migration faz:
--   1. Cria tabela lookup tipos_lancamento (valor, label, codigo)
--   2. Migra lancamentos_diarios.tipo e tipo_turno2 de ENUM → VARCHAR(80)
--   3. Atualiza registros com values antigos para os novos
--   4. Popula tipos_lancamento com todos os 21 tipos

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 1. Criar tabela lookup
CREATE TABLE IF NOT EXISTS tipos_lancamento (
    valor   VARCHAR(80) NOT NULL,
    label   VARCHAR(150) NOT NULL,
    codigo  VARCHAR(20) NULL,
    PRIMARY KEY (valor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Migrar ENUM → VARCHAR(80)
ALTER TABLE lancamentos_diarios
    MODIFY COLUMN tipo      VARCHAR(80) NOT NULL DEFAULT 'TRABALHO',
    MODIFY COLUMN tipo_turno2 VARCHAR(80) NULL;

-- 3. Migrar values que mudaram
UPDATE lancamentos_diarios SET tipo       = 'ATESTADO MEDICO DE ATE 03'   WHERE tipo       = 'ATESTADO';
UPDATE lancamentos_diarios SET tipo_turno2 = 'ATESTADO MEDICO DE ATE 03'  WHERE tipo_turno2 = 'ATESTADO';
UPDATE lancamentos_diarios SET tipo       = 'LICENCA MEDICA OU'           WHERE tipo       = 'LICENCA';
UPDATE lancamentos_diarios SET tipo_turno2 = 'LICENCA MEDICA OU'          WHERE tipo_turno2 = 'LICENCA';
UPDATE lancamentos_diarios SET tipo       = 'Abono TRE'                   WHERE tipo       = 'TRE';
UPDATE lancamentos_diarios SET tipo_turno2 = 'Abono TRE'                  WHERE tipo_turno2 = 'TRE';
UPDATE lancamentos_diarios SET tipo       = 'ABONO DE PONTO ART 151 LEI'  WHERE tipo       = 'ABONO';
UPDATE lancamentos_diarios SET tipo_turno2 = 'ABONO DE PONTO ART 151 LEI' WHERE tipo_turno2 = 'ABONO';

-- 4. Popular lookup
INSERT INTO tipos_lancamento (valor, label, codigo) VALUES
    ('TRABALHO',                    'TRABALHO NORMAL',                              NULL),
    ('FERIAS',                      'FÉRIAS',                                       '99902'),
    ('ATESTADO MEDICO DE ATE 03',   'ATESTADO MEDICO DE ATE 03 DIAS',               '00294'),
    ('LICENCA MEDICA OU',           'LICENCA MEDICA OU ODONTOLOGICA',               '00306'),
    ('FALTA',                       'FALTA',                                        '40010'),
    ('Abono TRE',                   'Abono TRE',                                    '00256'),
    ('ABONO DE PONTO ART 151 LEI',  'ABONO DE PONTO ART 151 LEI COMP 840/2011',    '00219'),
    ('CPIP',                        'CPIP',                                         NULL),
    ('CURSO',                       'CURSO FORMAÇÃO CONTINUADA',                    NULL),
    ('ABONO_NIVER',                 'ABONO ANIVERSÁRIO',                            NULL),
    ('FERIADO',                     'FERIADO',                                      NULL),
    ('FALTA PARALISAÇÃO',           'FALTA PARALISAÇÃO',                            '40034'),
    ('ATESTADO DE COMPARECIMENTO',  'ATESTADO COMPARECIMENTO SERVIDOR',             '00340'),
    ('LIC. ACOMP. PESSOA DOENTE',   'LIC. ACOMP. PESSOA DOENTE FAMILIA',           '99906'),
    ('AFAST DOACAO SANGUE ART 62',  'AFAST DOACAO SANGUE ART 62 LEI COMP 840/2011','00310'),
    ('ABONO DE PONTO BIMESTRAL LEI','ABONO DE PONTO BIMESTRAL LEI 449/1993',        '00284'),
    ('RECESSO',                     'RECESSO',                                      '00258'),
    ('PONTO FACULTATIVO',           'PONTO FACULTATIVO',                            '00000'),
    ('ATESTADO COMPARECIMENTO A',   'ATESTADO COMPARECIMENTO A SUBSAUDE',           '00343'),
    ('ATESTADO COMPARECIMENTO P.',  'ATESTADO COMPARECIMENTO PESSOA DA FAMILIA',    '00341'),
    ('EXAME MEDICO PREV/PERIOD ART','EXAME MEDICO PREV/PERIOD ART 62 LEI COMP',     '00118');
