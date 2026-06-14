-- Migration: Create vw_relatorio_atestados_bimestrais
-- Description: Counts medical certificates grouped by bimester, counting consecutive days as a single occurrence.
-- Compatibility: MySQL 5.7+ (Uses NOT EXISTS instead of Window Functions/CTEs)
-- Logic Adjustment: Handles 0-indexed months (0=Jan, 1=Feb, ..., 11=Dec) used by the system.

CREATE OR REPLACE VIEW vw_relatorio_atestados_bimestrais AS
SELECT 
    v1.matricula, 
    v1.nome, 
    v1.ano,
    -- Agrupamento bimestral (0-indexed: 0/1=Bim1, 2/3=Bim2, ...)
    SUM(CASE WHEN v1.mes IN (0, 1)   THEN 1 ELSE 0 END) AS bimestre1,
    SUM(CASE WHEN v1.mes IN (2, 3)   THEN 1 ELSE 0 END) AS bimestre2,
    SUM(CASE WHEN v1.mes IN (4, 5)   THEN 1 ELSE 0 END) AS bimestre3,
    SUM(CASE WHEN v1.mes IN (6, 7)   THEN 1 ELSE 0 END) AS bimestre4,
    SUM(CASE WHEN v1.mes IN (8, 9)   THEN 1 ELSE 0 END) AS bimestre5,
    SUM(CASE WHEN v1.mes IN (10, 11) THEN 1 ELSE 0 END) AS bimestre6
FROM vw_folhas_lancamento v1
WHERE (v1.tipo = 'ATESTADO MEDICO DE ATE 03' OR v1.tipo_turno2 = 'ATESTADO MEDICO DE ATE 03')
  -- Validação: meses de 0 a 11
  AND v1.mes BETWEEN 0 AND 11
  AND v1.dia BETWEEN 1 AND 31
  -- Identifica o início de uma sequência
  AND NOT EXISTS (
      SELECT 1 
      FROM vw_folhas_lancamento v2
      WHERE v2.matricula = v1.matricula 
        AND (v2.tipo = 'ATESTADO MEDICO DE ATE 03' OR v2.tipo_turno2 = 'ATESTADO MEDICO DE ATE 03')
        AND v2.mes BETWEEN 0 AND 11
        AND v2.dia BETWEEN 1 AND 31
        -- Converte para data real somando +1 ao mês para o MySQL STR_TO_DATE (1-indexed)
        AND STR_TO_DATE(CONCAT(v2.ano, '-', LPAD(v2.mes + 1, 2, '0'), '-', LPAD(v2.dia, 2, '0')), '%Y-%m-%d') = 
            DATE_SUB(STR_TO_DATE(CONCAT(v1.ano, '-', LPAD(v1.mes + 1, 2, '0'), '-', LPAD(v1.dia, 2, '0')), '%Y-%m-%d'), INTERVAL 1 DAY)
  )
GROUP BY v1.matricula, v1.nome, v1.ano;
