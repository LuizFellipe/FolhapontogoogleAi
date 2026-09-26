-- Migration 023: Criação de tabelas para dados complementares do SIGEP (Ficha Cadastral)
-- Regra de Não-Duplicação: dados básicos já presentes em 'profissionais' não são duplicados aqui.

USE folhaponto_db;

-- 1. Tabela 1:1 - Dados Pessoais e Cadastrais Complementares
CREATE TABLE IF NOT EXISTS profissionais_complementar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profissional_id INT NOT NULL UNIQUE,
    matricula VARCHAR(20) NULL,
    admissao VARCHAR(20) NULL,
    ref_sal VARCHAR(50) NULL,
    pcd VARCHAR(10) NULL,
    reducao_ch VARCHAR(10) NULL,
    readaptado VARCHAR(255) NULL,
    identidade_funcional VARCHAR(50) NULL,
    nascimento VARCHAR(20) NULL,
    sexo VARCHAR(20) NULL,
    cor_raca VARCHAR(50) NULL,
    naturalidade VARCHAR(100) NULL,
    nacionalidade VARCHAR(100) NULL,
    uf_naturalidade VARCHAR(10) NULL,
    ci_numero VARCHAR(30) NULL,
    ci_orgao VARCHAR(30) NULL,
    ci_uf VARCHAR(10) NULL,
    ci_data_emissao VARCHAR(20) NULL,
    cpf VARCHAR(20) NULL,
    pis_pasep VARCHAR(30) NULL,
    pis_emissao VARCHAR(20) NULL,
    titulo_eleitoral VARCHAR(30) NULL,
    titulo_zona VARCHAR(10) NULL,
    titulo_secao VARCHAR(10) NULL,
    estado_civil VARCHAR(50) NULL,
    conjuge VARCHAR(255) NULL,
    pai VARCHAR(255) NULL,
    mae VARCHAR(255) NULL,
    endereco VARCHAR(255) NULL,
    bairro VARCHAR(100) NULL,
    cidade VARCHAR(100) NULL,
    uf_endereco VARCHAR(10) NULL,
    cep VARCHAR(20) NULL,
    telefones JSON NULL,
    email VARCHAR(255) NULL,
    especialidade_concurso VARCHAR(255) NULL,
    escolaridade_salario VARCHAR(255) NULL,
    arquivo_origem VARCHAR(255) NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
    INDEX idx_comp_matricula (matricula),
    INDEX idx_comp_cpf (cpf)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela 1:N - Cargas Horárias
CREATE TABLE IF NOT EXISTS profissional_cargas_horarias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profissional_id INT NOT NULL,
    tipo_carga VARCHAR(50) NOT NULL, -- PRINCIPAL / SECUNDÁRIA
    unidade VARCHAR(255) NULL,
    cre VARCHAR(255) NULL,
    coord_externa VARCHAR(100) NULL,
    lotacao VARCHAR(255) NULL,
    turno VARCHAR(50) NULL,
    atuacao VARCHAR(255) NULL,
    FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
    INDEX idx_cg_profissional (profissional_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela 1:N - Cursos e Progressões
CREATE TABLE IF NOT EXISTS profissional_cursos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profissional_id INT NOT NULL,
    curso VARCHAR(255) NOT NULL,
    instituicao VARCHAR(255) NULL,
    emissao VARCHAR(20) NULL,
    utilizacao VARCHAR(255) NULL,
    data_utilizacao VARCHAR(20) NULL,
    carga_horaria INT NULL,
    FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
    INDEX idx_cr_profissional (profissional_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela 1:N - Habilitações
CREATE TABLE IF NOT EXISTS profissional_habilitacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profissional_id INT NOT NULL,
    habilitacao VARCHAR(255) NOT NULL,
    FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
    INDEX idx_hb_profissional (profissional_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabela 1:N - Componentes Curriculares
CREATE TABLE IF NOT EXISTS profissional_componentes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profissional_id INT NOT NULL,
    componente VARCHAR(255) NOT NULL,
    FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
    INDEX idx_cp_profissional (profissional_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Registrar a migration
INSERT IGNORE INTO schema_migrations (version) VALUES ('023');
