# Memória de Modificação - Backend (backend/)

## [2026-07-30] Relatório Resumo Anual + verificação de FERIADO / dedupe de turnos

### Arquivos Modificados:
- **app.py**

### Alterações:
- **Novo Endpoint**: `GET /api/relatorio/resumo?ano=<ano>` — totaliza ocorrências por profissional de janeiro até `date.today()`.
  - Fonte: `vw_folhas_lancamento`, com **`UNION` (não `UNION ALL`)** sobre `(nome, matricula, ano, mes, dia, tipo)` e `(… , tipo_turno2)`. Isso faz turno1 e turno2 do mesmo dia contarem como **1** — inclusive para `ATESTADO MEDICO DE ATE 03` e `LICENCA MEDICA OU`, que são lançados nos dois turnos. O total é número de **dias**, não de turnos.
  - Exclui `RECESSO`, `TRABALHO`, `FERIAS` e **`FERIADO`** nos dois ramos do UNION.
  - `GROUP BY (nome, matricula, tipo)` sem `fp.id` → cada profissional aparece uma única vez, apesar de ter N `folhas_ponto` no ano.
  - Retorno: `[{ nome, matricula, tipo, total }]`.
- **Novo Endpoint**: `GET /api/atestados-comparecimento?matricula=&ano=` — contagem mensal (`mes0..mes11`) via `vw_relatorio_atestados_comparecimento`; sem dados retorna zeros (fail-safe).

### 🔴 Armadilha registrada
Linhas `FERIADO` continuavam aparecendo no Resumo mesmo com o SQL correto: o processo Flask da porta 5000 (iniciado pelo `start_backend.sh`) **não tem auto-reload** e servia a versão anterior de `app.py`. Correção = reiniciar o backend, não mexer na query.

### 🧪 Verificação
`GET /api/relatorio/resumo?ano=2026` → 192 linhas, chaves `matricula/nome/tipo/total` (sem `id`), 0 linhas `FERIADO`; SERVIDORA EXEMPLO J com `ATESTADO MEDICO DE ATE 03` = 2 (dias 16 e 17/03, ambos os turnos preenchidos).

---

## [2026-06-15] Funcionalidade: Atestados por Bimestre

### Arquivos Modificados:
- **app.py**

### Alterações:
- **Novo Endpoint**: `GET /api/atestados-bimestrais?matricula=<mat>&ano=<ano>`.
- Consulta a view `vw_relatorio_atestados_bimestrais` para retornar a contagem de atestados agrupada por bimestre civil.

---

## [2026-06-10] Limpeza: Remoção de `observacao`/`observacao_turno2` do INSERT de lançamentos

### Arquivos Modificados:
- **app.py**

### Alterações:
- Endpoint `POST /api/folhas-ponto/<id>/lancamentos`: removidos `observacao` e `observacao_turno2` da query INSERT e dos `params`. O INSERT agora salva apenas `folha_ponto_id`, `dia`, `tipo` e `tipo_turno2`.

### 🎯 Objetivo
Alinhar o backend com a remoção física das colunas via migration `015`. Parte da limpeza coordenada em todas as camadas (frontend, API service, backend, banco de dados).

---

## [2026-06-09] Endpoints REST para Recessos

### Arquivos Modificados:
- **app.py**: Adicionados 3 endpoints para a tabela `recessos`.

### Alterações:
- **Novos Endpoints**:
  - `GET /api/recessos`: Lista todos os recessos; parâmetro opcional `ano` filtra por `ano_inicio = ano OR ano_fim = ano`.
  - `POST /api/recessos`: Insere novo recesso (`dia_inicio`, `mes_inicio`, `ano_inicio`, `dia_fim`, `mes_fim`, `ano_fim`, `label`). Retorna o `id` gerado.
  - `DELETE /api/recessos/<int:id>`: Remove um recesso pelo ID.

### Objetivo:
Suportar o CRUD de recessos via API, permitindo que o `HolidayModal` (aba Recessos) persista e recupere períodos de recesso do banco de dados.

---

## [2026-05-04] Endpoints para Relatórios

### Arquivos Modificados:
- **app.py**

### Alterações:
- **Novos Endpoints**:
  - `GET /api/relatorio/adicional-noturno`: Consulta a view `vw_adicional_noturno` (desacoplamento da lógica de turnos do frontend).
  - `GET /api/relatorio/lancamentos`: Consulta a view `vw_folhas_lancamento` para obter todos os lançamentos do período em uma única query (correção de N+1).

---

## [2026-05-03] Persistência de Feriados no Banco de Dados

### Arquivos Modificados:
- **app.py**: Adicionados os endpoints REST para interagir com a tabela `feriados`.

### Alterações:
- **Novos Endpoints**:
  - `GET /api/feriados`: Lista todos os feriados, com suporte ao parâmetro de query opcional `ano`.
  - `POST /api/feriados`: Insere um novo feriado (dia, mês, ano, label). Lida com erros de duplicidade (Error 400).
  - `DELETE /api/feriados/<int:id>`: Remove um feriado do banco usando o ID.

### Objetivo:
Mover a responsabilidade de armazenamento de feriados do navegador (localStorage) para a API, centralizando a informação.

---

## [2026-04-26] Correção de Serialização JSON e Validação de Matrícula

### Arquivos Modificados:
- **app.py**: Corrigida serialização de datetime/timedelta e validação de matrícula

### Alterações:
- **Função execute_query()**:
  - Adicionada conversão de objetos datetime/timedelta para strings serializáveis
  - Previne erro "Object of type timedelta is not JSON serializable"
  - Aplica a todas as queries do sistema

- **Endpoints de Profissionais**:
  - **create_profissional()**: Matrícula agora é o único campo obrigatório
  - **update_profissional()**: Validação alterada para exigir apenas matrícula
  - Adicionada verificação de matrícula duplicada em CREATE e UPDATE
  - Campos opcionais usam fallback `data.get('campo', '')`

### Objetivo:
Corrigir erros de salvamento e duplicação de matrícula, estabelecendo matrícula como chave primária verdadeira.

---

## [2026-03-31] Suporte a Segundo Turno em Lançamentos Diários

### Arquivos Modificados:
- **app.py**: Atualizada rota de lançamentos para suportar segundo turno

### Alterações:
- **Endpoint `/api/folhas-ponto/<int:folha_ponto_id>/lancamentos`**:
  - Adicionados campos `tipo_turno2` e `observacao_turno2` no INSERT
  - Atualizada query SQL para incluir novos campos
  - Mantida compatibilidade com estrutura existente

### Objetivo:
Implementar suporte a lançamentos independentes por turno, permitindo que cada dia tenha tipos diferentes para cada turno (matutino/vespertino).

---

## [2026-03-26] Remoção de Lógica de Horários

**Data:** 2026-03-26
**Objetivo:** Remover lógica de persistência de horários nos lançamentos diários.

### Arquivo Modificado:
1. **app.py**:
   - Alteração na rota `/api/folhas-ponto/<int:folha_ponto_id>/lancamentos` para remover as colunas `entrada1, entrada2, saida1, saida2` da query SQL de `INSERT` e dos parâmetros correspondentes.

---

## [2026-03-20] Implementação Inicial da API

**Data:** 2026-03-20
**Objetivo:** Criação inicial da API backend para o sistema Folha de Ponto.

### Arquivos Criados:
1. **app.py**: 
   - Estrutura inicial da API Flask
   - Endpoints para profissionais, folhas de ponto e lançamentos
   - Conexão com banco de dados MySQL
   - Funções helper para execução de queries

2. **Dockerfile**: Configuração para containerização
3. **README.md**: Documentação inicial da API
4. **MODIFICATION_MEMORY.md**: Registro de modificações

### Funcionalidades Implementadas:
- Gerenciamento de profissionais (CRUD)
- Gerenciamento de folhas de ponto (CRUD)
- Salvamento de lançamentos diários
- Conexão segura com MySQL
- Tratamento de erros e validação
