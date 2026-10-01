"""SIGEP-compatible cadastral PDF, rendered exclusively from a DB snapshot."""
import json
import re
from datetime import datetime
from math import ceil
from pathlib import Path
from zoneinfo import ZoneInfo

import pymupdf as pdf


TEMPLATE = Path(__file__).parent / 'assets' / 'sigep-ficha.pdf'
VALUE_FONT = pdf.Font('helv')
LABEL_FONT = pdf.Font('hebo')
COLLECTIONS = {
    'cargas': 'profissional_cargas_horarias',
    'cursos': 'profissional_cursos',
    'habilitacoes': 'profissional_habilitacoes',
    'componentes': 'profissional_componentes',
}
# (field, x, baseline, right edge). Coordinates are in A4 PDF points.
FIELDS = [
    ('nome', 46, 89.27, 394), ('matricula', 443, 89.27, 489),
    ('admissao', 534, 89.27, 580), ('cargo', 47, 104.27, 184),
    ('funcao', 223, 104.27, 394), ('ref_sal', 435, 104.27, 489),
    ('carga_horaria', 546, 104.27, 580), ('pcd', 111, 119.27, 394),
    ('reducao_ch', 518, 119.27, 580), ('nascimento', 99, 149.27, 144),
    ('cor_raca', 334, 149.27, 393), ('identidade_funcional', 521, 149.27, 580),
    ('naturalidade', 75, 164.27, 287), ('nacionalidade', 353, 164.27, 488),
    ('uf_naturalidade', 518, 164.27, 580), ('ci_numero', 67, 179.27, 144),
    ('ci_orgao', 197, 179.27, 288), ('ci_uf', 323, 179.27, 354),
    ('ci_data_emissao', 448, 179.27, 580), ('cpf', 40, 194.27, 109),
    ('pis_pasep', 167, 194.27, 221), ('pis_emissao', 276, 194.27, 327),
    ('titulo_eleitoral', 395, 194.27, 466), ('titulo_zona', 500, 194.27, 519),
    ('titulo_secao', 558, 194.27, 580), ('estado_civil', 70, 209.27, 144),
    ('conjuge', 229, 209.27, 580), ('pai', 128, 224.27, 580),
    ('mae', 132, 239.27, 580), ('endereco', 60, 254.27, 297),
    ('bairro', 331, 254.27, 427), ('cidade', 461, 254.27, 549),
    ('uf_endereco', 568, 254.27, 580), ('cep', 41, 269.27, 103),
    ('email', 50, 284.27, 580), ('especialidade_concurso', 173, 419.27, 580),
    ('escolaridade_salario', 156, 434.27, 297),
]
COURSE_COLUMNS = [('curso', 15, 222), ('instituicao', 226, 297),
                  ('emissao', 300, 340), ('utilizacao', 344, 508),
                  ('data_utilizacao', 511, 555), ('carga_horaria', 560, 580)]
LIST_CAPACITY = 15
COURSE_CAPACITY = 28


class MissingProfissional(Exception):
    pass


class MissingComplementar(Exception):
    pass


def load_snapshot(connection, profissional_id):
    """One consistent InnoDB read; DB errors propagate instead of yielding blanks."""
    cursor = None
    try:
        # MariaDB may advertise a 5.5.5 compatibility prefix. Connector/Python
        # rejects readonly=True on that handshake before sending any SQL.
        # SELECT-only snapshot needs isolation and consistency, not access-mode SQL.
        connection.start_transaction(isolation_level='REPEATABLE READ',
                                     consistent_snapshot=True)
        cursor = connection.cursor(dictionary=True)
        cursor.execute('SELECT * FROM profissionais WHERE id = %s', (profissional_id,))
        principal = cursor.fetchone()
        if principal is None:
            raise MissingProfissional()
        cursor.execute('SELECT * FROM profissionais_complementar WHERE profissional_id = %s',
                       (profissional_id,))
        complementar = cursor.fetchone()
        if complementar is None:
            raise MissingComplementar()
        snapshot = {'principal': principal, 'complementar': complementar}
        for name, table in COLLECTIONS.items():
            cursor.execute(f'SELECT * FROM {table} WHERE profissional_id = %s ORDER BY id',
                           (profissional_id,))
            snapshot[name] = cursor.fetchall()
        connection.commit()
        return snapshot
    except Exception:
        connection.rollback()
        raise
    finally:
        if cursor is not None:
            cursor.close()


def text(value):
    if value is None:
        return ''
    result = ' '.join(str(value).split())
    return '' if result.lower() == 'null' else result


def _lines(value, width, size, count):
    """Wrap within a fixed cell; binary-search truncation after the final line."""
    remaining = text(value)
    lines = []
    for index in range(count):
        if not remaining:
            break
        if VALUE_FONT.text_length(remaining, fontsize=size) <= width:
            lines.append(remaining)
            remaining = ''
            break
        low, high = 0, len(remaining)
        suffix = '...' if index == count - 1 else ''
        while low < high:
            mid = (low + high + 1) // 2
            if VALUE_FONT.text_length(remaining[:mid] + suffix, fontsize=size) <= width:
                low = mid
            else:
                high = mid - 1
        end = low
        if index < count - 1:
            space = remaining.rfind(' ', 0, end + 1)
            if space > 0:
                end = space
        lines.append(remaining[:end].rstrip() + suffix)
        remaining = remaining[end:].lstrip()
    return lines, bool(remaining)


def _value(page, value, x, baseline, right, size=8, count=1, leading=None):
    value = text(value)
    if not value:
        return
    for candidate in range(round(size * 2), 9, -1):
        chosen = candidate / 2
        lines, overflow = _lines(value, right - x, chosen, count)
        if not overflow:
            break
    spacing = leading if leading is not None else size * 1.164
    for index, line in enumerate(lines):
        page.insert_text((x, baseline + spacing * index), line,
                         fontname='helv', fontsize=chosen)


def _phones(raw):
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            raw = re.split(r'[,;/]', raw)
    return [text(phone) for phone in raw if text(phone)] if isinstance(raw, list) else []


def _carga(page, carga, secondary=False):
    offset = 286 if secondary else 0
    right = 580 if secondary else 297
    _value(page, carga.get('unidade'), 52 + offset, 314.27, right)
    # CRE and external coordination share a 30pt cell in the original report.
    _value(page, carga.get('cre'), (415 if secondary else 129), 329.43,
           580 if secondary else 297, count=2)
    _value(page, carga.get('coord_externa'), 112 + offset, 344.27, right)
    _value(page, carga.get('lotacao'), 105 + offset, 359.43, right, count=2)
    _value(page, carga.get('turno'), 331 if secondary else 47, 389.27, right)
    _value(page, carga.get('atuacao'), 339 if secondary else 54, 404.27, right)


def filename(snapshot):
    identity = text(snapshot['principal'].get('matricula')) or str(snapshot['principal']['id'])
    safe = re.sub(r'[^0-9A-Za-z_-]', '', identity) or str(snapshot['principal']['id'])
    return f'ficha-cadastral-{safe}.pdf'


def render(snapshot, emitted_at=None):
    emitted_at = emitted_at or datetime.now(ZoneInfo('America/Sao_Paulo'))
    if isinstance(emitted_at, datetime) and emitted_at.tzinfo is not None:
        emitted_at = emitted_at.astimezone(ZoneInfo('America/Sao_Paulo'))
    # Complementar has its own matrícula for import matching; the current principal wins.
    values = {**snapshot['complementar'], **snapshot['principal']}
    if re.fullmatch(r'\d+(?:[.,]\d+)?', text(values.get('carga_horaria'))):
        values['carga_horaria'] = text(values['carga_horaria']) + 'h'
    collections = {key: sorted(snapshot.get(key, []), key=lambda row: row.get('id', 0))
                   for key in COLLECTIONS}
    cargas = {'PRINCIPAL': [], 'SECUNDARIA': []}
    for carga in collections['cargas']:
        kind = text(carga.get('tipo_carga')).upper().replace('Á', 'A')
        cargas['SECUNDARIA' if kind == 'SECUNDARIA' else 'PRINCIPAL'].append(carga)
    page_count = max(1, len(cargas['PRINCIPAL']), len(cargas['SECUNDARIA']),
                     ceil(len(collections['habilitacoes']) / LIST_CAPACITY),
                     ceil(len(collections['componentes']) / LIST_CAPACITY),
                     ceil(len(collections['cursos']) / COURSE_CAPACITY))
    with pdf.open(TEMPLATE) as artwork, pdf.open() as document:
        for number in range(page_count):
            courses = collections['cursos'][number * COURSE_CAPACITY:(number + 1) * COURSE_CAPACITY]
            # Copy the page so Helvetica resources stay directly on the page.
            # Nested form resources can otherwise be mistaken for local fonts.
            variant = 0 if courses else 1
            document.insert_pdf(artwork, from_page=variant, to_page=variant)
            page = document[number]
            for name, x, baseline, right in FIELDS:
                _value(page, values.get(name), x, baseline, right)
            readaptado = text(values.get('readaptado'))
            flag = re.match(r'^(SIM|NÃO|NAO)\b\s*(.*)', readaptado, re.IGNORECASE)
            if flag:
                _value(page, flag[1], 70, 134.27, 93)
                _value(page, flag[2], 95, 130.08, 580, size=6, count=2, leading=6.99)
            else:
                _value(page, readaptado, 70, 134.27, 580)
            sexo = text(values.get('sexo')).upper()
            if sexo in ('MASCULINO', 'FEMININO'):
                page.insert_text((174 if sexo == 'MASCULINO' else 235, 149.27),
                                 'X', fontsize=11, fontname='helv')
            phones = _phones(values.get('telefones'))
            for index, (x, right) in enumerate([(150, 297), (341, 427), (473, 580)]):
                value = phones[index] if index < len(phones) else ''
                if index == 2:
                    value = ', '.join(phones[2:])
                _value(page, value, x, 269.27, right)
            for kind, records in cargas.items():
                if number < len(records):
                    _carga(page, records[number], kind == 'SECUNDARIA')
            for key, field, x, baseline, right in [
                ('habilitacoes', 'habilitacao', 17, 460.58, 209),
                ('componentes', 'componente', 377, 461.57, 580),
            ]:
                start = number * LIST_CAPACITY
                for index, row in enumerate(collections[key][start:start + LIST_CAPACITY]):
                    _value(page, row.get(field), x, baseline + index * 7, right, size=6)
            if courses:
                for index, row in enumerate(courses):
                    top = 593 + index * 7
                    for (field, x, right), left, edge in zip(
                            COURSE_COLUMNS, [13, 224, 299, 342, 510, 557],
                            [224, 299, 342, 510, 557, 582]):
                        page.draw_rect(pdf.Rect(left, top, edge, top + 7),
                                       color=(0, 0, 0), fill=(1, 1, 1), width=0.5)
                        _value(page, row.get(field), x, 598.58 + index * 7, right, size=6)
            page.insert_text((13, 826.92), emitted_at.strftime('%d/%m/%Y'),
                             fontsize=7, fontname='hebo')
            label = f'Página {number + 1} de {page_count}'
            width = LABEL_FONT.text_length(label, fontsize=8)
            page.insert_text(((595 - width) / 2, 827.77), label, fontsize=8, fontname='hebo')
        document.set_metadata({'title': 'Ficha cadastral', 'creator': 'Folha de Ponto'})
        return document.tobytes(garbage=4, deflate=True)
