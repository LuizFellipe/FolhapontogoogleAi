-- Migração para tornar matrícula opcional
-- Executar após a criação inicial das tabelas

USE folhaponto_db;

-- Remover a restrição UNIQUE e NOT NULL da coluna matricula
ALTER TABLE profissionais 
MODIFY COLUMN matricula VARCHAR(20) NULL;

-- Remover o índice único da matrícula
ALTER TABLE profissionais DROP INDEX idx_matricula;

-- Criar novo índice (não único) para buscas por matrícula
ALTER TABLE profissionais ADD INDEX idx_matricula (matricula);

-- Atualizar registro de exemplo para permitir NULL (se necessário)
-- Nota: Registros existentes com matrícula permanecem inalterados