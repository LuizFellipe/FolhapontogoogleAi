ALTER TABLE recessos
  ADD UNIQUE KEY unique_recesso_periodo (dia_inicio, mes_inicio, ano_inicio, dia_fim, mes_fim, ano_fim);

INSERT IGNORE INTO schema_migrations (version) VALUES ('019');
