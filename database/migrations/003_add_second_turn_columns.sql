-- Migration: Adicionar coluna para segundo turno em lançamentos diários
-- Esta migration adiciona suporte a lançamentos independentes por turno

USE folhaponto_db;

-- Adicionar coluna tipo_turno2 na tabela de lançamentos diários
ALTER TABLE lancamentos_diarios 
ADD COLUMN tipo_turno2 ENUM('TRABALHO', 'FERIAS', 'RECESSO', 'ATESTADO', 'LICENCA', 'FALTA', 'TRE', 'ABONO', 'CPIP', 'CURSO', 'ABONO_NIVER', 'FERIADO') NULL AFTER tipo;

-- Adicionar coluna observacao_turno2 para observações específicas do segundo turno
ALTER TABLE lancamentos_diarios 
ADD COLUMN observacao_turno2 TEXT NULL AFTER observacao;

-- Atualizar a coluna existente 'tipo' para ser explicitamente o tipo_turno1
-- (isso já existe, mas vamos garantir que está correto)
-- ALTER TABLE lancamentos_diarios CHANGE COLUMN tipo tipo_turno1 ENUM(...) NOT NULL DEFAULT 'TRABALHO';

-- Adicionar índices para performance
ALTER TABLE lancamentos_diarios 
ADD INDEX idx_tipo_turno2 (tipo_turno2);

-- Comentário sobre a estrutura final:
-- - tipo: será o tipo_turno1 (mantido para compatibilidade)
-- - tipo_turno2: NULL para funcionários de 20h, preenchido para 40h
-- - observacao: observações do turno 1
-- - observacao_turno2: observações do turno 2 (pode ser NULL)
