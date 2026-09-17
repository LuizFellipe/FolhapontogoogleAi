-- Migration: Adicionar campo disciplina aos profissionais
-- Permite vincular a disciplina ministrada pelo profissional (texto de até 255 caracteres)

USE folhaponto_db;

ALTER TABLE profissionais
ADD COLUMN IF NOT EXISTS disciplina VARCHAR(255) NULL AFTER cargo;

INSERT IGNORE INTO schema_migrations (version) VALUES ('022');
