CREATE TABLE IF NOT EXISTS recessos (
  id         INT NOT NULL AUTO_INCREMENT,
  dia_inicio INT NOT NULL,
  mes_inicio INT NOT NULL,
  ano_inicio INT NOT NULL,
  dia_fim    INT NOT NULL,
  mes_fim    INT NOT NULL,
  ano_fim    INT NOT NULL,
  label      VARCHAR(255) NOT NULL,
  criado_em  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
