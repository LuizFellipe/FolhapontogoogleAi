# Camada de Dados (Database)

Esta pasta centraliza a gestão de persistência do sistema Folha de Ponto.

## Estrutura da Pasta

-   **`migrations/`**: Contém scripts SQL para criação e evolução automática do esquema do banco de dados MySQL.

## Descrição do Modelo de Dados

O banco de dados `folhaponto_db` utiliza um modelo estruturado para representar os formulários oficiais de frequência:

1.  **`profissionais`**: Entidade central que mapeia os dados cadastrais (Matrícula, Nome, UA, Exercício, Lotação, Carga Horária e Turnos).
2.  **`folhas_ponto`**: Vincula um profissional a um período específico (Mês/Ano). É o container principal dos lançamentos.
3.  **`lancamentos_diarios`**: Armazena as ocorrências de cada dia do mês. O campo `tipo` (e `tipo_turno2`) é `VARCHAR(80)` vinculado à tabela `tipos_lancamento`. Tipos válidos: `TRABALHO`, `FERIAS`, `ATESTADO MEDICO DE ATE 03`, `LICENCA MEDICA OU`, `FALTA`, `Abono TRE`, `ABONO DE PONTO ART 151 LEI`, `CPIP`, `CURSO`, `ABONO_NIVER`, `FERIADO`, `FALTA PARALISAÇÃO`, `ATESTADO DE COMPARECIMENTO`, `LIC. ACOMP. PESSOA DOENTE`, `AFAST DOACAO SANGUE ART 62`, `ABONO DE PONTO BIMESTRAL LEI`, `RECESSO`, `PONTO FACULTATIVO`, `ATESTADO COMPARECIMENTO A`, `ATESTADO COMPARECIMENTO P.`, `EXAME MEDICO PREV/PERIOD ART`, `TRACEJADO`, `AFAST CASAMENTO ART 62 LEI`, `AFAST FALECIMENTO FAMILIA LEI`. Suporta dois turnos independentes via `tipo` (turno 1) e `tipo_turno2` (turno 2).
4.  **`tipos_lancamento`**: Tabela lookup com todos os tipos de lançamento válidos (`valor`, `label`, `codigo`). Fonte de verdade para os tipos — sempre consultar esta tabela ao adicionar novos tipos.
5.  **`resumo_folha`**: Contém as entradas do "Resumo de Frequência" (Página 2), mapeando códigos de operação (I/A/E), códigos de ocorrência e períodos.
6.  **`feriados`**: Tabela dedicada para gestão de feriados. Armazena o `dia`, `mes`, `ano` e um `label` (ex: FERIADO - NATAL), garantindo a persistência global para fácil reutilização sem precisar digitar nomes manualmente todas as vezes.
7.  **`recessos`**: Armazena períodos de recesso com data de início (`dia_inicio`, `mes_inicio`, `ano_inicio`) e fim (`dia_fim`, `mes_fim`, `ano_fim`) e um `label`. Possui `UNIQUE KEY` na composição completa do período (migration 019) para evitar duplicatas exatas — ainda permite recessos sobrepostos ou que cruzem meses. Ao aplicar, todos os dias do range que pertencem ao mês/ano da folha atual são marcados como tipo `RECESSO`.
8.  **`schema_migrations`**: Tabela de controle (migration 018) que registra quais migrations (`version`) já foram aplicadas ao banco. Toda migration nova deve terminar com `INSERT IGNORE INTO schema_migrations (version) VALUES ('NNN');` para se auto-registrar.

## Views

-   **`vw_folhas_lancamento`**: Achata `folhas_ponto` + `lancamentos_diarios` + `profissionais`, uma linha por dia com lançamento relevante (exclui `TRABALHO`, `CPIP`, `CURSO`, `TRACEJADO` dos dois turnos). Base para as views de relatório abaixo.
-   **`vw_adicional_noturno`**: Mesma base de `vw_folhas_lancamento`, mas filtra apenas dias de `TRABALHO` de profissionais com turno `Noturno` (turno1 ou turno2), excluindo cargo `PROFESSOR TEMPORÁRIO`.
-   **`vw_relatorio_atestados_bimestrais`** (migration 016): Conta atestados médicos (`ATESTADO MEDICO DE ATE 03`) agrupados por bimestre/ano/profissional, colapsando sequências de dias consecutivos em 1 ocorrência.
-   **`vw_relatorio_atestados_comparecimento`** (migration 020): Conta atestados de comparecimento (`ATESTADO DE COMPARECIMENTO` + `ATESTADO COMPARECIMENTO P.`) por mês/ano/profissional, sem colapsar sequências — usada para o limite anual de 12.

> **Nota:** `vw_folhas_lancamento` e `vw_adicional_noturno` existem no banco mas não possuem migration própria em `migrations/` — foram criadas manualmente fora do fluxo de rastreamento. Se precisar recriar o schema do zero, use as definições em `full_setup.sql`.

## Arquivo de Inicialização Docker

O arquivo **`full_setup.sql`** é o script usado pelos containers Docker (`docker-compose.yml` e `docker-compose.prod.yml`) para inicializar o banco de dados em novas implantações. Ele **sempre deve refletir o schema completo e atualizado**, incluindo todas as colunas adicionadas por migrations posteriores.

> **⚠️ Dados Fictícios:** Este arquivo contém apenas dados fictícios para desenvolvimento e testes. Nomes como "JOÃO DA SILVA", "MARIA SOUZA" e "PEDRO SANTOS" são exemplos criados para demonstrar a funcionalidade do sistema sem expor informações pessoais reais.

> **Importante:** Ao adicionar uma nova migration em `migrations/`, atualize também o `full_setup.sql` para que novas implantações Docker já iniciem com o schema correto.
> Para adicionar novos tipos de lançamento, use o script interativo na raiz: `python3 scripts/add_entry_type.py`. Ele atualiza `src/types.ts`, insere em `tipos_lancamento` no `full_setup.sql` e gera a migration correspondente com `INSERT IGNORE` (não modifica ENUMs — a tabela lookup é a fonte de verdade desde a migration 010).

## Características Técnicas
-   **MySQL 8+**: Sistema de gerenciamento de banco de dados utilizado.
-   **Chaves Estrangeiras**: Integridade garantida com exclusão em cascata (ao deletar um profissional, suas folhas e lançamentos são removidos).
-   **Índices**: Otimizado para busca rápida por matrícula de servidor e período de folha.
