-- Migration: Create vw_relatorio_atestados_comparecimento
-- Description: Counts comparecimento attestation types grouped by month (0-indexed).
--              Each day is counted as one occurrence (no sequence collapsing).
--              Two types are counted together toward the annual limit of 12:
--                - 'ATESTADO DE COMPARECIMENTO'      (servidor)
--                - 'ATESTADO COMPARECIMENTO P.'      (pessoa da família)
--              NOTE: 'ATESTADO COMPARECIMENTO A' (acompanhante/subsaúde) does NOT count.
-- Compatibility: MySQL 5.7+
-- Logic: Covers both tipo (turno 1) and tipo_turno2 (turno 2) columns.

CREATE OR REPLACE VIEW vw_relatorio_atestados_comparecimento AS
SELECT
    v1.matricula,
    v1.nome,
    v1.ano,
    SUM(CASE WHEN v1.mes = 0  THEN 1 ELSE 0 END) AS mes0,
    SUM(CASE WHEN v1.mes = 1  THEN 1 ELSE 0 END) AS mes1,
    SUM(CASE WHEN v1.mes = 2  THEN 1 ELSE 0 END) AS mes2,
    SUM(CASE WHEN v1.mes = 3  THEN 1 ELSE 0 END) AS mes3,
    SUM(CASE WHEN v1.mes = 4  THEN 1 ELSE 0 END) AS mes4,
    SUM(CASE WHEN v1.mes = 5  THEN 1 ELSE 0 END) AS mes5,
    SUM(CASE WHEN v1.mes = 6  THEN 1 ELSE 0 END) AS mes6,
    SUM(CASE WHEN v1.mes = 7  THEN 1 ELSE 0 END) AS mes7,
    SUM(CASE WHEN v1.mes = 8  THEN 1 ELSE 0 END) AS mes8,
    SUM(CASE WHEN v1.mes = 9  THEN 1 ELSE 0 END) AS mes9,
    SUM(CASE WHEN v1.mes = 10 THEN 1 ELSE 0 END) AS mes10,
    SUM(CASE WHEN v1.mes = 11 THEN 1 ELSE 0 END) AS mes11
FROM vw_folhas_lancamento v1
WHERE (
    v1.tipo IN ('ATESTADO DE COMPARECIMENTO', 'ATESTADO COMPARECIMENTO P.')
    OR v1.tipo_turno2 IN ('ATESTADO DE COMPARECIMENTO', 'ATESTADO COMPARECIMENTO P.')
)
  -- Validação: apenas meses/dias válidos do sistema (0-indexed meses, 1-indexed dias)
  AND v1.mes BETWEEN 0 AND 11
  AND v1.dia BETWEEN 1 AND 31
GROUP BY v1.matricula, v1.nome, v1.ano;

INSERT IGNORE INTO schema_migrations (version) VALUES ('020');
