"""
Sincronização das carências da GH (gh/GH.N.sem.AAAA[.historico].json) para o MySQL.

Funções puras (parse/casamento) ficam separadas das que tocam o banco para serem testáveis.
"""

import glob
import json
import os
import re
import unicodedata
from datetime import datetime

GH_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'gh')
_RE_ARQ = re.compile(r'^GH\.(\d)\.sem\.(\d{4})\.json$')


def normalizar_nome(nome):
    """Sem acento, caixa alta, espaços colapsados."""
    if not nome:
        return ''
    sem_acento = unicodedata.normalize('NFKD', str(nome)).encode('ascii', 'ignore').decode()
    return re.sub(r'\s+', ' ', sem_acento).strip().upper()


def normalizar_doc(doc):
    """CPF/matrícula: só [0-9A-Z], sem zeros à esquerda (igual a _norm_mat do app)."""
    if not doc:
        return ''
    return re.sub(r'[^0-9A-Za-z]', '', str(doc)).upper().lstrip('0')


def parse_substituto(texto):
    """'NOME (DOC)' -> (nome, doc). Sem parêntese final, doc = None."""
    if not texto:
        return None, None
    m = re.match(r'^(.*?)\s*\(([^)]+)\)\s*$', texto)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return texto.strip(), None


def parse_cod_pai(texto):
    """'68729 - NOME (mat)' ou '51868' -> '68729' / '51868'."""
    if not texto:
        return None
    m = re.match(r'\s*(\d+)', str(texto))
    return m.group(1) if m else None


def parse_periodo(texto):
    """'11/05/2026 a 22/05/2026' -> (date, date); campos inválidos viram None."""
    def _d(s):
        try:
            return datetime.strptime(s.strip(), '%d/%m/%Y').date()
        except (ValueError, AttributeError):
            return None
    if not texto or ' a ' not in texto:
        return None, None
    ini, fim = texto.split(' a ', 1)
    return _d(ini), _d(fim)


def parse_data_hora(texto):
    try:
        return datetime.strptime(texto, '%d/%m/%Y %H:%M:%S')
    except (ValueError, TypeError):
        return None


def parse_raspado_em(texto):
    try:
        return datetime.fromisoformat(texto)
    except (ValueError, TypeError):
        return None


def _vazio(v):
    """'--' e strings vazias viram None."""
    v = (v or '').strip() if isinstance(v, str) else v
    return None if v in ('', '--') else v


def indexar_profissionais(profissionais, cpf_por_prof_id):
    """
    Índices para o casamento. `profissionais`: dicts com id/nome/matricula.
    `cpf_por_prof_id`: {profissional_id: cpf}.
    """
    por_nome, por_doc = {}, {}
    for p in profissionais:
        por_nome.setdefault(normalizar_nome(p['nome']), []).append(p['id'])
        for doc in (p.get('matricula'), cpf_por_prof_id.get(p['id'])):
            d = normalizar_doc(doc)
            if d:
                por_doc.setdefault(d, set()).add(p['id'])
    return por_nome, por_doc


def casar_profissional(nome, doc, por_nome, por_doc):
    """
    Cascata: doc (CPF/matrícula) -> nome normalizado.
    Retorna (profissional_id|None, status) com status em 'casado'|'ambiguo'|'nao_casado'.
    Mais de um candidato em qualquer passo = ambíguo (não vincula).
    """
    d = normalizar_doc(doc)
    if d and d in por_doc:
        ids = por_doc[d]
        if len(ids) == 1:
            return next(iter(ids)), 'casado'
        return None, 'ambiguo'
    n = normalizar_nome(nome)
    ids = por_nome.get(n, []) if n else []
    if len(ids) == 1:
        return ids[0], 'casado'
    if len(ids) > 1:
        return None, 'ambiguo'
    return None, 'nao_casado'


def listar_arquivos(gh_dir=GH_DIR):
    """Arquivos de carências (não os .historico) com metadados leves."""
    saida = []
    for caminho in sorted(glob.glob(os.path.join(gh_dir, 'GH.*.sem.*.json'))):
        nome = os.path.basename(caminho)
        m = _RE_ARQ.match(nome)
        if not m:
            continue
        hist = caminho[:-len('.json')] + '.historico.json'
        try:
            with open(caminho, encoding='utf-8') as f:
                dados = json.load(f)
        except (OSError, ValueError):
            continue
        saida.append({
            'arquivo': nome,
            'caminho': caminho,
            'historico': os.path.basename(hist) if os.path.exists(hist) else None,
            'ano': dados.get('ano'),
            'semestre': dados.get('semestre'),
            'ultima_atualizacao': dados.get('ultima_atualizacao'),
            'total_carencias': len(dados.get('carencias', [])),
            'modificado_em': datetime.fromtimestamp(os.path.getmtime(caminho)).strftime('%Y-%m-%d %H:%M:%S'),
        })
    return saida


def carregar_arquivo(caminho):
    """Carrega (dados, historico_por_cod). Histórico ausente = {}."""
    with open(caminho, encoding='utf-8') as f:
        dados = json.load(f)
    hist_path = caminho[:-len('.json')] + '.historico.json'
    historico = {}
    if os.path.exists(hist_path):
        with open(hist_path, encoding='utf-8') as f:
            historico = json.load(f)
    return dados, historico


def sincronizar(conn, gh_dir=GH_DIR):
    """
    Upsert das carências e eventos. Nunca apaga. Refaz o casamento com profissionais a cada execução.
    Retorna o resumo para a aba de sync.
    """
    arquivos = listar_arquivos(gh_dir)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, nome, matricula FROM profissionais")
    profissionais = cursor.fetchall()
    cursor.execute("SELECT profissional_id, cpf FROM profissionais_complementar WHERE cpf IS NOT NULL")
    cpf_por_id = {r['profissional_id']: r['cpf'] for r in cursor.fetchall()}
    por_nome, por_doc = indexar_profissionais(profissionais, cpf_por_id)

    novas = atualizadas = eventos_novos = 0
    nao_casados, ambiguos = [], []
    agora = datetime.now()

    for arq in arquivos:
        dados, historico = carregar_arquivo(arq['caminho'])
        ano, semestre = dados.get('ano'), dados.get('semestre')
        if not ano or not semestre:
            continue

        for c in dados.get('carencias', []):
            cod = str(c['cod_carencia'])
            sub_nome, sub_doc = parse_substituto(c.get('professor_substituto'))
            tit_nome = _vazio(c.get('professor_titular'))
            ini, fim = parse_periodo(c.get('periodo'))

            tit_id = sub_id = None
            for papel, nome, doc in (('titular', tit_nome, None), ('substituto', sub_nome, sub_doc)):
                if not nome:
                    continue
                pid, status = casar_profissional(nome, doc, por_nome, por_doc)
                if papel == 'titular':
                    tit_id = pid
                else:
                    sub_id = pid
                if status != 'casado':
                    alvo = ambiguos if status == 'ambiguo' else nao_casados
                    item = {'cod_carencia': cod, 'ano': ano, 'semestre': semestre, 'papel': papel, 'nome': nome}
                    if item not in alvo:
                        alvo.append(item)

            cursor.execute(
                "SELECT id FROM gh_carencias WHERE ano=%s AND semestre=%s AND cod_carencia=%s",
                (ano, semestre, cod))
            existente = cursor.fetchone()
            valores = (
                parse_cod_pai(c.get('cod_carencia_pai')), c.get('nome_carga_horaria'), c.get('periodo'), ini, fim,
                c.get('tipo'), c.get('componente_principal'), c.get('situacao'),
                tit_nome, tit_id, sub_nome, sub_doc, sub_id, agora,
            )
            if existente:
                carencia_id = existente['id']
                cursor.execute("""
                    UPDATE gh_carencias SET cod_carencia_pai=%s, nome_carga_horaria=%s, periodo=%s,
                        periodo_ini=%s, periodo_fim=%s, tipo=%s, componente=%s, situacao=%s,
                        titular_nome=%s, titular_profissional_id=%s, substituto_nome=%s,
                        substituto_doc=%s, substituto_profissional_id=%s, ultima_vista_em=%s
                    WHERE id=%s
                """, valores + (carencia_id,))
                atualizadas += 1
            else:
                cursor.execute("""
                    INSERT INTO gh_carencias (cod_carencia_pai, nome_carga_horaria, periodo, periodo_ini,
                        periodo_fim, tipo, componente, situacao, titular_nome, titular_profissional_id,
                        substituto_nome, substituto_doc, substituto_profissional_id, ultima_vista_em,
                        ano, semestre, cod_carencia)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, valores + (ano, semestre, cod))
                carencia_id = cursor.lastrowid
                novas += 1

            for ev in (historico.get(cod) or {}).get('historico', []):
                if not ev.get('hash'):
                    continue
                cursor.execute("""
                    INSERT IGNORE INTO gh_carencia_historico
                        (carencia_id, data, situacao, matricula, nome, observacao, hash, raspado_em)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                """, (
                    carencia_id, parse_data_hora(ev.get('data')), ev.get('situacao'),
                    _vazio(ev.get('matricula')), _vazio(ev.get('nome')), _vazio(ev.get('observacao')),
                    ev['hash'], parse_raspado_em(ev.get('raspado_em')),
                ))
                eventos_novos += cursor.rowcount

    conn.commit()
    cursor.close()
    return {
        'arquivos': [{k: a[k] for k in ('arquivo', 'ano', 'semestre', 'total_carencias')} for a in arquivos],
        'carencias': {'novas': novas, 'atualizadas': atualizadas},
        'eventos_novos': eventos_novos,
        'nao_casados': nao_casados,
        'ambiguos': ambiguos,
    }


def carencias_do_profissional(execute_query, prof_id):
    """Carências (titular ou substituto) com histórico aninhado, mais recentes primeiro."""
    carencias = execute_query("""
        SELECT c.*, CASE WHEN c.titular_profissional_id = %s THEN 'titular' ELSE 'substituto' END AS papel
        FROM gh_carencias c
        WHERE c.titular_profissional_id = %s OR c.substituto_profissional_id = %s
        ORDER BY c.ano DESC, c.semestre DESC, c.periodo_ini DESC, c.cod_carencia DESC
    """, (prof_id, prof_id, prof_id)) or []
    if not carencias:
        return []
    ids = [c['id'] for c in carencias]
    marcadores = ','.join(['%s'] * len(ids))
    eventos = execute_query(
        f"SELECT * FROM gh_carencia_historico WHERE carencia_id IN ({marcadores}) ORDER BY data ASC, id ASC",
        tuple(ids)) or []
    por_carencia = {}
    for e in eventos:
        por_carencia.setdefault(e['carencia_id'], []).append(e)
    for c in carencias:
        c['historico'] = por_carencia.get(c['id'], [])
    return carencias
