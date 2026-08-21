-- Migration: Adicionar status (Ativo/Inativo) aos profissionais
-- Profissionais temporários encerram contrato e efetivos mudam de lotação;
-- este campo permite marcar o vínculo sem apagar o histórico de folhas.

USE folhaponto_db;

ALTER TABLE profissionais
ADD COLUMN IF NOT EXISTS status ENUM('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO' AFTER unidade_lotacao;

-- Garante explicitamente que todos os profissionais já cadastrados ficam ATIVO
-- (o DEFAULT acima já preenche isso automaticamente nas linhas existentes, mas
-- o UPDATE deixa a intenção explícita e serve de proteção redundante)
UPDATE profissionais SET status = 'ATIVO' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_status ON profissionais (status);

INSERT IGNORE INTO schema_migrations (version) VALUES ('021');
