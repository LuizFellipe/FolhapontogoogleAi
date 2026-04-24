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
    turno1 VARCHAR(50),
    turno2 VARCHAR(50),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_matricula (matricula),
    INDEX idx_nome (nome)
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

-- Tabela de Lançamentos Diários (lancamentos_diarios)
CREATE TABLE IF NOT EXISTS lancamentos_diarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folha_ponto_id INT NOT NULL,
    dia INT NOT NULL,
    tipo ENUM('TRABALHO', 'FERIAS', 'RECESSO', 'ATESTADO', 'LICENCA', 'FALTA', 'TRE', 'ABONO', 'CPIP', 'CURSO', 'ABONO_NIVER', 'FERIADO', 'ABONO DE PONTO ART 151 LEI', 'FALTA PARALISAÇÃO', 'ATESTADO DE COMPARECIMENTO') NOT NULL DEFAULT 'TRABALHO',
    tipo_turno2 ENUM('TRABALHO', 'FERIAS', 'RECESSO', 'ATESTADO', 'LICENCA', 'FALTA', 'TRE', 'ABONO', 'CPIP', 'CURSO', 'ABONO_NIVER', 'FERIADO', 'ABONO DE PONTO ART 151 LEI', 'FALTA PARALISAÇÃO', 'ATESTADO DE COMPARECIMENTO') NULL,
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
