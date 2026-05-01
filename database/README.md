# Camada de Dados (Database)

Esta pasta centraliza a gestão de persistência do sistema Folha de Ponto.

## Estrutura da Pasta

-   **`migrations/`**: Contém scripts SQL para criação e evolução automática do esquema do banco de dados MySQL.
-   **`MODIFICATION_MEMORY.md`**: Registro histórico de alterações estruturais e melhorias aplicadas nesta camada.

## Descrição do Modelo de Dados

O banco de dados `folhaponto_db` utiliza um modelo estruturado para representar os formulários oficiais da Secretaria de Educação:

1.  **`profissionais`**: Entidade central que mapeia os dados cadastrais (Matrícula, Nome, UA, Exercício, Lotação, Carga Horária e Turnos).
2.  **`folhas_ponto`**: Vincula um profissional a um período específico (Mês/Ano). É o container principal dos lançamentos.
3.  **`lancamentos_diarios`**: Armazena as ocorrências de cada dia do mês, selecionando tipos predefinidos para cada turno. ENUM completo: `TRABALHO`, `FERIAS`, `RECESSO`, `ATESTADO`, `LICENCA`, `FALTA`, `TRE`, `ABONO`, `CPIP`, `CURSO`, `ABONO_NIVER`, `FERIADO`, `ABONO DE PONTO ART 151 LEI`, `SUSPENSAO`, `FALTA PARALISAÇÃO`, `ATESTADO DE COMPARECIMENTO`, `AFAST DOACAO SANGUE ART 62`, `LIC. ACOMP. PESSOA DOENTE`, `ABONO DE PONTO BIMESTRAL LEI`. Inclui suporte a `tipo_turno2` e `observacao_turno2` para lançamentos independentes por turno.
4.  **`resumo_folha`**: Contém as entradas do "Resumo de Frequência" (Página 2), mapeando códigos de operação (I/A/E), códigos de ocorrência e períodos.

## Arquivo de Inicialização Docker

O arquivo **`full_setup.sql`** é o script usado pelos containers Docker (`docker-compose.yml` e `docker-compose.prod.yml`) para inicializar o banco de dados em novas implantações. Ele **sempre deve refletir o schema completo e atualizado**, incluindo todas as colunas adicionadas por migrations posteriores.

> **⚠️ Dados Fictícios:** Este arquivo contém apenas dados fictícios para desenvolvimento e testes. Nomes como "JOÃO DA SILVA", "MARIA SOUZA" e "PEDRO SANTOS" são exemplos criados para demonstrar a funcionalidade do sistema sem expor informações pessoais reais.

> **Importante:** Ao adicionar uma nova migration em `migrations/`, atualize também o `full_setup.sql` para que novas implantações Docker já iniciem com o schema correto.
> Para adicionar novos tipos de lançamento, use o script interativo na raiz: `python3 add_entry_type.py`. Ele atualiza automaticamente `src/types.ts`, `full_setup.sql`, `001_create_tables.sql` e aplica a migration no banco.

## Características Técnicas
-   **MySQL 8+**: Sistema de gerenciamento de banco de dados utilizado.
-   **Chaves Estrangeiras**: Integridade garantida com exclusão em cascata (ao deletar um profissional, suas folhas e lançamentos são removidos).
-   **Índices**: Otimizado para busca rápida por matrícula de servidor e período de folha.
