# Memória de Modificação - Database (database/)

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
