-- Migration 028: distribuição de carga horária (gh/distribuicao_carga.csv)
-- Serve os servidores que não aparecem nos GH.N.sem.*.csv. Importada por POST /api/gh/processar
-- (snapshot por ano/semestre presente no CSV: apaga e regrava esses semestres).

USE folhaponto_db;

CREATE TABLE IF NOT EXISTS gh_distribuicao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ano SMALLINT NOT NULL,
    semestre TINYINT NOT NULL,
    grade VARCHAR(120) NOT NULL,
    nome_professor VARCHAR(255) NULL,
    matricula VARCHAR(20) NOT NULL,
    turno VARCHAR(20) NULL,
    carga_horaria TINYINT NULL,
    profissional_id INT NULL,
    criado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_gh_distribuicao (ano, semestre, matricula, grade),
    INDEX idx_gh_distribuicao_prof (profissional_id),
    FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE SET NULL
);

INSERT IGNORE INTO schema_migrations (version) VALUES ('028');
