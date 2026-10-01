import copy
import json
import re
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import Mock, patch

import pymupdf as pdf
from mysql.connector.connection import MySQLConnection

import app as api
import ficha_cadastral as ficha


def snapshot():
    return {
        'principal': {'id': 7, 'nome': 'JOÃO TESTE', 'matricula': '0023456X',
                      'cargo': 'PROFESSOR', 'funcao': '', 'carga_horaria': '40h'},
        'complementar': {'matricula': 'MATRICULA-ANTIGA', 'cpf': '00123456789',
                        'naturalidade': 'BRASÍLIA', 'ci_data_emissao': '02/03/2004',
                        'pis_emissao': '04/05/2006', 'readaptado': 'NÃO',
                        'sexo': 'FEMININO', 'telefones': '["(61) 123456789"]'},
        'cargas': [], 'cursos': [], 'habilitacoes': [], 'componentes': [],
    }


class RenderTests(unittest.TestCase):
    def test_complete_selectable_data_and_no_import_identity(self):
        data = snapshot()
        data['cursos'] = [{'id': 1, 'curso': 'CURSO TESTE', 'instituicao': 'ESCOLA',
                           'carga_horaria': 0}]
        original = copy.deepcopy(data)
        with pdf.open(stream=ficha.render(data, datetime(2026, 10, 1)), filetype='pdf') as doc:
            self.assertEqual(len(doc), 1)
            self.assertEqual(tuple(doc[0].rect), (0, 0, 595, 842))
            content = doc[0].get_text()
            for value in ['JOÃO TESTE', '0023456X', '00123456789', 'BRASÍLIA',
                          '02/03/2004', '04/05/2006', '(61) 123456789',
                          'CURSO TESTE', 'Página 1 de 1', '01/10/2026', 'sigep.se.df.gov.br']:
                self.assertIn(value, content)
            self.assertNotIn('MATRICULA-ANTIGA', content)
            self.assertNotIn('null', content)
            self.assertTrue(doc[0].get_images())
            self.assertTrue(any('Helvetica' in font[3] for font in doc[0].get_fonts()))
            self.assertTrue(doc[0].search_for('0'))
        self.assertEqual(data, original)

    def test_timezone_filename_and_blank_fields(self):
        data = snapshot()
        data['principal']['matricula'] = None
        content = ficha.render(data, datetime(2026, 10, 1, 1, tzinfo=timezone.utc))
        self.assertEqual(ficha.filename(data), 'ficha-cadastral-7.pdf')
        with pdf.open(stream=content, filetype='pdf') as doc:
            self.assertIn('30/09/2026', doc[0].get_text())
            # The hidden course title is covered, so validate rendered pixels.
            area = doc[0].get_pixmap(clip=pdf.Rect(20, 567, 575, 590), colorspace=pdf.csGRAY)
            self.assertTrue(all(value == 255 for value in area.samples))

    def test_overflow_all_records_once_and_sorted(self):
        data = snapshot()
        data['cursos'] = [{'id': i, 'curso': f'CURSO-{i:03d}'} for i in range(70, 0, -1)]
        data['habilitacoes'] = [{'id': i, 'habilitacao': f'HAB-{i:03d}'} for i in range(40)]
        data['componentes'] = [{'id': i, 'componente': f'COMP-{i:03d}'} for i in range(31)]
        data['cargas'] = [{'id': i, 'tipo_carga': kind, 'unidade': f'UNIDADE-{kind}-{i}'}
                          for i in range(3) for kind in ['PRINCIPAL', 'SECUNDÁRIA']]
        with pdf.open(stream=ficha.render(data), filetype='pdf') as doc:
            self.assertEqual(len(doc), 3)
            content = '\n'.join(page.get_text() for page in doc)
            for i in range(1, 71):
                self.assertEqual(content.count(f'CURSO-{i:03d}'), 1)
            for i in range(40):
                self.assertEqual(content.count(f'HAB-{i:03d}'), 1)
            for i in range(31):
                self.assertEqual(content.count(f'COMP-{i:03d}'), 1)
            for number, page in enumerate(doc, 1):
                self.assertIn(f'Página {number} de 3', page.get_text())
                self.assertIn('JOÃO TESTE', page.get_text())
                self.assertIn(f'UNIDADE-PRINCIPAL-{number - 1}', page.get_text())
                self.assertIn(f'UNIDADE-SECUNDÁRIA-{number - 1}', page.get_text())
            self.assertLess(content.index('CURSO-001'), content.index('CURSO-002'))

    def test_text_stays_in_cells_and_truncates(self):
        data = snapshot()
        data['principal']['nome'] = 'NOME MUITO LONGO ' * 80
        data['complementar']['readaptado'] = 'SIM ' + 'OBSERVAÇÃO MUITO LONGA ' * 100
        data['complementar']['telefones'] = ['11', '22', '33', '44']
        with pdf.open(stream=ficha.render(data), filetype='pdf') as doc:
            spans = [span for b in doc[0].get_text('dict')['blocks']
                     for line in b.get('lines', []) for span in line['spans']]
            name = next(s for s in spans if s['text'].startswith('NOME MUITO'))
            self.assertGreaterEqual(name['size'], 5)
            self.assertLessEqual(name['bbox'][2], 394.1)
            self.assertTrue(name['text'].endswith('...'))
            observations = [s for s in spans if abs(s['origin'][0] - 95) < 0.1
                            and 125 < s['origin'][1] < 139]
            self.assertEqual(len(observations), 2)
            self.assertTrue(observations[-1]['text'].endswith('...'))
            self.assertLessEqual(observations[-1]['bbox'][3], 139)
            self.assertIn('33, 44', doc[0].get_text())

    def test_artwork_has_no_personal_values(self):
        from assets.build_sigep_template import LABELS
        with pdf.open(ficha.TEMPLATE) as doc:
            spans = [s['text'] for b in doc[0].get_text('dict')['blocks']
                     for line in b.get('lines', []) for s in line['spans']]
            self.assertTrue(set(spans).issubset(LABELS))
            self.assertFalse(re.search(r'\d{5,}|@', doc[0].get_text()))
            self.assertEqual(doc.metadata['author'], '')

    def test_reference_static_positions_and_grids(self):
        root = Path(__file__).resolve().parent.parent / 'sigep'
        if not (root / 'roger.00369004.pdf').exists():
            self.skipTest('Reference PDFs are local SIGEP downloads, not distributed assets')
        with pdf.open(ficha.TEMPLATE) as artwork, pdf.open(root / 'roger.00369004.pdf') as source:
            labels = {span['text']: span for b in artwork[0].get_text('dict')['blocks']
                      for line in b.get('lines', []) for span in line['spans']}
            for b in source[0].get_text('dict')['blocks']:
                for line in b.get('lines', []):
                    for span in line['spans']:
                        if span['text'] in labels:
                            actual = labels[span['text']]
                            # Labels repeated across columns can have several origins.
                            matches = artwork[0].search_for(span['text'])
                            self.assertTrue(any(abs(rect.y0 - span['bbox'][1]) < 1 for rect in matches))
                            self.assertEqual(actual['size'], span['size'])
            rects = [drawing['rect'] for drawing in artwork[0].get_drawings()]
            for drawing in source[0].get_drawings():
                rect = drawing['rect']
                if rect.y0 >= 593 and rect.y1 <= 794:
                    continue
                self.assertTrue(any(all(abs(a - b) < 1 for a, b in zip(rect, actual))
                                    for actual in rects), str(rect))


class SnapshotTests(unittest.TestCase):
    def connection(self, principal=True, complementar=True):
        connection = Mock()
        cursor = connection.cursor.return_value
        cursor.fetchone.side_effect = [snapshot()['principal'] if principal else None,
                                       snapshot()['complementar'] if complementar else None]
        cursor.fetchall.return_value = []
        return connection

    def test_consistent_read_with_ordering_and_cleanup(self):
        connection = self.connection()
        data = ficha.load_snapshot(connection, 7)
        self.assertEqual(data['principal']['id'], 7)
        connection.start_transaction.assert_called_once_with(
            isolation_level='REPEATABLE READ', consistent_snapshot=True)
        queries = connection.cursor.return_value.execute.call_args_list
        self.assertEqual(len(queries), 6)
        self.assertTrue(all('ORDER BY id' in query.args[0] for query in queries[2:]))
        connection.commit.assert_called_once()
        connection.cursor.return_value.close.assert_called_once()

    def test_mariadb_555_handshake_uses_consistent_snapshot(self):
        # Exercise the real connector's version guard, not a mocked start_transaction.
        connection = MySQLConnection()
        connection._server_version = (5, 5, 5)
        cursor = self.connection().cursor.return_value
        with patch.object(connection, 'cursor', return_value=cursor), \
             patch.object(connection, '_execute_query') as execute, \
             patch.object(connection, 'cmd_query') as query, \
             patch.object(connection, 'commit'), patch.object(connection, 'rollback'):
            data = ficha.load_snapshot(connection, 7)
        self.assertEqual(data['principal']['id'], 7)
        execute.assert_called_once_with('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
        query.assert_called_once_with('START TRANSACTION WITH CONSISTENT SNAPSHOT')

    def test_missing_and_db_failure_roll_back(self):
        for connection, error in [(self.connection(principal=False), ficha.MissingProfissional),
                                  (self.connection(complementar=False), ficha.MissingComplementar)]:
            with self.assertRaises(error):
                ficha.load_snapshot(connection, 7)
            connection.rollback.assert_called_once()
            connection.commit.assert_not_called()
            connection.cursor.return_value.close.assert_called_once()
        connection = self.connection()
        connection.cursor.return_value.fetchall.side_effect = RuntimeError('DB unavailable')
        with self.assertRaisesRegex(RuntimeError, 'DB unavailable'):
            ficha.load_snapshot(connection, 7)
        connection.rollback.assert_called_once()


class EndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = api.app.test_client()

    def test_pdf_response_and_cors_filename(self):
        with patch.object(api, 'get_db_connection', return_value=Mock()) as connect, \
             patch.object(ficha, 'load_snapshot', return_value=snapshot()):
            response = self.client.get('/api/profissionais/7/ficha-cadastral.pdf',
                                       headers={'Origin': 'http://localhost:3000'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, 'application/pdf')
        self.assertTrue(response.data.startswith(b'%PDF'))
        self.assertIn('ficha-cadastral-0023456X.pdf', response.headers['Content-Disposition'])
        self.assertEqual(response.headers['Cache-Control'], 'no-store')
        self.assertIn('Content-Disposition', response.headers['Access-Control-Expose-Headers'])
        connect.return_value.close.assert_called_once()

    def test_missing_db_failure_and_render_failure(self):
        for error, status in [(ficha.MissingProfissional(), 404),
                              (ficha.MissingComplementar(), 409), (RuntimeError('DB'), 500)]:
            connection = Mock()
            with patch.object(api, 'get_db_connection', return_value=connection), \
                 patch.object(ficha, 'load_snapshot', side_effect=error), \
                 patch.object(api.app.logger, 'exception'):
                response = self.client.get('/api/profissionais/7/ficha-cadastral.pdf')
            self.assertEqual(response.status_code, status)
            self.assertIn('error', response.json)
            connection.close.assert_called_once()
        with patch.object(api, 'get_db_connection', return_value=None):
            self.assertEqual(self.client.get('/api/profissionais/7/ficha-cadastral.pdf').status_code, 500)
        with patch.object(api, 'get_db_connection', return_value=Mock()), \
             patch.object(ficha, 'load_snapshot', return_value=snapshot()), \
             patch.object(ficha, 'render', side_effect=RuntimeError('render')), \
             patch.object(api.app.logger, 'exception'):
            self.assertEqual(self.client.get('/api/profissionais/7/ficha-cadastral.pdf').status_code, 500)


if __name__ == '__main__':
    unittest.main()
