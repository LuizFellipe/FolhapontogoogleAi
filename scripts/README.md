# Scripts Utilitários (scripts/)

Scripts de manutenção e desenvolvimento para o sistema Folha de Ponto.

## Scripts Disponíveis

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
Realiza dump do banco `folhaponto_db` via Docker e salva em diretório configurável.

### `sync_tipos_lancamento.py` — Sincronizar tipos
Sincroniza a tabela `tipos_lancamento` do banco com os valores definidos em `src/types.ts`.

### `backfill_resumo.py` — Recálculo de resumo de folhas
Script de backfill geral para recalcular `resumo_folha` em lote.

### `update_tree.py` — Atualizar estrutura de diretórios
Utilitário para regenerar snapshots da árvore de arquivos do projeto.

## MODIFICATION_MEMORY

Veja `MODIFICATION_MEMORY.md` nesta pasta para o histórico de alterações dos scripts.
