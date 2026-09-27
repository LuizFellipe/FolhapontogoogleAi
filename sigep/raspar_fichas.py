#!/usr/bin/env python3
"""
Raspador de Fichas Cadastrais do SIGEP (SEEDF).
Para cada servidor de servidores.csv (matricula,nome): busca no SIGEP, confere a matrícula,
baixa a Ficha Cadastral via POST /FichaFuncional e salva como primeironome.matricula.pdf.

Uso:
    pip install playwright && playwright install chromium
    python3 raspar_fichas.py        # todos os pendentes
    python3 raspar_fichas.py 3      # só os 3 próximos pendentes
Login é manual na janela do Chromium; depois aperte ENTER no terminal.
"""

import base64
import csv
import os
import re
import sys
import unicodedata

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

BASE_URL = "https://sigep.se.df.gov.br/"
BUSCA_TIMEOUT_MS = 15000
SEM_RESULTADO_MS = 5000  # só o placeholder por esse tempo -> sem cadastro (resultado real chega em <1s)
FICHA_TIMEOUT_MS = 15000
DELAY_MS = 1000

PASTA = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(PASTA, "servidores.csv")
PERFIL = os.path.join(PASTA, ".browser_profile")
CAMPO_BUSCA = 'input[placeholder="Informe a matrícula, nome, sobrenome ou CPF."]'


def normalizar_matricula(m):
    return re.sub(r"[^0-9X]", "", m.upper())


def carregar_servidores():
    with open(CSV_PATH, encoding="utf-8") as f:
        return [{"matricula": r["matricula"].strip(), "nome": r["nome"].strip()} for r in csv.DictReader(f)]


def nome_arquivo(nome, matricula):
    primeiro = unicodedata.normalize("NFKD", nome.split()[0]).encode("ascii", "ignore").decode()
    primeiro = re.sub(r"[^a-z]", "", primeiro.lower())
    return f"{primeiro}.{normalizar_matricula(matricula)}.pdf"


def abrir_cadastro(page):
    page.goto(BASE_URL + "cadastro.jsp")
    try:
        page.wait_for_selector(CAMPO_BUSCA, timeout=FICHA_TIMEOUT_MS)
    except PWTimeout:
        input("\n!! Campo de busca não apareceu (sessão expirada?). Faça login e aperte ENTER...")
        page.goto(BASE_URL + "cadastro.jsp")
        page.wait_for_selector(CAMPO_BUSCA, timeout=FICHA_TIMEOUT_MS)


class SemCadastro(RuntimeError):
    """Busca vazia: servidor ainda não cadastrado no SIGEP ou não está mais na unidade."""


def buscar_e_abrir(page, matricula_esperada, nome):
    """Retorna (idServidor, codigoUnidade) ou lança RuntimeError com os resultados vistos."""
    abrir_cadastro(page)
    page.fill(CAMPO_BUSCA, nome)
    page.click("text=Buscar")
    page.wait_for_timeout(DELAY_MS)

    alvo = normalizar_matricula(matricula_esperada)
    links = page.locator('a[href*="AbreDados"]')
    vistos = []
    reais = []
    for n in range(BUSCA_TIMEOUT_MS // 500):
        vistos = [(links.nth(i).inner_text().strip(), links.nth(i).get_attribute("href") or "")
                  for i in range(links.count())]
        for i, (texto, href) in enumerate(vistos):
            m = re.match(r"\s*([\d.\-Xx]+)", texto)
            ids = re.search(r"AbreDados\((\d+),'(\d+)'\)", href)
            if m and ids and normalizar_matricula(m.group(1)) == alvo:
                links.nth(i).click()
                page.get_by_text("Imprimir Ficha Cadastral").first.wait_for(timeout=FICHA_TIMEOUT_MS)
                page.wait_for_timeout(DELAY_MS)
                return ids.group(1), ids.group(2)
        # busca vazia = só o link modelo "AbreDados(98);" (sem unidade), que existe antes da busca
        reais = [t for t, h in vistos if re.search(r"AbreDados\(\d+,'\d+'\)", h)]
        if not reais and (n + 1) * 500 >= SEM_RESULTADO_MS:
            break
        page.wait_for_timeout(500)
    if not reais:
        raise SemCadastro("SEM CADASTRO NO SIGEP (não cadastrado ainda ou fora da unidade)")
    raise RuntimeError(f"NAO ENCONTRADO (resultados: {reais})")


def post_pdf(page, endpoint, body):
    """POST form-urlencoded dentro da sessão logada; retorna bytes do PDF."""
    res = page.evaluate(
        """async ([ep, body]) => {
            const r = await fetch(ep, {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body
            });
            const blob = await r.blob();
            const url = await new Promise(ok => { const fr = new FileReader(); fr.onloadend = () => ok(fr.result); fr.readAsDataURL(blob); });
            return {ok: r.ok, status: r.status, url};
        }""",
        [endpoint, body],
    )
    if not res["ok"]:
        raise RuntimeError(f"HTTP {res['status']} em {endpoint}")
    dados = base64.b64decode(res["url"].split(",", 1)[1])
    if not dados.startswith(b"%PDF"):
        raise RuntimeError("resposta não é PDF (sessão caiu?)")
    return dados


def baixar_ficha_pdf(page, id_servidor, codigo_unidade):
    return post_pdf(page, "/FichaFuncional", f"idServidorFichaFunc={id_servidor}&codigoUnidade={codigo_unidade}")


def main():
    limite = int(sys.argv[1]) if len(sys.argv) > 1 else None
    servidores = carregar_servidores()
    pendentes = [s for s in servidores if not os.path.exists(os.path.join(PASTA, nome_arquivo(s["nome"], s["matricula"])))]
    pulados = len(servidores) - len(pendentes)
    if limite:
        pendentes = pendentes[:limite]
    gerados, falhas, sem_cadastro = 0, [], []

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(PERFIL, headless=False)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto(BASE_URL)
        input("Faça login no SIGEP na janela do Chromium e aperte ENTER aqui...")
        try:
            for n, s in enumerate(pendentes, 1):
                destino = os.path.join(PASTA, nome_arquivo(s["nome"], s["matricula"]))
                print(f"[{n}/{len(pendentes)}] {s['nome']} ({s['matricula']})... ", end="", flush=True)
                try:
                    dados = baixar_ficha_pdf(page, *buscar_e_abrir(page, s["matricula"], s["nome"]))
                    with open(destino + ".tmp", "wb") as f:
                        f.write(dados)
                    os.replace(destino + ".tmp", destino)
                    gerados += 1
                    print("OK")
                except SemCadastro as e:
                    sem_cadastro.append(s)
                    print(e)
                except Exception as e:
                    falhas.append((s, str(e)))
                    print(e)
        except KeyboardInterrupt:
            print("\nInterrompido.")
        finally:
            ctx.close()
            print(f"\nResumo: {gerados} gerados, {pulados} já existiam, {len(sem_cadastro)} sem cadastro, {len(falhas)} falhas")
            if sem_cadastro:
                print("Sem cadastro no SIGEP (tentados de novo na próxima execução):")
            for s in sem_cadastro:
                print(f"  - {s['nome']} ({s['matricula']})")
            if falhas:
                print("Falhas:")
            for s, erro in falhas:
                print(f"  - {s['nome']} ({s['matricula']}): {erro}")


if __name__ == "__main__":
    main()
