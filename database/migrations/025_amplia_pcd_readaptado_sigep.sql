-- Migration 025: amplia colunas do SIGEP que estouravam no sync
-- pcd traz o tipo (ex.: SIM - DEFICIENCIA FISICA). readaptado traz o texto do laudo (> 255)

USE folhaponto_db;

ALTER TABLE profissionais_complementar
    MODIFY pcd VARCHAR(100) NULL,
    MODIFY readaptado TEXT NULL;

INSERT IGNORE INTO schema_migrations (version) VALUES ('025');
