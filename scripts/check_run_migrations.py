#!/usr/bin/env python3
"""
Verifica e executa migrations pendentes no banco de dados MySQL/MariaDB.
"""
import sys
import re
import subprocess
from pathlib import Path

# Adiciona o diretório do script ao path de imports para resolver add_entry_type
sys.path.append(str(Path(__file__).parent))

from add_entry_type import load_env, find_docker_container

ROOT = Path(__file__).parent.parent
MIGRATIONS_DIR = ROOT / "database" / "migrations"

def run_query(sql: str, env: dict) -> tuple[int, str, str]:
    """Executa uma query no banco de dados e retorna o returncode, stdout e stderr."""
    container = find_docker_container()
    if container:
        cmd = [
            "docker", "exec", "-i", container,
            "mysql", "--default-character-set=utf8mb4", "--batch", "--skip-column-names",
            "-u", env["DB_USER"], f"-p{env['DB_PASSWORD']}", env["DB_NAME"],
            "-e", sql
        ]
    else:
        cmd = [
            "mysql", "--batch", "--skip-column-names",
            "-u", env["DB_USER"], f"-p{env['DB_PASSWORD']}",
            "-h", env["DB_HOST"], "-P", env.get("DB_PORT", "3306"), env["DB_NAME"],
            "-e", sql
        ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode, result.stdout, result.stderr

def apply_migration_file(filepath: Path, env: dict) -> bool:
    """Aplica o arquivo SQL de migration no banco de dados."""
    container = find_docker_container()
    if container:
        cmd = [
            "docker", "exec", "-i", container,
            "mysql", "--default-character-set=utf8mb4",
            "-u", env["DB_USER"], f"-p{env['DB_PASSWORD']}", env["DB_NAME"]
        ]
        with open(filepath, "r", encoding="utf-8") as f:
            result = subprocess.run(cmd, stdin=f, capture_output=True, text=True)
    else:
        cmd = [
            "mysql", "--default-character-set=utf8mb4",
            "-u", env["DB_USER"], f"-p{env['DB_PASSWORD']}",
            "-h", env["DB_HOST"], "-P", env.get("DB_PORT", "3306"), env["DB_NAME"]
        ]
        with open(filepath, "r", encoding="utf-8") as f:
            result = subprocess.run(cmd, stdin=f, capture_output=True, text=True)
            
    if result.returncode == 0:
        return True
    else:
        print(f"Erro ao aplicar {filepath.name}: {result.stderr}")
        return False

def main():
    print("Checking for pending database migrations...")
    env = load_env()
    
    # 1. Obter todas as migrations locais
    migration_files = sorted(list(MIGRATIONS_DIR.glob("[0-9][0-9][0-9]_*.sql")))
    if not migration_files:
        print("No migration files found in database/migrations/")
        sys.exit(0)
        
    # 2. Verificar se a tabela schema_migrations existe
    code, stdout, stderr = run_query("SELECT version FROM schema_migrations;", env)
    
    applied_versions = set()
    if code == 0:
        applied_versions = set(line.strip() for line in stdout.splitlines() if line.strip())
    else:
        # A tabela provavelmente não existe. Vamos rodar a migration 018 para criá-la se estiver na lista.
        print("Table 'schema_migrations' not found. Initializing migration table...")
        m18 = MIGRATIONS_DIR / "018_create_schema_migrations.sql"
        if m18.exists():
            print("Applying 018_create_schema_migrations.sql retroactive setup...")
            if apply_migration_file(m18, env):
                # Consultar novamente as versões
                code, stdout, stderr = run_query("SELECT version FROM schema_migrations;", env)
                if code == 0:
                    applied_versions = set(line.strip() for line in stdout.splitlines() if line.strip())
                else:
                    print("Failed to query schema_migrations even after running 018 setup.")
                    sys.exit(1)
            else:
                print("Failed to initialize schema_migrations table.")
                sys.exit(1)
        else:
            print("Migration 018_create_schema_migrations.sql not found. Cannot auto-initialize.")
            sys.exit(1)
            
    # 3. Identificar migrations pendentes
    pending_migrations = []
    for f in migration_files:
        version_prefix = f.name[:3]
        if version_prefix not in applied_versions:
            pending_migrations.append((version_prefix, f))
            
    if not pending_migrations:
        print("All migrations are up to date. Database is ready.")
        sys.exit(0)
        
    print(f"Found {len(pending_migrations)} pending migration(s) to execute.")
    for version, filepath in pending_migrations:
        print(f"Applying migration {filepath.name}...")
        if apply_migration_file(filepath, env):
            # Garantir que foi inserida no schema_migrations se a migration em si não o fez
            run_query(f"INSERT IGNORE INTO schema_migrations (version) VALUES ('{version}');", env)
            print(f"Migration {filepath.name} applied successfully.")
        else:
            print(f"FATAL: Failed to apply migration {filepath.name}. Aborting startup.")
            sys.exit(1)
            
    print("Database migrations applied successfully!")

if __name__ == "__main__":
    main()
