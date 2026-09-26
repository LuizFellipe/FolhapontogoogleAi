-- Migration 024: remove colunas redundantes das tabelas 1:N do SIGEP
-- matricula: derivável via profissional_id. criado_em: linhas são recriadas a cada sync

USE folhaponto_db;

ALTER TABLE profissional_cargas_horarias DROP COLUMN IF EXISTS matricula, DROP COLUMN IF EXISTS criado_em;
ALTER TABLE profissional_cursos DROP COLUMN IF EXISTS matricula, DROP COLUMN IF EXISTS criado_em;
ALTER TABLE profissional_habilitacoes DROP COLUMN IF EXISTS matricula, DROP COLUMN IF EXISTS criado_em;
ALTER TABLE profissional_componentes DROP COLUMN IF EXISTS matricula, DROP COLUMN IF EXISTS criado_em;

INSERT IGNORE INTO schema_migrations (version) VALUES ('024');
