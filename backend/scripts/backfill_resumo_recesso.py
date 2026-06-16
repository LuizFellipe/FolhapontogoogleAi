#!/usr/bin/env python3
"""
Backfill one-off: recalcula resumo_folha para folhas de junho/2026 (mes=5, ano=2026)
que tiveram RECESSO aplicado via Geracao em Lote mas ficaram com resumo_folha vazio
(bug corrigido em src/App.tsx, branch "folha ja existe" de handleBatchGenerate).

Reimplementa o mesmo algoritmo de computeSummaryFromEntries (src/App.tsx:19-72)
usando o mapeamento de codigos de ENTRY_TYPES (src/types.ts:50-75).
"""

import os
import sys

import mysql.connector
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'folhaponto_user'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'folhaponto_db'),
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci',
}

MES = 5  # junho, 0-indexed
ANO = 2026

# value -> code, espelha ENTRY_TYPES em src/types.ts
ENTRY_TYPE_CODES = {
    'TRABALHO': None,
    'FERIAS': '99902',
    'ATESTADO MEDICO DE ATE 03': '00294',
    'LICENCA MEDICA OU': '00306',
    'FALTA': '40010',
    'Abono TRE': '00256',
    'ABONO DE PONTO ART 151 LEI': '00219',
    'CPIP': None,
    'CURSO': None,
    'ABONO_NIVER': '00717',
    'FERIADO': None,
    'FALTA PARALISAÇÃO': '40034',
    'ATESTADO DE COMPARECIMENTO': '00340',
    'LIC. ACOMP. PESSOA DOENTE': '99906',
    'AFAST DOACAO SANGUE ART 62': '00310',
    'ABONO DE PONTO BIMESTRAL LEI': '00284',
    'RECESSO': '00258',
    'PONTO FACULTATIVO': '00000',
    'ATESTADO COMPARECIMENTO A': '00343',
    'ATESTADO COMPARECIMENTO P.': '00341',
    'EXAME MEDICO PREV/PERIOD ART': '00118',
    'TRACEJADO': None,
    'AFAST CASAMENTO ART 62 LEI': '00317',
    'AFAST FALECIMENTO FAMILIA LEI': '00313',
}


def compute_summary_from_entries(entries, carga_horaria):
    """entries: list of (dia, tipo, tipo_turno2). Espelha src/App.tsx:19-72."""
    carga_value = '3' if '40' in str(carga_horaria or '').lower() else '1'

    seen = set()
    code_days = []
    for dia, tipo, tipo_turno2 in entries:
        for tipo_value in (tipo, tipo_turno2):
            code = ENTRY_TYPE_CODES.get(tipo_value)
            if code is not None:
                key = (code, dia)
                if key not in seen:
                    seen.add(key)
                    code_days.append((code, dia))

    code_map = {}
    for code, dia in code_days:
        code_map.setdefault(code, []).append(dia)

    rows = []
    for code, days in code_map.items():
        days = sorted(days)
        i = 0
        while i < len(days):
            j = i
            while j + 1 < len(days) and days[j + 1] == days[j] + 1:
                j += 1
            rows.append({
                'operacao': 'I',
                'codigo': code,
                'carga': carga_value,
                'meses': '01',
                'horas_dias': str(j - i + 1).zfill(5),
                'dia_inicio': str(days[i]).zfill(2),
                'dia_fim': str(days[j]).zfill(2),
            })
            i = j + 1

    while len(rows) < 8:
        rows.append({
            'operacao': '', 'codigo': '', 'carga': '',
            'meses': '', 'horas_dias': '', 'dia_inicio': '', 'dia_fim': '',
        })
    return rows[:8]


def main(dry_run=False):
    conn = mysql.connector.connect(**DB_CONFIG)
    cur = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT fp.id AS folha_id, p.matricula, p.nome, p.carga_horaria
        FROM folhas_ponto fp
        JOIN profissionais p ON p.id = fp.profissional_id
        WHERE fp.mes = %s AND fp.ano = %s
        ORDER BY fp.id
    """, (MES, ANO))
    folhas = cur.fetchall()

    affected = []
    for row in folhas:
        folha_id = row['folha_id']
        cur.execute(
            "SELECT dia, tipo, tipo_turno2 FROM lancamentos_diarios WHERE folha_ponto_id = %s",
            (folha_id,)
        )
        entries = [(r['dia'], r['tipo'], r['tipo_turno2']) for r in cur.fetchall()]
        if not entries:
            continue

        summary_rows = compute_summary_from_entries(entries, row['carga_horaria'])
        expected_set = {(r['codigo'], r['dia_inicio'], r['dia_fim']) for r in summary_rows if r['codigo']}

        cur.execute(
            "SELECT codigo, dia_inicio, dia_fim FROM resumo_folha WHERE folha_ponto_id = %s AND codigo != ''",
            (folha_id,)
        )
        actual_set = {(r['codigo'], r['dia_inicio'], r['dia_fim']) for r in cur.fetchall()}

        if expected_set != actual_set:
            affected.append((row, summary_rows))

    print(f"Folhas com divergencia esperado-vs-atual (mes={MES}, ano={ANO}): {len(affected)}")

    total_updated = 0
    for row, summary_rows in affected:
        folha_id = row['folha_id']
        non_empty = sum(1 for r in summary_rows if r['codigo'])

        print(f"  folha {folha_id} ({row['matricula']} - {row['nome']}): {non_empty} linha(s) de resumo geradas")

        if dry_run:
            continue

        cur.execute("DELETE FROM resumo_folha WHERE folha_ponto_id = %s", (folha_id,))
        for r in summary_rows:
            cur.execute(
                """INSERT INTO resumo_folha
                   (folha_ponto_id, operacao, codigo, carga, meses, horas_dias, dia_inicio, dia_fim)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (folha_id, r['operacao'], r['codigo'], r['carga'], r['meses'],
                 r['horas_dias'], r['dia_inicio'], r['dia_fim'])
            )
        conn.commit()
        total_updated += 1

    cur.close()
    conn.close()
    print(f"\nTotal de folhas sincronizadas: {total_updated}{' (dry-run, nada gravado)' if dry_run else ''}")


if __name__ == '__main__':
    main(dry_run='--dry-run' in sys.argv)
