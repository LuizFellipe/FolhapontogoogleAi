#!/usr/bin/env python3
"""
Backend API para Folha de Ponto
Sistema de gerenciamento de folhas de ponto com persistência MySQL
"""

import json
import os
import sys
import re
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error

# Carregar variáveis de ambiente
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuração do banco de dados
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'folhaponto_user'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'folhaponto_db'),
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci'
}

def get_db_connection():
    """Estabelece conexão com o banco de dados"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Erro ao conectar ao MySQL: {e}")
        return None

def execute_query(query, params=None, fetch=True, return_lastrowid=False):
    """Executa uma query no banco de dados"""
    connection = get_db_connection()
    if not connection:
        return None
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute(query, params)
        
        if fetch:
            result = cursor.fetchall()
            # Converter objetos datetime/timedelta para strings serializáveis
            for row in result:
                for key, value in row.items():
                    if hasattr(value, 'strftime'):  # datetime objects
                        row[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                    elif hasattr(value, 'total_seconds'):  # timedelta objects
                        row[key] = str(value)
            return result
        else:
            connection.commit()
            if return_lastrowid:
                return cursor.lastrowid
            return True
    except Error as e:
        print(f"Erro na query: {e}")
        if not fetch:
            connection.rollback()
        if e.errno == 1062:  # Duplicate entry -> repropaga pro caller tratar
            raise
        return None
    finally:
        cursor.close()
        connection.close()

# Rotas para Profissionais
@app.route('/api/profissionais', methods=['GET'])
def get_profissionais():
    """Lista todos os profissionais"""
    query = "SELECT * FROM profissionais ORDER BY nome"
    profissionais = execute_query(query)
    return jsonify(profissionais or [])

@app.route('/api/profissionais', methods=['POST'])
def create_profissional():
    """Cria um novo profissional"""
    data = request.get_json()
    
    # Validar campo nome obrigatório
    if not data.get('nome'):
        return jsonify({'error': 'Campo nome é obrigatório'}), 400
    
    query = """
    INSERT INTO profissionais (nome, matricula, cargo, disciplina, ua, exercicio, carga_horaria, funcao, unidade_lotacao, status, turno1, turno2)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    params = (
        data.get('nome'),
        data.get('matricula') or None,  # Permitir NULL
        data.get('cargo'),
        data.get('disciplina'),
        data.get('ua'),
        data.get('exercicio'),
        data.get('carga_horaria'),
        data.get('funcao'),
        data.get('unidade_lotacao'),
        data.get('status') or 'ATIVO',
        data.get('turno1'),
        data.get('turno2')
    )

    try:
        result = execute_query(query, params, fetch=False, return_lastrowid=True)
        if result:
            return jsonify({'id': result, 'message': 'Profissional criado com sucesso'}), 201
        return jsonify({'error': 'Erro ao criar profissional'}), 500
    except Error as e:
        if e.errno == 1062:
            return jsonify({'error': f'Matrícula "{data.get("matricula")}" já está cadastrada no sistema'}), 400
        return jsonify({'error': f'Erro ao criar profissional: {e}'}), 500

@app.route('/api/profissionais/<int:id>', methods=['GET'])
def get_profissional(id):
    """Busca um profissional por ID"""
    query = "SELECT * FROM profissionais WHERE id = %s"
    profissional = execute_query(query, (id,))
    
    if profissional:
        return jsonify(profissional[0])
    return jsonify({'error': 'Profissional não encontrado'}), 404

@app.route('/api/profissionais/<int:id>', methods=['PUT'])
def update_profissional(id):
    """Atualiza um profissional"""
    data = request.get_json()
    
    # Validar campos obrigatórios
    if not data.get('nome'):
        return jsonify({'error': 'Campo nome é obrigatório'}), 400
    
    query = """
    UPDATE profissionais
    SET nome = %s, matricula = %s, cargo = %s, disciplina = %s, ua = %s, exercicio = %s,
        carga_horaria = %s, funcao = %s, unidade_lotacao = %s, status = %s, turno1 = %s, turno2 = %s
    WHERE id = %s
    """

    params = (
        data.get('nome'),
        data.get('matricula') or None,  # Permitir NULL
        data.get('cargo'),
        data.get('disciplina'),
        data.get('ua'),
        data.get('exercicio'),
        data.get('carga_horaria'),
        data.get('funcao'),
        data.get('unidade_lotacao'),
        data.get('status') or 'ATIVO',
        data.get('turno1'),
        data.get('turno2'),
        id
    )
    
    try:
        result = execute_query(query, params, fetch=False)
        if result:
            return jsonify({'message': 'Profissional atualizado com sucesso'})
        return jsonify({'error': 'Erro ao atualizar profissional'}), 500
    except Error as e:
        if e.errno == 1062:
            return jsonify({'error': f'Matrícula "{data.get("matricula")}" já está em uso por outro profissional'}), 400
        return jsonify({'error': f'Erro ao atualizar profissional: {e}'}), 500

@app.route('/api/profissionais/<int:id>', methods=['DELETE'])
def delete_profissional(id):
    """Exclui um profissional"""
    query = "DELETE FROM profissionais WHERE id = %s"
    result = execute_query(query, (id,), fetch=False)
    
    if result:
        return jsonify({'message': 'Profissional excluído com sucesso'})
    return jsonify({'error': 'Erro ao excluir profissional'}), 500

# Rotas para Folhas de Ponto
@app.route('/api/folhas-ponto', methods=['GET'])
def get_folhas_ponto():
    """Lista todas as folhas de ponto"""
    profissional_id = request.args.get('profissional_id')
    mes = request.args.get('mes')
    ano = request.args.get('ano')
    
    query = """
    SELECT f.*, p.nome as profissional_nome, p.nome, p.matricula, p.disciplina
    FROM folhas_ponto f
    JOIN profissionais p ON f.profissional_id = p.id
    WHERE 1=1
    """
    
    params = []
    if profissional_id:
        query += " AND f.profissional_id = %s"
        params.append(profissional_id)
    if mes:
        query += " AND f.mes = %s"
        params.append(mes)
    if ano:
        query += " AND f.ano = %s"
        params.append(ano)
    
    query += " ORDER BY f.ano DESC, f.mes DESC, p.nome"
    
    folhas_ponto = execute_query(query, params)
    return jsonify(folhas_ponto or [])

@app.route('/api/folhas-ponto', methods=['POST'])
def create_folha_ponto():
    """Cria uma nova folha de ponto"""
    data = request.get_json()
    
    # Validar campos obrigatórios
    if not data.get('profissional_id') or data.get('mes') is None or data.get('ano') is None:
        return jsonify({'error': 'Campos profissional_id, mes e ano são obrigatórios'}), 400
    
    query = """
    INSERT INTO folhas_ponto (profissional_id, mes, ano, observacoes)
    VALUES (%s, %s, %s, %s)
    """
    
    params = (
        data.get('profissional_id'),
        data.get('mes'),
        data.get('ano'),
        data.get('observacoes')
    )
    
    result = execute_query(query, params, fetch=False, return_lastrowid=True)
    if result:
        return jsonify({'id': result, 'message': 'Folha de ponto criada com sucesso'}), 201
    return jsonify({'error': 'Erro ao criar folha de ponto'}), 500

@app.route('/api/folhas-ponto/<int:id>', methods=['GET'])
def get_folha_ponto(id):
    """Busca uma folha de ponto completa com lançamentos e resumo"""
    # Buscar folha de ponto
    folha_query = """
    SELECT f.*, p.nome as profissional_nome, p.nome, p.matricula, p.cargo, p.disciplina, p.ua,
           p.exercicio, p.carga_horaria, p.funcao, p.unidade_lotacao, p.status, p.turno1, p.turno2
    FROM folhas_ponto f
    JOIN profissionais p ON f.profissional_id = p.id
    WHERE f.id = %s
    """
    folha = execute_query(folha_query, (id,))
    
    if not folha:
        return jsonify({'error': 'Folha de ponto não encontrada'}), 404
    
    # Buscar lançamentos diários
    lancamentos_query = "SELECT * FROM lancamentos_diarios WHERE folha_ponto_id = %s ORDER BY dia"
    lancamentos = execute_query(lancamentos_query, (id,))
    
    # Buscar resumo
    resumo_query = "SELECT * FROM resumo_folha WHERE folha_ponto_id = %s ORDER BY id"
    resumo = execute_query(resumo_query, (id,))
    
    result = {
        'folha_ponto': folha[0],
        'lancamentos': lancamentos or [],
        'resumo': resumo or []
    }
    
    return jsonify(result)

@app.route('/api/folhas-ponto/<int:id>', methods=['PUT'])
def update_folha_ponto(id):
    """Atualiza uma folha de ponto"""
    data = request.get_json()
    
    query = """
    UPDATE folhas_ponto 
    SET profissional_id = %s, mes = %s, ano = %s, observacoes = %s
    WHERE id = %s
    """
    
    params = (
        data.get('profissional_id'),
        data.get('mes'),
        data.get('ano'),
        data.get('observacoes'),
        id
    )
    
    result = execute_query(query, params, fetch=False)
    if result:
        return jsonify({'message': 'Folha de ponto atualizada com sucesso'})
    return jsonify({'error': 'Erro ao atualizar folha de ponto'}), 500

@app.route('/api/folhas-ponto/<int:id>', methods=['DELETE'])
def delete_folha_ponto(id):
    """Exclui uma folha de ponto (e todos os lançamentos relacionados)"""
    query = "DELETE FROM folhas_ponto WHERE id = %s"
    result = execute_query(query, (id,), fetch=False)
    
    if result:
        return jsonify({'message': 'Folha de ponto excluída com sucesso'})
    return jsonify({'error': 'Erro ao excluir folha de ponto'}), 500

# Rotas para Lançamentos Diários
@app.route('/api/folhas-ponto/<int:folha_ponto_id>/lancamentos', methods=['POST'])
def create_lancamentos_diarios(folha_ponto_id):
    """Cria ou atualiza lançamentos diários em lote"""
    data = request.get_json()
    lancamentos = data.get('lancamentos', [])
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco'}), 500
    
    try:
        cursor = connection.cursor()
        
        # Excluir lançamentos existentes
        cursor.execute("DELETE FROM lancamentos_diarios WHERE folha_ponto_id = %s", (folha_ponto_id,))
        
        # Inserir novos lançamentos
        for lancamento in lancamentos:
            query = """
            INSERT INTO lancamentos_diarios
            (folha_ponto_id, dia, tipo, tipo_turno2)
            VALUES (%s, %s, %s, %s)
            """
            params = (
                folha_ponto_id,
                lancamento.get('dia'),
                lancamento.get('tipo'),
                lancamento.get('tipo_turno2'),
            )
            cursor.execute(query, params)
        
        connection.commit()
        cursor.close()
        return jsonify({'message': 'Lançamentos salvos com sucesso'})
    
    except Error as e:
        connection.rollback()
        return jsonify({'error': f'Erro ao salvar lançamentos: {e}'}), 500
    finally:
        connection.close()

# Rotas para Resumo
@app.route('/api/folhas-ponto/<int:folha_ponto_id>/resumo', methods=['POST'])
def create_resumo_folha(folha_ponto_id):
    """Cria ou atualiza entradas de resumo em lote"""
    data = request.get_json()
    resumo_entries = data.get('resumo_entries', [])
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco'}), 500
    
    try:
        cursor = connection.cursor()
        
        # Excluir resumo existente
        cursor.execute("DELETE FROM resumo_folha WHERE folha_ponto_id = %s", (folha_ponto_id,))
        
        # Inserir novo resumo
        for entry in resumo_entries:
            query = """
            INSERT INTO resumo_folha 
            (folha_ponto_id, operacao, codigo, carga, meses, horas_dias, dia_inicio, dia_fim)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            params = (
                folha_ponto_id,
                entry.get('operacao'),
                entry.get('codigo'),
                entry.get('carga'),
                entry.get('meses'),
                entry.get('horas_dias'),
                entry.get('dia_inicio'),
                entry.get('dia_fim')
            )
            cursor.execute(query, params)
        
        connection.commit()
        cursor.close()
        return jsonify({'message': 'Resumo salvo com sucesso'})
    
    except Error as e:
        connection.rollback()
        return jsonify({'error': f'Erro ao salvar resumo: {e}'}), 500
    finally:
        connection.close()

# Rotas para Feriados
@app.route('/api/feriados', methods=['GET'])
def get_feriados():
    """Lista todos os feriados, opcionalmente filtrados por ano"""
    ano = request.args.get('ano')
    query = "SELECT * FROM feriados"
    params = []
    
    if ano:
        query += " WHERE ano = %s"
        params.append(ano)
        
    query += " ORDER BY ano DESC, mes, dia"
    
    feriados = execute_query(query, params)
    return jsonify(feriados or [])

@app.route('/api/feriados', methods=['POST'])
def create_feriado():
    """Cria um novo feriado"""
    data = request.get_json()
    
    query = """
    INSERT INTO feriados (dia, mes, ano, label)
    VALUES (%s, %s, %s, %s)
    """
    
    params = (
        data.get('dia'),
        data.get('mes'),
        data.get('ano'),
        data.get('label')
    )
    
    try:
        result = execute_query(query, params, fetch=False, return_lastrowid=True)
        if result:
            return jsonify({'id': result, 'message': 'Feriado criado com sucesso'}), 201
        return jsonify({'error': 'Erro ao criar feriado'}), 500
    except Exception as e:
        # Pega erro de duplicidade
        if 'Duplicate entry' in str(e):
            return jsonify({'error': 'Já existe um feriado para esta data.'}), 400
        return jsonify({'error': f'Erro ao criar feriado: {e}'}), 500

@app.route('/api/feriados/<int:id>', methods=['DELETE'])
def delete_feriado(id):
    """Exclui um feriado"""
    query = "DELETE FROM feriados WHERE id = %s"
    result = execute_query(query, (id,), fetch=False)
    
    if result:
        return jsonify({'message': 'Feriado excluído com sucesso'})
    return jsonify({'error': 'Erro ao excluir feriado'}), 500

# Rotas para Recessos
@app.route('/api/recessos', methods=['GET'])
def get_recessos():
    """Lista todos os recessos, opcionalmente filtrados por ano"""
    ano = request.args.get('ano')
    query = "SELECT * FROM recessos"
    params = []

    if ano:
        query += " WHERE ano_inicio = %s OR ano_fim = %s"
        params.extend([ano, ano])

    query += " ORDER BY ano_inicio DESC, mes_inicio, dia_inicio"

    recessos = execute_query(query, params)
    return jsonify(recessos or [])

@app.route('/api/recessos', methods=['POST'])
def create_recesso():
    """Cria um novo recesso"""
    data = request.get_json()

    query = """
    INSERT INTO recessos (dia_inicio, mes_inicio, ano_inicio, dia_fim, mes_fim, ano_fim, label)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    """

    params = (
        data.get('dia_inicio'),
        data.get('mes_inicio'),
        data.get('ano_inicio'),
        data.get('dia_fim'),
        data.get('mes_fim'),
        data.get('ano_fim'),
        data.get('label')
    )

    try:
        result = execute_query(query, params, fetch=False, return_lastrowid=True)
        if result:
            return jsonify({'id': result, 'message': 'Recesso criado com sucesso'}), 201
        return jsonify({'error': 'Erro ao criar recesso'}), 500
    except Error as e:
        if e.errno == 1062:
            return jsonify({'error': 'Já existe um recesso com esse período.'}), 400
        return jsonify({'error': f'Erro ao criar recesso: {e}'}), 500

@app.route('/api/recessos/<int:id>', methods=['DELETE'])
def delete_recesso(id):
    """Exclui um recesso"""
    query = "DELETE FROM recessos WHERE id = %s"
    result = execute_query(query, (id,), fetch=False)

    if result:
        return jsonify({'message': 'Recesso excluído com sucesso'})
    return jsonify({'error': 'Erro ao excluir recesso'}), 500

# Rota de Relatório — consulta view vw_adicional_noturno
@app.route('/api/relatorio/adicional-noturno', methods=['GET'])
def get_relatorio_adicional_noturno():
    """Retorna dados de adicional noturno consultando a view vw_adicional_noturno"""
    mes = request.args.get('mes')
    ano = request.args.get('ano')

    if mes is None or ano is None:
        return jsonify({'error': 'Parâmetros mes e ano são obrigatórios'}), 400

    query = """
    SELECT *
    FROM vw_adicional_noturno
    WHERE mes = %s AND ano = %s
    ORDER BY nome, dia
    """

    rows = execute_query(query, (mes, ano))
    return jsonify(rows or [])

# Rota de Relatório — consulta view vw_folhas_lancamento
@app.route('/api/relatorio/lancamentos', methods=['GET'])
def get_relatorio_lancamentos():
    """Retorna todos os lançamentos do período consultando a view vw_folhas_lancamento"""
    mes = request.args.get('mes')
    ano = request.args.get('ano')

    if mes is None or ano is None:
        return jsonify({'error': 'Parâmetros mes e ano são obrigatórios'}), 400

    query = """
    SELECT *
    FROM vw_folhas_lancamento
    WHERE mes = %s AND ano = %s
    ORDER BY nome, dia
    """

    rows = execute_query(query, (mes, ano))
    return jsonify(rows or [])

# Rota de Relatório — Resumo anual de ocorrências por profissional
@app.route('/api/relatorio/resumo', methods=['GET'])
def get_relatorio_resumo():
    """Totaliza lançamentos por profissional de janeiro até hoje, excluindo RECESSO/TRABALHO/FERIAS"""
    ano = request.args.get('ano')
    if ano is None:
        return jsonify({'error': 'Parâmetro ano é obrigatório'}), 400

    from datetime import date as _date
    hoje = _date.today()

    query = """
    SELECT t.nome, t.matricula, t.tipo, COUNT(*) AS total
    FROM (
        SELECT nome, matricula, ano, mes, dia, tipo
        FROM vw_folhas_lancamento
        WHERE tipo IS NOT NULL AND tipo != ''
          AND tipo NOT IN ('RECESSO','TRABALHO','FERIAS','FERIADO')
        UNION
        SELECT nome, matricula, ano, mes, dia, tipo_turno2
        FROM vw_folhas_lancamento
        WHERE tipo_turno2 IS NOT NULL AND tipo_turno2 != ''
          AND tipo_turno2 NOT IN ('RECESSO','TRABALHO','FERIAS','FERIADO')
    ) t
    WHERE t.ano = %s
      AND (t.mes < %s OR (t.mes = %s AND t.dia <= %s))
    GROUP BY t.nome, t.matricula, t.tipo
    ORDER BY t.nome, t.tipo
    """

    rows = execute_query(query, (ano, hoje.month, hoje.month, hoje.day))
    return jsonify(rows or [])

# Tipos de lançamento
@app.route('/api/tipos-lancamento', methods=['GET'])
def get_tipos_lancamento():
    rows = execute_query(
        "SELECT valor, label, codigo FROM tipos_lancamento ORDER BY label"
    )
    return jsonify(rows or [])

# Rota — checagem de atestados por bimestre civil
@app.route('/api/atestados-bimestrais', methods=['GET'])
def get_atestados_bimestrais():
    """Retorna contagem de ATESTADO MEDICO DE ATE 03 por bimestre civil para um profissional/ano.
    Consulta a view vw_relatorio_atestados_bimestrais (conta sequências consecutivas como 1 ocorrência).
    Parâmetros: matricula (string), ano (int)
    """
    matricula = request.args.get('matricula')
    ano = request.args.get('ano')

    if not matricula or not ano:
        return jsonify({'error': 'Parâmetros matricula e ano são obrigatórios'}), 400

    query = """
    SELECT bimestre1, bimestre2, bimestre3, bimestre4, bimestre5, bimestre6
    FROM vw_relatorio_atestados_bimestrais
    WHERE matricula = %s AND ano = %s
    """

    rows = execute_query(query, (matricula, ano))

    if rows:
        # Converter Decimal (retorno do SUM do MySQL) para int para evitar serialização como string
        row = {k: int(v) for k, v in rows[0].items()}
        return jsonify(row)

    # Profissional sem nenhum atestado no ano → retorna zeros
    return jsonify({
        'bimestre1': 0, 'bimestre2': 0, 'bimestre3': 0,
        'bimestre4': 0, 'bimestre5': 0, 'bimestre6': 0
    })

# Rota — checagem de atestados de comparecimento por ano
@app.route('/api/atestados-comparecimento', methods=['GET'])
def get_atestados_comparecimento():
    """Retorna contagem mensal de ATESTADO DE COMPARECIMENTO (e ACOMPANHANTE) para um profissional/ano.
    Consulta a view vw_relatorio_atestados_comparecimento (cada dia conta como 1 ocorrência).
    Parâmetros: matricula (string), ano (int)
    """
    matricula = request.args.get('matricula')
    ano = request.args.get('ano')

    if not matricula or not ano:
        return jsonify({'error': 'Parâmetros matricula e ano são obrigatórios'}), 400

    query = """
    SELECT mes0, mes1, mes2, mes3, mes4, mes5, mes6, mes7, mes8, mes9, mes10, mes11
    FROM vw_relatorio_atestados_comparecimento
    WHERE matricula = %s AND ano = %s
    """

    rows = execute_query(query, (matricula, ano))

    if rows:
        # Converter Decimal (retorno do SUM do MySQL) para int para evitar serialização como string
        row = {k: int(v) for k, v in rows[0].items()}
        return jsonify(row)

    # Profissional sem nenhum comparecimento no ano → retorna zeros
    return jsonify({f'mes{i}': 0 for i in range(12)})

# Rota para leitura dos dados extraídos do EducaSync
@app.route('/api/educasync/dados', methods=['GET'])
def get_educasync_dados():
    """Retorna os dados cadastrais extraídos pelo EducaSync a partir do JSON."""
    candidatos = [
        os.path.join(os.path.dirname(os.path.dirname(__file__)), 'docs', 'dados_folha_ponto.json'),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), 'educasync', 'dados_folha_ponto.json')
    ]
    for caminho in candidatos:
        if os.path.exists(caminho):
            try:
                with open(caminho, 'r', encoding='utf-8') as f:
                    dados = json.load(f)
                return jsonify({'origem': os.path.basename(caminho), 'total': len(dados), 'dados': dados})
            except Exception as e:
                return jsonify({'error': f'Erro ao ler arquivo JSON: {e}'}), 500
                
    return jsonify({'error': 'Arquivo dados_folha_ponto.json não encontrado'}), 404

# Helpers para dados complementares do SIGEP
def _norm_mat(mat):
    if not mat:
        return ''
    return re.sub(r'[^0-9A-Za-z]', '', str(mat)).upper().lstrip('0')

def _find_latest_sigep_json():
    sigep_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'sigep')
    if not os.path.exists(sigep_dir):
        return None
    files = [f for f in os.listdir(sigep_dir) if f.startswith('ficha.cadastral.') and f.endswith('.json')]
    if not files:
        return None
    # Nome é DD.MM.YYYY: ordenar como YYYYMMDD (string pura erra na virada de mês)
    return os.path.join(sigep_dir, max(files, key=lambda f: ''.join(reversed(f.split('.')[2:5]))))

def _group_by_mat(rows):
    grupos = {}
    for r in rows:
        m = _norm_mat(r.get('matricula'))
        if m:
            grupos.setdefault(m, []).append(r)
    return grupos

# Colunas de profissionais_complementar (exceto profissional_id), fonte única p/ sync e PUT
COMP_COLS = [
    'matricula', 'admissao', 'ref_sal', 'pcd', 'reducao_ch', 'readaptado', 'identidade_funcional',
    'nascimento', 'sexo', 'cor_raca', 'naturalidade', 'nacionalidade', 'uf_naturalidade',
    'ci_numero', 'ci_orgao', 'ci_uf', 'ci_data_emissao', 'cpf', 'pis_pasep', 'pis_emissao',
    'titulo_eleitoral', 'titulo_zona', 'titulo_secao', 'estado_civil', 'conjuge', 'pai', 'mae',
    'endereco', 'bairro', 'cidade', 'uf_endereco', 'cep', 'telefones', 'email',
    'especialidade_concurso', 'escolaridade_salario', 'arquivo_origem',
]

def _upsert_complementar(prof_id, src, cols=COMP_COLS):
    """Retorna (sql, params) do upsert em profissionais_complementar (profissional_id é UNIQUE)."""
    telefones = src.get('telefones')
    vals = {**src, 'telefones': json.dumps(telefones if isinstance(telefones, list) else [], ensure_ascii=False)}
    sql = (
        f"INSERT INTO profissionais_complementar (profissional_id, {', '.join(cols)}) "
        f"VALUES (%s{', %s' * len(cols)}) "
        f"ON DUPLICATE KEY UPDATE {', '.join(f'{c} = VALUES({c})' for c in cols)}"
    )
    return sql, (prof_id, *(vals.get(c) for c in cols))

# Rotas SIGEP e Dados Complementares
@app.route('/api/sigep/fichas-cadastrais', methods=['GET'])
def get_sigep_fichas_cadastrais():
    """Retorna os dados cadastrais complementares do SIGEP a partir do JSON mais recente."""
    caminho = _find_latest_sigep_json()
    if not caminho or not os.path.exists(caminho):
        return jsonify({'error': 'Nenhum arquivo ficha.cadastral.*.json encontrado na pasta sigep'}), 404

    try:
        with open(caminho, 'r', encoding='utf-8') as f:
            dados = json.load(f)
        return jsonify({
            'origem': os.path.basename(caminho),
            'metadados': dados.get('metadados', {}),
            'tabelas': dados.get('tabelas', {})
        })
    except Exception as e:
        return jsonify({'error': f'Erro ao ler arquivo JSON do SIGEP: {e}'}), 500

@app.route('/api/sigep/sincronizar', methods=['POST'])
def sincronizar_sigep():
    """
    Sincroniza os dados complementares do SIGEP para o banco MySQL com upsert inteligente.
    Pode receber lista de matrículas selecionadas via body {"matriculas": ["..."]}.
    """
    body = request.get_json(silent=True) or {}
    filtro_matriculas = body.get('matriculas')
    if filtro_matriculas:
        filtro_set = {_norm_mat(m) for m in filtro_matriculas if m}
    else:
        filtro_set = None

    caminho = _find_latest_sigep_json()
    if not caminho:
        return jsonify({'error': 'Nenhum arquivo ficha.cadastral.*.json encontrado para sincronizar'}), 404

    try:
        with open(caminho, 'r', encoding='utf-8') as f:
            dados_sigep = json.load(f)
    except Exception as e:
        return jsonify({'error': f'Erro ao ler JSON: {e}'}), 500

    tabelas = dados_sigep.get('tabelas', {})
    servidores_json = tabelas.get('servidores', [])
    cargas_por_mat = _group_by_mat(tabelas.get('cargas_horarias', []))
    cursos_por_mat = _group_by_mat(tabelas.get('cursos_progressoes', []))
    habs_por_mat = _group_by_mat(tabelas.get('habilitacoes', []))
    comps_por_mat = _group_by_mat(tabelas.get('componentes_curriculares', []))

    # Obter profissionais do banco para relacionar por matrícula
    profissionais_db = execute_query("SELECT id, matricula, nome FROM profissionais") or []
    db_por_mat = {}
    for p in profissionais_db:
        m_db = _norm_mat(p.get('matricula'))
        if m_db:
            db_por_mat[m_db] = p

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Falha na conexão com banco de dados'}), 500

    cursor = conn.cursor()
    sincronizados = 0
    nao_encontrados = []

    try:
        for s in servidores_json:
            raw_mat = s.get('matricula')
            mat_norm = _norm_mat(raw_mat)
            if not mat_norm:
                continue

            if filtro_set is not None and mat_norm not in filtro_set:
                continue

            prof = db_por_mat.get(mat_norm)
            if not prof:
                nao_encontrados.append({
                    'matricula': raw_mat,
                    'nome': s.get('nome')
                })
                continue

            prof_id = prof['id']
            # 1. Upsert na tabela profissionais_complementar
            cursor.execute(*_upsert_complementar(prof_id, {**s, 'matricula': raw_mat}))

            # 2. Atualizar tabelas 1:N (apagar registros anteriores do profissional e reinserir)
            cursor.execute("DELETE FROM profissional_cargas_horarias WHERE profissional_id = %s", (prof_id,))
            for cg in cargas_por_mat.get(mat_norm, []):
                cursor.execute("""
                    INSERT INTO profissional_cargas_horarias
                    (profissional_id, tipo_carga, unidade, cre, coord_externa, lotacao, turno, atuacao)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    prof_id, cg.get('tipo_carga') or 'PRINCIPAL', cg.get('unidade'),
                    cg.get('cre'), cg.get('coord_externa'), cg.get('lotacao'), cg.get('turno'), cg.get('atuacao')
                ))

            cursor.execute("DELETE FROM profissional_cursos WHERE profissional_id = %s", (prof_id,))
            for cr in cursos_por_mat.get(mat_norm, []):
                try:
                    ch_val = int(cr['carga_horaria'])
                except (KeyError, TypeError, ValueError):
                    ch_val = None
                cursor.execute("""
                    INSERT INTO profissional_cursos
                    (profissional_id, curso, instituicao, emissao, utilizacao, data_utilizacao, carga_horaria)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    prof_id, cr.get('curso') or '', cr.get('instituicao'),
                    cr.get('emissao'), cr.get('utilizacao'), cr.get('data_utilizacao'), ch_val
                ))

            cursor.execute("DELETE FROM profissional_habilitacoes WHERE profissional_id = %s", (prof_id,))
            cursor.executemany(
                "INSERT INTO profissional_habilitacoes (profissional_id, habilitacao) VALUES (%s, %s)",
                [(prof_id, hb.get('habilitacao') or '') for hb in habs_por_mat.get(mat_norm, [])])

            cursor.execute("DELETE FROM profissional_componentes WHERE profissional_id = %s", (prof_id,))
            cursor.executemany(
                "INSERT INTO profissional_componentes (profissional_id, componente) VALUES (%s, %s)",
                [(prof_id, cp.get('componente') or '') for cp in comps_por_mat.get(mat_norm, [])])

            sincronizados += 1

        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro durante sincronização: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

    return jsonify({
        'mensagem': 'Sincronização concluída com sucesso',
        'sincronizados': sincronizados,
        'nao_encontrados': nao_encontrados
    })

@app.route('/api/profissionais/<int:prof_id>/complementar', methods=['GET'])
def get_profissional_complementar(prof_id):
    """Retorna dados complementares e coleções 1:N de um profissional específico."""
    comp_rows = execute_query("SELECT * FROM profissionais_complementar WHERE profissional_id = %s", (prof_id,))
    if not comp_rows:
        return jsonify({'complementar': None, 'cargas': [], 'cursos': [], 'habilitacoes': [], 'componentes': []})

    comp = comp_rows[0]
    if comp.get('telefones') and isinstance(comp['telefones'], str):
        try:
            comp['telefones'] = json.loads(comp['telefones'])
        except:
            pass

    cargas = execute_query("SELECT * FROM profissional_cargas_horarias WHERE profissional_id = %s", (prof_id,)) or []
    cursos = execute_query("SELECT * FROM profissional_cursos WHERE profissional_id = %s", (prof_id,)) or []
    habs = execute_query("SELECT * FROM profissional_habilitacoes WHERE profissional_id = %s", (prof_id,)) or []
    comps = execute_query("SELECT * FROM profissional_componentes WHERE profissional_id = %s", (prof_id,)) or []

    return jsonify({
        'complementar': comp,
        'cargas': cargas,
        'cursos': cursos,
        'habilitacoes': habs,
        'componentes': comps
    })

@app.route('/api/profissionais/<int:prof_id>/complementar', methods=['PUT'])
def update_profissional_complementar(prof_id):
    """Cria/atualiza dados cadastrais/contato complementares de um profissional."""
    data = request.get_json() or {}
    # arquivo_origem só é gravado pelo sync SIGEP
    cols = [c for c in COMP_COLS if c != 'arquivo_origem']
    if not execute_query(*_upsert_complementar(prof_id, data, cols), fetch=False):
        return jsonify({'error': 'Erro ao salvar dados complementares'}), 500
    return jsonify({'message': 'Dados complementares salvos com sucesso'})

# Rota de saúde
@app.route('/api/health', methods=['GET'])
def health_check():
    """Verifica se a API está funcionando"""
    try:
        connection = get_db_connection()
        if connection:
            connection.close()
            return jsonify({'status': 'healthy', 'database': 'connected'})
        else:
            return jsonify({'status': 'unhealthy', 'database': 'disconnected'}), 500
    except:
        return jsonify({'status': 'unhealthy', 'database': 'error'}), 500

if __name__ == '__main__':
    port = int(os.getenv('API_PORT', 5000))
    host = os.getenv('API_HOST', '0.0.0.0')
    
    debug_mode = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    print(f"Iniciando servidor na porta {port}...")
    app.run(host=host, port=port, debug=debug_mode)
