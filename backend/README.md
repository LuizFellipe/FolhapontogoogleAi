# Camada de Backend (API)

Esta pasta contém o servidor API desenvolvido em Python para o sistema Folha de Ponto.

## Estrutura da Pasta

-   **`app.py`**: O arquivo de lógica principal da API. Define as rotas Flask para gerenciar profissionais, folhas de ponto e lançamentos.
-   **`MODIFICATION_MEMORY.md`**: Registro histórico de alterações realizadas no backend.
-   **`__pycache__/`**: Arquivos temporários gerados pelo Python (podem ser ignorados).

## Principais Responsabilidades (Funções de `app.py`)

O backend atua como intermediário entre o frontend React e o banco de dados MySQL, expondo as seguintes funcionalidades:

### 1. Gerenciamento de Conexão
-   **`get_db_connection()`**: Estabelece conexão segura com o MySQL usando variáveis de ambiente (`.env`).
-   **`execute_query()`**: Helper centralizado para executar comandos SQL (SELECT, INSERT, UPDATE, DELETE) com tratamento de erro e fechamento automático de cursores.

### 2. Endpoints de API (Rotas)

| Recurso | Método | Descrição |
|---------|--------|-----------|
| `/api/profissionais` | GET, POST | Listagem e criação de servidores. |
| `/api/profissionais/<id>` | GET, PUT, DELETE | Detalhes, atualização e exclusão de um servidor específico. |
| `/api/folhas-ponto` | GET, POST | Filtros de folhas por mês/ano e criação de novas folhas. |
| `/api/folhas-ponto/<id>` | GET, PUT, DELETE | Busca completa (folha + lançamentos + resumo), atualização e exclusão. |
| `/api/folhas-ponto/<id>/lancamentos` | POST | Salva múltiplos lançamentos diários em lote (incluindo tipo_turno2 e observacao_turno2). |
| `/api/folhas-ponto/<id>/resumo` | POST | Salva as entradas da tabela de resumo em lote. |
| `/api/health` | GET | Verifica se a API e o banco de dados estão operacionais. |

## Tecnologias Utilizadas
-   **Flask**: Micro-framework para criação da API.
-   **mysql-connector-python**: Driver oficial para comunicação com o MySQL.
-   **Flask-CORS**: Habilita o acesso do frontend à API (Cross-Origin Resource Sharing).
-   **python-dotenv**: Gerencia configurações sensíveis (DB_USER, DB_PASSWORD, etc.).

## Como Executar Localmente
O backend é iniciado através do script `start_backend.sh` na raiz, mas pode ser rodado individualmente:
```bash
python app.py
```
*Certifique-se de ter o ambiente virtual (`venv`) ativado e as dependências instaladas (`pip install -r requirements.txt`).*
