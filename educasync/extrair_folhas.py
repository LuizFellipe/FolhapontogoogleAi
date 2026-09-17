#!/usr/bin/env python3
"""
Script de extração de dados de folhas de frequência/ponto em formato PDF.
Lê os arquivos PDF da pasta indicada e extrai os campos:
- matricula
- nome
- cargo_especialidade
- disciplina
- carga_horaria
- funcao
- vinculo
- arquivo

Salva o resultado em formato JSON consolidado.
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import pymupdf  # PyMuPDF
except ImportError:
    print(
        "Erro: PyMuPDF não encontrado. Instale com 'pip install pymupdf' ou use a virtualenv do projeto.",
        file=sys.stderr,
    )
    sys.exit(1)

logger = logging.getLogger(__name__)


def limpar_espacos(texto: Optional[str]) -> Optional[str]:
    """Remove quebras de linha excessivas, espaços não separáveis e espaços duplicados."""
    if not texto:
        return None
    # Substitui espaço não separável (\xa0) e quebras de linha por espaço comum
    limpo = texto.replace("\xa0", " ").replace("\r", " ").replace("\n", " ")
    limpo = re.sub(r"\s+", " ", limpo).strip()
    return limpo if limpo else None


def extrair_vinculo(nome_arquivo: str, cargo: Optional[str]) -> str:
    """Determina o vínculo do servidor baseado no arquivo ou no cargo."""
    nome_norm = nome_arquivo.lower()
    if "temporar" in nome_norm:
        return "temporario"
    if "efetiv" in nome_norm:
        return "efetivo"

    if cargo and "TEMPORARIO" in cargo.upper():
        return "temporario"
    return "efetivo"


def extrair_dados_pagina(
    texto: str, *, arquivo: str = "", pagina: int = -1
) -> Optional[Dict[str, Any]]:
    """Extrai os dados de uma página de cabeçalho de folha de frequência.

    Args:
        texto: Texto bruto extraído da página do PDF.
        arquivo: Nome do arquivo PDF (para logging).
        pagina: Índice da página no PDF (para logging).
    """
    if "Matrícula:" not in texto or "Folha de Frequência" not in texto:
        return None

    ctx = f"[{arquivo} p.{pagina}]" if arquivo else ""

    # Extrai Matrícula (pode estar na mesma linha ou na linha seguinte)
    # Suporta dígitos e dígito verificador alfanumérico (ex: 0026010X, 7062626X)
    m_mat = re.search(r"Matrícula:\s*([0-9A-Za-z]+)", texto)
    if not m_mat:
        m_mat = re.search(r"Matrícula:\s*\n\s*([0-9A-Za-z]+)", texto)
    matricula = m_mat.group(1).strip() if m_mat else None

    # Extrai Nome
    m_nome = re.search(r"Nome:\s*([^\n\r]+)", texto)
    nome = limpar_espacos(m_nome.group(1)) if m_nome else None

    # Extrai Cargo/Especialidade
    m_cargo = re.search(
        r"Cargo/Especialidade:\s*(.*?)(?=(?:Disciplina:|C\.H\.:|Função:|Dia|TURNO|\Z))",
        texto,
        re.DOTALL,
    )
    cargo = limpar_espacos(m_cargo.group(1)) if m_cargo else None

    # Extrai Disciplina
    m_disc = re.search(
        r"Disciplina:\s*(.*?)(?=(?:C\.H\.:|Função:|Dia|TURNO|\Z))",
        texto,
        re.DOTALL,
    )
    disciplina = limpar_espacos(m_disc.group(1)) if m_disc else None

    # Extrai Carga Horária (C.H.)
    m_ch = re.search(r"C\.H\.:\s*(\d+)", texto)
    carga_horaria = int(m_ch.group(1)) if m_ch else None

    # Extrai Função
    m_func = re.search(
        r"Função:\s*(.*?)(?=(?:Dia|TURNO|\Z))",
        texto,
        re.DOTALL,
    )
    funcao = limpar_espacos(m_func.group(1)) if m_func else None

    if not matricula and not nome:
        return None

    # Logging de campos possivelmente incompletos
    if not disciplina and not funcao:
        logger.warning(
            "%s Registro sem disciplina e sem função: matrícula=%s nome=%s",
            ctx, matricula, nome,
        )
    if carga_horaria is None:
        logger.warning(
            "%s Carga horária não encontrada no texto: matrícula=%s",
            ctx, matricula,
        )
    elif carga_horaria == 0:
        logger.info(
            "%s Carga horária zero (cadastro sem lotação ativa): matrícula=%s nome=%s",
            ctx, matricula, nome,
        )

    return {
        "matricula": matricula,
        "nome": nome,
        "cargo_especialidade": cargo,
        "disciplina": disciplina,
        "carga_horaria": carga_horaria,
        "funcao": funcao,
    }


def processar_pdf(caminho_pdf: Path) -> List[Dict[str, Any]]:
    """Lê todas as páginas do PDF e extrai os registros de servidores encontrados."""
    registros: List[Dict[str, Any]] = []
    doc = pymupdf.open(caminho_pdf)

    for page_idx, page in enumerate(doc):
        texto = page.get_text()
        dados = extrair_dados_pagina(
            texto, arquivo=caminho_pdf.name, pagina=page_idx
        )
        if dados:
            vinculo = extrair_vinculo(caminho_pdf.name, dados["cargo_especialidade"])
            registro = {
                "matricula": dados["matricula"],
                "nome": dados["nome"],
                "cargo_especialidade": dados["cargo_especialidade"],
                "disciplina": dados["disciplina"],
                "carga_horaria": dados["carga_horaria"],
                "funcao": dados["funcao"],
                "vinculo": vinculo,
                "arquivo": caminho_pdf.name,
            }
            registros.append(registro)

    doc.close()
    return registros


def imprimir_resumo(registros: List[Dict[str, Any]]) -> None:
    """Imprime um resumo de integridade dos dados extraídos."""
    total = len(registros)
    if total == 0:
        return

    completos = sum(
        1
        for r in registros
        if (r["disciplina"] or r["funcao"])
        and r["carga_horaria"] is not None
        and r["carga_horaria"] > 0
    )
    incompletos = total - completos

    sem_disciplina_funcao = sum(
        1 for r in registros if not r["disciplina"] and not r["funcao"]
    )
    ch_zero_ou_null = sum(
        1 for r in registros
        if r["carga_horaria"] is None or r["carga_horaria"] == 0
    )

    print(f"\n{'─' * 50}")
    print("RESUMO DE INTEGRIDADE")
    print(f"{'─' * 50}")
    print(f"  Total de registros:           {total}")
    print(f"  Registros completos:          {completos}")
    print(f"  Registros incompletos:        {incompletos}")
    if sem_disciplina_funcao:
        print(f"  Sem disciplina nem função:    {sem_disciplina_funcao}")
    if ch_zero_ou_null:
        print(f"  CH zero ou ausente:           {ch_zero_ou_null}")
    print(f"{'─' * 50}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extrai dados cadastrais de folhas de ponto em PDF para JSON."
    )
    parser.add_argument(
        "--input-dir",
        "-i",
        type=Path,
        default=Path("educa_folha"),
        help="Diretório contendo os arquivos PDF (padrão: educa_folha)",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=Path("dados_folha_ponto.json"),
        help="Caminho do arquivo JSON de saída (padrão: dados_folha_ponto.json)",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Exibe warnings de registros incompletos (logging nível WARNING).",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Exibe todos os logs, incluindo registros com CH zero (nível DEBUG).",
    )

    args = parser.parse_args()

    # Configura logging baseado nos flags
    if args.debug:
        log_level = logging.DEBUG
    elif args.verbose:
        log_level = logging.WARNING
    else:
        log_level = logging.ERROR  # silencioso por padrão
    logging.basicConfig(
        level=log_level,
        format="%(levelname)s: %(message)s",
    )

    input_dir: Path = args.input_dir
    output_file: Path = args.output

    if not input_dir.exists() or not input_dir.is_dir():
        print(f"Erro: Diretório de entrada '{input_dir}' não encontrado.", file=sys.stderr)
        sys.exit(1)

    # Glob case-insensitive robusto
    arquivos_pdf = sorted(
        p for p in input_dir.iterdir() if p.suffix.lower() == ".pdf"
    )
    if not arquivos_pdf:
        print(f"Aviso: Nenhum arquivo PDF encontrado em '{input_dir}'.", file=sys.stderr)
        sys.exit(0)

    print(f"Encontrados {len(arquivos_pdf)} arquivos PDF em '{input_dir}'. Iniciando extração...")

    todos_registros: List[Dict[str, Any]] = []

    for caminho_pdf in arquivos_pdf:
        try:
            registros_pdf = processar_pdf(caminho_pdf)
            print(f" - {caminho_pdf.name}: {len(registros_pdf)} servidores extraídos.")
            todos_registros.extend(registros_pdf)
        except Exception as e:
            print(
                f"ERRO ao processar {caminho_pdf.name}: {e}",
                file=sys.stderr,
            )
            logger.exception("Detalhes do erro em %s:", caminho_pdf.name)
            continue

    # Cria diretório pai do output se não existir
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(todos_registros, f, ensure_ascii=False, indent=2)

    imprimir_resumo(todos_registros)

    print(f"\nConcluído com sucesso! Total de {len(todos_registros)} registros exportados.")
    print(f"Arquivo salvo em: {output_file.resolve()}")


if __name__ == "__main__":
    main()
