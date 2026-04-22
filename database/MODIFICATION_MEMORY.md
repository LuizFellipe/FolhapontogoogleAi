# Memória de Modificação - Database (database/)

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
