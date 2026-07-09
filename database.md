# Database Architecture — Melhorias Candidatas

> Gerado via análise do graphify (GRAPH_REPORT.md) + exploração de `backend/app.py`, `database/migrations/`, `scripts/add_entry_type.py`.
> Trabalhar parte a parte — marcar status conforme avança.

## Contexto

Todo backend concentrado em `backend/app.py` (602 linhas): rotas Flask + acesso a dados + serialização, tudo junto. Sem ORM, sem models, sem tabela de schema_version. `execute_query()` (app.py:33-74) é a única abstração compartilhada de fato, chamada ~23x. Migrations são arquivos SQL numerados (`database/migrations/001..017_*.sql`) geridos por `scripts/add_entry_type.py`, que também edita `src/types.ts` e `database/full_setup.sql` via regex.

## Candidatos

### 1. CRUD genérico (data-access module) — [ ] pendente
- **Files**: `backend/app.py` — rotas profissionais/folhas_ponto/feriados/recessos (~15+ handlers)
- **Problem**: cada rota reimplementa o mesmo padrão — `request.get_json()` → INSERT SQL manual → tupla `data.get()` → `execute_query`. Interface quase tão complexa quanto a implementação.
- **Solution**: módulo `db/repository.py` com fn genérica `insert(table, columns, data)` / `update(table, id, data)`; colunas declaradas 1x por tabela.
- **Benefits**: bug de insert corrigido em 1 lugar (locality); deletion test passa (lógica reaparece em 15 rotas se remover); teste unitário único cobre todas as tabelas.

### 2. Duplicate-check consolidado — [x] feito
- **Files**: `create_profissional`/`update_profissional` (SELECT manual, app.py:95-99, 145-149) vs `create_feriado`/`create_recesso` (catch `'Duplicate entry'`, app.py:434-436)
- **Problem**: duas estratégias diferentes pro mesmo problema de unicidade; SELECT pre-check tem race condition.
- **Solution**: padronizar em `UNIQUE KEY` + catch de erro (atômico), aplicar também em profissionais. Extrair helper/decorator `handle_duplicate`.
- **Benefits**: elimina race condition, 1 padrão testável.

### 3. Transação multi-insert — [ ] pendente
- **Files**: `create_lancamentos_diarios` (app.py:307-346), `create_resumo_folha` (app.py:349-392)
- **Problem**: `execute_query()` não suporta transação multi-statement → essas 2 rotas duplicam boilerplate inteiro de conexão/cursor/commit/rollback.
- **Solution**: `execute_transaction(fn)` — abre conn/cursor, passa cursor pro callback, cuida de commit/rollback/close.
- **Benefits**: lógica de transação em 1 lugar, remove boilerplate duplicado, testável (rollback).

### 4. Migration tool com 3 responsabilidades — [ ] pendente
- **Files**: `scripts/add_entry_type.py` (269 linhas)
- **Problem**: 1 script fazendo migration SQL + regex-edit `src/types.ts` + regex-edit `full_setup.sql` + docker exec — responsabilidades não relacionadas.
- **Solution**: separar `create_migration()` (só gera SQL) do sync de `types.ts`/`full_setup.sql` (talvez virar passo manual documentado).
- **Benefits**: menos acoplamento, script menor, menos risco de regex quebrar `types.ts`.

### 5. Schema versioning ausente — [x] feito
- **Files**: `database/migrations/*.sql`, README manual
- **Problem**: sem tabela `schema_migrations`, deploy não sabe o que já rodou — depende de disciplina manual.
- **Solution**: tabela `schema_migrations(version, applied_at)`; `apply_migration()` checa antes de rodar.
- **Benefits**: evita reaplicar migration, ordem garantida, essencial pra CI/deploy.
