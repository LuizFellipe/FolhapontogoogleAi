# Auditoria ponytail — FolhapontogoogleAi

## Resumo do projeto (para retomar sem recontexto)

**O que é**: sistema web para a SEE-DF gerar/gerenciar/imprimir folhas de frequência de servidores (efetivos e temporários). Stack: React 19 + TS + Tailwind (frontend, Vite), Flask (`backend/app.py`, 1 arquivo, ~600 linhas, 25+ rotas REST), MySQL 8 (schema em `database/`, migrations sequenciais 001–016).

**Fluxo de dados**: Profissional → Folha de Ponto (mês/ano) → Lançamentos Diários (31 dias × 2 turnos, tipo de lançamento de 21+ opções em `src/types.ts::ENTRY_TYPES`) → Resumo da Folha (página 2, auto-calculado por `computeSummaryFromEntries` em `src/App.tsx`). Impressão gera 2 páginas A4 fieis ao formulário oficial.

**Como rodar**: `./start_backend.sh` (dev local, ativa venv, sobe Flask :5000 + Vite :3000) ou `./folha_manager.sh` (menu interativo cyberpunk — start/stop/status/backup/sync tipos/add tipo) ou `docker-compose up -d` (prod).

**Scripts de manutenção (raiz do projeto, não em `scripts/` como o README afirma)**:
- `add_entry_type.py` — adiciona novo tipo de lançamento (types.ts + SQL + migration + aplica no banco)
- `sync_tipos_lancamento.py` — sincroniza types.ts ↔ tabela `tipos_lancamento`
- `backfill_resumo.py` — preenche resumo_folha retroativamente
- `backup_db.py` — backup/restore
- `update_tree.py` — regenera tree.txt

**Auth**: básica, client-side, credenciais em `.env` (`VITE_APP_USERNAME/PASSWORD`) embutidas no bundle JS. Aceitável só para rede interna — README já avisa.

**Estado da doc**: `MODIFICATION_MEMORY.md` é o changelog canônico, mantido a cada sessão — consultar antes de mexer em `App.tsx` (tem lógica não-óbvia: pré-preenchimento CPIP/CURSO por posição semanal, cálculo de resumo). Escopo desta auditoria: **só over-engineering/complexidade**, não bugs nem visual (excluído a pedido do usuário, especialmente previews de impressão).

---

## Achados, por prioridade (maior corte primeiro)

1. ✅ **`delete:`** `README.md` documenta endpoints com `/api/folhas_ponto` (underscore) mas o backend real usa `/api/folhas-ponto` (hífen) — e omite `/api/recessos`, `/api/relatorio/*`, `/api/tipos-lancamento`, `/api/atestados-bimestrais`, `/api/health` (5+ rotas reais não documentadas). E cita pasta `scripts/` que não existe — os 5 scripts Python estão na raiz. `README.md:199,282-296`. ~~Prioridade alta~~ **FEITO**: endpoints corrigidos para hífen, rotas ausentes adicionadas, seção de scripts corrigida para raiz do projeto.

2. ✅ **`yagni:`** Duas migrations com número `012` (`012_add_type_tracejado.sql` e `012_create_recessos_table.sql`) — numeração colidida quebra a suposição de ordem sequencial que o resto do projeto depende (script `add_entry_type.py` cria migrations numeradas assumindo unicidade). `database/migrations/`. ~~Prioridade média~~ **FEITO**: `012_create_recessos_table.sql` renomeado para `017_create_recessos_table.sql`; `database/migrations/README.md` e tree.txts regenerados.

3. ✅ **`shrink:`** `folha_manager.sh` mistura duas personas na mesma função ("Sistema Mágico"/"País das Maravilhas"/emoji 🌸🍰 vs "GESTOR FOLHA PONTO"/cyberpunk) — resquício do tema antigo ("Alice in Wonderland") que a entrada do changelog de 2026-05-01 diz ter sido substituído mas não foi 100% limpo (`show_system_status`, `stop_system`, `clean_and_optimize`, `system_status` ainda usam a nomenclatura antiga). `folha_manager.sh:249-359,604-678`. ~~Prioridade baixa~~ **FEITO**: termos antigos removidos, emojis 🌸🍰🌷 substituídos por ícones neutros/cyberpunk, "Sistema Mágico" → "Gestor Folha Ponto", "País das Maravilhas" → "Sistema".

4. ✅ **`delete:`** Migration `009` tem sufixo com acento no nome do arquivo original listado no changelog (`005_add_type_falta_paralisação.sql`) — nomes de arquivo com acentuação/caracteres especiais já causaram Mojibake documentado no próprio `MODIFICATION_MEMORY.md` (entrada 2026-04-24). Vale confirmar se `sync_tipos_lancamento.py`/`add_entry_type.py` tratam nomes acentuados de forma robusta, ou se isso é só cosmético no nome do arquivo. ~~Prioridade baixa~~ **FEITO**: migration renomeada para `005_add_type_falta_paralisacao.sql`. Documentação `database/migrations/README.md` e tree.txts atualizados. Scripts (`add_entry_type.py`, `sync_tipos_lancamento.py`) usam UTF-8 no I/O de arquivo e `--default-character-set=utf8mb4` no MySQL — nomes acentuados no *conteúdo* (labels/valores dos tipos) são tratados robustamente; o risco era só no nome do arquivo do filesystem.

5. Nada de over-engineering estrutural encontrado no fluxo React (`App.tsx` é grande mas funções são coesas, sem abstração especulativa), nem no backend (`app.py` é 1 arquivo direto, sem camadas desnecessárias) — arquitetura já é enxuta para o tamanho do projeto.

net: -0 lines de código requeridas (achados 1 e 2 são de documentação/organização, não código), nenhuma dependência a remover. Maior ganho está em **atualizar README com endpoints reais** e **resolver colisão de migration 012**.
