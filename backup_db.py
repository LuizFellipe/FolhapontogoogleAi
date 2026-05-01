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
def get_docker_container_info():
    """Obtém informações do container Docker do MySQL a partir do docker-compose.yml."""
    container_name = "meu-mysql"  # Nome padrão do container MySQL no docker-compose.yml
    
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
                        if 'mysql' in service_config.get('image', '').lower():
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


def create_backup():
    """Realiza o backup do banco de dados MySQL."""
    # Obter informações do banco de dados do ambiente
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '3306')
    db_user = os.getenv('DB_USER', 'root')
    db_password = os.getenv('DB_PASSWORD', '123456')
    db_name = os.getenv('DB_NAME', 'folhaponto_db')
    
    # Obter nome do container Docker
    container_name = get_docker_container_info()
    
    # Obter data atual para nome do arquivo
    today = datetime.datetime.now()
    date_str = today.strftime("%d.%m.%Y")
    
    # Nome do arquivo de backup
    backup_filename = f"backup.{db_name}.{date_str}.sql"
    temp_tar_name = f"backup.{db_name}.{date_str}.tar.gz"

    print(f"Iniciando backup do banco de dados '{db_name}'...")
    print(f"Container Docker: {container_name}")
    print(f"Arquivo de backup: {backup_filename}")
    
    try:
        # Verificar se o Docker está instalado
        result = subprocess.run(["docker", "--version"], capture_output=True, text=True)
        if result.returncode != 0:
            print("ERRO: Docker não está instalado ou não está acessível.")
            return False
        
        # Verificar se o container Docker está rodando
        result = subprocess.run(["docker", "ps"], capture_output=True, text=True)
        if container_name not in result.stdout:
            print(f"ERRO: Container '{container_name}' não está em execução.")
            return False
        
        print_progress("Executando mysqldump")
        
        # Executar o mysqldump via Docker
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
            "--set-gtid-purged=OFF",
            db_name
        ]
        
        # Executar o comando e salvar o output no arquivo
        with open(backup_filename, 'w', encoding='utf-8') as f:
            result = subprocess.run(dump_cmd, stdout=f, stderr=subprocess.PIPE, text=True)
            
        if result.returncode != 0:
            print(f"Erro ao fazer backup: {result.stderr}")
            return False
            
        print("Backup concluído com sucesso!")
        
        # Compactar o arquivo SQL em .tar.gz
        print_progress("Compactando o arquivo de backup")
        
        with tarfile.open(temp_tar_name, "w:gz") as tar:
            tar.add(backup_filename, arcname=os.path.basename(backup_filename))
        
        # Remover o arquivo .sql original após compactação
        os.remove(backup_filename)
        
        print(f"Backup compactado com sucesso: {temp_tar_name}")
        print("Processo de backup concluído!")
        
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