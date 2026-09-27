#!/usr/bin/env python3
"""
Verifica servidores novos na unidade (SIGEP) ainda ausentes de servidores.csv.
Baixa a Listagem do Cadastro Geral (POST /EmitirRelatorioGeral, CRE Guará / CEP ETG),
salva como listagem.geral.DD.MM.YYYY.pdf, compara matrículas com o CSV,
anexa os novos ao CSV e avisa quem saiu da listagem (sem apagar nada).

Uso:
    python3 verificar_novos.py                         # baixa listagem nova (login manual)
    python3 verificar_novos.py listagem.geral.X.pdf    # só compara um PDF já baixado
Depois: python3 raspar_fichas.py baixa as fichas dos novos.
"""

import csv
import os
import re
import subprocess
import sys
from datetime import date

from raspar_fichas import BASE_URL, CSV_PATH, PASTA, PERFIL, carregar_servidores, normalizar_matricula, post_pdf

REGIONAL = "005"  # COORDENAÇÃO REGIONAL DE ENSINO DO GUARÁ
UNIDADE = "990210000029"  # CEP ESCOLA TÉCNICA DO GUARÁ PROFESSORA TERESA ONDINA
# matrícula vem "0243.044-4" (layout antigo) ou "02430444" (atual)
LINHA = re.compile(r"^\s*(\d{4}\.\d{3}-[\dXx]|\d{7}[\dXx])\s+(.+?)(?:\s{2,}|$)", re.M)
# nome longo encosta na coluna Cargo com 1 espaço só ("... MENDES CONTEMP")
# ponytail: lista fixa de cargos vistos; cargo novo grudado -> acrescentar aqui
CARGO_GRUDADO = re.compile(r"\s+(CONTEMP|PROF|TECNICO\d*|ORIEN\w*)$")


def baixar_listagem():
    from playwright.sync_api import sync_playwright

    destino = os.path.join(PASTA, f"listagem.geral.{date.today():%d.%m.%Y}.pdf")
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(PERFIL, headless=False)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto(BASE_URL)
        input("Faça login no SIGEP na janela do Chromium e aperte ENTER aqui...")
        try:
            page.goto(BASE_URL + "rltListaGeral.jsp")
            dados = post_pdf(page, "/EmitirRelatorioGeral", f"tipo=1&selCodigoRegional={REGIONAL}&codigoUnidade={UNIDADE}")
        finally:
            ctx.close()
    with open(destino, "wb") as f:
        f.write(dados)
    print(f"Listagem salva: {os.path.basename(destino)}")
    return destino


def ler_listagem(pdf):
    texto = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True, check=True).stdout
    lidos = {}
    for m, nome in LINHA.findall(texto):
        n = normalizar_matricula(m)
        lidos[n] = (f"{n[:4]}.{n[4:7]}-{n[7]}", CARGO_GRUDADO.sub("", nome.strip()))
    return lidos


def main():
    pdf = sys.argv[1] if len(sys.argv) > 1 else baixar_listagem()
    listagem = ler_listagem(pdf)
    if not listagem:
        sys.exit(f"Nenhuma matrícula lida de {pdf} — layout mudou?")
    csv_mats = {normalizar_matricula(s["matricula"]): s for s in carregar_servidores()}

    novos = [listagem[k] for k in listagem if k not in csv_mats]
    saidas = [csv_mats[k] for k in csv_mats if k not in listagem]

    if novos:
        with open(CSV_PATH, "a", newline="", encoding="utf-8") as f:
            csv.writer(f).writerows(novos)
    print(f"\n{len(listagem)} na listagem, {len(csv_mats)} no CSV.")
    print(f"Novos (anexados ao CSV): {len(novos)}")
    for m, nome in novos:
        print(f"  + {m} {nome}")
    print(f"Não estão mais na listagem (CSV intacto): {len(saidas)}")
    for s in saidas:
        print(f"  - {s['matricula']} {s['nome']}")
    if novos:
        print("\nPróximo: python3 raspar_fichas.py")


if __name__ == "__main__":
    main()
