# Memória de Modificação - Database (database/)

## [2026-08-01] Correções v4flash — full_setup.sql: dados de lancamentos_diarios e ABONO_NIVER

### Arquivos Modificados:
- **full_setup.sql**

### Alterações:
#### 1. Bug corrigido — INSERT de `lancamentos_diarios` com 9 valores para tabela de 7 colunas
A migration 015 (2026-06-10) removeu as colunas `observacao` e `observacao_turno2` da tabela `lancamentos_diarios`, reduzindo-a para 7 colunas, mas o bloco `INSERT INTO lancamentos_diarios VALUES (...)` em `full_setup.sql` continuava com 9 valores por tupla (sobra das duas colunas removidas). Isso causava `ERROR 1136 (Column count doesn't match value count)` ao inicializar o banco do zero via Docker.

- Removidos os dois campos extras (posições 6 e 7) de **155 tuplas** nos dois batches de INSERT (IDs 1063–1124 e IDs 1187–1247).
- Todos os 123 tuplas resultantes têm exatamente 7 valores, alinhados ao schema atual.

#### 2. Inconsistência corrigida — `ABONO_NIVER` sem código na tabela `tipos_lancamento`
O seed data de `tipos_lancamento` tinha `codigo = NULL` para `ABONO_NIVER`, enquanto `src/types.ts` e `backend/scripts/backfill_resumo_recesso.py` usavam o código `'00717'`. Um banco inicializado do zero ficaria com o código errado, podendo causar divergência nos relatórios de frequência.

- Corrigido: `('ABONO_NIVER', 'ABONO ANIVERSÁRIO', NULL)` → `('ABONO_NIVER', 'ABONO ANIVERSÁRIO', '00717')`.

### Validação:
- Todos os tuplas de `lancamentos_diarios` têm 7 valores (correto).
- `SELECT nome, codigo FROM tipos_lancamento WHERE nome='ABONO_NIVER'` deve retornar `'00717'`.
- ⚠️ **Lembrete**: nunca testar `full_setup.sql` contra o banco real — ver nota crítica abaixo.

---

## [2026-07-31] Sincronização de Migrations Pendentes + full_setup.sql

### Arquivos Modificados/Criados:
- **migrations/020_create_vw_atestados_comparecimento.sql**: Adicionado `INSERT IGNORE INTO schema_migrations (version) VALUES ('020');` ao final, seguindo o padrão das migrations 018/019 (o arquivo original não se auto-registrava).
- **migrations/README.md**: Nota sobre a correção acima.
- **full_setup.sql**: Sincronizado com o schema real do banco — estava desatualizado desde a criação das migrations 011-020.
- **README.md**: Documentadas as views existentes (nenhuma estava listada antes) e a tabela `schema_migrations`.

### Diagnóstico:
Auditoria do banco real (`meu-mysql`/`folhaponto_db`) via `SHOW TABLES`/`SHOW FULL TABLES WHERE Table_type='VIEW'` contra `schema_migrations` revelou:
- Migrations **018** (`schema_migrations`), **019** (unique key em `recessos`) e **020** (view de comparecimento) nunca haviam sido aplicadas ao banco — aplicadas nesta sessão.
- `full_setup.sql` não continha a tabela `schema_migrations`, nem `recessos`, nem nenhuma das 4 views existentes (`vw_folhas_lancamento`, `vw_adicional_noturno`, `vw_relatorio_atestados_bimestrais`, `vw_relatorio_atestados_comparecimento`).
- `vw_folhas_lancamento` e `vw_adicional_noturno` existem no banco **sem migration correspondente** — criadas manualmente fora do fluxo rastreado. Reconstruídas em `full_setup.sql` a partir do `SHOW CREATE VIEW` atual do banco.

### 🔴 Armadilha crítica registrada — NUNCA testar `full_setup.sql` contra o banco real
`full_setup.sql` começa com `CREATE DATABASE folhaponto_db; USE folhaponto_db;` — **hardcoded**. Rodar o arquivo via `mysql < full_setup.sql` contra o container `meu-mysql` ignora qualquer banco selecionado no cliente (mesmo `folhaponto_test`) e executa `DROP TABLE`+`CREATE TABLE`+`INSERT` de dados fictícios diretamente no `folhaponto_db` **de produção**.

Isso causou perda de dados em 2026-07-31 durante a validação desta própria mudança: `lancamentos_diarios` zerada, `folhas_ponto` e `feriados` substituídas pelos dados fictícios do arquivo. A execução só não atingiu `profissionais`/`resumo_folha`/views porque abortou antes, num erro pré-existente de `INSERT` em `lancamentos_diarios` (ver bug abaixo). Recuperação pendente via backup (`/media/luiz/Data2/backup.folhaponto/`, mais recente 30/07/2026 17:59) + replay de binlog (`log_bin=ON`, container tem binlogs `.000024`–`.000034`).

**Regra permanente**: para validar `full_setup.sql`, ou (a) editar temporariamente o `CREATE DATABASE`/`USE` para um nome de teste antes de rodar e reverter depois, ou (b) rodar num container MySQL efêmero/descartável, nunca contra `meu-mysql`.

### 🔴 Bug pré-existente não corrigido — dados de `lancamentos_diarios` desalinhados
A tabela `lancamentos_diarios` tem 7 colunas desde a migration 015 (remoção de `observacao`/`observacao_turno2`), mas o bloco `INSERT INTO lancamentos_diarios VALUES (...)` em `full_setup.sql` ainda tem 9 valores por linha (sobra das colunas removidas). Causa `ERROR 1136: Column count doesn't match value count`. Não corrigido nesta sessão — precisa de nova extração de dados fictícios com a contagem de colunas correta.

---

## [2026-06-15] View de Atestados Bimestrais (Migration 016)

### Arquivos Modificados/Criados:
- **migrations/016_create_vw_eventos_consolidados.sql**: Nova migration criada e aplicada.

### Alterações:
- Criada a view `vw_relatorio_atestados_bimestrais`.
- Lógica utiliza `NOT EXISTS` para identificar o início de sequências de dias consecutivos de atestado, contando o bloco todo como 1 ocorrência.
- Suporta meses 0-indexed (Jan=0) do sistema.

---

## [2026-06-10] Remoção de Colunas Mortas (Migration 015)

### Arquivos Modificados/Criados:
- **migrations/015_remove_observacao_columns.sql**: Nova migration criada e aplicada
- **full_setup.sql**: Removidas linhas de definição das colunas `observacao` e `observacao_turno2`

### Alterações:
#### 1. `lancamentos_diarios` — DROP COLUMN
- Removida coluna `observacao TEXT` (turno 1).
- Removida coluna `observacao_turno2 TEXT` (turno 2).

### Causa Raiz:
Investigação revelou que estes campos armazenavam o `label` de feriados/recessos quando aplicados, mas o dado nunca era exibido em nenhuma tela (TimesheetGrid, TimesheetPreview) nem no relatório de Lançamentos Efetuados (a coluna "Obs" hardcodeiava `''`). Campos mortos sem nenhum consumidor real.

### Impacto:
- Schema mais enxuto. Nenhuma funcionalidade afetada.
- Migration `003_add_second_turn_columns.sql` adicionava ambas as colunas — em bancos existentes que ainda não rodaram a 015, as colunas permanecem até a execução da migration.

---

## [2026-06-09] Adição de Tipos de Afastamento (Migrations 013 e 014)

### Arquivos Modificados/Criados:
- **migrations/013_add_type_afast_casamento_art_62_lei.sql**: Nova migration.
- **migrations/014_add_type_afast_falecimento_familia_lei.sql**: Nova migration.
- **full_setup.sql**: Adicionados tipos via `INSERT IGNORE INTO tipos_lancamento`.

### Alterações:
- Adicionados tipos `AFAST CASAMENTO ART 62 LEI` e `AFAST FALECIMENTO FAMILIA LEI`.
- Inserção na tabela lookup `tipos_lancamento`.

---

## [2026-06-09] Criação da Tabela de Recessos (Migration 012)

### Arquivos Modificados/Criados:
- **migrations/012_create_recessos_table.sql**: Nova migration criada e aplicada

### Alterações:
#### 1. Nova tabela `recessos`
- Criada com colunas `id INT PK AUTO_INCREMENT`, `dia_inicio INT`, `mes_inicio INT`, `ano_inicio INT`, `dia_fim INT`, `mes_fim INT`, `ano_fim INT`, `label VARCHAR(255)` e `criado_em TIMESTAMP`.
- Sem restrição de unicidade — permite recessos sobrepostos ou que cruzem meses.
- Diferente de `feriados` (ponto único), um recesso representa um intervalo de datas.

### Objetivo:
Persistir períodos de recesso com data de início e fim para reutilização entre folhas. O modal `HolidayModal` aplica o tipo `RECESSO` a todos os dias do range que pertencem ao mês/ano da folha aberta.

---

## [2026-05-03] Criação da Tabela de Feriados (Migration 011)

### Arquivos Modificados/Criados:
- **migrations/011_create_feriados_table.sql**: Nova migration criada
- **full_setup.sql**: Tabela `feriados` adicionada

### Alterações:
#### 1. Nova tabela `feriados`
- Criada com colunas `id INT PK AUTO_INCREMENT`, `dia INT`, `mes INT`, `ano INT`, `label VARCHAR(255)` e `criado_em TIMESTAMP`.
- Definida `UNIQUE KEY` para a composição `(dia, mes, ano)` evitando feriados duplicados no mesmo dia.
- Esta tabela permitirá que o sistema gerencie (CRUD) os feriados de forma centralizada e persistente na base de dados em vez de depender de `localStorage`.

### Validação:
- Script `full_setup.sql` atualizado e validado.
- Tabela inserida com sucesso no banco de dados.

---

## [2026-05-01] Refatoração Completa dos Tipos de Lançamento (Migration 010)

### Arquivos Modificados/Criados:
- **migrations/010_refactor_tipos_lancamento.sql**: Nova migration criada e aplicada
- **full_setup.sql**: ENUM → VARCHAR(80), tabela `tipos_lancamento` adicionada, seed data corrigido
- **migrations/001_create_tables.sql**: ENUM → VARCHAR(80), tabela `tipos_lancamento` adicionada
- **README.md**: Documentação atualizada com nova tabela e lista completa de tipos

### Alterações:

#### 1. Nova tabela `tipos_lancamento` (lookup)
- Criada com colunas `valor VARCHAR(80) PK`, `label VARCHAR(150)`, `codigo VARCHAR(20) NULL`
- Populada com 21 tipos de lançamento oficiais com seus respectivos labels e códigos
- Serve como fonte de verdade para todos os tipos válidos do sistema

#### 2. Migração ENUM → VARCHAR(80)
- `lancamentos_diarios.tipo` e `tipo_turno2` convertidos de ENUM para `VARCHAR(80)`
- Elimina a necessidade de `ALTER TABLE` a cada novo tipo adicionado
- Dados existentes preservados integralmente

#### 3. Migração de values antigos (UPDATE em dados existentes)
| value antigo | value novo | registros afetados (tipo + turno2) |
|---|---|---|
| `ATESTADO` | `ATESTADO MEDICO DE ATE 03` | 15 |
| `LICENCA` | `LICENCA MEDICA OU` | 21 |
| `ABONO` | `ABONO DE PONTO ART 151 LEI` (merge) | 2 |
| `TRE` | `Abono TRE` | 0 |

#### 4. Novos tipos adicionados
- `PONTO FACULTATIVO` (código 00000)
- `ATESTADO COMPARECIMENTO A` (código 00343)
- `ATESTADO COMPARECIMENTO P.` (código 00341)
- `EXAME MEDICO PREV/PERIOD ART` (código 00118)

#### 5. Correção no seed data (`full_setup.sql`)
- 3 registros com value `'LICENCA'` (obsoleto) corrigidos para `'LICENCA MEDICA OU'`
- IDs afetados: 1092, 1093, 1124

### Causa Raiz:
Sistema precisava associar códigos oficiais (ex: 00294, 99902) a cada tipo de lançamento para uso nos formulários e relatórios. O ENUM hardcoded impedia adições flexíveis e não comportava o campo `codigo`.

### Impacto:
- ✅ 21 tipos de lançamento com codes oficiais registrados
- ✅ Novo container Docker inicializa com schema e seed corretos
- ✅ Adição de novos tipos não requer mais ALTER TABLE de ENUM
- ✅ `add_entry_type.py` corrigido para gerar entries com campo `code`

### Validação:
- Migration aplicada ao container `meu-mysql` sem erros
- `SELECT COUNT(*) FROM tipos_lancamento` → 21
- `vite build` → zero erros TypeScript

---

## [2026-05-01] Substituição de Dados Pessoais por Dados Fictícios

### Arquivos Modificados:
- **full_setup.sql**: Substituídos dados pessoais reais por dados fictícios na tabela `profissionais`
- **README.md**: Adicionado aviso sobre dados fictícios

### Alterações:
- **Dados Removidos (Pessoais Reais)**:
  - FULANO DE TAL SOUZA (matrícula: 0123456-7)
  - JOÃO DA SILVA (matrícula: 123456-7)
  - SERVIDORA EXEMPLO I (matrícula: 0666.666-6)

- **Dados Adicionados (Fictícios)**:
  - JOÃO DA SILVA (matrícula: 123456-7)
  - MARIA SOUZA (matrícula: 987654-3)
  - PEDRO SANTOS (matrícula: 456789-0)

### Motivo:
Segurança e privacidade de dados - eliminação de informações pessoais sensíveis do arquivo de setup usado em desenvolvimento e implantações Docker.

### Impacto:
- ✅ Nenhum dado pessoal real exposto no repositório
- ✅ Funcionalidade mantida para desenvolvimento/testes
- ✅ Estrutura do banco preservada
- ✅ Compatibilidade total com sistema existente

### Validação:
- Verificação completa de remoção de todos os dados pessoais
- Confirmação de presença apenas de dados fictícios
- Teste de integridade da estrutura do banco

---

## [2026-04-22] Adição do Tipo ABONO DE PONTO ART 151 LEI

### Arquivos Modificados/Criados:
- **migrations/004_add_abono_art151_type.sql**: Nova migration criada e aplicada
- **full_setup.sql**: ENUM atualizado em `tipo` e `tipo_turno2`
- **migrations/001_create_tables.sql**: ENUM atualizado em `tipo` e `tipo_turno2`

### Alterações:
- Adicionado `'ABONO DE PONTO ART 151 LEI'` ao ENUM das colunas `tipo` e `tipo_turno2` da tabela `lancamentos_diarios`.
- Migration aplicada ao banco existente via Docker (`folhaponto-mysql`).

### Causa Raiz:
`src/types.ts` incluía o novo tipo mas o ENUM do MySQL não o reconhecia, causando erro `1265 Data truncated for column 'tipo'` ao salvar lançamentos.

### Observação:
A partir desta data, use o script `add_entry_type.py` na raiz do projeto para adicionar novos tipos. Ele atualiza automaticamente todos os arquivos afetados (TypeScript, SQL e banco de dados).

---

## [2026-04-23] Adição do Tipo FALTA PARALISAÇÃO

### Arquivos Modificados/Criados:
- **migrations/005_add_type_falta_paralisação.sql**: Nova migration criada e aplicada
- **full_setup.sql**: ENUM atualizado em `tipo` e `tipo_turno2`
- **migrations/001_create_tables.sql**: ENUM atualizado em `tipo` e `tipo_turno2`

### Alterações:
- Adicionado `'FALTA PARALISAÇÃO'` ao ENUM das colunas `tipo` e `tipo_turno2` da tabela `lancamentos_diarios`.
- Migration gerada automaticamente pelo script `add_entry_type.py`.

---

## [2026-04-24] Adição do Tipo ATESTADO DE COMPARECIMENTO

### Arquivos Modificados/Criados:
- **migrations/006_add_type_atestado_de_comparecimento.sql**: Nova migration criada e aplicada
- **full_setup.sql**: ENUM atualizado em `tipo` e `tipo_turno2`
- **migrations/001_create_tables.sql**: ENUM atualizado em `tipo` e `tipo_turno2`

### Alterações:
- Adicionado `'ATESTADO DE COMPARECIMENTO'` ao ENUM das colunas `tipo` e `tipo_turno2` da tabela `lancamentos_diarios`.
- Migration gerada automaticamente pelo script `add_entry_type.py`.

---

## [2026-04-25] Adição de Múltiplos Tipos de Lançamento

### Arquivos Modificados/Criados:
- **migrations/007_add_type_lic_acomp_pessoa_doente.sql**: Nova migration criada e aplicada
- **full_setup.sql**: ENUM atualizado em `tipo` e `tipo_turno2`
- **migrations/001_create_tables.sql**: ENUM atualizado em `tipo` e `tipo_turno2`

### Alterações:
- Adicionados múltiplos tipos ao ENUM das colunas `tipo` e `tipo_turno2` da tabela `lancamentos_diarios`:
  - `'AFAST DOACAO SANGUE ART 62'`
  - `'LIC. ACOMP. PESSOA DOENTE'`
  - `'ABONO DE PONTO BIMESTRAL LEI'`
- Migration gerada automaticamente pelo script `add_entry_type.py`.

### Observação:
Nesta mesma data, o tipo `'SUSPENSAO'` também foi adicionado manualmente ao schema, estando presente no `full_setup.sql` mas sem migration específica.

---

## [2026-04-17] Sincronização do Schema com Estado Atual do Banco

### Arquivos Modificados:
- **full_setup.sql**: Adicionadas colunas `tipo_turno2` e `observacao_turno2` na tabela `lancamentos_diarios`
- **migrations/001_create_tables.sql**: Atualizado ENUM de `tipo` (adicionados `CPIP`, `CURSO`, `ABONO_NIVER`, `FERIADO`) e adicionadas colunas `tipo_turno2`, `observacao_turno2` e índice `idx_tipo_turno2`

### Causa Raiz:
A migration `003_add_second_turn_columns.sql` adicionou as colunas ao banco já existente, mas os arquivos de criação inicial (`full_setup.sql` e `001_create_tables.sql`) não foram atualizados. Ao subir a imagem Docker em uma nova máquina, o banco era inicializado sem as colunas necessárias, causando falha no sistema.

### Impacto:
- Implantações novas via `docker-compose.yml` ou `docker-compose.prod.yml` agora criam o banco já com a estrutura completa e atualizada.
- A migration `003` continua existindo para atualizar bancos já existentes criados antes desta correção.

### Objetivo:
Garantir que `full_setup.sql` (arquivo de inicialização Docker) sempre reflita o schema atual completo, evitando divergência entre banco existente (via migrations) e banco novo (via Docker).

---

## [2026-03-31] Adição de Suporte a Segundo Turno

### Arquivos Modificados:
- **migrations/003_add_second_turn_columns.sql**: Nova migration para adicionar campos de segundo turno

### Alterações:
- **Nova Migration**:
  - Adicionada coluna `tipo_turno2` (ENUM) na tabela `lancamentos_diarios`
  - Adicionada coluna `observacao_turno2` (TEXT) na tabela `lancamentos_diarios`
  - Adicionado índice para performance em `tipo_turno2`
  - Campos definidos como NULL para compatibilidade com dados existentes

### Execução:
- Migration executada com sucesso no container Docker `meu-mysql`
- Comando: `docker exec -i meu-mysql mysql -u root -p'123456' folhaponto_db < migrations/003_add_second_turn_columns.sql`

### Objetivo:
Implementar suporte a lançamentos independentes por turno, permitindo tipos diferentes para cada turno no mesmo dia.

---

## [2026-03-26] Remoção de Colunas de Horário

**Data:** 2026-03-26
**Objetivo:** Ajustar schema para remover colunas de horário obsoletas.

### Arquivo Modificado:
1. **migrations/001_create_tables.sql**:
   - Remoção das definições de coluna `entrada1, entrada2, saida1, saida2` na criação da tabela `lancamentos_diarios`.
   
**Nota:** Foi executado um comando `ALTER TABLE` manualmente no container Docker para sincronizar o banco de dados ativo.
