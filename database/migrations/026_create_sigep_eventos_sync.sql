-- Migration 026: flag de eventos do Relatório de Eventos já sincronizados no SIGEP (03.Lançamento)
-- Uma linha por range (tipo + dia_inicio..dia_fim) da folha, gravada por sigep/lancar_eventos.py

USE folhaponto_db;

CREATE TABLE IF NOT EXISTS sigep_eventos_sync (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folha_ponto_id INT NOT NULL,
    tipo VARCHAR(80) NOT NULL,
    dia_inicio TINYINT NOT NULL,
    dia_fim TINYINT NOT NULL,
    turnos VARCHAR(20) NOT NULL,
    status ENUM('JA_EXISTIA','LANCADO') NOT NULL,
    sincronizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_range (folha_ponto_id, tipo, dia_inicio, dia_fim),
    FOREIGN KEY (folha_ponto_id) REFERENCES folhas_ponto(id) ON DELETE CASCADE
);

INSERT IGNORE INTO schema_migrations (version) VALUES ('026');
