#!/usr/bin/env python3
"""
Backend API para Folha de Ponto
Sistema de gerenciamento de folhas de ponto com persistência MySQL
"""

import os
import sys
from datetime import datetime
from flask import Flask, request, jsonify
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
    
    # Verificar se a matrícula foi fornecida e se já existe (apenas se não for NULL/vazio)
    if data.get('matricula'):
        query_check = "SELECT id FROM profissionais WHERE matricula = %s"
        existing = execute_query(query_check, (data.get('matricula'),))
        
        if existing:
            return jsonify({'error': f'Matrícula "{data.get("matricula")}" já está cadastrada no sistema'}), 400
    
    query = """
    INSERT INTO profissionais (nome, matricula, cargo, ua, exercicio, carga_horaria, funcao, unidade_lotacao, turno1, turno2)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    params = (
        data.get('nome'),
        data.get('matricula') or None,  # Permitir NULL
        data.get('cargo'),
        data.get('ua'),
        data.get('exercicio'),
        data.get('carga_horaria'),
        data.get('funcao'),
        data.get('unidade_lotacao'),
        data.get('turno1'),
        data.get('turno2')
    )
    
    result = execute_query(query, params, fetch=False, return_lastrowid=True)
    if result:
        return jsonify({'id': result, 'message': 'Profissional criado com sucesso'}), 201
    return jsonify({'error': 'Erro ao criar profissional'}), 500

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
    
    # Verificar se a matrícula está sendo alterada e se já existe (apenas se não for NULL/vazio)
    if data.get('matricula'):
        query_check = "SELECT matricula FROM profissionais WHERE id != %s AND matricula = %s"
        existing = execute_query(query_check, (id, data.get('matricula')))
        
        if existing:
            return jsonify({'error': f'Matrícula "{data.get("matricula")}" já está em uso por outro profissional'}), 400
    
    query = """
    UPDATE profissionais 
    SET nome = %s, matricula = %s, cargo = %s, ua = %s, exercicio = %s, 
        carga_horaria = %s, funcao = %s, unidade_lotacao = %s, turno1 = %s, turno2 = %s
    WHERE id = %s
    """
    
    params = (
        data.get('nome'),
        data.get('matricula') or None,  # Permitir NULL
        data.get('cargo'),
        data.get('ua'),
        data.get('exercicio'),
        data.get('carga_horaria'),
        data.get('funcao'),
        data.get('unidade_lotacao'),
        data.get('turno1'),
        data.get('turno2'),
        id
    )
    
    result = execute_query(query, params, fetch=False)
    if result:
        return jsonify({'message': 'Profissional atualizado com sucesso'})
    return jsonify({'error': 'Erro ao atualizar profissional'}), 500

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
    SELECT f.*, p.nome as profissional_nome, p.nome, p.matricula
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
    SELECT f.*, p.nome as profissional_nome, p.nome, p.matricula, p.cargo, p.ua, 
           p.exercicio, p.carga_horaria, p.funcao, p.unidade_lotacao, p.turno1, p.turno2
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
            (folha_ponto_id, dia, tipo, observacao, tipo_turno2, observacao_turno2)
            VALUES (%s, %s, %s, %s, %s, %s)
            """
            params = (
                folha_ponto_id,
                lancamento.get('dia'),
                lancamento.get('tipo'),
                lancamento.get('observacao'),
                lancamento.get('tipo_turno2'),
                lancamento.get('observacao_turno2')
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
