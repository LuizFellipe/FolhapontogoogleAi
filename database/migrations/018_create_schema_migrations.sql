CREATE TABLE IF NOT EXISTS schema_migrations (
  version    VARCHAR(50) NOT NULL,
  applied_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Marca retroativamente as migrations já aplicadas em bancos existentes.
INSERT IGNORE INTO schema_migrations (version) VALUES
  ('001'), ('002'), ('003'), ('004'), ('005'), ('006'), ('007'), ('008'),
  ('009'), ('010'), ('011'), ('012'), ('013'), ('014'), ('015'), ('016'), ('017'), ('018');
