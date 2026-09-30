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


# Grupos de campos que o usuário liga/desliga na aba de sync. 'historico' = eventos (tabela própria).
GRUPOS = {
    'situacao': ['situacao'],
    'pessoas': ['titular_nome', 'titular_profissional_id', 'substituto_nome', 'substituto_doc',
                'substituto_profissional_id'],
    'dados': ['periodo', 'tipo', 'componente', 'nome_carga_horaria', 'cod_carencia_pai'],
}
GRUPOS_TODOS = ('situacao', 'pessoas', 'dados', 'historico')


def normalizar_grupos(grupos):
    """None = todos; ignora nomes inválidos."""
    if grupos is None:
        return set(GRUPOS_TODOS)
    return {g for g in grupos if g in GRUPOS_TODOS}


def campos_dos_grupos(grupos):
    return [c for g in GRUPOS if g in grupos for c in GRUPOS[g]]


def chave_carencia(ano, semestre, cod):
    return f'{ano}.{semestre}.{cod}'


def motivos_da_divergencia(diffs, eventos_novos):
    """Traduz os diffs (campo/antes/depois) e a contagem de eventos novos em motivos legíveis."""
    motivos = []

    def add(m):
        if m not in motivos:
            motivos.append(m)

    for d in diffs:
        campo = d['campo']
        if campo == 'situacao':
            add('situacao_mudou')
        elif campo.endswith('_profissional_id'):
            if d['antes'] is None and d['depois'] is not None:
                add('servidor_vinculado')
            elif d['antes'] is not None and d['depois'] is None:
                add('servidor_desvinculado')
            else:
                add('pessoas_mudaram')
        elif campo in GRUPOS['pessoas']:
            add('pessoas_mudaram')
        else:
            add('dados_mudaram')
    if eventos_novos:
        add('eventos_novos')
    return motivos


def _ler_carencias(cursor, gh_dir):
    """
    Lê os arquivos e resolve o casamento com profissionais.
    Retorna (arquivos, itens, nomes_por_id); cada item traz a chave, os campos a gravar e os eventos do arquivo.
    """
    arquivos = listar_arquivos(gh_dir)
    cursor.execute("SELECT id, nome, matricula FROM profissionais")
    profissionais = cursor.fetchall()
    cursor.execute("SELECT profissional_id, cpf FROM profissionais_complementar WHERE cpf IS NOT NULL")
    cpf_por_id = {r['profissional_id']: r['cpf'] for r in cursor.fetchall()}
    por_nome, por_doc = indexar_profissionais(profissionais, cpf_por_id)
    nomes_por_id = {p['id']: p['nome'] for p in profissionais}

    itens = []
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

            ids, pendencias = {}, []
            for papel, nome, doc in (('titular', tit_nome, None), ('substituto', sub_nome, sub_doc)):
                ids[papel] = None
                if not nome:
                    continue
                pid, status = casar_profissional(nome, doc, por_nome, por_doc)
                ids[papel] = pid
                if status != 'casado':
                    pendencias.append((status, {'cod_carencia': cod, 'ano': ano, 'semestre': semestre,
                                                'papel': papel, 'nome': nome}))

            itens.append({
                'chave': chave_carencia(ano, semestre, cod),
                'ano': ano, 'semestre': semestre, 'cod_carencia': cod,
                'ini': ini, 'fim': fim,
                'campos': {
                    'cod_carencia_pai': parse_cod_pai(c.get('cod_carencia_pai')),
                    'nome_carga_horaria': c.get('nome_carga_horaria'),
                    'periodo': c.get('periodo'),
                    'tipo': c.get('tipo'),
                    'componente': c.get('componente_principal'),
                    'situacao': c.get('situacao'),
                    'titular_nome': tit_nome,
                    'titular_profissional_id': ids['titular'],
                    'substituto_nome': sub_nome,
                    'substituto_doc': sub_doc,
                    'substituto_profissional_id': ids['substituto'],
                },
                'pendencias': pendencias,
                'eventos': [e for e in (historico.get(cod) or {}).get('historico', []) if e.get('hash')],
            })
    return arquivos, itens, nomes_por_id


def _evento_resumo(e):
    return {'data': e.get('data'), 'situacao': e.get('situacao'), 'nome': _vazio(e.get('nome')),
            'observacao': _vazio(e.get('observacao'))}


def comparar(conn, gh_dir=GH_DIR, grupos=None):
    """
    Compara arquivos x banco sem gravar, só nos grupos de campos ativos. Status por carência:
    'novo' (não existe), 'divergente' (campo mudou ou há evento novo) ou 'sincronizado'.
    Cada item traz `motivos`, `diffs` (vínculos com nome do servidor) e `eventos` (os que seriam gravados).
    """
    grupos = normalizar_grupos(grupos)
    campos = campos_dos_grupos(grupos)
    cursor = conn.cursor(dictionary=True)
    _, itens, nomes = _ler_carencias(cursor, gh_dir)
    saida = []
    for it in itens:
        cursor.execute(
            f"SELECT id, {', '.join(sorted(set(c for g in GRUPOS.values() for c in g)))} "
            "FROM gh_carencias WHERE ano=%s AND semestre=%s AND cod_carencia=%s",
            (it['ano'], it['semestre'], it['cod_carencia']))
        db = cursor.fetchone()
        diffs, novos = [], it['eventos']
        if db:
            for campo in campos:
                antes, depois = db[campo], it['campos'][campo]
                if (antes or None) != (depois or None):
                    diffs.append({'campo': campo, 'antes': antes, 'depois': depois})
            cursor.execute("SELECT hash FROM gh_carencia_historico WHERE carencia_id=%s", (db['id'],))
            existentes = {r['hash'] for r in cursor.fetchall()}
            novos = [e for e in it['eventos'] if e['hash'] not in existentes]
        if 'historico' not in grupos:
            novos = []
        motivos = motivos_da_divergencia(diffs, len(novos)) if db else []
        status = 'novo' if not db else ('divergente' if diffs or novos else 'sincronizado')

        diffs_saida = []
        for d in diffs:
            antes, depois = d['antes'], d['depois']
            if d['campo'].endswith('_profissional_id'):
                antes, depois = nomes.get(antes), nomes.get(depois)
            diffs_saida.append({'campo': d['campo'],
                                'antes': None if antes is None else str(antes),
                                'depois': None if depois is None else str(depois)})
        c = it['campos']
        saida.append({
            'chave': it['chave'], 'ano': it['ano'], 'semestre': it['semestre'], 'cod_carencia': it['cod_carencia'],
            'nome_carga_horaria': c['nome_carga_horaria'], 'componente': c['componente'],
            'situacao': c['situacao'], 'periodo': c['periodo'],
            'titular_nome': c['titular_nome'], 'substituto_nome': c['substituto_nome'],
            'titular_casado': c['titular_profissional_id'] is not None,
            'substituto_casado': c['substituto_profissional_id'] is not None,
            'status': status, 'motivos': motivos, 'diffs': diffs_saida,
            'eventos_novos': len(novos), 'total_eventos': len(it['eventos']),
            'eventos': [_evento_resumo(e) for e in novos],
        })
    cursor.close()
    return saida


def _gravar_carencia(cursor, it, grupos, agora):
    """Upsert de uma carência (+ eventos). Retorna ('nova'|'atualizada', eventos_novos)."""
    ano, semestre, cod, c = it['ano'], it['semestre'], it['cod_carencia'], it['campos']
    cursor.execute(
        "SELECT id FROM gh_carencias WHERE ano=%s AND semestre=%s AND cod_carencia=%s", (ano, semestre, cod))
    existente = cursor.fetchone()

    if existente:
        carencia_id = existente['id']
        cols = {campo: c[campo] for campo in campos_dos_grupos(grupos)}
        if 'dados' in grupos:
            cols['periodo_ini'], cols['periodo_fim'] = it['ini'], it['fim']
        cols['ultima_vista_em'] = agora
        cursor.execute(
            f"UPDATE gh_carencias SET {', '.join(f'{k}=%s' for k in cols)} WHERE id=%s",
            tuple(cols.values()) + (carencia_id,))
        acao = 'atualizada'
    else:
        cols = dict(c, periodo_ini=it['ini'], periodo_fim=it['fim'], ultima_vista_em=agora,
                    ano=ano, semestre=semestre, cod_carencia=cod)
        cursor.execute(
            f"INSERT INTO gh_carencias ({', '.join(cols)}) VALUES ({', '.join(['%s'] * len(cols))})",
            tuple(cols.values()))
        carencia_id = cursor.lastrowid
        acao = 'nova'

    eventos_novos = 0
    if 'historico' in grupos:
        for ev in it['eventos']:
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
    return acao, eventos_novos


def sincronizar(conn, gh_dir=GH_DIR, chaves=None, grupos=None):
    """
    Upsert das carências e eventos. Nunca apaga. Refaz o casamento com profissionais a cada execução.
    `chaves` (opcional): só as carências com essas chaves (ano.semestre.cod); None = todas.
    `grupos` (opcional): grupos de campos a gravar em carências já existentes (None = todos);
    carência nova sempre entra completa.
    Cada carência roda em SAVEPOINT: falha em uma não derruba as outras e vai para `falhas` com o motivo.
    """
    grupos = normalizar_grupos(grupos)
    cursor = conn.cursor(dictionary=True)
    arquivos, itens, _ = _ler_carencias(cursor, gh_dir)
    if chaves is not None:
        chaves = set(chaves)
        itens = [i for i in itens if i['chave'] in chaves]

    novas = atualizadas = eventos_novos = 0
    nao_casados, ambiguos, resultados = [], [], []
    agora = datetime.now()

    for it in itens:
        cursor.execute("SAVEPOINT gh_item")
        try:
            acao, n_eventos = _gravar_carencia(cursor, it, grupos, agora)
            cursor.execute("RELEASE SAVEPOINT gh_item")
        except Exception as e:
            cursor.execute("ROLLBACK TO SAVEPOINT gh_item")
            resultados.append({'chave': it['chave'], 'ok': False, 'motivo': f'{type(e).__name__}: {e}'})
            continue

        novas += acao == 'nova'
        atualizadas += acao == 'atualizada'
        eventos_novos += n_eventos
        resultados.append({'chave': it['chave'], 'ok': True, 'acao': acao, 'eventos_novos': n_eventos})
        for status, item in it['pendencias']:
            alvo = ambiguos if status == 'ambiguo' else nao_casados
            if item not in alvo:
                alvo.append(item)

    conn.commit()
    cursor.close()
    return {
        'arquivos': [{k: a[k] for k in ('arquivo', 'ano', 'semestre', 'total_carencias')} for a in arquivos],
        'carencias': {'novas': novas, 'atualizadas': atualizadas},
        'eventos_novos': eventos_novos,
        'resultados': resultados,
        'falhas': [r for r in resultados if not r['ok']],
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
