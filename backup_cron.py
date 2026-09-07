#!/usr/bin/env python3
"""Backup automático para cron: gera backup do MySQL via scripts/backup_db.build_backup()
e envia para o OneDrive via rclone. Mantém só o backup mais recente em disco local
como fallback (política: "manter tudo no OneDrive, pouco localmente").

Setup do rclone (uma vez, ANTES de usar este script):

    1. Na sua máquina local (não no servidor): `rclone config`
       - New remote -> nome "hotmail" -> tipo "onedrive" -> siga o login OAuth no browser.
    2. Copie o config gerado para o servidor de produção:
       scp ~/.config/rclone/rclone.conf usuario@servidor:~/.config/rclone/rclone.conf
    3. No servidor, confirme: `rclone lsd hotmail:` (deve listar as pastas do OneDrive).
    4. Confirme que a pasta de destino existe no OneDrive: `rclone lsd hotmail:SEDF`

Crontab (produção), 2x ao dia às 3h e 15h:

    0 3,15 * * * /usr/bin/flock -n /tmp/folhaponto_backup.lock /caminho/para/FolhapontogoogleAi/backup_cron.py

(o próprio script já loga em backup_cron.log com rotação — não precisa de `>>` no crontab,
mas manter `>> arquivo 2>&1` extra não faz mal como rede de segurança para erros antes do logging iniciar.)
"""
import os
import shutil
import subprocess
import sys
import logging
import logging.handlers
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
DB_CONTAINER = os.environ.get("DB_CONTAINER", "meu-mysql")
os.environ["DB_CONTAINER"] = DB_CONTAINER
RCLONE_REMOTE = os.environ.get("FOLHAPONTO_RCLONE_REMOTE", "hotmail:SEDF")
LOG_FILE = ROOT_DIR / "backup_cron.log"


def _venv_python():
    venv_python = ROOT_DIR / "venv" / "bin" / "python"
    return venv_python if venv_python.exists() else None


def _reexec_into_venv():
    if os.environ.get("_FOLHAPONTO_VENV_REEXEC"):
        return
    venv_python = _venv_python()
    if venv_python:
        os.environ["_FOLHAPONTO_VENV_REEXEC"] = "1"
        os.execve(str(venv_python), [str(venv_python)] + sys.argv, os.environ)


def setup_logging():
    handler = logging.handlers.RotatingFileHandler(
        LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
    )
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[handler, logging.StreamHandler(sys.stdout)],
    )


def check_container():
    result = subprocess.run(
        f"docker ps --filter name=^{DB_CONTAINER}$ --format '{{{{.Names}}}}'",
        shell=True, capture_output=True, text=True,
    )
    if DB_CONTAINER not in result.stdout.split():
        raise RuntimeError(
            f"Container '{DB_CONTAINER}' não está rodando. Abortando backup "
            "(este script não inicia containers automaticamente)."
        )


def rclone_upload(local_path: Path):
    if not shutil.which("rclone"):
        raise RuntimeError("rclone não encontrado no PATH. Instale e configure antes de usar este script.")
    logging.info(f"Enviando {local_path.name} para {RCLONE_REMOTE} via rclone...")
    result = subprocess.run(
        ["rclone", "copy", str(local_path), RCLONE_REMOTE],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        logging.error(f"rclone stdout: {result.stdout.strip()}")
        logging.error(f"rclone stderr: {result.stderr.strip()}")
        raise RuntimeError(f"rclone copy falhou (exit {result.returncode}).")
    logging.info("Upload confirmado no OneDrive.")


def _remote_backup_files():
    """Lista {nome: tamanho} dos arquivos já presentes no remote, para nunca apagar
    localmente algo que não tenha uma cópia confirmada no OneDrive."""
    import json
    result = subprocess.run(
        ["rclone", "lsjson", RCLONE_REMOTE],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        logging.warning(f"Não foi possível listar {RCLONE_REMOTE} para validar limpeza local: {result.stderr.strip()}")
        return {}
    try:
        entries = json.loads(result.stdout)
    except ValueError:
        return {}
    return {e["Name"]: e["Size"] for e in entries if not e.get("IsDir")}


def cleanup_old_local_backups(current_file: Path):
    remote_files = _remote_backup_files()
    for f in ROOT_DIR.glob("backup.*.tar.gz"):
        if f == current_file:
            continue
        remote_size = remote_files.get(f.name)
        if remote_size is None:
            logging.warning(f"Mantendo {f.name}: não encontrado em {RCLONE_REMOTE} (não vou apagar sem confirmação de upload).")
            continue
        if remote_size != f.stat().st_size:
            logging.warning(f"Mantendo {f.name}: tamanho local ({f.stat().st_size}) difere do remoto ({remote_size}).")
            continue
        logging.info(f"Removendo backup local antigo (confirmado no OneDrive): {f.name}")
        f.unlink()


def main():
    setup_logging()
    logging.info("=== Iniciando backup automático (cron) ===")
    try:
        check_container()

        os.chdir(ROOT_DIR)
        sys.path.insert(0, str(ROOT_DIR / "scripts"))
        import backup_db
        tar_file = backup_db.build_backup()
        logging.info(f"Backup local criado: {tar_file}")

        rclone_upload(tar_file)
        cleanup_old_local_backups(tar_file)

        logging.info("=== Backup concluído com sucesso ===")
    except Exception as e:
        logging.error(f"Backup falhou: {e}")
        sys.exit(1)


if __name__ == "__main__":
    _reexec_into_venv()
    main()
