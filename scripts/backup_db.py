#!/usr/bin/env python3
"""
Script para fazer backup do banco de dados MySQL com compactação e barra de progresso.
"""
import os
import subprocess
import datetime
import tarfile
import sys
import time

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass
def get_docker_container_info():
    """Obtém informações do container Docker do MySQL a partir do docker-compose.yml."""
    container_name = "folhaponto-mysql"  # Nome padrão do container MySQL no docker-compose.yml
    
    # Verifica se o docker-compose.yml existe e extrai o nome do container se possível
    compose_files = ["docker-compose.yml", "docker-compose.yaml"]
    
    for compose_file in compose_files:
        if os.path.exists(compose_file):
            try:
                with open(compose_file, 'r') as f:
                    content = f.read()
                    # Procura pelo nome do container do banco de dados
                    import yaml
                    data = yaml.safe_load(content)
                    for service_name, service_config in data.get('services', {}).items():
                        image = service_config.get('image', '').lower()
                        if 'mysql' in image or 'mysql' in service_name.lower() or service_name == 'db' or 'db' in service_name.lower():
                            container_name = service_config.get('container_name', service_name)
                            break
            except:
                # Se não conseguir ler o YAML, continua com o nome padrão
                pass
    
    return container_name


def print_progress(message, duration=1.0):
    """Imprime uma barra de progresso simples com mensagem."""
    print(f"{message} ", end="", flush=True)
    symbols = ['.', '..', '...', '....']
    for i in range(int(duration * 2)):
        for symbol in symbols:
            print(f"\r{message} {symbol}", end="", flush=True)
            time.sleep(0.25)
    print(f"\r{message} ✓")


def get_db_connection():
    """Cria e retorna conexão direta."""
    import mysql.connector
    return mysql.connector.connect(
        host=os.getenv('DB_HOST', '127.0.0.1'),
        port=int(os.getenv('DB_PORT', 3307)),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', '123456'),
        database=os.getenv('DB_NAME', 'folhaponto_db'),
        charset="utf8mb4",
        collation="utf8mb4_unicode_ci"
    )

def create_backup():
    """Realiza o backup do banco de dados MySQL/MariaDB."""
    # Obter informações do banco de dados do ambiente
    db_host = os.getenv('DB_HOST', '127.0.0.1')
    db_port = os.getenv('DB_PORT', '3307')
    db_user = os.getenv('DB_USER', 'root')
    db_password = os.getenv('DB_PASSWORD', '123456')
    db_name = os.getenv('DB_NAME', 'folhaponto_db')
    
    # Obter data e hora atual para nome do arquivo
    today = datetime.datetime.now()
    date_str = today.strftime("%d.%m.%Y.%H.%M.%S")
    
    # Nome dos arquivos de backup
    backup_filename = f"backup.{db_name}.{date_str}.sql"
    info_filename = f"backup.{db_name}.{date_str}.txt"
    temp_tar_name = f"backup.{db_name}.{date_str}.tar.gz"

    print(f"Iniciando backup do banco de dados '{db_name}' ({db_host}:{db_port})...")
    print(f"Arquivo de backup: {backup_filename}")
    
    try:
        # Obter contagem de registros das tabelas diretamente via Python
        print_progress("Obtendo contagem de registros")
        
        tabelas = ['folhas_ponto', 'lancamentos_diarios', 'profissionais', 'resumo_folha','feriados','tipos_lancamento','vw_adicional_noturno','vw_folhas_lancamento','vw_relatorio_atestados_bimestrais','vw_relatorio_atestados_comparecimento']
        contagem_registros = {}
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            for tabela in tabelas:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM `{tabela}`;")
                    row = cursor.fetchone()
                    contagem_registros[tabela] = int(row[0]) if row else 0
                except Exception:
                    contagem_registros[tabela] = 0
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"\n[AVISO] Não foi possível obter contagem de registros: {e}")
            for tabela in tabelas:
                contagem_registros[tabela] = 0
        
        print_progress("Executando dump do banco")
        
        # Identificar utilitário de dump disponível
        dump_tool = None
        for tool in ["mariadb-dump", "mysqldump"]:
            if subprocess.run(["which", tool], capture_output=True).returncode == 0:
                dump_tool = tool
                break
                
        container_name = get_docker_container_info()

        if dump_tool:
            dump_cmd = [
                dump_tool,
                f"--host={db_host}",
                f"--port={db_port}",
                f"--user={db_user}",
                f"--password={db_password}",
                "--single-transaction",
                "--routines",
                "--triggers",
                db_name
            ]
            with open(backup_filename, 'w', encoding='utf-8') as f:
                result = subprocess.run(dump_cmd, stdout=f, stderr=subprocess.PIPE, text=True)
        else:
            # Fallback para Docker se instalado
            dump_cmd = [
                "docker", "exec", container_name,
                "mysqldump",
                f"--host={db_host}",
                f"--port={db_port}",
                f"--user={db_user}",
                f"--password={db_password}",
                "--single-transaction",
                "--routines",
                "--triggers",
                db_name
            ]
            with open(backup_filename, 'w', encoding='utf-8') as f:
                result = subprocess.run(dump_cmd, stdout=f, stderr=subprocess.PIPE, text=True)
            
        if result.returncode != 0:
            print(f"Erro ao fazer backup: {result.stderr}")
            return False
            
        print("Backup concluído com sucesso!")
        
        # Criar arquivo de informações do backup
        print_progress("Criando arquivo de informações")
        
        file_size = os.path.getsize(backup_filename)
        file_size_mb = file_size / (1024 * 1024)
        execution_mode = f"CLI Local ({dump_tool})" if dump_tool else f"Container Docker ({container_name})"
        
        with open(info_filename, 'w', encoding='utf-8') as f:
            f.write(f"Backup do Banco de Dados\n")
            f.write(f"========================\n\n")
            f.write(f"Banco de Dados: {db_name}\n")
            f.write(f"Data/Hora: {today.strftime('%d/%m/%Y %H:%M:%S')}\n")
            f.write(f"Host: {db_host}:{db_port}\n")
            f.write(f"Usuário: {db_user}\n")
            f.write(f"Modo de Execução: {execution_mode}\n")
            f.write(f"Container Docker: {container_name}\n\n")
            f.write(f"RESUMO DE REGISTROS POR TABELA:\n")
            f.write(f"================================\n")
            total_registros = 0
            for tabela, count in contagem_registros.items():
                f.write(f"{tabela}: {count:,} registros\n")
                total_registros += count
            f.write(f"----------------------------------------\n")
            f.write(f"TOTAL: {total_registros:,} registros\n\n")
            f.write(f"Arquivo SQL: {backup_filename}\n")
            f.write(f"Tamanho: {file_size_mb:.2f} MB ({file_size} bytes)\n")
        
        # Compactar os arquivos SQL e TXT em .tar.gz
        print_progress("Compactando arquivos de backup")
        
        with tarfile.open(temp_tar_name, "w:gz") as tar:
            tar.add(backup_filename, arcname=os.path.basename(backup_filename))
            tar.add(info_filename, arcname=os.path.basename(info_filename))
        
        # Remover os arquivos originais após compactação
        os.remove(backup_filename)
        os.remove(info_filename)
        
        # Calcular tamanho do arquivo compactado
        tar_size = os.path.getsize(temp_tar_name)
        tar_size_mb = tar_size / (1024 * 1024)
        
        # Exibir resumo de registros
        print("\n" + "="*50)
        print("RESUMO DE REGISTROS POR TABELA:")
        print("="*50)
        total_registros = 0
        for tabela, count in contagem_registros.items():
            print(f"{tabela}: {count:,} registros")
            total_registros += count
        print("-" * 40)
        print(f"TOTAL: {total_registros:,} registros")
        
        # Exibir resumo do backup
        print("\n" + "="*50)
        print("RESUMO DO BACKUP")
        print("="*50)
        print(f"Banco de Dados: {db_name}")
        print(f"Data/Hora: {today.strftime('%d/%m/%Y %H:%M:%S')}")
        print(f"Arquivo: {temp_tar_name}")
        print(f"Tamanho do SQL: {file_size_mb:.2f} MB")
        print(f"Tamanho do TAR.GZ: {tar_size_mb:.2f} MB")
        print(f"Taxa de compressão: {((file_size - tar_size) / file_size * 100):.1f}%")
        print("="*50)
        print("Processo de backup concluído com sucesso!")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"Erro ao executar o mysqldump: {e}")
        return False
    except FileNotFoundError:
        print("ERRO: Docker não está instalado ou não está no PATH.")
        return False
    except Exception as e:
        print(f"Erro inesperado: {e}")
        return False


if __name__ == "__main__":
    print("=== Sistema de Backup do Banco de Dados ===")
    success = create_backup()
    if not success:
        sys.exit(1)
    else:
        sys.exit(0)
