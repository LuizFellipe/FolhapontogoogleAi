#!/usr/bin/env python3
"""
Backfill resumo_folha para folhas de ponto existentes.

Processa apenas folhas que ainda não possuem dados em resumo_folha.
Aplica a mesma lógica de computeSummaryFromEntries do frontend.
"""

import os
import sys
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error

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


def compute_summary(lancamentos, carga_horaria, codigo_map):
    carga_value = '3' if '40' in str(carga_horaria) else '1'

    seen = set()
    code_days = {}

    for l in lancamentos:
        for campo in ('tipo', 'tipo_turno2'):
            tipo = l.get(campo)
            if not tipo:
                continue
            codigo = codigo_map.get(tipo)
            if not codigo:
                continue
            key = (codigo, l['dia'])
            if key not in seen:
                seen.add(key)
                code_days.setdefault(codigo, []).append(l['dia'])

    rows = []
    for codigo, days in code_days.items():
        days.sort()
        i = 0
        while i < len(days):
            j = i
            while j + 1 < len(days) and days[j + 1] == days[j] + 1:
                j += 1
            rows.append({
                'operacao': 'I',
                'codigo': codigo,
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


def main():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
    except Error as e:
        print(f"Erro ao conectar ao MySQL: {e}")
        sys.exit(1)

    cursor = conn.cursor(dictionary=True)

    # Carregar mapeamento codigo_map
    cursor.execute("SELECT valor, codigo FROM tipos_lancamento WHERE codigo IS NOT NULL AND codigo != ''")
    codigo_map = {row['valor']: row['codigo'] for row in cursor.fetchall()}
    print(f"Tipos com código: {len(codigo_map)}")

    # Buscar todas as folhas com carga_horaria do profissional
    cursor.execute("""
        SELECT fp.id, p.carga_horaria
        FROM folhas_ponto fp
        JOIN profissionais p ON p.id = fp.profissional_id
        ORDER BY fp.id
    """)
    folhas = cursor.fetchall()
    print(f"Total de folhas encontradas: {len(folhas)}")

    stats = {'puladas_resumo': 0, 'puladas_sem_codigo': 0, 'preenchidas': 0, 'erros': 0}

    for folha in folhas:
        folha_id = folha['id']
        carga_horaria = folha['carga_horaria']

        # Verificar se já tem resumo com código preenchido
        cursor.execute(
            "SELECT COUNT(*) AS cnt FROM resumo_folha WHERE folha_ponto_id = %s AND codigo != ''",
            (folha_id,)
        )
        if cursor.fetchone()['cnt'] > 0:
            stats['puladas_resumo'] += 1
            continue

        # Buscar lançamentos
        cursor.execute(
            "SELECT dia, tipo, tipo_turno2 FROM lancamentos_diarios WHERE folha_ponto_id = %s ORDER BY dia",
            (folha_id,)
        )
        lancamentos = cursor.fetchall()

        # Verificar se há algum lançamento com código não-nulo
        tem_codigo = any(
            codigo_map.get(l['tipo']) or (l['tipo_turno2'] and codigo_map.get(l['tipo_turno2']))
            for l in lancamentos
        )
        if not tem_codigo:
            stats['puladas_sem_codigo'] += 1
            continue

        # Calcular resumo
        rows = compute_summary(lancamentos, carga_horaria, codigo_map)

        try:
            cursor.execute("DELETE FROM resumo_folha WHERE folha_ponto_id = %s", (folha_id,))
            cursor.executemany(
                """INSERT INTO resumo_folha
                   (folha_ponto_id, operacao, codigo, carga, meses, horas_dias, dia_inicio, dia_fim)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                [
                    (folha_id, r['operacao'], r['codigo'], r['carga'],
                     r['meses'], r['horas_dias'], r['dia_inicio'], r['dia_fim'])
                    for r in rows
                ]
            )
            conn.commit()
            stats['preenchidas'] += 1
        except Error as e:
            conn.rollback()
            print(f"  Erro na folha {folha_id}: {e}")
            stats['erros'] += 1

    cursor.close()
    conn.close()

    print()
    print("=== Backfill resumo_folha ===")
    print(f"Total de folhas encontradas:          {len(folhas)}")
    print(f"  Puladas (já tinham resumo):          {stats['puladas_resumo']}")
    print(f"  Puladas (sem lançamentos com código):{stats['puladas_sem_codigo']}")
    print(f"  Preenchidas com sucesso:             {stats['preenchidas']}")
    print(f"  Erros:                               {stats['erros']}")
    print("=============================")


if __name__ == '__main__':
    main()
