#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script de processamento e conversão de Grades Horárias (GH) de CSV para JSON.

Padrão de arquivos CSV de entrada:
    GH.<semestre>.sem.<dd>.<mm>.<aaaa>.csv
    Exemplo: GH.1.sem.29.09.2026.csv, GH.2.sem.29.09.2026.csv

Padrão de arquivos JSON de saída:
    GH.<semestre>.sem.<aaaa>.json
    Exemplo: GH.1.sem.2026.json, GH.2.sem.2026.json

Comportamento incremental:
    - Agrupa arquivos por semestre e ano.
    - Ordena cronologicamente pela data do arquivo.
    - Se o JSON já existir, carrega os dados e a lista de arquivos já processados.
    - Se encontrar um arquivo mais novo, detecta diferenças:
        * Novos CÓD. CARÊNCIA são adicionados.
        * Carências já existentes com campos alterados têm um snapshot completo
          do estado anterior adicionado à lista "historico", e os campos são atualizados.
    - Atualiza os metadados ("ultima_atualizacao", "arquivos_processados").
"""

import argparse
import csv
import json
import os
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

FILENAME_PATTERN = re.compile(
    r"^GH\.(?P<semestre>\d+)\.sem\.(?P<dia>\d{2})\.(?P<mes>\d{2})\.(?P<ano>\d{4})\.csv$",
    re.IGNORECASE,
)

COLUMN_MAPPING = {
    "CÓD. CARÊNCIA": "cod_carencia",
    "CÓD. CARÊNCIA PAI": "cod_carencia_pai",
    "NOME DA CARGA HORÁRIA": "nome_carga_horaria",
    "PERÍODO": "periodo",
    "TIPO": "tipo",
    "PROFESSOR TITULAR": "professor_titular",
    "PROFESSOR SUBSTITUTO": "professor_substituto",
    "COMPONENTE PRINCIPAL": "componente_principal",
    "SITUAÇÃO": "situacao",
}

NULL_VALUES = {"", "-", "não possui", "não informado"}


def parse_filename(filename: str) -> Optional[Tuple[int, int, date]]:
    """Extrai semestre, ano e data a partir do nome do arquivo CSV."""
    match = FILENAME_PATTERN.match(filename)
    if not match:
        return None

    semestre = int(match.group("semestre"))
    dia = int(match.group("dia"))
    mes = int(match.group("mes"))
    ano = int(match.group("ano"))

    try:
        data_arquivo = date(ano, mes, dia)
    except ValueError:
        return None

    return semestre, ano, data_arquivo


def normalize_value(column_name: str, value: Any) -> Optional[str]:
    """Limpa e normaliza os valores dos campos."""
    if value is None:
        return None

    val = str(value).strip()

    # Remover prefixo de professor substituto se presente
    if column_name == "PROFESSOR SUBSTITUTO":
        prefix = "Carência suprida por:"
        if val.lower().startswith(prefix.lower()):
            val = val[len(prefix):].strip()

    # Normalizar valores que representam ausência de informação
    if val.lower() in NULL_VALUES:
        return None

    return val


def read_csv_carencias(filepath: Path) -> List[Dict[str, Any]]:
    """Lê um arquivo CSV de grade horária e retorna os registros normalizados."""
    records = []

    with open(filepath, mode="r", encoding="utf-8-sig") as fp:
        reader = csv.reader(fp)
        try:
            raw_headers = next(reader)
        except StopIteration:
            return []

        # Mapear índices das colunas relevantes
        header_map = {}
        for idx, col in enumerate(raw_headers):
            clean_col = col.strip()
            if clean_col in COLUMN_MAPPING:
                header_map[idx] = (clean_col, COLUMN_MAPPING[clean_col])

        for row in reader:
            if not row or all(not cell.strip() for cell in row):
                continue

            record = {}
            for idx, cell in enumerate(row):
                if idx in header_map:
                    orig_col, clean_key = header_map[idx]
                    record[clean_key] = normalize_value(orig_col, cell)

            # Só aceitar se tiver cod_carencia
            if record.get("cod_carencia"):
                records.append(record)

    return records


def process_semester_year(
    directory: Path,
    semestre: int,
    ano: int,
    csv_files: List[Tuple[date, Path]],
) -> Path:
    """Processa os arquivos CSV de um respectivo semestre e ano incrementalmente."""
    output_filename = f"GH.{semestre}.sem.{ano}.json"
    output_path = directory / output_filename

    # Carregar JSON existente ou criar estrutura base
    if output_path.exists():
        with open(output_path, mode="r", encoding="utf-8") as fp:
            data = json.load(fp)
    else:
        data = {
            "ano": ano,
            "semestre": semestre,
            "ultima_atualizacao": None,
            "arquivos_processados": [],
            "carencias": [],
        }

    arquivos_processados = set(data.get("arquivos_processados", []))
    carencias_map: Dict[str, Dict[str, Any]] = {
        item["cod_carencia"]: item for item in data.get("carencias", []) if "cod_carencia" in item
    }

    # Ordenar arquivos cronologicamente
    sorted_files = sorted(csv_files, key=lambda item: (item[0], item[1].name))

    modified = False

    for file_date, file_path in sorted_files:
        filename = file_path.name
        if filename in arquivos_processados:
            print(f"  [Ignorado] Já processado anteriormente: {filename}")
            continue

        print(f"  [Processando] {filename} (Data: {file_date.strftime('%d/%m/%Y')})")
        records = read_csv_carencias(file_path)

        new_count = 0
        updated_count = 0

        for new_rec in records:
            cod = new_rec["cod_carencia"]

            if cod not in carencias_map:
                # Novo registro
                entry = dict(new_rec)
                entry["historico"] = []
                carencias_map[cod] = entry
                new_count += 1
            else:
                current_entry = carencias_map[cod]

                # Comparar campos para verificar se houve alteração
                diff_found = False
                for field, new_val in new_rec.items():
                    if current_entry.get(field) != new_val:
                        diff_found = True
                        break

                if diff_found:
                    # Gerar snapshot do estado anterior
                    snapshot = {
                        "data_modificacao": file_date.isoformat(),
                        "arquivo_modificacao": filename,
                        "registro_anterior": {
                            k: v for k, v in current_entry.items() if k != "historico"
                        },
                    }
                    if "historico" not in current_entry:
                        current_entry["historico"] = []
                    current_entry["historico"].append(snapshot)

                    # Atualizar com os novos valores
                    for field, new_val in new_rec.items():
                        current_entry[field] = new_val

                    updated_count += 1

        data["arquivos_processados"].append(filename)
        data["ultima_atualizacao"] = file_date.isoformat()
        arquivos_processados.add(filename)
        modified = True
        print(f"    -> {new_count} novas carências, {updated_count} carências atualizadas.")

    if modified:
        # Manter a ordem original ou ordenar por cod_carencia
        data["carencias"] = list(carencias_map.values())

        with open(output_path, mode="w", encoding="utf-8") as fp:
            json.dump(data, fp, indent=2, ensure_ascii=False)
        print(f"  [Concluído] Arquivo salvo em: {output_path.name}")
    else:
        print(f"  [Sem alterações] Nenhum arquivo novo para {output_filename}.")

    return output_path


def scan_and_process(directory: Path) -> List[Path]:
    """Varre o diretório em busca de CSVs que correspondam ao padrão e os processa."""
    grouped_files: Dict[Tuple[int, int], List[Tuple[date, Path]]] = {}

    for entry in directory.iterdir():
        if entry.is_file():
            parsed = parse_filename(entry.name)
            if parsed:
                semestre, ano, file_date = parsed
                grouped_files.setdefault((semestre, ano), []).append((file_date, entry))

    if not grouped_files:
        print(f"Nenhum arquivo CSV correspondente encontrado em {directory}")
        return []

    output_files = []
    for (semestre, ano), files in sorted(grouped_files.items()):
        print(f"\n=== Processando Grade Horária: Semestre {semestre} / {ano} ===")
        out_file = process_semester_year(directory, semestre, ano, files)
        output_files.append(out_file)

    return output_files


def main():
    parser = argparse.ArgumentParser(
        description="Converte e sincroniza arquivos de Grade Horária (.csv) para .json"
    )
    parser.add_argument(
        "--dir",
        "-d",
        type=str,
        default=".",
        help="Diretório onde os arquivos CSV estão localizados (padrão: diretório atual)",
    )
    args = parser.parse_args()

    target_dir = Path(args.dir).resolve()
    print(f"Iniciando varredura em: {target_dir}")
    scan_and_process(target_dir)


if __name__ == "__main__":
    main()
