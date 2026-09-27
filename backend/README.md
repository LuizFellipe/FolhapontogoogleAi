# Camada de Backend (API)

Esta pasta contém o servidor API desenvolvido em Python para o sistema Folha de Ponto.

## Estrutura da Pasta

-   **`app.py`**: O arquivo de lógica principal da API. Define as rotas Flask para gerenciar profissionais, folhas de ponto e lançamentos.
-   **`MODIFICATION_MEMORY.md`**: Registro histórico de alterações realizadas no backend.
-   **`scripts/`**: Scripts auxiliares e de manutenção. `backfill_resumo_recesso.py` é um script **one-off histórico** para recálculo do resumo de folhas de junho/2026 — não deve ser reaproveitado para novos backfills (o dicionário `ENTRY_TYPE_CODES` interno não é atualizado; novos backfills devem consultar a tabela `tipos_lancamento` diretamente).
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
| `/api/folhas-ponto` | GET, POST | Filtros de folhas por mês/ano e criação de novas folhas (inclui matrícula e disciplina no retorno da listagem). |
| `/api/folhas-ponto/<id>` | GET, PUT, DELETE | Busca completa (folha + lançamentos + resumo + dados cadastrais do servidor incluindo disciplina), atualização e exclusão. |
| `/api/folhas-ponto/<id>/lancamentos` | POST | Salva múltiplos lançamentos diários em lote (campos: `dia`, `tipo`, `tipo_turno2`). |
| `/api/folhas-ponto/<id>/resumo` | POST | Salva as entradas da tabela de resumo em lote. |
| `/api/feriados` | GET, POST | Consulta e inserção de feriados (dia, mês, ano e label). |
| `/api/feriados/<id>` | DELETE | Remoção de um feriado. |
| `/api/recessos` | GET | Lista recessos, com filtro opcional por `ano` (`ano_inicio OR ano_fim`). |
| `/api/recessos` | POST | Cria novo recesso (dia/mes/ano início + dia/mes/ano fim + label). |
| `/api/recessos/<id>` | DELETE | Remoção de um recesso. |
| `/api/relatorio/adicional-noturno` | GET | Retorna dados de adicional noturno (apenas dias de TRABALHO). |
| `/api/sigep/eventos` | GET | Ranges do Relatório de Eventos (`mes` 0-indexed, `ano`) montados de `vw_folhas_lancamento`, com `sync_status`/`sincronizado_em` do SIGEP. |
| `/api/sigep/eventos/sync` | POST | Marca range como sincronizado no SIGEP (`folha_ponto_id, tipo, dia_inicio, dia_fim, turnos, status`). Usado por `sigep/lancar_eventos.py`. |
| `/api/relatorio/resumo` | GET | Totalização anual (janeiro até hoje) de ocorrências por profissional. Param: `ano`. |
| `/api/tipos-lancamento` | GET | Lista os tipos de lançamento cadastrados (valor, label, código). |
| `/api/atestados-bimestrais` | GET | Retorna contagem de atestados por bimestre civil para um servidor. |
| `/api/atestados-comparecimento` | GET | Retorna contagem mensal (`mes0..mes11`) de atestados de comparecimento. Params: `matricula`, `ano`. |
| `/api/educasync/dados` | GET | Retorna os dados cadastrais extraídos pelo módulo EducaSync a partir do `dados_folha_ponto.json`. |
| `/api/sigep/fichas-cadastrais` | GET | Retorna metadados e tabelas do `sigep/ficha.cadastral.DD.MM.YYYY.json` mais recente (pela data do nome). |
| `/api/sigep/sincronizar` | POST | Upsert transacional dos dados SIGEP em `profissionais_complementar` + recria as tabelas 1:N (cargas, cursos, habilitações, componentes). Body opcional: `{"matriculas": [...]}`. Casa por matrícula normalizada (`_norm_mat`). |
| `/api/profissionais/<id>/complementar` | GET, PUT | Dados complementares SIGEP + coleções 1:N do servidor. PUT faz upsert (não sobrescreve `arquivo_origem`). |
| `/sync` | GET | Serve a interface web standalone (`sync.html`) para sincronização e conciliação de dados cadastrais. |
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

> ⚠️ **Reinicie o Flask após editar `app.py`.** O servidor iniciado pelo `start_backend.sh` roda sem auto-reload: alterações em queries/rotas só passam a valer depois de reiniciar o processo da porta 5000. Sintoma típico: o relatório continua exibindo dados no formato antigo (ex.: linhas `FERIADO` no Resumo) mesmo com o código já corrigido.
