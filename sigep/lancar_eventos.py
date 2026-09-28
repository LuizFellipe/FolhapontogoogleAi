#!/usr/bin/env python3
"""
Lança no SIGEP (03.Lançamento) os eventos do Relatório de Eventos da Folha de Ponto.
Para cada range (GET /api/sigep/eventos): busca a matrícula, confere "Registros Localizados";
já existe -> flag JA_EXISTIA; ausente -> Novo/Incluir/Tipo/Obs/Gravar -> rebusca -> flag LANCADO.
Flag gravada via POST /api/sigep/eventos/sync. Sobreposição parcial = CONFLITO (manual).

Uso (menu interativo: lista servidores do mês, roda um, vários ou todos):
    python3 lancar_eventos.py
    python3 lancar_eventos.py --api http://servidor:5000/api
    python3 lancar_eventos.py --reconferir   # JA_EXISTIA também: completa Obs (turnos) vazia/diferente
    python3 lancar_eventos.py --selftest
Login é manual na janela do Chromium (uma vez); depois aperte ENTER no terminal.
Cada execução pergunta o modo: simular (dry-run, padrão) ou lançar. 'c' liga/desliga ENTER antes de cada Gravar.
"""

import json
import os
import re
import sys
import unicodedata
import urllib.request
from datetime import date, timedelta

from raspar_fichas import BASE_URL, PERFIL, normalizar_matricula

EVENTO_URL = BASE_URL + "evento.jsp"
TIMEOUT_MS = 15000
IGNORAR = {"FERIAS", "ABONO_NIVER"}  # férias: SIGEP exige PAF. aniversário: não existe no SIGEP
# tipo (nosso) -> texto exato da opção no SIGEP, só quando o label não casa sozinho
EVENTO_SIGEP = {}
# matrícula SIGEP -> Obs fixa (ex: redução de carga horária: assina só MAT na folha, SIGEP é MAT VESP).
# Dado pessoal -> fica em obs_sigep.json (fora do git): {"<matrícula 8 dígitos>": "MAT VESP"}
_OBS_JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)), "obs_sigep.json")
OBS_SIGEP = json.load(open(_OBS_JSON)) if os.path.exists(_OBS_JSON) else {}


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return " ".join(s.upper().split())


def casar_evento(label, opcoes):
    """Texto da opção do SIGEP para nosso label: igual (normalizado) ou única que começa com ele."""
    n = norm(label)
    for regra in (lambda o: norm(o) == n, lambda o: norm(o).startswith(n)):
        achadas = [o for o in opcoes if regra(o)]
        if len(achadas) == 1:
            return achadas[0]
    return None


def parse_data(s):
    d, m, a = map(int, s.split("/"))
    return date(a, m, d)


def parse_registro(texto, href):
    """'7064.821-2 ANA CAROLINA 16/09/2026 ATESTADO ...' + 'javascript:AbreDados(1,2);' -> dict."""
    m = re.search(r"(\d{2}/\d{2}/\d{4})\s+(.+?)\s*$", texto)
    ids = re.search(r"AbreDados\((\d+),\s*(\d+)\)", href or "")
    if not (m and ids):
        return None
    return {"inicio": parse_data(m.group(1)), "evento": m.group(2), "abre": f"AbreDados({ids.group(1)},{ids.group(2)})"}


def obs_turnos(turnos):
    return " ".join(turnos.replace(",", " ").split())  # "MAT, VESP" -> "MAT VESP"


def obs_sigep(e):
    return OBS_SIGEP.get(mat_sigep(e["matricula"])) or obs_turnos(e["turnos"])


def classificar(di, df, evento, registros, fim_de):
    """EXISTE | CONFLITO | AUSENTE. fim_de(reg) lê a data final (abre o registro = 1 navegação), só quando precisa."""
    # ponytail: ignora registros iniciados antes do mês anterior (senão abre cada atestado antigo da pessoa);
    # afastamento > ~2 meses que ainda cubra este mês passa como AUSENTE -> alargar a janela se acontecer
    corte = (di.replace(day=1) - timedelta(days=1)).replace(day=1)
    for r in registros:
        # a lista corta o nome em 40 chars ('...PESSOA DA FAMILI') -> basta a opção começar com ele
        if not norm(evento).startswith(norm(r["evento"])) or r["inicio"] > df or r["inicio"] < corte:
            continue
        if r["inicio"] == di:
            return "EXISTE" if fim_de(r) == df else "CONFLITO"
        if r["inicio"] > di or fim_de(r) >= di:  # começa dentro do nosso range, ou cobre o início dele
            return "CONFLITO"
    return "AUSENTE"


# ── API da Folha de Ponto ────────────────────────────────────────────────────

def api_get(api, path):
    with urllib.request.urlopen(api + path) as r:
        return json.load(r)


def api_flag(api, e, status):
    body = {k: e[k] for k in ("folha_ponto_id", "tipo", "dia_inicio", "dia_fim", "turnos")}
    body["status"] = status
    req = urllib.request.Request(api + "/sigep/eventos/sync", json.dumps(body).encode(),
                                 {"Content-Type": "application/json"})
    urllib.request.urlopen(req).close()


# ── SIGEP ────────────────────────────────────────────────────────────────────

def abrir_evento(page):
    page.goto(EVENTO_URL)
    try:
        page.wait_for_selector("#argBusca", timeout=TIMEOUT_MS)
    except Exception:
        input("\n!! Busca não apareceu (sessão expirada?). Faça login e aperte ENTER...")
        page.goto(EVENTO_URL)
        page.wait_for_selector("#argBusca", timeout=TIMEOUT_MS)


def buscar(page, mat):
    """Lista de registros do servidor (todas as páginas estão no DOM, só ocultas)."""
    abrir_evento(page)
    page.fill("#argBusca", mat)
    page.click("#btnBusca")  # ajax síncrono: ao voltar, #divResultado já foi trocado
    page.wait_for_function("m => document.querySelector('#divResultado').innerText.includes(m)", arg=mat,
                           timeout=TIMEOUT_MS)
    links = page.eval_on_selector_all(".paginasLanc a", "as => as.map(a => [a.innerText, a.getAttribute('href')])")
    return [r for r in (parse_registro(t, h) for t, h in links) if r]


def abrir_registro(page, reg):
    """Abre o registro no form #divCad. Retorna (data final, Obs)."""
    abrir_evento(page)
    with page.expect_navigation():
        page.evaluate(reg["abre"])
    page.wait_for_selector("#divCad", state="visible", timeout=TIMEOUT_MS)
    return parse_data(page.input_value("#dataFinal")), page.input_value("#texto")


def data_final(page, reg, cache):
    if reg["abre"] not in cache:
        cache[reg["abre"]] = abrir_registro(page, reg)
    return cache[reg["abre"]][0]


def obs_ok(lida, turnos):
    return norm(lida) == norm(obs_turnos(turnos))


def completar_obs(page, reg, obs, confirmar):
    """Registro já existe sem a Obs certa: abre, troca #texto, Gravar, reabre e confere. None = pulado."""
    abrir_registro(page, reg)
    if page.is_visible("#divMsgBotao"):  # ex: "frequência já entregue na Regional" -> sem botões
        raise RuntimeError(f"SIGEP bloqueia alteração: {page.inner_text('#divMsgBotao').strip()}")
    page.fill("#texto", obs)
    conferir(page, {"#texto": obs}, "Obs")
    if confirmar and input("   Confira a tela (só a Obs muda). ENTER grava, 'p' pula: ").strip().lower() == "p":
        return None
    # registro aberto: #btnGravar fica oculto (#divSoBotaoGravar, só Novo); #btnGravar2 repassa o click pra ele
    page.click("#btnGravar2")
    page.wait_for_function("() => !document.querySelector('#btnGravar').disabled", timeout=TIMEOUT_MS)
    page.wait_for_timeout(1000)
    msg = page.inner_text("#divMsg1").strip()
    if not obs_ok(abrir_registro(page, reg)[1], obs):
        raise RuntimeError(f"Obs não gravada (SIGEP: {msg!r})")
    return msg


def conferir(page, esperado, etapa):
    """Aborta antes de gravar se algum campo não tem o valor esperado ({seletor: valor})."""
    lido = {sel: page.input_value(sel) for sel in esperado}
    errado = {sel: (v, lido[sel]) for sel, v in esperado.items() if norm(lido[sel]) != norm(v)}
    if errado:
        raise RuntimeError(f"{etapa}: campo(s) com valor errado {errado} (esperado, lido) — nada gravado")


def lancar(page, mat, di, df, opcao, obs, confirmar):
    """Novo -> Incluir -> Tipo/Obs -> Gravar. Retorna a mensagem do SIGEP (#divMsg1)."""
    ini, fim = di.strftime("%d/%m/%Y"), df.strftime("%d/%m/%Y")
    abrir_evento(page)
    page.click("#btnNovo")
    # modal abre com fade; ao terminar, o SIGEP faz $('#novoMat').focus() (shown.bs.modal). Preencher antes
    # disso faz o texto da data cair na matrícula (fill insere no elemento focado) -> esperar esse foco.
    page.wait_for_function("() => document.querySelector('#divNovo.in') && document.activeElement.id === 'novoMat'",
                           timeout=TIMEOUT_MS)
    # não mexer no #novoTipo: onchange=TrataTipo() limpa a matrícula e move o foco. reset() já deixa 'I'.
    conferir(page, {"#novoTipo": "I"}, "Novo")
    page.fill("#novoMat", mat)
    page.fill("#novoDataI", ini)
    page.fill("#novoDataF", fim)  # onfocus copia a DataI; o fill sobrescreve em seguida
    conferir(page, {"#novoMat": mat, "#novoDataI": ini, "#novoDataF": fim}, "Novo")
    page.click("#btnNovoModal")
    # sucesso: modal fecha (fade) e foco vai pro #tipo; erro de validação: mensagem em #divMsgNovo
    page.wait_for_function("() => document.activeElement.id === 'tipo' && !document.querySelector('#divNovo.in')"
                           " || getComputedStyle(document.querySelector('#divMsgNovo')).display !== 'none'",
                           timeout=TIMEOUT_MS)
    if page.is_visible("#divMsgNovo"):
        raise RuntimeError(f"Incluir recusado: {page.inner_text('#divMsgNovo').strip()}")
    page.wait_for_selector("#divNovo", state="hidden", timeout=TIMEOUT_MS)
    conferir(page, {"#dataInicial": ini, "#dataFinal": fim}, "Incluir")
    if normalizar_matricula(page.input_value("#matricula")).zfill(8) != mat:
        raise RuntimeError(f"Incluir abriu matrícula {page.input_value('#matricula')!r}, esperado {mat} — nada gravado")
    page.select_option("#tipo", label=opcao)
    page.fill("#texto", obs)
    conferir(page, {"#texto": obs}, "Formulário")
    if page.eval_on_selector("#tipo", "s => s.selectedOptions[0].text.trim()") != opcao:
        raise RuntimeError(f"Tipo de Evento não selecionado ({opcao!r}) — nada gravado")
    if confirmar and input("   Confira a tela. ENTER grava, 'p' pula: ").strip().lower() == "p":
        return None
    page.click("#btnGravar")
    page.wait_for_function("() => !document.querySelector('#btnGravar').disabled", timeout=TIMEOUT_MS)
    page.wait_for_timeout(1000)
    return page.inner_text("#divMsg1").strip()


def processar(page, api, grupos, mes, ano, opcoes, dry, confirmar, reconferir=False):
    """Roda os ranges pendentes de cada grupo (lista de ranges de uma folha). Retorna res por status."""
    res = {"JA_EXISTIA": [], "LANCADO": [], "OBS COMPLETADA": [], "CONFLITO": [], "AUSENTE (dry-run)": [],
           "OBS (dry-run)": [], "NAO MAPEADO": [], "FALHA": []}
    try:
        for n, eventos in enumerate(grupos, 1):
            eventos = pendentes(eventos, reconferir)
            if not eventos:
                continue
            nome, mat = eventos[0]["nome"], mat_sigep(eventos[0]["matricula"])
            print(f"[{n}/{len(grupos)}] {nome} ({mat})")
            if not mat:
                res["FALHA"] += [(e, "sem matrícula") for e in eventos]
                continue
            try:
                registros, cache = buscar(page, mat), {}
            except Exception as ex:
                res["FALHA"] += [(e, f"busca: {ex}") for e in eventos]
                continue
            for e in eventos:
                di, df = date(ano, mes, e["dia_inicio"]), date(ano, mes, e["dia_fim"])
                desc = f"   {e['label']} {di:%d/%m}-{df:%d/%m} {e['turnos']}: "
                opcao = EVENTO_SIGEP.get(e["tipo"]) or casar_evento(e["label"], opcoes)
                if not opcao:
                    res["NAO MAPEADO"].append((e, e["label"]))
                    print(desc + "EVENTO NÃO MAPEADO")
                    continue
                try:
                    st = classificar(di, df, opcao, registros, lambda r: data_final(page, r, cache))
                    if st == "EXISTE":
                        # registro pré-existente pode estar sem o turno na Obs -> completa
                        reg = next(r for r in registros if r["inicio"] == di and norm(opcao).startswith(norm(r["evento"])))
                        data_final(page, reg, cache)
                        obs = obs_sigep(e)
                        if obs_ok(cache[reg["abre"]][1], obs):
                            api_flag(api, e, "JA_EXISTIA")
                            res["JA_EXISTIA"].append((e, ""))
                        elif dry:
                            res["OBS (dry-run)"].append((e, f"SIGEP {cache[reg['abre']][1]!r} -> {obs!r}"))
                            st = f"OBS (dry-run: SIGEP {cache[reg['abre']][1]!r}, folha {obs!r})"
                        else:
                            msg = completar_obs(page, reg, obs, confirmar)
                            if msg is None:
                                print(desc + "PULADO")
                                continue
                            cache[reg["abre"]] = (df, obs)
                            api_flag(api, e, "LANCADO")
                            res["OBS COMPLETADA"].append((e, msg))
                            st = "OBS COMPLETADA"
                    elif st == "CONFLITO":
                        res["CONFLITO"].append((e, opcao))
                    elif dry:
                        res["AUSENTE (dry-run)"].append((e, opcao))
                        st = "AUSENTE (dry-run: não lançado)"
                    else:
                        msg = lancar(page, mat, di, df, opcao, obs_sigep(e), confirmar)
                        if msg is None:
                            print(desc + "PULADO")
                            continue
                        registros = buscar(page, mat)
                        if classificar(di, df, opcao, registros, lambda r: data_final(page, r, cache)) != "EXISTE":
                            raise RuntimeError(f"não apareceu após Gravar (SIGEP: {msg!r})")
                        api_flag(api, e, "LANCADO")
                        res["LANCADO"].append((e, msg))
                        st = "LANCADO"
                    print(desc + st)
                except Exception as ex:
                    res["FALHA"].append((e, str(ex)))
                    print(desc + f"FALHA {ex}")
    except KeyboardInterrupt:
        print("\nInterrompido.")
    print("\nResumo: " + ", ".join(f"{len(v)} {k}" for k, v in res.items()))
    for k in ("CONFLITO", "OBS (dry-run)", "NAO MAPEADO", "FALHA"):
        for e, info in res[k]:
            print(f"  {k}: {e['nome']} ({e['matricula']}) {e['label']} "
                  f"{e['dia_inicio']:02d}-{e['dia_fim']:02d}/{mes:02d} {info}")
    return res


def mat_sigep(m):
    """Matrícula como o SIGEP busca: só dígitos/X, 8 posições ('203.656-8' -> '02036568')."""
    return normalizar_matricula(m or "").zfill(8) if normalizar_matricula(m or "") else ""


def carregar(api, mes, ano):
    """Ranges do mês agrupados por folha, na ordem do relatório (nome)."""
    grupos = {}
    for e in api_get(api, f"/sigep/eventos?mes={mes - 1}&ano={ano}"):
        grupos.setdefault(e["folha_ponto_id"], []).append(e)
    return list(grupos.values())


def fmt_range(e):
    dias = f"{e['dia_inicio']:02d}" + (f"-{e['dia_fim']:02d}" if e["dia_fim"] != e["dia_inicio"] else "")
    marca = "✓" if e["sync_status"] else "-" if e["tipo"] in IGNORAR else "·"
    return f"{marca}{e['label'][:18].strip()} {dias}"


def pendentes(g, reconferir=False):
    """reconferir: JA_EXISTIA volta a ser pendente (só a Obs é revisada)."""
    ok = (None, "JA_EXISTIA") if reconferir else (None,)
    return [e for e in g if e["sync_status"] in ok and e["tipo"] not in IGNORAR]


def listar(grupos, mes, ano):
    print(f"\n── Eventos {mes:02d}/{ano} ── (· pendente  ✓ sincronizado  - ignorado)")
    print(f"{'#':>3}  {'MATRÍCULA':<10} {'NOME':<32} {'PEND':>4}  EVENTOS")
    for n, g in enumerate(grupos, 1):
        resumo = ", ".join(fmt_range(e) for e in g)
        print(f"{n:>3}  {mat_sigep(g[0]['matricula']):<10} {g[0]['nome'][:32]:<32} "
              f"{len(pendentes(g)):>4}  {resumo[:70] + ('…' if len(resumo) > 70 else '')}")
    print(f"     Total: {len(grupos)} servidores, {sum(len(pendentes(g)) for g in grupos)} eventos pendentes")


def detalhar(g, mes):
    print(f"\n{g[0]['nome']} ({g[0]['matricula']})")
    for e in g:
        st = (f"✓ {e['sync_status']} em {e['sincronizado_em'][:10]}" if e["sync_status"]
              else "ignorado" if e["tipo"] in IGNORAR else "pendente")
        print(f"   {e['label']:<45} {e['dia_inicio']:02d}-{e['dia_fim']:02d}/{mes:02d}  {e['turnos']:<10} {st}")


def escolher(txt, total):
    """'3' | '1,4,7' | '2-5' -> índices 0-based válidos."""
    nums = set()
    for parte in txt.replace(" ", "").split(","):
        a, _, b = parte.partition("-")
        nums.update(range(int(a), int(b or a) + 1))
    return [n - 1 for n in sorted(nums) if 1 <= n <= total]


def main():
    api = next((sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == "--api"), "http://localhost:5000/api")
    reconferir = "--reconferir" in sys.argv
    hoje = date.today()
    resp = input(f"Mês/ano [{hoje:%m/%Y}]: ").strip()
    mes, ano = map(int, resp.split("/")) if resp else (hoje.month, hoje.year)
    confirmar = True  # ao lançar, pede ENTER antes de cada Gravar

    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(PERFIL, headless=False)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto(BASE_URL)
        input("Faça login no SIGEP na janela do Chromium e aperte ENTER aqui...")
        abrir_evento(page)
        opcoes = page.eval_on_selector_all("#tipo option", "os => os.map(o => o.text.trim()).filter(Boolean)")
        try:
            grupos = carregar(api, mes, ano)
            listar(grupos, mes, ano)
            while True:
                print(f"\n[nº | 1,4 | 2-5] rodar  t=todos pendentes  v nº=ver  l=listar  m=mês  "
                      f"c=confirmar antes de Gravar ({'LIGADO' if confirmar else 'DESLIGADO'})  q=sair")
                cmd = input("> ").strip().lower()
                if cmd == "q":
                    break
                elif cmd == "l":
                    grupos = carregar(api, mes, ano)
                    listar(grupos, mes, ano)
                elif cmd == "c":
                    confirmar = not confirmar
                elif cmd == "m":
                    mes, ano = map(int, input("Mês/ano (MM/AAAA): ").split("/"))
                    grupos = carregar(api, mes, ano)
                    listar(grupos, mes, ano)
                elif cmd.startswith("v"):
                    for i in escolher(cmd[1:] or "0", len(grupos)):
                        detalhar(grupos[i], mes)
                elif cmd == "t" or re.fullmatch(r"[\d,\- ]+", cmd):
                    alvo = [g for g in grupos if pendentes(g, reconferir)] if cmd == "t" else \
                        [grupos[i] for i in escolher(cmd, len(grupos))]
                    if not alvo:
                        print("Nada selecionado.")
                        continue
                    modo = input(f"{len(alvo)} servidor(es). [s]imular (só compara, marca os que já existem) "
                                 f"ou [l]ançar no SIGEP? [s]: ").strip().lower()
                    if modo not in ("", "s", "l"):
                        continue
                    if modo == "l" and len(alvo) > 1 and \
                            input(f"Confirma LANÇAR para {len(alvo)} servidores? (s/N) ").strip().lower() != "s":
                        continue
                    processar(page, api, alvo, mes, ano, opcoes, dry=modo != "l", confirmar=confirmar,
                              reconferir=reconferir)
                    grupos = carregar(api, mes, ano)  # atualiza flags
                else:
                    print("Opção inválida.")
        except KeyboardInterrupt:
            print("\nSaindo.")
        finally:
            ctx.close()


def selftest():
    opcoes = ["FALTA", "FALTA INJUSTIFICADA", "FALTA PARALISACAO", "AFAST CASAMENTO ART 62 LEI COMP 840/2011",
              "ABONO DE PONTO ART 151 LEI COMP 840/2011", "LIC PATERNIDADE ART 150 LEI COMP 840/2011",
              "LIC PATERNIDADE (Prorr Dec. 37.669/2016)", "Abono TRE"]
    assert casar_evento("FALTA", opcoes) == "FALTA"
    assert casar_evento("FALTA PARALISAÇÃO", opcoes) == "FALTA PARALISACAO"
    assert casar_evento("AFAST CASAMENTO ART 62 LEI", opcoes) == opcoes[3]
    assert casar_evento("ABONO DE PONTO ART 151", opcoes) == opcoes[4]
    assert casar_evento("LIC PATERNIDADE ART 150 LEI", opcoes) == opcoes[5]
    assert casar_evento("ABONO ANIVERSÁRIO", opcoes) is None
    assert casar_evento("ABONO TRE", opcoes) == "Abono TRE"
    assert obs_turnos("MAT, VESP") == "MAT VESP" and obs_turnos("NOT") == "NOT"
    OBS_SIGEP["00000019"] = "MAT VESP"
    assert obs_sigep({"matricula": "1-9", "turnos": "MAT"}) == "MAT VESP"
    assert obs_sigep({"matricula": "203.656-8", "turnos": "MAT"}) == "MAT"
    assert obs_ok(" vesp  not", "VESP, NOT") and not obs_ok("", "VESP, NOT") and not obs_ok("MAT VESP", "MAT")
    g = [{"sync_status": None, "tipo": "FALTA"}, {"sync_status": "JA_EXISTIA", "tipo": "FALTA"},
         {"sync_status": "LANCADO", "tipo": "FALTA"}, {"sync_status": None, "tipo": "FERIAS"}]
    assert pendentes(g) == g[:1] and pendentes(g, reconferir=True) == g[:2]
    assert mat_sigep("203.656-8") == "02036568" and mat_sigep("7062.819-X") == "7062819X" and mat_sigep(None) == ""
    assert escolher("3", 10) == [2] and escolher("1,4, 7", 10) == [0, 3, 6]
    assert escolher("2-4,9", 5) == [1, 2, 3]  # 9 fora do total é descartado

    r = parse_registro(" 7064.821-2 ANA CAROLINA 16/09/2026 ATESTADO COMPARECIMENTO SERVIDOR ",
                       "javascript:AbreDados(224162077,2);")
    assert r == {"inicio": date(2026, 9, 16), "evento": "ATESTADO COMPARECIMENTO SERVIDOR",
                 "abre": "AbreDados(224162077,2)"}
    assert parse_registro("Registros Localizados", "javascript:document.frmBusca.argBusca.focus();") is None

    d = lambda dia: date(2026, 9, dia)
    ev = "ATESTADO COMPARECIMENTO SERVIDOR"
    regs = [{"inicio": d(16), "evento": ev, "abre": "a"}]
    fins = {"a": d(16), "b": d(5)}
    fim = lambda r: fins[r["abre"]]
    assert classificar(d(16), d(16), ev, regs, fim) == "EXISTE"
    assert classificar(d(2), d(2), ev, regs, fim) == "AUSENTE"  # caso real: 16/09 existe, 02/09 falta
    assert classificar(d(16), d(17), ev, regs, fim) == "CONFLITO"  # mesma data inicial, final diferente
    assert classificar(d(10), d(20), ev, regs, fim) == "CONFLITO"  # SIGEP começa dentro do nosso range
    assert classificar(d(16), d(16), "FALTA", regs, fim) == "AUSENTE"  # outro evento
    fam = "ATESTADO COMPARECIMENTO PESSOA DA FAMILIA"
    fins["f"] = d(20)
    assert classificar(d(20), d(20), fam, [{"inicio": d(20), "evento": fam[:40], "abre": "f"}], fim) == "EXISTE"
    antigos = [{"inicio": date(2025, m, 3), "evento": ev, "abre": "x"} for m in range(1, 13)]
    assert classificar(d(11), d(11), ev, antigos, lambda r: 1 / 0) == "AUSENTE"  # não abre registro antigo
    fins["c"] = d(2)
    assert classificar(d(1), d(2), ev, [{"inicio": date(2026, 8, 25), "evento": ev, "abre": "c"}], fim) == "CONFLITO"
    regs_b = [{"inicio": d(1), "evento": ev, "abre": "b"}]
    assert classificar(d(3), d(4), ev, regs_b, fim) == "CONFLITO"  # SIGEP 01-05 cobre 03-04
    assert classificar(d(6), d(6), ev, regs_b, fim) == "AUSENTE"
    print("selftest OK")


if __name__ == "__main__":
    selftest() if "--selftest" in sys.argv else main()
