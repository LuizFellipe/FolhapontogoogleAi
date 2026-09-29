-- Migration 027: carências da Gestão de Horários (GH) e histórico de cada carência
-- Fonte: gh/GH.N.sem.AAAA.json (carências) e gh/GH.N.sem.AAAA.historico.json (eventos), lidos por POST /api/gh/sincronizar
-- Carência que some do arquivo é mantida (só deixa de atualizar ultima_vista_em).

USE folhaponto_db;

CREATE TABLE IF NOT EXISTS gh_carencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ano SMALLINT NOT NULL,
    semestre TINYINT NOT NULL,
    cod_carencia VARCHAR(20) NOT NULL,
    cod_carencia_pai VARCHAR(20) NULL,
    nome_carga_horaria VARCHAR(120) NULL,
    periodo VARCHAR(40) NULL,
    periodo_ini DATE NULL,
    periodo_fim DATE NULL,
    tipo VARCHAR(30) NULL,
    componente VARCHAR(255) NULL,
    situacao VARCHAR(80) NULL,
    titular_nome VARCHAR(255) NULL,
    titular_profissional_id INT NULL,
    substituto_nome VARCHAR(255) NULL,
    substituto_doc VARCHAR(20) NULL,
    substituto_profissional_id INT NULL,
    ultima_vista_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    criado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_gh_carencia (ano, semestre, cod_carencia),
    INDEX idx_gh_titular (titular_profissional_id),
    INDEX idx_gh_substituto (substituto_profissional_id),
    FOREIGN KEY (titular_profissional_id) REFERENCES profissionais(id) ON DELETE SET NULL,
    FOREIGN KEY (substituto_profissional_id) REFERENCES profissionais(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS gh_carencia_historico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    carencia_id INT NOT NULL,
    data DATETIME NULL,
    situacao VARCHAR(80) NULL,
    matricula VARCHAR(20) NULL,
    nome VARCHAR(255) NULL,
    observacao TEXT NULL,
    hash VARCHAR(32) NOT NULL,
    raspado_em DATETIME NULL,
    UNIQUE KEY uq_gh_hist (carencia_id, hash),
    INDEX idx_gh_hist_data (carencia_id, data),
    FOREIGN KEY (carencia_id) REFERENCES gh_carencias(id) ON DELETE CASCADE
);

INSERT IGNORE INTO schema_migrations (version) VALUES ('027');
