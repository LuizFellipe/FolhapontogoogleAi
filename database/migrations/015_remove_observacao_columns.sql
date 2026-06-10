-- Remove colunas observacao e observacao_turno2 de lancamentos_diarios.
-- Estes campos armazenavam labels de feriado/recesso mas nunca foram
-- exibidos em nenhuma tela ou relatório do sistema.

ALTER TABLE lancamentos_diarios
  DROP COLUMN observacao,
  DROP COLUMN observacao_turno2;
