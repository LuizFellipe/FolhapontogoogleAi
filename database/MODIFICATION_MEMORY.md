# Memória de Modificação - Database (database/)

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
