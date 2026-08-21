#!/usr/bin/env python3
"""
Script para restaurar backup do banco de dados MySQL a partir de arquivo compactado .tar.gz.
"""
import os
import subprocess
import tarfile
import sys
import glob
import time

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


def restore_backup():
    """Restaura o backup selecionado no banco de dados MySQL."""
    # Obter arquivos de backup no diretório atual
    backup_pattern = "backup.folhaponto_db.*.tar.gz"
    backup_files = sorted(glob.glob(backup_pattern))
    
    if not backup_files:
        print("ERRO: Nenhum arquivo de backup encontrado no formato 'backup.folhaponto_db.*.tar.gz'.")
        return False
        
    print("\nBackups disponíveis para restauração:")
    print("=" * 60)
    for idx, file_path in enumerate(backup_files, 1):
        file_size = os.path.getsize(file_path)
        file_size_mb = file_size / (1024 * 1024)
        mod_time = time.ctime(os.path.getmtime(file_path))
        print(f"[{idx}] {os.path.basename(file_path)} ({file_size_mb:.2f} MB) - Modificado em: {mod_time}")
    print("=" * 60)
    
    try:
        selection = input("\nEscolha o número do backup para restaurar (ou Enter para cancelar): ").strip()
        if not selection:
            print("Operação cancelada.")
            return False
            
        selected_idx = int(selection) - 1
        if selected_idx < 0 or selected_idx >= len(backup_files):
            print("Seleção inválida.")
            return False
    except ValueError:
        print("Entrada inválida. Digite um número.")
        return False
        
    selected_backup = backup_files[selected_idx]
    print(f"\nSelecionado: {selected_backup}")
    
    confirm = input("AVISO: Isso irá substituir os dados atuais. Confirma a restauração? (S/N): ").strip().lower()
    if confirm not in ['s', 'sim']:
        print("Restauração cancelada.")
        return False

    # Obter informações do banco de dados do ambiente
    db_host = os.getenv('DB_HOST', '127.0.0.1')
    db_port = os.getenv('DB_PORT', '3307')
    db_user = os.getenv('DB_USER', 'root')
    db_password = os.getenv('DB_PASSWORD', '123456')
    db_name = os.getenv('DB_NAME', 'folhaponto_db')
    
    try:
        print_progress("Descompactando arquivo de backup")
        
        # Extrair o SQL do tar.gz
        sql_filename = None
        with tarfile.open(selected_backup, "r:gz") as tar:
            for member in tar.getmembers():
                if member.name.endswith(".sql"):
                    sql_filename = member.name
                    tar.extract(member)
                    break
                    
        if not sql_filename or not os.path.exists(sql_filename):
            print("ERRO: Arquivo SQL correspondente não encontrado dentro do pacote de backup.")
            return False
            
        print_progress(f"Importando SQL ({sql_filename}) no banco de dados '{db_name}' ({db_host}:{db_port})")
        
        # Tentar utilitário mariadb / mysql CLI
        sql_tool = None
        for tool in ["mariadb", "mysql"]:
            if subprocess.run(["which", tool], capture_output=True).returncode == 0:
                sql_tool = tool
                break
                
        restored = False
        if sql_tool:
            with open(sql_filename, 'r', encoding='utf-8') as f:
                restore_cmd = [
                    sql_tool,
                    f"--host={db_host}",
                    f"--port={db_port}",
                    f"--user={db_user}",
                    f"--password={db_password}",
                    db_name
                ]
                result = subprocess.run(restore_cmd, stdin=f, capture_output=True, text=True)
                if result.returncode == 0:
                    restored = True
                else:
                    print(f"Aviso CLI: {result.stderr}")
                    
        if not restored:
            # Fallback para execução via mysql.connector
            try:
                import mysql.connector
                conn = mysql.connector.connect(
                    host=db_host,
                    port=int(db_port),
                    user=db_user,
                    password=db_password,
                    database=db_name,
                    charset="utf8mb4",
                    collation="utf8mb4_unicode_ci"
                )
                cursor = conn.cursor()
                sql_content = Path(sql_filename).read_text(encoding='utf-8')
                for res in cursor.execute(sql_content, multi=True):
                    if res.with_rows:
                        res.fetchall()
                conn.commit()
                cursor.close()
                conn.close()
                restored = True
            except Exception as e:
                print(f"Erro ao importar via Python: {e}")
                
        # Remover arquivo SQL extraído temporariamente
        if os.path.exists(sql_filename):
            os.remove(sql_filename)
            
        if not restored:
            print("Erro ao restaurar backup.")
            return False
            
        print("\nRestauração concluída com sucesso!")
        return True
        
    except Exception as e:
        print(f"Erro inesperado: {e}")
        return False


if __name__ == "__main__":
    from pathlib import Path
    print("=== Sistema de Restauração de Banco de Dados ===")
    success = restore_backup()
    if not success:
        sys.exit(1)
    else:
        sys.exit(0)

