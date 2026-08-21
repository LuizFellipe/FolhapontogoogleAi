-- Criação do banco de dados folhaponto_db
CREATE DATABASE IF NOT EXISTS folhaponto_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usar o banco de dados criado
USE folhaponto_db;

-- Tabela de Profissionais (profissionais)
CREATE TABLE IF NOT EXISTS profissionais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    matricula VARCHAR(20) NULL,
    cargo VARCHAR(255) NOT NULL,
    ua VARCHAR(10) NOT NULL,
    exercicio VARCHAR(20) NOT NULL,
    carga_horaria VARCHAR(10) NOT NULL,
    funcao VARCHAR(255),
    unidade_lotacao VARCHAR(255) NOT NULL,
    status ENUM('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO',
    turno1 VARCHAR(50),
    turno2 VARCHAR(50),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_matricula (matricula),
    INDEX idx_nome (nome),
    INDEX idx_status (status)
);

-- Tabela de Folhas de Ponto (folhas_ponto)
CREATE TABLE IF NOT EXISTS folhas_ponto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profissional_id INT NOT NULL,
    mes INT NOT NULL,
    ano INT NOT NULL,
    observacoes TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
    UNIQUE KEY unique_profissional_mes_ano (profissional_id, mes, ano),
    INDEX idx_profissional_mes_ano (profissional_id, mes, ano)
);

-- Tabela lookup de tipos de lançamento (tipos_lancamento)
CREATE TABLE IF NOT EXISTS tipos_lancamento (
    valor   VARCHAR(80)  NOT NULL,
    label   VARCHAR(150) NOT NULL,
    codigo  VARCHAR(20)  NULL,
    PRIMARY KEY (valor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO tipos_lancamento (valor, label, codigo) VALUES
    ('TRABALHO',                    'TRABALHO NORMAL',                               NULL),
    ('FERIAS',                      'FÉRIAS',                                        '99902'),
    ('ATESTADO MEDICO DE ATE 03',   'ATESTADO MEDICO DE ATE 03 DIAS',                '00294'),
    ('LICENCA MEDICA OU',           'LICENCA MEDICA OU ODONTOLOGICA',                '00306'),
    ('FALTA',                       'FALTA',                                         '40010'),
    ('Abono TRE',                   'Abono TRE',                                     '00256'),
    ('ABONO DE PONTO ART 151 LEI',  'ABONO DE PONTO ART 151 LEI COMP 840/2011',     '00219'),
    ('CPIP',                        'CPIP',                                          NULL),
    ('CURSO',                       'CURSO FORMAÇÃO CONTINUADA',                     NULL),
    ('ABONO_NIVER',                 'ABONO ANIVERSÁRIO',                             NULL),
    ('FERIADO',                     'FERIADO',                                       NULL),
    ('FALTA PARALISAÇÃO',           'FALTA PARALISAÇÃO',                             '40034'),
    ('ATESTADO DE COMPARECIMENTO',  'ATESTADO COMPARECIMENTO SERVIDOR',              '00340'),
    ('LIC. ACOMP. PESSOA DOENTE',   'LIC. ACOMP. PESSOA DOENTE FAMILIA',            '99906'),
    ('AFAST DOACAO SANGUE ART 62',  'AFAST DOACAO SANGUE ART 62 LEI COMP 840/2011', '00310'),
    ('ABONO DE PONTO BIMESTRAL LEI','ABONO DE PONTO BIMESTRAL LEI 449/1993',         '00284'),
    ('RECESSO',                     'RECESSO',                                       '00258'),
    ('PONTO FACULTATIVO',           'PONTO FACULTATIVO',                             '00000'),
    ('ATESTADO COMPARECIMENTO A',   'ATESTADO COMPARECIMENTO A SUBSAUDE',            '00343'),
    ('ATESTADO COMPARECIMENTO P.',  'ATESTADO COMPARECIMENTO PESSOA DA FAMILIA',     '00341'),
    ('EXAME MEDICO PREV/PERIOD ART','EXAME MEDICO PREV/PERIOD ART 62 LEI COMP',      '00118');

-- Tabela de Lançamentos Diários (lancamentos_diarios)
CREATE TABLE IF NOT EXISTS lancamentos_diarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folha_ponto_id INT NOT NULL,
    dia INT NOT NULL,
    tipo VARCHAR(80) NOT NULL DEFAULT 'TRABALHO',
    tipo_turno2 VARCHAR(80) NULL,
    observacao TEXT,
    observacao_turno2 TEXT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (folha_ponto_id) REFERENCES folhas_ponto(id) ON DELETE CASCADE,
    UNIQUE KEY unique_folha_dia (folha_ponto_id, dia),
    INDEX idx_folha_dia (folha_ponto_id, dia),
    INDEX idx_tipo_turno2 (tipo_turno2)
);

-- Tabela de Resumo (resumo_folha)
CREATE TABLE IF NOT EXISTS resumo_folha (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folha_ponto_id INT NOT NULL,
    operacao ENUM('I', 'A', 'E', '') NOT NULL DEFAULT '',
    codigo VARCHAR(10) NOT NULL DEFAULT '',
    carga VARCHAR(20) NOT NULL DEFAULT '',
    meses VARCHAR(50) NOT NULL DEFAULT '',
    horas_dias VARCHAR(20) NOT NULL DEFAULT '',
    dia_inicio VARCHAR(10) NOT NULL DEFAULT '',
    dia_fim VARCHAR(10) NOT NULL DEFAULT '',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (folha_ponto_id) REFERENCES folhas_ponto(id) ON DELETE CASCADE,
    INDEX idx_folha_ponto (folha_ponto_id)
);

-- Inserir dados de exemplo para teste
INSERT IGNORE INTO profissionais (
    nome, matricula, cargo, ua, exercicio, carga_horaria, funcao, unidade_lotacao, turno1, turno2
) VALUES (
    'JOÃO DA SILVA',
    '123456-7',
    'PPGE - APOIO 07-TQ5',
    '005',
    '990210000029',
    '40',
    '',
    'CENTRO DE EDUC PROF ESCOLA TEC DO GUARA PROF TERESA ONDINA M',
    'MATUTINO',
    ''
);
