# Migrações do Banco de Dados

Esta pasta contém os scripts SQL necessários para inicializar e atualizar a estrutura do banco de dados MySQL do sistema.

## Arquivos

### `001_create_tables.sql`
Script principal de inicialização que realiza as seguintes operações:
- Cria o banco de dados `folhaponto_db`.
- Define o conjunto de caracteres para `utf8mb4` (suporte total a Unicode).
- Cria a tabela `profissionais`: Armazena os dados cadastrais dos servidores (nome, matrícula, cargo, lotação, turnos, etc.).
- Cria a tabela `folhas_ponto`: Cabeçalho da folha de cada mês/ano vinculada a um profissional.
- Cria a tabela `lancamentos_diarios`: Registra as ocorrências de cada dia com suporte a dois turnos independentes (`tipo`/`observacao` para turno 1 e `tipo_turno2`/`observacao_turno2` para turno 2). ENUM completo: `TRABALHO`, `FERIAS`, `RECESSO`, `ATESTADO`, `LICENCA`, `FALTA`, `TRE`, `ABONO`, `CPIP`, `CURSO`, `ABONO_NIVER`, `FERIADO`.
- Cria a tabela `resumo_folha`: Armazena os dados da segunda página (resumo de frequência e códigos de operação).
- Insere um usuário de exemplo para testes iniciais.

### `002_make_matricula_optional.sql`
Torna a coluna `matricula` da tabela `profissionais` opcional (NULL), permitindo cadastro de servidores sem matrícula.

### `003_add_second_turn_columns.sql`
Adiciona `tipo_turno2` e `observacao_turno2` à tabela `lancamentos_diarios` para suporte a lançamentos independentes por turno.
> **Nota:** Esta migration aplica-se apenas a bancos **já existentes** criados antes de 2026-04-17. Bancos novos criados via Docker já contêm estas colunas diretamente no `001_create_tables.sql` e `full_setup.sql`.

## Como Executar
Estes scripts são aplicados automaticamente pelo script `start_backend.sh` na raiz do projeto ou podem ser importados manualmente via:
```bash
mysql -u root -p < 001_create_tables.sql
```
