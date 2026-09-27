# Migrações do Banco de Dados

Esta pasta contém os scripts SQL necessários para inicializar e atualizar a estrutura do banco de dados MySQL do sistema.

## Arquivos

### `001_create_tables.sql`
Script principal de inicialização que realiza as seguintes operações:
- Cria o banco de dados `folhaponto_db`.
- Define o conjunto de caracteres para `utf8mb4` (suporte total a Unicode).
- Cria a tabela `profissionais`: Armazena os dados cadastrais dos servidores (nome, matrícula, cargo, lotação, turnos, etc.).
- Cria a tabela `folhas_ponto`: Cabeçalho da folha de cada mês/ano vinculada a um profissional.
- Cria a tabela `lancamentos_diarios`: Registra as ocorrências de cada dia com suporte a dois turnos independentes (`tipo` para turno 1 e `tipo_turno2` para turno 2). ENUM completo: `TRABALHO`, `FERIAS`, `RECESSO`, `ATESTADO`, `LICENCA`, `FALTA`, `TRE`, `ABONO`, `CPIP`, `CURSO`, `ABONO_NIVER`, `FERIADO`, `ABONO DE PONTO ART 151 LEI`.
- Cria a tabela `resumo_folha`: Armazena os dados da segunda página (resumo de frequência e códigos de operação).
- Insere um usuário de exemplo para testes iniciais.

### `002_make_matricula_optional.sql`
Torna a coluna `matricula` da tabela `profissionais` opcional (NULL), permitindo cadastro de servidores sem matrícula.

### `003_add_second_turn_columns.sql`
Adiciona `tipo_turno2` à tabela `lancamentos_diarios` para suporte a lançamentos independentes por turno. *(Nota: também adicionava `observacao_turno2`, removida pela migration 015.)*
> **Nota:** Esta migration aplica-se apenas a bancos **já existentes** criados antes de 2026-04-17. Bancos novos criados via Docker já contêm `tipo_turno2` diretamente no `001_create_tables.sql` e `full_setup.sql`.

### `004_add_abono_art151_type.sql`
Adiciona o valor `'ABONO DE PONTO ART 151 LEI'` ao ENUM das colunas `tipo` e `tipo_turno2` da tabela `lancamentos_diarios`.
> **Nota:** Aplica-se apenas a bancos criados antes de 2026-04-22. Bancos novos já inicializam com o valor incluído no `001_create_tables.sql` e `full_setup.sql`.

### `005_add_type_falta_paralisacao.sql`
Adiciona o valor `'FALTA PARALISAÇÃO'` ao ENUM das colunas `tipo` e `tipo_turno2` da tabela `lancamentos_diarios`.
> **Nota:** Aplica-se apenas a bancos criados antes de 2026-04-23.

### `006_add_type_atestado_de_comparecimento.sql`
Adiciona o valor `'ATESTADO DE COMPARECIMENTO'` ao ENUM das colunas `tipo` e `tipo_turno2` da tabela `lancamentos_diarios`.
> **Nota:** Aplica-se apenas a bancos criados antes de 2026-04-24.

### `007_add_type_lic_acomp_pessoa_doente.sql`
Adiciona os valores `'LIC. ACOMP. PESSOA DOENTE'`, `'AFAST DOACAO SANGUE ART 62'` e `'ABONO DE PONTO BIMESTRAL LEI'` ao ENUM das colunas `tipo` e `tipo_turno2` da tabela `lancamentos_diarios`.
> **Nota:** Aplica-se apenas a bancos criados antes de 2026-04-25.

### `008_add_type_abono_de_ponto_bimestral_lei.sql`
Garante a adição do valor `'ABONO DE PONTO BIMESTRAL LEI'` ao ENUM das colunas `tipo` e `tipo_turno2` da tabela `lancamentos_diarios`.
> **Nota:** Aplica-se apenas a bancos criados antes de 2026-04-25.

### `009_add_type_afast_doacao_sangue_art_62.sql`
Garante a adição do valor `'AFAST DOACAO SANGUE ART 62'` ao ENUM das colunas `tipo` e `tipo_turno2` da tabela `lancamentos_diarios`.
> **Nota:** Aplica-se apenas a bancos criados antes de 2026-04-25.

### `010_refactor_tipos_lancamento.sql`
Refatoração completa: converte `tipo`/`tipo_turno2` de ENUM para `VARCHAR(80)` e cria a tabela lookup `tipos_lancamento` com 21 tipos oficiais e seus códigos.

### `011_create_feriados_table.sql`
Cria a tabela `feriados` (`id`, `dia`, `mes`, `ano`, `label`, `criado_em`) com `UNIQUE KEY (dia, mes, ano)` para evitar duplicatas.

### `012_add_type_tracejado.sql`
Adiciona o tipo `'TRACEJADO'` à tabela de lookup `tipos_lancamento`.

### `013_add_type_afast_casamento_art_62_lei.sql`
Adiciona o valor `'AFAST CASAMENTO ART 62 LEI'` à tabela lookup de tipos de lançamento.

### `014_add_type_afast_falecimento_familia_lei.sql`
Adiciona o valor `'AFAST FALECIMENTO FAMILIA LEI'` à tabela lookup de tipos de lançamento.

### `015_remove_observacao_columns.sql`
Remove as colunas `observacao` e `observacao_turno2` da tabela `lancamentos_diarios`. Estes campos armazenavam labels de feriado/recesso quando aplicados, mas nunca foram exibidos em nenhuma tela ou relatório do sistema — eram dados mortos.

### `016_create_vw_eventos_consolidados.sql`
Cria a view `vw_relatorio_atestados_bimestrais` para contagem de atestados médicos agrupados por bimestre civil, considerando dias consecutivos como uma única ocorrência.

### `017_create_recessos_table.sql`
Cria a tabela `recessos` (`id`, `dia_inicio`, `mes_inicio`, `ano_inicio`, `dia_fim`, `mes_fim`, `ano_fim`, `label`, `criado_em`) para armazenar períodos de recesso com data de início e fim.

### `018_create_schema_migrations.sql`
Cria a tabela `schema_migrations(version, applied_at)` para rastrear quais migrations já foram aplicadas em cada banco. Marca retroativamente `001`-`018` como aplicadas.

### `019_recessos_unique_constraint.sql`
Adiciona `UNIQUE KEY unique_recesso_periodo` na tabela `recessos` (dia/mês/ano de início e fim), evitando períodos duplicados.

### `020_create_vw_atestados_comparecimento.sql`
Cria a view `vw_relatorio_atestados_comparecimento` para contagem mensal de atestados de comparecimento, agrupados por profissional/ano. Colunas `mes0..mes11` (meses 0-indexed). Cobre dois tipos em conjunto:
- `ATESTADO DE COMPARECIMENTO` (servidor)
- `ATESTADO COMPARECIMENTO P.` (pessoa da família)

`ATESTADO COMPARECIMENTO A` (acompanhante/subsaúde) **não** é contabilizado nesta view.
Cada dia conta como 1 ocorrência (sem colapso de sequências, diferente da view bimestral).
Utilizada pelo endpoint `/api/atestados-comparecimento` para enforçar o limite de **12 comparecimentos/ano**.
> Corrigido em 2026-07-31: o arquivo original não fazia `INSERT INTO schema_migrations`, diferente do padrão das migrations 018/019. Agora finaliza com `INSERT IGNORE INTO schema_migrations (version) VALUES ('020');`.

### `021_add_status_profissionais.sql`
Adiciona a coluna `status ENUM('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO'` e o índice `idx_status` na tabela `profissionais`. Permite marcar o vínculo de profissionais como ativo ou inativo sem apagar o histórico de folhas de ponto.
> Finaliza registrando `021` na tabela `schema_migrations`.

### `022_add_disciplina_profissionais.sql`
Adiciona o campo `disciplina VARCHAR(255) NULL` na tabela `profissionais`.
> Finaliza registrando `022` na tabela `schema_migrations`.

### `023_create_dados_complementares_sigep.sql`
Cria a arquitetura relacional para dados complementares do SIGEP (Ficha Cadastral) sem duplicação dos dados já existentes em `profissionais`:
- `profissionais_complementar` (relação 1:1 com `profissionais`, dados pessoais e documentais como CPF, CI/RG, PIS, Nascimento, Filiação, Endereço, Telefones, etc.)
- `profissional_cargas_horarias` (relação 1:N com histórico de cargas horárias principal/secundária, unidades, CRE, turnos e atuação)
- `profissional_cursos` (relação 1:N com cursos de formação, progressões, leis e cargas horárias)
- `profissional_habilitacoes` (relação 1:N com habilitações funcionais)
- `profissional_componentes` (relação 1:N com componentes curriculares autorizados)
> Finaliza registrando `023` na tabela `schema_migrations`.

### `024_drop_colunas_redundantes_sigep.sql`
Remove `matricula` e `criado_em` das 4 tabelas 1:N do SIGEP (matrícula derivável via `profissional_id`; linhas são recriadas a cada sync). Usa `DROP COLUMN IF EXISTS` (MariaDB), idempotente para bancos criados já com a 023 enxuta.
> Finaliza registrando `024` na tabela `schema_migrations`.

### `025_amplia_pcd_readaptado_sigep.sql`
Amplia `profissionais_complementar.pcd` para `VARCHAR(100)` (valores como `SIM - DEFICIENCIA FISICA`) e `readaptado` para `TEXT` (texto do laudo passa de 255). Corrige erro 1406 no sync SIGEP.
> Finaliza registrando `025` na tabela `schema_migrations`.

### `026_create_sigep_eventos_sync.sql`
Cria `sigep_eventos_sync`: uma linha por range do Relatório de Eventos (`folha_ponto_id`, `tipo`, `dia_inicio`, `dia_fim`) já sincronizado no SIGEP, com `status` (`JA_EXISTIA`/`LANCADO`) e `sincronizado_em`. Gravada por `sigep/lancar_eventos.py` via `POST /api/sigep/eventos/sync`.
> Finaliza registrando `026` na tabela `schema_migrations`.

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
