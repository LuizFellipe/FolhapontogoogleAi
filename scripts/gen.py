"""Gera os diagramas .drawio de docs/diagrams (paleta fixa por camada) e exporta cada um para .drawio.svg.

Gera: folhaponto-arquitetura, ciclo-vida-folha, integracao-sigep-educasync, modelo-dados.
Edições feitas à mão nesses 4 .drawio são sobrescritas — altere aqui. Os demais .drawio só são re-exportados.
Requer o CLI `drawio` no PATH.

    python3 scripts/gen.py
"""
import glob
import re
import subprocess
from html import escape
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'docs' / 'diagrams'

PAL = {  # fill, stroke
    'user': ('#f5f5f5', '#666666'),
    'front': ('#dae8fc', '#6c8ebf'),
    'back': ('#d5e8d4', '#82b366'),
    'db': ('#ffe6cc', '#d79b00'),
    'integ': ('#e1d5e7', '#9673a6'),
    'ops': ('#fff2cc', '#d6b656'),
    'warn': ('#f8cecc', '#b85450'),
    'file': ('#ffffff', '#9673a6'),
}
FONT = 'fontFamily=Helvetica;fontSize=12;'


class D:
    def __init__(self, name, w, h):
        self.name, self.w, self.h, self.cells, self.n = name, w, h, [], 0

    def _id(self):
        self.n += 1
        return f'c{self.n}'

    def box(self, label, x, y, w, h, kind, shape='rounded=1;arcSize=12;', extra='', parent='1'):
        i = self._id()
        f, s = PAL[kind]
        st = f'{shape}whiteSpace=wrap;html=1;fillColor={f};strokeColor={s};{FONT}{extra}'
        self.cells.append(f'<mxCell id="{i}" value="{escape(label)}" style="{st}" vertex="1" parent="{parent}">'
                          f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
        return i

    def group(self, title, x, y, w, h, kind):
        f, s = PAL[kind]
        return self.box(f'<b>{title}</b>', x, y, w, h, kind,
                        shape='rounded=1;arcSize=4;dashed=1;verticalAlign=top;align=left;spacingLeft=10;spacingTop=4;',
                        extra=f'fillColor={f}66;fontSize=14;')

    def db(self, label, x, y, w, h):
        return self.box(label, x, y, w, h, 'db', shape='shape=cylinder3;boundedLbl=1;size=12;')

    def doc(self, label, x, y, w, h, kind='file'):
        return self.box(label, x, y, w, h, kind, shape='shape=note;size=14;')

    def rhombus(self, label, x, y, w, h, kind='warn'):
        return self.box(label, x, y, w, h, kind, shape='rhombus;')

    def text(self, label, x, y, w, h, size=20):
        i = self._id()
        self.cells.append(f'<mxCell id="{i}" value="{escape(label)}" style="text;html=1;align=left;verticalAlign=middle;'
                          f'{FONT}fontSize={size};" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" '
                          f'height="{h}" as="geometry"/></mxCell>')

    def edge(self, a, b, label='', dashed=False, color='#555555', ex='', en=''):
        i = self._id()
        st = (f'edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeWidth=1.5;strokeColor={color};'
              f'fontSize=11;labelBackgroundColor=#ffffff;endArrow=block;endFill=1;'
              f'{"dashed=1;" if dashed else ""}{ex}{en}')
        self.cells.append(f'<mxCell id="{i}" value="{escape(label)}" style="{st}" edge="1" parent="1" '
                          f'source="{a}" target="{b}"><mxGeometry relative="1" as="geometry"/></mxCell>')

    def legend(self, x, y, items):
        self.text('<b>Legenda</b>', x, y, 120, 20, 12)
        for k, (kind, lbl) in enumerate(items):
            self.box(lbl, x, y + 24 + k * 30, 150, 24, kind, extra='fontSize=11;')

    def save(self):
        body = '\n'.join(self.cells)
        xml = (f'<mxfile><diagram id="{self.name}" name="{self.name}"><mxGraphModel grid="0" page="0" '
               f'pageWidth="{self.w}" pageHeight="{self.h}" background="#ffffff"><root><mxCell id="0"/>'
               f'<mxCell id="1" parent="0"/>\n{body}\n</root></mxGraphModel></diagram></mxfile>\n')
        (OUT / f'{self.name}.drawio').write_text(xml, encoding='utf-8')


LEG = [('user', 'Usuário / externo'), ('front', 'Frontend React'), ('back', 'Backend Flask'),
       ('db', 'MySQL'), ('integ', 'Integrações SIGEP/EducaSync'), ('ops', 'Operação / scripts')]


# ─────────────────────────── 1. Arquitetura geral ───────────────────────────
def arquitetura():
    d = D('folhaponto-arquitetura', 1500, 1000)
    d.text('🏛️ <b>Gestor Folha Ponto</b> — arquitetura geral', 20, 10, 700, 40, 24)

    user = d.box('👤 <b>Usuário</b><br>navegador', 20, 135, 130, 60, 'user')

    d.group('🐳 Docker Compose', 190, 60, 1000, 530, 'user')
    # frontend
    d.group('🎨 Frontend — React 19', 205, 100, 250, 470, 'front')
    nginx = d.box('<b>nginx</b> :3000<br><font style="font-size:10px">SPA + proxy /api</font>', 220, 140, 220, 50, 'front')
    app = d.box('<b>App.tsx</b><br>estado da folha + auto-save', 220, 215, 220, 50, 'front')
    comps = d.box('<b>components/</b><br>Grade · Servidor<br>Feriados/Recessos · Lote<br>Relatórios · Memorandos<br>Sync EducaSync/SIGEP<br>Impressão A4',
                  220, 290, 220, 110, 'front', extra='fontSize=11;')
    api = d.box('<b>services/api.ts</b><br>apiService', 220, 425, 220, 50, 'front')
    d.box('<b>types.ts</b><br>tipos de lançamento + códigos', 220, 500, 220, 45, 'front', extra='fontSize=11;')
    # backend
    d.group('⚙️ Backend — Flask 3 (app.py)', 480, 100, 420, 470, 'back')
    flask = d.box('<b>Flask</b> :5000 · gunicorn em produção', 500, 140, 380, 40, 'back')
    rotas = ['👥 /profissionais (+ /complementar)', '📄 /folhas-ponto · /lancamentos · /resumo',
             '🗓️ /feriados · /recessos', '📊 /relatorio/* · /atestados-*',
             '🔄 /sigep/* · /educasync/dados', '🏷️ /tipos-lancamento · /health']
    rids = [d.box(t, 500, 195 + k * 42, 380, 34, 'back', extra='fontSize=11;align=left;spacingLeft=8;') for k, t in enumerate(rotas)]
    exq = d.box('<b>execute_query()</b> · mysql-connector', 500, 460, 380, 40, 'back')
    # db
    d.group('🗄️ Banco — MySQL 8', 925, 100, 250, 470, 'db')
    mysql = d.db('<b>folhaponto_db</b><br>:3307 → 3306', 960, 135, 180, 80)
    d.box('<b>Tabelas</b><br>profissionais · folhas_ponto<br>lancamentos_diarios<br>resumo_folha · feriados<br>recessos · tipos_lancamento<br>profissionais_complementar<br>sigep_eventos_sync',
          940, 230, 220, 140, 'db', extra='fontSize=11;')
    d.box('<b>Views</b><br>vw_adicional_noturno<br>vw_folhas_lancamento<br>vw_relatorio_atestados_*', 940, 385, 220, 80, 'db', extra='fontSize=11;')
    d.box('migrations/ 001…026<br>schema_migrations', 940, 480, 220, 50, 'db', extra='fontSize=11;')

    # integrações: arquivos que o backend lê ficam logo abaixo dele
    d.group('🔌 Integrações (scripts Python locais)', 190, 630, 1000, 350, 'integ')
    edu = d.box('<b>educasync/</b><br>extrair_folhas.py<br>PDFs → PyMuPDF', 210, 670, 230, 65, 'integ', extra='fontSize=11;')
    ejson = d.doc('dados_folha_<br>ponto.json', 495, 670, 120, 65)
    fjson = d.doc('ficha.cadastral<br>.*.json', 630, 670, 120, 65)
    lanc = d.box('<b>lancar_eventos.py</b> 🤖<br>robô 03.Lançamento', 765, 670, 140, 65, 'integ', extra='fontSize=11;')
    verif = d.box('<b>verificar_novos.py</b><br>listagem → servidores.csv', 210, 820, 210, 60, 'integ', extra='fontSize=11;')
    rasp = d.box('<b>raspar_fichas.py</b><br>Playwright → PDFs', 440, 820, 190, 60, 'integ', extra='fontSize=11;')
    extr = d.box('<b>extrair_fichas.py</b><br>pdftotext → JSON/XLSX', 650, 820, 190, 60, 'integ', extra='fontSize=11;')
    sigep = d.box('🌐 <b>SIGEP</b><br>sistema externo', 1260, 830, 190, 60, 'user')

    # operação
    d.group('🧰 Operação', 1230, 300, 250, 290, 'ops')
    d.box('<b>folha_manager.sh</b><br>menu: iniciar/parar, backup,<br>tipos, EducaSync…', 1245, 340, 220, 70, 'ops', extra='fontSize=11;')
    d.box('<b>scripts/</b><br>add_entry_type · sync_tipos<br>backfill · backup/restore', 1245, 425, 220, 65, 'ops', extra='fontSize=11;')
    bkp = d.box('<b>backup_cron.py</b><br>backup_db → rclone', 1245, 505, 220, 50, 'ops', extra='fontSize=11;')
    cloud = d.box('☁️ OneDrive', 1270, 640, 170, 45, 'user')

    d.edge(user, nginx, 'HTTP', ex='exitX=1;exitY=0.5;', en='entryX=0;entryY=0.5;')
    d.edge(nginx, app)
    d.edge(app, comps)
    d.edge(comps, api)
    d.edge(api, flask, '/api/*', ex='exitX=1;exitY=0.5;', en='entryX=0;entryY=0.5;')
    d.edge(flask, rids[0])
    d.edge(rids[-1], exq)
    d.edge(exq, mysql, 'SQL', ex='exitX=1;exitY=0.5;', en='entryX=0;entryY=0.5;')
    d.edge(edu, ejson)
    d.edge(verif, rasp, 'novos')
    d.edge(rasp, extr, 'PDFs')
    d.edge(extr, fjson, ex='exitX=0.5;exitY=0;', en='entryX=0.5;entryY=1;')
    d.edge(ejson, exq, 'lê', color='#9673a6', ex='exitX=0.5;exitY=0;', en='entryX=0.1;entryY=1;')
    d.edge(fjson, exq, 'lê', color='#9673a6', ex='exitX=0.5;exitY=0;', en='entryX=0.45;entryY=1;')
    d.edge(lanc, exq, 'GET eventos · POST sync', color='#9673a6', ex='exitX=0.5;exitY=0;', en='entryX=0.8;entryY=1;')
    d.edge(lanc, sigep, 'lança eventos', dashed=True, color='#9673a6', ex='exitX=1;exitY=0.5;', en='entryX=0.5;entryY=0;')
    d.edge(rasp, sigep, 'Playwright', dashed=True, color='#9673a6', ex='exitX=0.5;exitY=1;', en='entryX=0.5;entryY=1;')
    d.edge(bkp, mysql, 'dump', dashed=True, color='#d6b656', ex='exitX=0.5;exitY=0;', en='entryX=1;entryY=0.5;')
    d.edge(bkp, cloud, 'rclone', dashed=True, color='#d6b656', ex='exitX=0.5;exitY=1;', en='entryX=0.5;entryY=0;')
    d.legend(20, 640, LEG)
    d.save()


# ─────────────────────────── 2. Ciclo de vida da folha ───────────────────────────
def ciclo():
    d = D('ciclo-vida-folha', 1360, 880)
    d.text('🔁 <b>Ciclo de vida de uma folha de ponto</b>', 20, 10, 700, 40, 24)
    W, H, Y = 190, 80, 70
    xs = [20 + k * 225 for k in range(6)]
    steps = [
        ('1 · 🔐 Login', 'LoginScreen<br>credenciais do .env', 'front'),
        ('2 · 👤 Servidor', 'EmployeeNavigator<br>EmployeeForm', 'front'),
        ('3 · 📅 Mês / Ano', 'loadCompleteTimesheet()<br>carrega ou cria folha', 'back'),
        ('4 · ✏️ Grade diária', 'TimesheetGrid<br>31 dias × 2 turnos', 'front'),
        ('5 · 💾 Auto-save', 'saveCompleteTimesheet()<br>lançamentos + resumo', 'back'),
        ('6 · 🖨️ Impressão A4', 'Pág. 1 Frequência<br>Pág. 2 Resumo', 'front'),
    ]
    ids = [d.box(f'<b>{t}</b><br><font style="font-size:11px">{s}</font>', x, Y, W, H, k) for x, (t, s, k) in zip(xs, steps)]
    for a, b in zip(ids, ids[1:]):
        d.edge(a, b)

    # ajudantes: coluna dos passos 2–4
    d.group('🧩 Ajudantes da grade', 245, 190, 640, 350, 'front')
    lote = d.box('<b>📦 Geração em lote</b><br>BatchTimesheetModal<br>vários servidores + impressão', 260, 235, 190, 75, 'front', extra='fontSize=11;')
    pre = d.box('<b>⚡ Pré-preenchimento</b><br>replica CPIP / CURSO<br>por posição semanal + dia', 470, 235, 190, 75, 'front', extra='fontSize=11;')
    fer = d.box('<b>🗓️ Feriados / Recessos</b><br>HolidayModal<br>aplica e reverte', 680, 235, 190, 75, 'front', extra='fontSize=11;')
    crit = d.rhombus('<b>Atestado<br>dentro do<br>limite?</b>', 700, 350, 150, 120)
    blk = d.box('⛔ <b>bloqueia</b> lançamento<br>limite bimestral / anual', 470, 380, 190, 60, 'warn', extra='fontSize=11;')
    views = d.db('vw_relatorio_<br>atestados_*', 285, 365, 140, 95)
    d.edge(ids[1], lote, 'vários', dashed=True)
    d.edge(ids[3], pre, dashed=True, ex='exitX=0.15;exitY=1;', en='entryX=0.5;entryY=0;')
    d.edge(ids[3], fer, dashed=True, ex='exitX=0.45;exitY=1;', en='entryX=0.5;entryY=0;')
    d.edge(ids[3], crit, 'atestado', dashed=True, ex='exitX=0.9;exitY=1;', en='entryX=1;entryY=0.5;')
    d.edge(crit, blk, 'não', color='#b85450')
    d.edge(crit, views, 'consulta', dashed=True, color='#d79b00', ex='exitX=0.5;exitY=1;', en='entryX=0.5;entryY=1;')

    # resumo automático: coluna do passo 5
    resumo = d.box('<b>📄 Resumo automático</b><br>computeSummaryFromEntries()<br>agrupa dias com código<br>→ I/A/E · código · "U"', 915, 200, 190, 90, 'back', extra='fontSize=11;')
    dbx = d.db('<b>MySQL</b><br>folhas_ponto<br>lancamentos_diarios<br>resumo_folha', 920, 330, 180, 120)
    d.edge(ids[4], resumo)
    d.edge(resumo, dbx)
    d.legend(1160, 200, LEG[1:6] + [('warn', 'Bloqueio / regra')])

    # pós-impressão
    pos = d.group('📬 Depois do mês fechado', 20, 590, 1320, 240, 'ops')
    rel = d.box('<b>📊 Relatórios</b><br>lançamentos · adicional noturno<br>resumo anual', 60, 660, 220, 80, 'ops', extra='fontSize=11;')
    ent = d.box('<b>📨 Memorando de entrega</b><br>TimesheetDeliveryModal', 320, 660, 220, 80, 'ops', extra='fontSize=11;')
    dev = d.box('<b>↩️ Memorando de devolução</b><br>ReturnMemoModal', 580, 660, 220, 80, 'ops', extra='fontSize=11;')
    robo = d.box('<b>🤖 Lançar no SIGEP</b><br>lancar_eventos.py<br>GET /api/sigep/eventos', 910, 660, 200, 80, 'integ', extra='fontSize=11;')
    d.edge(dbx, robo)
    d.edge(ids[5], pos, 'fim do mês', ex='exitX=0.9;exitY=1;', en='entryX=0.975;entryY=0;', dashed=True)
    d.save()


# ─────────────────────────── 3. SIGEP + EducaSync ───────────────────────────
def integracoes():
    d = D('integracao-sigep-educasync', 1400, 880)
    d.text('🔌 <b>Integrações — SIGEP e EducaSync</b>', 20, 10, 700, 40, 24)

    # SIGEP: importação cadastral
    d.group('① SIGEP → fichas cadastrais (importação)', 20, 60, 1360, 250, 'integ')
    sig = d.box('🌐 <b>SIGEP</b><br>login manual<br>(Chromium)', 40, 130, 130, 90, 'user')
    v = d.box('<b>verificar_novos.py</b><br>baixa Listagem Geral<br>compara matrículas', 200, 110, 190, 70, 'integ', extra='fontSize=11;')
    csv = d.doc('servidores.csv<br><small>+ novos anexados</small>', 200, 205, 190, 60)
    r = d.box('<b>raspar_fichas.py</b><br>busca nome → confere matrícula<br>POST /FichaFuncional', 420, 130, 210, 80, 'integ', extra='fontSize=11;')
    pdf = d.doc('nome.matricula.pdf<br><small>1 por servidor</small>', 660, 140, 160, 60)
    e = d.box('<b>extrair_fichas.py</b><br>pdftotext -bbox-layout<br>+ BeautifulSoup', 850, 130, 190, 80, 'integ', extra='fontSize=11;')
    js = d.doc('<b>ficha.cadastral.*.json</b><br>+ .xlsx multi-abas', 1070, 120, 170, 60)
    ui = d.box('<b>SyncSigepTab</b><br>POST /api/sigep/sincronizar<br>upsert por matrícula', 1070, 210, 170, 75, 'front', extra='fontSize=11;')
    tbl = d.db('profissionais_<br>complementar<br>+ cargas/cursos…', 1265, 190, 105, 110)
    d.edge(sig, v, dashed=True, color='#9673a6', ex='exitX=1;exitY=0.25;', en='entryX=0;entryY=0.5;')
    d.edge(v, csv)
    d.edge(csv, r, ex='exitX=1;exitY=0.5;', en='entryX=0;entryY=0.75;')
    d.edge(sig, r, dashed=True, color='#9673a6', ex='exitX=1;exitY=0.6;', en='entryX=0;entryY=0.35;')
    d.edge(r, pdf)
    d.edge(pdf, e)
    d.edge(e, js)
    d.edge(js, ui)
    d.edge(ui, tbl)

    # SIGEP: robô de eventos
    d.group('② Folha de Ponto → SIGEP 03.Lançamento (robô)', 20, 340, 1360, 280, 'integ')
    api = d.box('<b>GET /api/sigep/eventos</b><br>ranges de dias do mês<br>(exceto trabalho normal)', 40, 420, 200, 80, 'back', extra='fontSize=11;')
    bot = d.box('<b>lancar_eventos.py</b> 🤖<br>menu: um · vários · todos<br>modo simular (padrão) ou lançar', 280, 420, 220, 80, 'integ', extra='fontSize=11;')
    q = d.rhombus('<b>Evento já<br>existe no<br>SIGEP?</b>', 550, 400, 150, 120, 'integ')
    ja = d.box('✅ <b>JA_EXISTIA</b><br>--reconferir completa<br>turno na Obs', 760, 370, 180, 70, 'back', extra='fontSize=11;')
    novo = d.box('➕ <b>Novo → Incluir → Gravar</b><br>rebusca e confirma<br>→ <b>LANCADO</b>', 760, 460, 180, 75, 'back', extra='fontSize=11;')
    conf = d.box('⚠️ <b>CONFLITO</b><br>sobreposição parcial<br>→ revisão manual', 760, 550, 180, 60, 'warn', extra='fontSize=11;')
    sync = d.box('<b>POST /api/sigep/eventos/sync</b><br>grava flag', 990, 430, 200, 60, 'back', extra='fontSize=11;')
    t2 = d.db('sigep_eventos_<br>sync', 1230, 415, 130, 90)
    d.edge(api, bot)
    d.edge(bot, q)
    d.edge(q, ja, 'sim', ex='exitX=0.5;exitY=0;', en='entryX=0;entryY=0.5;')
    d.edge(q, novo, 'não', ex='exitX=1;exitY=0.5;', en='entryX=0;entryY=0.5;')
    d.edge(q, conf, 'parcial', color='#b85450', ex='exitX=0.5;exitY=1;', en='entryX=0;entryY=0.5;')
    d.edge(ja, sync, ex='exitX=1;exitY=0.5;', en='entryX=0.5;entryY=0;')
    d.edge(novo, sync, ex='exitX=1;exitY=0.5;', en='entryX=0;entryY=0.5;')
    d.edge(sync, t2)

    # EducaSync
    d.group('③ EducaSync → dados básicos das folhas em PDF', 20, 650, 1360, 210, 'integ')
    pdfs = d.doc('educasync/educa_folha/<br>folhas em PDF', 40, 720, 180, 70)
    ex = d.box('<b>extrair_folhas.py</b><br>PyMuPDF · lê cabeçalhos<br>(menu opção 11)', 260, 710, 210, 80, 'integ', extra='fontSize=11;')
    dj = d.doc('<b>dados_folha_ponto.json</b>', 510, 720, 200, 60)
    ge = d.box('<b>GET /api/educasync/dados</b>', 750, 720, 200, 60, 'back', extra='fontSize=11;')
    mod = d.box('<b>SyncEducaModal</b><br>compara com MySQL<br>e aplica divergências', 990, 705, 200, 90, 'front', extra='fontSize=11;')
    p = d.db('profissionais', 1230, 705, 130, 90)
    for a, b in [(pdfs, ex), (ex, dj), (dj, ge), (ge, mod), (mod, p)]:
        d.edge(a, b)
    d.save()


# ─────────────────────────── 4. Modelo de dados ───────────────────────────
def er():
    d = D('modelo-dados', 1360, 760)
    d.text('🗄️ <b>Modelo de dados — MySQL</b>', 20, 10, 700, 40, 24)

    def table(title, cols, x, y, kind='db', w=230):
        body = '<br>'.join(cols)
        return d.box(f'<b>{title}</b><hr size="1">{body}', x, y, w, 40 + 17 * len(cols), kind,
                     shape='rounded=1;arcSize=4;', extra='align=left;verticalAlign=top;spacingLeft=8;spacingTop=4;fontSize=11;')

    prof = table('👥 profissionais', ['🔑 id', 'nome · matricula', 'cargo · disciplina · funcao', 'ua · exercicio · unidade_lotacao',
                                     'carga_horaria (20/40)', 'turno1 · turno2', 'status ATIVO/INATIVO'], 40, 80)
    comp = table('🧾 profissionais_complementar', ['🔑 id', '🔗 profissional_id (1:1)', 'admissao · ref_sal · pcd',
                                                  'dados pessoais / documentos', 'endereço · contatos', 'arquivo_origem'], 40, 350, 'integ')
    folha = table('📄 folhas_ponto', ['🔑 id', '🔗 profissional_id', 'mes · ano', 'observacoes'], 360, 80)
    sat = table('📚 satélites SIGEP (1:N)', ['profissional_cargas_horarias', 'profissional_cursos',
                                          'profissional_habilitacoes', 'profissional_componentes'], 360, 350, 'integ')
    lanc = table('✏️ lancamentos_diarios', ['🔑 id', '🔗 folha_ponto_id', 'dia (1–31)', 'tipo (turno 1)', 'tipo_turno2'], 700, 60)
    res = table('📋 resumo_folha', ['🔑 id', '🔗 folha_ponto_id', 'operacao I/A/E', 'codigo · carga · meses',
                                   'horas_dias', 'dia_inicio · dia_fim'], 700, 245)
    sync = table('🤖 sigep_eventos_sync', ['🔑 id', '🔗 folha_ponto_id', 'tipo · dia_inicio · dia_fim', 'turnos',
                                          'status JA_EXISTIA/LANCADO'], 700, 450, 'integ')
    tipos = table('🏷️ tipos_lancamento', ['🔑 valor', 'label', 'codigo oficial (ex.: 99902)'], 1060, 60, 'db', 260)
    table('🎉 feriados', ['dia · mes · ano · label'], 1060, 190, 'db', 260)
    table('🏖️ recessos', ['dia/mes/ano_inicio', 'dia/mes/ano_fim · label'], 1060, 270, 'db', 260)
    views = table('👁️ Views (relatórios / críticas)', ['vw_adicional_noturno', 'vw_folhas_lancamento',
                                                     'vw_relatorio_atestados_bimestrais', 'vw_relatorio_atestados_comparecimento'],
                  1060, 370, 'db', 260)
    table('🧱 schema_migrations', ['version · applied_at'], 1060, 530, 'ops', 260)

    er_ = 'endArrow=ERmany;startArrow=ERmandOne;endFill=0;startFill=0;'
    d.edge(prof, folha, '1 : N', ex=er_ + 'exitX=1;exitY=0.3;', en='entryX=0;entryY=0.4;')
    d.edge(prof, comp, '1 : 1', ex='endArrow=ERmandOne;startArrow=ERmandOne;')
    d.edge(prof, sat, '1 : N', ex=er_ + 'exitX=1;exitY=0.85;', en='entryX=0.3;entryY=0;')
    d.edge(folha, lanc, '1 : N', ex=er_ + 'exitX=1;exitY=0.2;', en='entryX=0;entryY=0.5;')
    d.edge(folha, res, '1 : N', ex=er_ + 'exitX=1;exitY=0.6;', en='entryX=0;entryY=0.4;')
    d.edge(folha, sync, '1 : N', ex=er_ + 'exitX=1;exitY=0.9;', en='entryX=0;entryY=0.4;')
    d.edge(lanc, tipos, 'tipo → valor', dashed=True, ex='exitX=1;exitY=0.4;', en='entryX=0;entryY=0.5;')
    d.edge(lanc, views, 'agregam', dashed=True, color='#d79b00', ex='exitX=1;exitY=0.85;', en='entryX=0;entryY=0.3;')
    d.text('<font style="font-size:11px">🔗 FK com <b>ON DELETE CASCADE</b>: excluir um servidor apaga folhas, lançamentos, resumo e dados SIGEP.<br>'
           'Feriados e recessos não têm FK: são aplicados na grade (tipo = FERIADO / RECESSO).</font>', 40, 640, 700, 50, 11)
    d.save()




def exportar_svg():
    """Exporta todos os .drawio para SVG claro, sem os PNG de fallback (foreignObject basta nos navegadores)."""
    for f in sorted(glob.glob(str(OUT / '*.drawio'))):
        svg = f + '.svg'
        subprocess.run(['drawio', '-x', '-f', 'svg', '--theme', 'light', '-o', svg, f, '--no-sandbox'],
                       check=True, capture_output=True)
        txt = Path(svg).read_text(encoding='utf-8')
        Path(svg).write_text(re.sub(r'<image [^>]*?xlink:href="data:image/png;base64,[^"]*"[^>]*/>', '', txt), encoding='utf-8')
        print('ok', Path(svg).name)


if __name__ == '__main__':
    arquitetura(); ciclo(); integracoes(); er()
    exportar_svg()
