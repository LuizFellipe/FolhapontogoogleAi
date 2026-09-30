import os
import unittest
from datetime import date, datetime

import gh_sync as g


class ParseTests(unittest.TestCase):
    def test_substituto_com_cpf_matricula_e_alfanumerica(self):
        self.assertEqual(g.parse_substituto('NAZARENI SOUTO BRAGA (88186300163)'), ('NAZARENI SOUTO BRAGA', '88186300163'))
        self.assertEqual(g.parse_substituto('ANA RAQUEL LIRA VIEIRA (02127326)'), ('ANA RAQUEL LIRA VIEIRA', '02127326'))
        self.assertEqual(g.parse_substituto('EDSON PEREIRA PIRES (0038092X)'), ('EDSON PEREIRA PIRES', '0038092X'))
        self.assertEqual(g.parse_substituto(None), (None, None))
        self.assertEqual(g.parse_substituto('SEM DOC'), ('SEM DOC', None))

    def test_cod_pai(self):
        self.assertEqual(g.parse_cod_pai('51868'), '51868')
        self.assertEqual(g.parse_cod_pai('68729 - PATRICIA SANTIAGO MARQUES (20033311)'), '68729')
        self.assertIsNone(g.parse_cod_pai(None))
        self.assertIsNone(g.parse_cod_pai('sem numero'))

    def test_periodo_e_datas(self):
        self.assertEqual(g.parse_periodo('11/05/2026 a 22/05/2026'), (date(2026, 5, 11), date(2026, 5, 22)))
        self.assertEqual(g.parse_periodo('lixo'), (None, None))
        self.assertEqual(g.parse_data_hora('27/05/2026 08:14:22'), datetime(2026, 5, 27, 8, 14, 22))
        self.assertIsNone(g.parse_data_hora('--'))

    def test_traco_duplo_vira_none(self):
        self.assertIsNone(g._vazio('--'))
        self.assertIsNone(g._vazio('  '))
        self.assertEqual(g._vazio('texto'), 'texto')


class CasamentoTests(unittest.TestCase):
    def setUp(self):
        profs = [
            {'id': 1, 'nome': 'Sheila Vieira Coutinho', 'matricula': '0123456'},
            {'id': 2, 'nome': 'JOSÉ SILVA', 'matricula': '777'},
            {'id': 3, 'nome': 'Jose  Silva', 'matricula': '888'},  # homônimo
            {'id': 4, 'nome': 'EDSON PEREIRA PIRES', 'matricula': '0038092X'},
            {'id': 5, 'nome': 'NAZARENI SOUTO BRAGA', 'matricula': None},
        ]
        self.idx = g.indexar_profissionais(profs, {5: '881.863.001-63'})

    def casar(self, nome, doc=None):
        return g.casar_profissional(nome, doc, *self.idx)

    def test_nome_normalizado(self):
        self.assertEqual(self.casar('SHEILA VIEIRA COUTINHO'), (1, 'casado'))

    def test_homonimo_e_ambiguo(self):
        self.assertEqual(self.casar('JOSE SILVA'), (None, 'ambiguo'))

    def test_doc_desambigua_homonimo(self):
        self.assertEqual(self.casar('JOSE SILVA', '888'), (3, 'casado'))

    def test_matricula_alfanumerica(self):
        self.assertEqual(self.casar('QUALQUER', '0038092X'), (4, 'casado'))

    def test_cpf_do_complementar(self):
        self.assertEqual(self.casar('NOME DIFERENTE', '88186300163'), (5, 'casado'))

    def test_nao_casado(self):
        self.assertEqual(self.casar('FULANO INEXISTENTE', '999'), (None, 'nao_casado'))
        self.assertEqual(self.casar(None), (None, 'nao_casado'))


class GruposEMotivosTests(unittest.TestCase):
    def test_grupos_none_liga_todos_e_ignora_invalidos(self):
        self.assertEqual(g.normalizar_grupos(None), set(g.GRUPOS_TODOS))
        self.assertEqual(g.normalizar_grupos(['situacao', 'xpto']), {'situacao'})
        self.assertEqual(g.normalizar_grupos([]), set())

    def test_campos_dos_grupos(self):
        self.assertEqual(g.campos_dos_grupos({'situacao'}), ['situacao'])
        self.assertEqual(g.campos_dos_grupos({'historico'}), [])
        self.assertIn('substituto_profissional_id', g.campos_dos_grupos({'pessoas'}))

    def test_chave_carencia(self):
        self.assertEqual(g.chave_carencia(2026, 1, '123'), '2026.1.123')

    def test_motivos(self):
        d = lambda campo, a, b: {'campo': campo, 'antes': a, 'depois': b}
        self.assertEqual(g.motivos_da_divergencia([d('situacao', 'A', 'B')], 0), ['situacao_mudou'])
        self.assertEqual(g.motivos_da_divergencia([d('substituto_profissional_id', None, 7)], 0), ['servidor_vinculado'])
        self.assertEqual(g.motivos_da_divergencia([d('substituto_profissional_id', 7, None)], 0), ['servidor_desvinculado'])
        self.assertEqual(g.motivos_da_divergencia([d('substituto_profissional_id', 7, 8)], 0), ['pessoas_mudaram'])
        self.assertEqual(g.motivos_da_divergencia([d('substituto_nome', 'A', 'B'), d('titular_nome', 'C', 'D')], 0), ['pessoas_mudaram'])
        self.assertEqual(g.motivos_da_divergencia([d('periodo', 'x', 'y')], 2), ['dados_mudaram', 'eventos_novos'])
        self.assertEqual(g.motivos_da_divergencia([], 0), [])


class ArquivosRealTests(unittest.TestCase):
    def test_lista_arquivos_de_carencias(self):
        if not os.path.isdir(g.GH_DIR):
            self.skipTest('pasta gh/ ausente')
        arqs = g.listar_arquivos()
        self.assertTrue(all(not a['arquivo'].endswith('.historico.json') for a in arqs))
        self.assertTrue(all(a['ano'] and a['semestre'] for a in arqs))


if __name__ == '__main__':
    unittest.main()
