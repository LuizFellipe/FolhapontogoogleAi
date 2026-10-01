# Scripts Utilitários (scripts/)

Scripts de manutenção e desenvolvimento para o sistema Folha de Ponto.

## Scripts Disponíveis

### `test_ficha_cadastral_ui.py` — Regressão da emissão cadastral
Testa download/nome do PDF, bloqueios por edições principais e complementares, salvar/desfazer, erros de salvamento/geração, ficha pendente e respostas atrasadas durante troca de servidor. Usa API interceptada com dados sintéticos, sem gravações no banco. Requer Playwright/Chromium e Vite iniciado com credenciais de teste:

```bash
VITE_APP_USERNAME=pdf-test VITE_APP_PASSWORD=pdf-test npm run dev -- --host 127.0.0.1 --port 5173
# Em outro terminal; ajuste URL se Vite escolher outra porta:
python3 scripts/test_ficha_cadastral_ui.py http://127.0.0.1:5173
```

### `add_entry_type.py` — Adicionar novo tipo de lançamento
Script interativo para adicionar um novo tipo de lançamento ao sistema. Atualiza todos os artefatos necessários de forma consistente:
1. `src/types.ts` — union type `EntryType` e array `ENTRY_TYPES`
2. `database/full_setup.sql` — `INSERT IGNORE INTO tipos_lancamento`
3. Gera a próxima migration numerada (`database/migrations/NNN_add_type_*.sql`) com `INSERT IGNORE INTO tipos_lancamento`

> **Nota:** desde a migration 010, os tipos de lançamento são gerenciados pela tabela lookup `tipos_lancamento` (`VARCHAR(80)`). O script **não modifica ENUMs** — essa lógica foi removida pois `lancamentos_diarios.tipo` e `tipo_turno2` são `VARCHAR(80)` desde então.

```bash
python3 scripts/add_entry_type.py
```

### `backup_db.py` — Backup do banco de dados
Realiza dump do banco `folhaponto_db` via CLI local (`mariadb-dump`/`mysqldump`) ou container Docker (`meu-mysql` ou `DB_CONTAINER`). Gera arquivo compactado `.tar.gz` contendo o dump SQL e sumário TXT. Expõe a função `build_backup()` utilizada por rotinas automatizadas (ex.: `backup_cron.py`).

### `sync_tipos_lancamento.py` — Sincronizar tipos
Sincroniza a tabela `tipos_lancamento` do banco com os valores definidos em `src/types.ts`.

### `backfill_resumo.py` — Recálculo de resumo de folhas
Script de backfill geral para recalcular `resumo_folha` em lote.

### `gen.py` — Diagramas da documentação
Gera `folhaponto-arquitetura`, `ciclo-vida-folha`, `integracao-sigep-educasync` e `modelo-dados` em `docs/diagrams/` (paleta fixa por camada) e exporta todos os `.drawio` da pasta para `.drawio.svg` com tema claro. Edições manuais nesses 4 `.drawio` são sobrescritas. Requer o CLI `drawio`.

```bash
python3 scripts/gen.py
```
