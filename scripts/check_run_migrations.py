#!/usr/bin/env python3
"""
Verifica e executa migrations pendentes no banco de dados MySQL/MariaDB
usando mysql.connector diretamente para compatibilidade total.
"""
import sys
from pathlib import Path

# Adiciona o diretório do script ao path de imports para resolver add_entry_type
sys.path.append(str(Path(__file__).parent))

from add_entry_type import load_env

ROOT = Path(__file__).parent.parent
MIGRATIONS_DIR = ROOT / "database" / "migrations"


def get_db_connection(env: dict):
    """Cria e retorna uma conexão mysql.connector."""
    import mysql.connector
    return mysql.connector.connect(
        host=env.get("DB_HOST", "127.0.0.1"),
        port=int(env.get("DB_PORT", 3307)),
        user=env.get("DB_USER", "root"),
        password=env.get("DB_PASSWORD", "123456"),
        database=env.get("DB_NAME", "folhaponto_db"),
        charset="utf8mb4",
        collation="utf8mb4_unicode_ci",
        autocommit=True
    )


def run_query(sql: str, env: dict) -> tuple[int, list[tuple], str]:
    """Executa uma query no banco de dados e retorna (returncode, rows, error_msg)."""
    try:
        conn = get_db_connection(env)
        cursor = conn.cursor()
        cursor.execute(sql)
        rows = cursor.fetchall() if cursor.description else []
        cursor.close()
        conn.close()
        return 0, rows, ""
    except Exception as e:
        return 1, [], str(e)


def apply_migration_file(filepath: Path, env: dict) -> bool:
    """Aplica o arquivo SQL de migration no banco de dados via mysql.connector."""
    try:
        sql_content = filepath.read_text(encoding="utf-8")
        conn = get_db_connection(env)
        cursor = conn.cursor()
        
        # Executar comandos do arquivo SQL separando por ';'
        statements = [s.strip() for s in sql_content.split(';') if s.strip()]
        for stmt in statements:
            cursor.execute(stmt)
            if cursor.description:
                cursor.fetchall()
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Erro ao aplicar {filepath.name}: {e}")
        return False


def main():
    print("Checking for pending database migrations...")
    env = load_env()
    
    # Diagnóstico de conexão (senha mascarada)
    pw_masked = env["DB_PASSWORD"][:2] + "****" if len(env["DB_PASSWORD"]) > 2 else "****"
    print(f"  Conexão: host={env.get('DB_HOST','127.0.0.1')}:{env.get('DB_PORT','3307')}, user={env['DB_USER']}, password={pw_masked}, db={env['DB_NAME']}")
    
    # 1. Obter todas as migrations locais
    migration_files = sorted(list(MIGRATIONS_DIR.glob("[0-9][0-9][0-9]_*.sql")))
    if not migration_files:
        print("No migration files found in database/migrations/")
        sys.exit(0)
        
    # 2. Verificar se a tabela schema_migrations existe
    code, rows, err = run_query("SELECT version FROM schema_migrations;", env)
    
    applied_versions = set()
    if code == 0:
        applied_versions = set(str(r[0]).strip() for r in rows if r and r[0])
    else:
        # A tabela provavelmente não existe. Vamos rodar a migration 018 para criá-la se estiver na lista.
        print(f"Table 'schema_migrations' not found ({err}). Initializing migration table...")
        m18 = MIGRATIONS_DIR / "018_create_schema_migrations.sql"
        if m18.exists():
            print("Applying 018_create_schema_migrations.sql retroactive setup...")
            if apply_migration_file(m18, env):
                # Consultar novamente as versões
                code, rows, err = run_query("SELECT version FROM schema_migrations;", env)
                if code == 0:
                    applied_versions = set(str(r[0]).strip() for r in rows if r and r[0])
                else:
                    print(f"Failed to query schema_migrations even after running 018 setup: {err}")
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

