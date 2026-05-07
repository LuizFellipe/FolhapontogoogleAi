-- Migration 012: Adiciona tipo TRACEJADO à tabela de lookup tipos_lancamento
INSERT IGNORE INTO `tipos_lancamento` (`valor`, `label`, `codigo`)
VALUES ('TRACEJADO', '--- (Tracejado)', NULL);
