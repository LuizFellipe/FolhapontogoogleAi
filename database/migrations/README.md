### `004_add_abono_art151_type.sql`
Adiciona o valor `'ABONO DE PONTO ART 151 LEI'` ao ENUM das colunas `tipo` e `tipo_turno2` da tabela `lancamentos_diarios`.
> **Nota:** Aplica-se apenas a bancos criados antes de 2026-04-22. Bancos novos já inicializam com o valor incluído no `001_create_tables.sql` e `full_setup.sql`.

### `005_add_type_falta_paralisação.sql`
Adiciona o valor `'FALTA PARALISAÇÃO'` ao ENUM das colunas `tipo` e `tipo_turno2` da tabela `lancamentos_diarios`.
> **Nota:** Aplica-se apenas a bancos criados antes de 2026-04-23.

### `006_add_type_atestado_de_comparecimento.sql`
Adiciona o valor `'ATESTADO DE COMPARECIMENTO'` ao ENUM das colunas `tipo` e `tipo_turno2` da tabela `lancamentos_diarios`.
> **Nota:** Aplica-se apenas a bancos criados antes de 2026-04-24.

### `007_add_type_lic_acomp_pessoa_doente.sql`
Adiciona o valor `'AFAST DOACAO SANGUE ART 62'` ao ENUM das colunas `tipo` e `tipo_turno2` da tabela `lancamentos_diarios`.
> **Nota:** Aplica-se apenas a bancos criados antes de 2026-04-25.

### `008_add_type_abono_de_ponto_bimestral_lei.sql`
Adiciona os valores `'LIC. ACOMP. PESSOA DOENTE'` e `'ABONO DE PONTO BIMESTRAL LEI'` ao ENUM das colunas `tipo` e `tipo_turno2` da tabela `lancamentos_diarios`.
> **Nota:** Aplica-se apenas a bancos criados antes de 2026-04-25.

### `009_add_type_afast_doacao_sangue_art_62.sql`
Adiciona o valor `'ABONO DE PONTO BIMESTRAL LEI'` ao ENUM das colunas `tipo` e `tipo_turno2` da tabela `lancamentos_diarios`.
> **Nota:** Aplica-se apenas a bancos criados antes de 2026-04-25.

## Como Adicionar Novos Tipos de Lançamento# Migrações do Banco de Dados

Esta pasta contém os scripts SQL necessários para inicializar e atualizar a estrutura do banco de dados MySQL do sistema.

## Arquivos

### `001_create_tables.sql`
Script principal de inicialização que realiza as seguintes operações:
- Cria o banco de dados `folhaponto_db`.
- Define o conjunto de caracteres para `utf8mb4` (suporte total a Unicode).
- Cria a tabela `profissionais`: Armazena os dados cadastrais dos servidores (nome, matrícula, cargo, lotação, turnos, etc.).
- Cria a tabela `folhas_ponto`: Cabeçalho da folha de cada mês/ano vinculada a um profissional.
- Cria a tabela `lancamentos_diarios`: Registra as ocorrências de cada dia com suporte a dois turnos independentes (`tipo`/`observacao` para turno 1 e `tipo_turno2`/`observacao_turno2` para turno 2). ENUM completo: `TRABALHO`, `FERIAS`, `RECESSO`, `ATESTADO`, `LICENCA`, `FALTA`, `TRE`, `ABONO`, `CPIP`, `CURSO`, `ABONO_NIVER`, `FERIADO`, `ABONO DE PONTO ART 151 LEI`.
- Cria a tabela `resumo_folha`: Armazena os dados da segunda página (resumo de frequência e códigos de operação).
- Insere um usuário de exemplo para testes iniciais.

### `002_make_matricula_optional.sql`
Torna a coluna `matricula` da tabela `profissionais` opcional (NULL), permitindo cadastro de servidores sem matrícula.

### `003_add_second_turn_columns.sql`
Adiciona `tipo_turno2` e `observacao_turno2` à tabela `lancamentos_diarios` para suporte a lançamentos independentes por turno.
> **Nota:** Esta migration aplica-se apenas a bancos **já existentes** criados antes de 2026-04-17. Bancos novos criados via Docker já contêm estas colunas diretamente no `001_create_tables.sql` e `full_setup.sql`.

### `004_add_abono_art151_type.sql`
Adiciona o valor `'ABONO DE PONTO ART 151 LEI'` ao ENUM das colunas `tipo` e `tipo_turno2` da tabela `lancamentos_diarios`.
> **Nota:** Aplica-se apenas a bancos criados antes de 2026-04-22. Bancos novos já inicializam com o valor incluído no `001_create_tables.sql` e `full_setup.sql`.

### `010_refactor_tipos_lancamento.sql`
Refatoração completa: converte `tipo`/`tipo_turno2` de ENUM para `VARCHAR(80)` e cria a tabela lookup `tipos_lancamento` com 21 tipos oficiais e seus códigos.

### `011_create_feriados_table.sql`
Cria a tabela `feriados` (`id`, `dia`, `mes`, `ano`, `label`, `criado_em`) com `UNIQUE KEY (dia, mes, ano)` para evitar duplicatas.

### `012_create_recessos_table.sql`
Cria a tabela `recessos` (`id`, `dia_inicio`, `mes_inicio`, `ano_inicio`, `dia_fim`, `mes_fim`, `ano_fim`, `label`, `criado_em`) para armazenar períodos de recesso com data de início e fim.

## Como Adicionar Novos Tipos de Lançamento

Use o script interativo na raiz do projeto — ele atualiza automaticamente `types.ts`, os SQLs e aplica a migration no banco:

```bash
python3 add_entry_type.py
```

## Como Executar Manualmente
Estes scripts são aplicados automaticamente pelo script `start_backend.sh` na raiz do projeto ou podem ser importados manualmente via:
```bash
mysql -u root -p < 001_create_tables.sql
```
