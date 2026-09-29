"""Raspa o Histórico das carências (educadf) e grava em <json>.historico.json (merge incremental)."""
import glob
import hashlib
import json
import os
import re
from datetime import datetime

from playwright.sync_api import TimeoutError as PWTimeout, sync_playwright

URL_HOME = "https://educadf.se.df.gov.br/"
URL_CARENCIA = "https://educadf.se.df.gov.br/cadastro-escola/modulos/gestao/carencia"
LINHAS = "#grid-gestao-escolar tbody tr"
MODAL = "ngb-modal-window"
CAMPOS = ["data", "situacao", "matricula", "nome", "observacao"]


def escolher_json():
    arquivos = [a for a in sorted(glob.glob("GH.*.sem.*.json")) if not a.endswith(".historico.json")]
    if not arquivos:
        raise SystemExit("Nenhum GH.*.sem.*.json na pasta.")
    for i, a in enumerate(arquivos, 1):
        print(f"  {i}) {a}")
    return arquivos[int(input("Arquivo: ")) - 1]


def limpar(t):
    return re.sub(r"\s+", " ", t or "").strip()


def carregar_saida(caminho):
    if os.path.exists(caminho):
        with open(caminho, encoding="utf-8") as f:
            return json.load(f)
    return {}


def salvar_saida(caminho, dados):
    tmp = caminho + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)
    os.replace(tmp, caminho)


def hash_entrada(e):
    return hashlib.sha1("|".join(e[c] for c in CAMPOS).encode()).hexdigest()[:16]


def codigos_da_pagina(page):
    """cod_carencia -> índice da linha, na página atual."""
    textos = page.locator(LINHAS).evaluate_all(
        "rs => rs.map(r => (r.querySelector('td')||{}).innerText || '')"
    )
    return {limpar(t): i for i, t in enumerate(textos) if limpar(t)}


def ler_historico(page, linha):
    linha.locator("button.btn-actions").click()
    linha.locator("ul.dropdown-menu a", has_text="Histórico").click()
    modal = page.locator(MODAL)
    modal.wait_for(state="visible", timeout=15000)
    try:
        modal.locator("table tbody tr").first.wait_for(timeout=8000)
    except PWTimeout:
        pass  # histórico vazio
    entradas = []
    for tr in modal.locator("table tbody tr").all():
        tds = [limpar(td) for td in tr.locator("td").all_inner_texts()]
        if len(tds) < len(CAMPOS):
            continue
        entradas.append(dict(zip(CAMPOS, tds[: len(CAMPOS)])))
    modal.get_by_role("button", name="Voltar").click()
    modal.wait_for(state="detached", timeout=10000)
    return entradas


def mesclar(saida, cod, nome, entradas):
    reg = saida.setdefault(cod, {"nome_carga_horaria": nome, "historico": []})
    existentes = {e["hash"] for e in reg["historico"]}
    agora = datetime.now().isoformat(timespec="seconds")
    novas = 0
    for e in entradas:
        e["hash"] = hash_entrada(e)
        if e["hash"] not in existentes:
            e["raspado_em"] = agora
            reg["historico"].append(e)
            existentes.add(e["hash"])
            novas += 1
    reg["ultima_raspagem"] = agora
    return novas


def main():
    arquivo = escolher_json()
    with open(arquivo, encoding="utf-8") as f:
        carencias = json.load(f)["carencias"]
    destino = arquivo.replace(".json", ".historico.json")
    saida = carregar_saida(destino)
    pendentes = {c["cod_carencia"]: c["nome_carga_horaria"] for c in carencias}
    print(f"{len(pendentes)} carências. Saída: {destino}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_context(viewport=None).new_page()
        page.goto(URL_HOME)
        try:
            page.get_by_text("Servidor", exact=False).first.click(timeout=8000)
        except Exception:
            print("Não achei 'Servidor'. Clique você mesmo.")
        input("Faça login. Enter quando logado... ")
        page.goto(URL_CARENCIA)
        input("Filtre o intervalo e espere a tabela carregar. Enter... ")

        while pendentes:
            na_pagina = codigos_da_pagina(page)
            alvo = [c for c in pendentes if c in na_pagina]
            print(f"\nPágina atual: {len(na_pagina)} linhas, {len(alvo)} pendentes aqui, "
                  f"{len(pendentes)} pendentes no total.")
            for n, cod in enumerate(alvo, 1):
                nome = pendentes[cod]
                linha = page.locator(LINHAS).nth(na_pagina[cod])
                try:
                    entradas = ler_historico(page, linha)
                except Exception as e:
                    print(f"  [{n}/{len(alvo)}] {cod} ERRO: {e}")
                    if page.locator(MODAL).count():
                        try:
                            page.locator(MODAL).get_by_role("button", name="Voltar").click()
                        except Exception:
                            page.keyboard.press("Escape")
                    continue
                novas = mesclar(saida, cod, nome, entradas)
                salvar_saida(destino, saida)
                del pendentes[cod]
                print(f"  [{n}/{len(alvo)}] {cod} {nome}: {len(entradas)} lidas, {novas} novas")
            if not pendentes:
                break
            print("Não localizadas nesta página (ou com erro):", ", ".join(pendentes))
            r = input("Vá para a próxima página e dê Enter (ou 'q' p/ encerrar): ")
            if r.strip().lower() == "q":
                break

        print(f"\nFim. Sem histórico raspado: {len(pendentes)}")
        browser.close()


if __name__ == "__main__":
    main()
