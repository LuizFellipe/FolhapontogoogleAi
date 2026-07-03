# Memória de Modificações do Projeto

## [2026-07-02] Auditoria e Resolução de Consistência de Documentação e Migrações

### Arquivos Modificados/Renomeados:
- `database/migrations/012_create_recessos_table.sql` -> `database/migrations/017_create_recessos_table.sql` *(resolução de colisão de numeração)*
- `database/migrations/005_add_type_falta_paralisação.sql` -> `database/migrations/005_add_type_falta_paralisacao.sql` *(remoção de acento para evitar incompatibilidades de filesystem)*
- `README.md` *(correção de endpoints com hífen e caminhos de scripts para raiz)*
- `folha_manager.sh` *(substituição do antigo vocabulário "Mágico" e emojis por tema padrão do Gestor Folha Ponto)*
- `database/migrations/README.md` *(correção de cabeçalhos duplicados e atualização de mapeamento de migrações)*
- `database/migrations/tree.txt`, `database/tree.txt`, `tree.txt` *(regenerados)*

### Problema:
Colisões de numeração de migrations (`012`), acentuação gráfica no nome de arquivo de migration (`005`), termos e emojis obsoletos ("Mágico") remanescentes no script `folha_manager.sh`, e endpoints/caminhos de scripts incorretos no `README.md`.

### Correções:
1. **Consistência de Migrações**: Renomeada a migração de recessos para `017` e a de paralisação para remover acento gráfico.
2. **Atualização da Documentação**: `README.md` e `database/migrations/README.md` atualizados com endpoints reais (hífen) e referências corretas.
3. **Limpeza do Manager**: `folha_manager.sh` unificado sob a persona do Gestor Folha Ponto sem termos mágicos.
4. **Árvores de Diretórios**: Atualizadas com os scripts de sincronização de árvore.

## [2026-06-25] Correção: Liberação das Portas 3000-3010 e 5000 nos Scripts de Inicialização

### Arquivos Modificados:
- `start_backend.sh`
- `folha_manager.sh`

### Problema:
O Vite, ao detectar a porta 3000 ocupada, abria automaticamente na próxima porta disponível (3001, 3002, etc.) sem avisar o usuário. Isso ocorria porque:
1. Nenhum dos dois scripts (`start_backend.sh` e `folha_manager.sh`) verificava ou liberava a porta 3000 antes de iniciar o frontend.
2. A função `stop_system()` do `folha_manager.sh` usava apenas `kill $PID`, que não matava processos filhos do Node/Vite, deixando as portas ocupadas após o encerramento.

### Correções:

#### 1. `start_backend.sh` — Checagem das portas 3000-3010
- Adicionado loop `for PORT in $(seq 3000 3010)` antes de iniciar o Vite, que verifica e mata processos em cada porta via `lsof`/`kill -9`.
- Garante que instâncias órfãs de execuções anteriores sejam encerradas antes de subir o frontend.

#### 2. `folha_manager.sh` — Checagem das portas 3000-3010 na função `start_backend()`
- Mesmo loop de verificação adicionado antes da linha `nohup npm run dev`, com mensagens no estilo do script (`warning`).

#### 3. `folha_manager.sh` — Correção da função `stop_system()`
- Adicionado fallback após o `kill` por PID: um loop que varre as portas 5000 e 3000-3010 com `lsof`/`kill -9`.
- Resolve o problema de processos filhos órfãos do Node que o `kill $PID` sozinho não alcançava.

### Resultado:
- O frontend agora sempre inicia na porta 3000.
- O `stop_system()` limpa completamente todas as portas utilizadas.
- Instâncias órfãs em portas 3001-3010 de execuções anteriores são eliminadas na próxima inicialização.


## [2026-06-15] Auditoria de Raiz e Melhoria de Documentação

### Arquivos Modificados/Removidos:
- `opencode.json` *(removido — exposição de API Key)*
- `tree.txt` *(reescrito com comentários úteis)*
- `README.md` *(reescrito com design moderno)*

### Alterações:

#### 1. Remoção de Arquivo com Segurança Crítica
- **`opencode.json`** continha API Key de OpenRouter exposta
- Arquivo removido imediatamente
- **Recomendação**: Revogar chave em OpenRouter se foi commitado antes

#### 2. `tree.txt` — Árvore com Documentação
- Adicionados comentários descritivos a cada arquivo/pasta
- Emojis para facilitar leitura
- Documentação de scripts helper (`sync_tipos_lancamento.py`)
- Seção de sumário técnico

#### 3. `README.md` — Redesign Completo
- **Antes**: Placeholder com imagens genéricas (picsum.photos)
- **Depois**: Documentação técnica e visual
  - Seção **Funcionalidades Destaque**: 10+ features com ícones
  - **Guia Rápido**: 4 passos (setup → entrada → resumo → impressão)
  - **Interface em Ação**: Diagrama ASCII da tela principal + Página 1 + Página 2
  - **Tecnologias**: Tabela com versões
  - **Ambientes**: Comparação Local vs Docker
  - **Endpoints**: Tabela de 11+ rotas da API
  - **Deploy**: Instruções Docker Compose
  - **Fluxo de Dados**: Diagrama visual
  - **Scripts**: Documentação de automação

### Objetivos Alcançados:
- ✅ Remover risco de segurança
- ✅ Documentar scripts helper não registrados
- ✅ Melhorar experiência de onboarding
- ✅ Substituir placeholders por conteúdo real
- ✅ Adicionar diagrama visual de fluxo

### Próximos Passos:
- Capturar screenshots reais do sistema via `docker-compose up`
- Atualizar seção "📸 Interface em Ação" com imagens PNG
- Documentar como executar screenshots (guia para colaboradores)

---

## [2026-06-14] Funcionalidade: Tela de Login com Credenciais via .env

### Arquivos Modificados/Criados:
- `src/components/LoginScreen.tsx` *(novo)*
- `src/App.tsx`
- `.env`
- `.env.example`

### Alterações:

#### 1. `src/components/LoginScreen.tsx` — Novo componente de login
- Tela escura (dark) que contrasta com o app claro, com acento verde terminal (`#059669`), evocando o tema cyberpunk do `folha_manager.sh`.
- Exibe identificador `SEE-DF · SISTEMA OFICIAL` e título `GESTOR FOLHA PONTO` em fonte monoespaciada.
- Campos de usuário e senha com focus highlight verde. Animação de "shake" no card ao errar a senha.
- Valida contra `import.meta.env.VITE_APP_USERNAME` e `import.meta.env.VITE_APP_PASSWORD` (client-side).
- Recebe prop `onLogin: () => void` — chamado ao autenticar com sucesso.

#### 2. `src/App.tsx` — Portão de autenticação
- Adicionado estado `isAuthenticated` (boolean, inicia `false`).
- Antes do return principal: se `!isAuthenticated`, renderiza `<LoginScreen onLogin={() => setIsAuthenticated(true)} />` e retorna cedo.
- Resto do componente inalterado — o sistema só é exibido após login correto.

#### 3. `.env` e `.env.example` — Credenciais padrão
- Adicionadas variáveis `VITE_APP_USERNAME` e `VITE_APP_PASSWORD`.
- Padrão: `admin` / `senha123` — alterar conforme necessidade.

### Nota de segurança:
Solução intencional e básica ("a princípio"). As credenciais ficam embutidas no bundle JS gerado pelo Vite — adequado para uso em rede interna, não recomendado para exposição pública sem uma autenticação de backend real.

---

## [2026-06-09] Correção: add_entry_type.py — Falha ao adicionar novo tipo de lançamento

### Arquivos Modificados:
- `add_entry_type.py`

### Problema:
Script terminava com `"Erro: EntryType não encontrado em types.ts"` sempre que executado via opção 4 do `folha_manager.sh`. Dois bugs independentes:

1. **Regex não casava com union multi-linha** — `src/types.ts` define `EntryType` com `=\n  | 'VALOR'` (sem espaço entre `=` e a quebra de linha), mas o padrão buscava `= ` (espaço literal). Linhas 48 e 59 corrigidas de `r"export type EntryType = (.+?);"` para `r"export type EntryType\s*=\s*(.+?);"`.

2. **Regex não casava com final do array ENTRY_TYPES** — O último item do array já possuía vírgula trailing (`},`), portanto o padrão `(\})\s*\n(\];)$` nunca encontrava `}` imediatamente antes de `];`. Linha 67 substituída por `text.rfind('\n];')` para inserção direta antes do fechamento do array.

### Alterações:
- `read_current_types` (linha 48): `= (.+?);` → `\s*=\s*(.+?);`
- `update_types_ts` (linha 59): mesma correção na busca do `old_union`
- `update_types_ts` (linhas 64-70): `re.sub` de ENTRY_TYPES substituído por inserção via `rfind('\n];')`

---

## [2026-05-03] Melhoria: Impressão Isolada e Limpeza de Seleção em Lote

### Arquivos Modificados/Criados:
- `src/components/BatchTimesheetModal.tsx`
- `src/App.tsx`

### Alterações:
1. **BatchTimesheetModal**: Adição dos botões "Imprimir" (que aciona apenas a renderização temporária) e "Limpar Seleção" (que desmarca as checkboxes rapidamente).
2. **App.tsx**: Implementada a lógica `handleBatchPrintOnly` que carrega do banco de dados ou gera modelos vazios em memória, sem acionar `computePreFillEntries` nem efetuar salvamento automático (`saveLancamentosDiarios`), voltada apenas para leitura e impressão rápida em lote.

---

## [2026-05-03] Refatoração: Persistência de Feriados no Banco de Dados

### Arquivos Modificados/Criados:
- `database/migrations/011_create_feriados_table.sql` *(novo)*
- `backend/app.py`
- `src/services/api.ts`
- `src/components/HolidayModal.tsx`
- `database/full_setup.sql`

### Alterações:
1. **Banco de Dados**: Criação da tabela `feriados` com os campos `id`, `dia`, `mes`, `ano` e `label`. Adicionada `UNIQUE KEY` para `(dia, mes, ano)`. O `full_setup.sql` foi atualizado para contemplar a tabela.
2. **Backend (app.py)**: Adicionados endpoints REST para interagir com a tabela (`GET /api/feriados`, `POST /api/feriados`, `DELETE /api/feriados/<id>`).
3. **Frontend**: Remoção do armazenamento local via `localStorage`. Agora o `HolidayModal.tsx` realiza as requisições API para recuperar, cadastrar e excluir as informações globalmente.

---

### Arquivos Modificados/Criados:
- [src/components/HolidayModal.tsx](src/components/HolidayModal.tsx) *(novo)*
- [src/components/EmployeeNavigator.tsx](src/components/EmployeeNavigator.tsx)
- [src/App.tsx](src/App.tsx)

### Alterações:

#### 1. Criação do Componente `HolidayModal`
- Interface modal contendo formulário (Dia, Mês, Ano e Nome) para cadastrar feriados.
- Listagem dos feriados do ano com botões para "Aplicar", "Reverter" e "Excluir".
- Feriados são armazenados no `localStorage` do navegador para manter o histórico entre sessões.

#### 2. Atualização em `App.tsx` e UI
- Inclusão do botão "Feriados" (ícone de Calendário) no `EmployeeNavigator`.
- Lógica no `App.tsx` para interceptar a ação de aplicar/reverter feriado e atualizar instantaneamente o vetor de lançamentos (`entries`) da folha em edição (mudando o dia selecionado para `FERIADO` em ambos os turnos e inserindo o nome do feriado no campo de observação).

### Objetivo:
Prover uma forma ágil e centralizada para o usuário marcar dias como feriado com suas devidas descrições na folha de ponto atual sem a necessidade de preencher cada select manualmente no `TimesheetGrid`.

---

## [2026-05-03] Funcionalidade: Auto-preenchimento do Resumo da Frequência e Backfill

### Arquivos Modificados/Criados:
- [src/App.tsx](src/App.tsx)
- [backfill_resumo.py](backfill_resumo.py) *(novo)*

### Alterações:

#### 1. `src/App.tsx` — Auto-preenchimento do resumo ao alterar lançamentos

- **`computeSummaryFromEntries(entries, ch)`** (função pura fora do componente): recebe os lançamentos diários e a carga horária, retorna 8 `SummaryEntry` calculados automaticamente.
  - Coleta pares `(codigo, dia)` de turno1 e turno2, deduplica por dia.
  - Agrupa por código e detecta sequências de dias consecutivos.
  - `carga = '1'` para 20h, `'3'` para 40h. `operation = 'I'`, `months = '01'`.
  - `hoursDays`, `startDay`, `endDay` em zero-pad conforme o intervalo.
- **`handleEntriesChange`**: novo handler que encadeia `setEntries` + `setSummaryEntries(computeSummaryFromEntries(...))`.
- **`TimesheetGrid onChange`**: atualizado de `setEntries` para `handleEntriesChange`.
- **`handleClearEntries`**: atualizado para resetar `summaryEntries` para `initialSummary`.
- **`handlePreFill`**: atualizado para chamar `handleEntriesChange` (recalcula resumo após pré-preenchimento).
- Carregamento do banco (`loadExistingTimesheet`) **inalterado** — continua usando dados salvos.

#### 2. `backfill_resumo.py` — Script de backfill para folhas existentes

- Script Python standalone na raiz do projeto.
- Usa as mesmas variáveis de ambiente do backend (`DB_HOST`, `DB_USER`, etc.) via `.env`.
- **Lógica**: para cada `folha_ponto`, verifica se `resumo_folha` já tem linhas com `codigo != ''`. Se sim, pula (preserva dados manuais). Se não, aplica o mesmo algoritmo de `computeSummaryFromEntries` em Python e insere as linhas.
- Resultado da execução inicial: 245 folhas encontradas, 6 já tinham resumo (puladas), 217 sem lançamentos com código (puladas), **22 preenchidas com sucesso**, 0 erros.
- Pode ser reexecutado a qualquer momento — folhas com resumo existente nunca são sobrescritas.

### 🎯 Objetivo
Automatizar o preenchimento da Página 2 (Resumo da Frequência) tanto em tempo real (UI) quanto retroativamente para todas as folhas já salvas no banco.

---

## [2026-05-01] Refatoração Completa dos Tipos de Lançamento

### Arquivos Modificados/Criados:
- [src/types.ts](src/types.ts)
- [add_entry_type.py](add_entry_type.py)
- [database/migrations/010_refactor_tipos_lancamento.sql](database/migrations/010_refactor_tipos_lancamento.sql) (novo)
- [database/full_setup.sql](database/full_setup.sql)
- [database/migrations/001_create_tables.sql](database/migrations/001_create_tables.sql)
- [database/README.md](database/README.md)

### Alterações:

#### 1. `src/types.ts` — Atualização completa de EntryType e ENTRY_TYPES
- **`EntryType` union type**: atualizado com 21 valores (4 values antigos renomeados, 4 novos adicionados, 1 removido por merge)
- **`ENTRY_TYPES`**: adicionado campo `code: string | null` a cada entrada
- Values renomeados: `ATESTADO` → `ATESTADO MEDICO DE ATE 03`, `LICENCA` → `LICENCA MEDICA OU`, `TRE` → `Abono TRE`
- Merge: `ABONO` eliminado — registros migrados para `ABONO DE PONTO ART 151 LEI`
- Novos types: `PONTO FACULTATIVO`, `ATESTADO COMPARECIMENTO A`, `ATESTADO COMPARECIMENTO P.`, `EXAME MEDICO PREV/PERIOD ART`
- Labels atualizadas para refletir nomenclatura oficial dos formulários

#### 2. `add_entry_type.py` — Correção do gerador de entries
- **Antes**: `new_entry = f"  {{ value: '{value}', label: '{label}' }}"` — gerava entry sem o campo `code`
- **Depois**: inclui `code: null` — compatível com o novo tipo `ENTRY_TYPES`
- Sem esta correção, usar o script adicionaria um tipo com estrutura inválida, quebrando o TypeScript

#### 3. Migration 010 — Banco de dados
- Tabela `tipos_lancamento` criada (lookup com valor, label, codigo)
- `lancamentos_diarios.tipo` e `tipo_turno2`: ENUM → VARCHAR(80)
- Registros existentes migrados com novos values (ver `database/MODIFICATION_MEMORY.md`)
- 3 registros no seed data do `full_setup.sql` corrigidos (`LICENCA` → `LICENCA MEDICA OU`)

### Varredura de impacto realizada:
- `src/App.tsx`: sem hardcoded types (usa `'TRABALHO'` como fallback — inalterado) ✅
- `src/components/TimesheetGrid.tsx`: iteração dinâmica via `ENTRY_TYPES.map()` ✅
- `src/components/TimesheetPreview.tsx`: usa `ENTRY_TYPES.find()` — sem values hardcoded ✅
- `backend/app.py`: sem validação de tipos — passa valor diretamente ao banco ✅
- `src/components/TimesheetSummaryPreview.tsx`: referência a `'TRE'` como texto descritivo cosmético (não é validação) ✅

### Objetivo:
Associar códigos oficiais de ocorrência (ex: 99902 para FÉRIAS, 00294 para ATESTADO) aos tipos de lançamento para suporte a geração de relatórios e conformidade com os formulários da SEE. Modernizar o schema eliminando ENUM hardcoded.

---

## [2026-05-01] Tema Cyberpunk para Menu do Sistema

### Arquivos Modificados:
- [folha_manager.sh](folha_manager.sh)

### Alterações:

#### 1. Transformação Visual Completa
- **Cabeçalho**: Substituído tema "Alice in Wonderland" por tema cyberpunk/retro terminal
- **ASCII Art**: Novo banner "GESTOR FOLHA PONTO" com estilo cyberpunk
- **Cores**: Paleta atualizada para neon greens, blues, e whites (cyberpunk style)
- **Menu**: Redesenho para layout tradicional com bordas limpas e bem formatadas

#### 2. Elementos Visuais Atualizados
- **Header**: ASCII art cyberpunk com "GESTOR FOLHA PONTO" centralizado
- **Welcome Message**: "Welcome Netrunner, choose an option"
- **Menu Layout**: Design tradicional com bordas `=` e opções numeradas `[ 1 ]` a `[ 9 ]`
- **Color Scheme**: Mantidos cores cyberpunk mas com layout mais tradicional e bonito

#### 3. Mensagens do Sistema
- **Status Messages**: Formatadas como `[SYSTEM ONLINE]`/`[SYSTEM OFFLINE]`
- **Action Messages**: `[SUCCESS]`, `[ERROR]`, `[WARNING]`, `[INFO]` com estilo bracketed
- **Prompts**: `[SELECT OPTION 1-9]:` e `[PRESS ENTER TO CONTINUE]`
- **Exit Messages**: `[SYSTEM SHUTDOWN]` e `[DISCONNECTED]`

#### 4. Funcionalidade Preservada
- Todas as 9 opções do menu mantidas com mesma funcionalidade
- Sistema de gerenciamento de processos background intacto
- Compatibilidade total com operações existentes

### Objetivo:
Modernizar a interface visual do script de gerenciamento mantendo toda a funcionalidade existente, proporcionando uma experiência mais atraente e profissional com tema cyberpunk mas com design tradicional e bem formatado.

---

## [2026-04-29] Correção: Algoritmo de Pré Preenchimento CPIP/CURSO

### Arquivos Modificados:
- [src/App.tsx](src/App.tsx)

### Problema:
Ao executar o Pré Preenchimento (individual ou em lote) para um mês alvo, o algoritmo em `computePreFillEntries` aplicava os lançamentos CPIP/CURSO de forma incorreta em dois cenários:

#### 1. Colisão de DOW (causa raiz do bug reportado — usuário id=22, Fevereiro/2026)
O pattern usava apenas o dia da semana (DOW) como chave (`Map<number, pattern>`). Quando CURSO (dia 16, 3ª segunda-feira) e CPIP (dia 23, 4ª segunda-feira) caíam no mesmo DOW=1 no mês fonte, somente o primeiro lançamento encontrado (menor dia = CURSO) era armazenado — o CPIP era descartado. Resultado: todas as segundas-feiras do mês alvo recebiam CURSO, nunca CPIP.

#### 2. Sort instável entre meses equidistantes
O sort `Math.abs(mes - targetMonth)` era não-determinístico quando dois meses estavam à mesma distância do alvo (ex: Janeiro e Março ambos a 1 mês de Fevereiro). O mês usado como fonte dependia do runtime JS.

### Correções (`src/App.tsx` — `computePreFillEntries`):

#### Fix 1 — Chave composta `"DOW-weekIndex"`
- **Antes**: `Map<number, pattern>` — chave = DOW
- **Depois**: `Map<string, pattern>` — chave = `"${dow}-${weekIndex}"` onde `weekIndex = Math.floor((dia - 1) / 7)`
- Dias 1–7 → weekIndex=0, 8–14 → 1, 15–21 → 2, 22–28 → 3, 29–31 → 4
- Resultado: dia 16 (CURSO, "1-2") e dia 23 (CPIP, "1-3") armazenados independentemente

#### Fix 2 — Sort determinístico com preferência por meses anteriores
- **Antes**: `sort((a,b) => |a.mes - target| - |b.mes - target|)` (instável em empate)
- **Depois**: mesma distância → prefere meses **antes** do target (passado mais recente)
- Garante que Janeiro seja preferido sobre Março para preencher Fevereiro

### Resultado após correção:
| Mês fonte | Dia | Tipo  | DOW-weekIndex | Mês alvo | Dia alvo | Tipo aplicado |
|-----------|-----|-------|---------------|----------|----------|---------------|
| Março     | 16  | CURSO | 1-2           | Fevereiro| 16       | CURSO ✓       |
| Março     | 23  | CPIP  | 1-3           | Fevereiro| 23       | CPIP ✓        |

### Objetivo:
Garantir que o pré preenchimento replique com precisão o padrão semanal posicional (ex: 3ª segunda vs 4ª segunda) tanto no fluxo individual quanto na geração em lote.

---

## [2026-04-29] Funcionalidade: Valores Padrão para Novo Profissional

### Arquivos Modificados:
- [src/App.tsx](src/App.tsx)

### Alterações:
- Atualizada a função `handleNewProfissional` para preencher automaticamente os campos `ua`, `exercicio` e `unidade` com os valores padrão da instituição ao criar um novo cadastro.
- Valores configurados:
  - **UA**: `"005"`
  - **Exercício**: `"990210000029"`
  - **Unidade**: `"CENTRO DE EDUC PROF ESCOLA TEC DO GUARA PROF TERESA ONDINA M"`
- Limpeza do `initialEmployee` para remover dados de exemplo (Nome/Matrícula) mantendo os padrões institucionais.

### Objetivo:
Agilizar o cadastro de novos profissionais, pré-populando os campos que são comuns à maioria dos servidores da unidade.

---

## [2026-04-28] Funcionalidade: Observação Automática para CPIP/CURSO

### Arquivos Modificados:
- [src/App.tsx](src/App.tsx)

### Alterações:

#### 1. Lógica de preenchimento automático
- Atualizada a função `handlePreFill` para inserir automaticamente a observação referente ao CURSO FORMAÇÃO CONTINUADA caso seja detectado o padrão de CPIP ou CURSO de meses anteriores.
- Atualizada a função `handleBatchGenerate` para inserir a mesma observação automática nas folhas geradas em lote, quando houver dias com CPIP ou CURSO.
- Texto inserido: `"CURSO FORMACAO CONTINUADA DE ACORDO MEMORANDO/CIRC 59/2025 - SEE/SUBEB DE 18/02/2025 - SEI 00080.00049147/2025-76"`

### Objetivo:
Automatizar a inclusão da justificativa/observação padrão para servidores que possuem CPIP ou CURSO DE FORMAÇÃO CONTINUADA, garantindo conformidade com as orientações circulares da SEE/SUBEB tanto no preenchimento individual quanto na geração em lote.

---

## [2026-04-26] Configuração Condicional do Proxy Vite e Otimizações Docker

### Arquivos Modificados:
- [vite.config.ts](vite.config.ts)
- [.env.example](.env.example)
- [Dockerfile](Dockerfile)
- [backend/Dockerfile](backend/Dockerfile)
- [package.json](package.json)
- [.dockerignore](.dockerignore) (novo)

### Problema:
O proxy Vite estava configurado com target fixo (`localhost:5000` ou `backend:5000`), o que impedia o funcionamento simultâneo em desenvolvimento local e ambiente Docker. Além disso, os Dockerfiles não estavam otimizados e continham dependências desnecessárias no package.json.

### Soluções Implementadas:

#### 1. Configuração Condicional do Proxy
- **vite.config.ts**: Implementada lógica condicional baseada em `VITE_ENVIRONMENT`
  - `VITE_ENVIRONMENT=local` → proxy para `http://localhost:5000`
  - `VITE_ENVIRONMENT=docker` → proxy para `http://backend:5000`
- **.env.example**: Adicionada documentação da nova variável com exemplos
- **Resultado**: Mesmo código funciona em ambos os ambientes sem alterações manuais

#### 2. Otimizações nos Dockerfiles
- **Dockerfile principal**: Adicionado `ENV VITE_ENVIRONMENT=docker` e `COPY .env .`
- **Backend Dockerfile**: Adicionado `ENV VITE_ENVIRONMENT=docker` e `COPY .env .`
- **Resultado**: Variáveis de ambiente disponíveis durante build e execução

#### 3. Limpeza de Dependências
- **package.json**: Removidas dependências desnecessárias (`express`, `dotenv`, `@types/express`)
- **Resultado**: Build mais limpo e eficiente

#### 4. .dockerignore (novo)
- **Criado**: Arquivo `.dockerignore` otimizado para builds Docker
- **Conteúdo**: Exclusão de arquivos desnecessários (node_modules, .git, logs, etc.)
- **Resultado**: Builds mais rápidos e imagens menores

### Comportamento Implementado:

#### Desenvolvimento Local (start_backend.sh):
- `VITE_ENVIRONMENT` não definido → usa padrão `local`
- Proxy aponta para `localhost:5000`
- Funciona com backend rodando localmente

#### Ambiente Docker (docker-compose):
- `VITE_ENVIRONMENT=docker` definido nos Dockerfiles
- Proxy aponta para `backend:5000` (nome do serviço)
- Funciona com comunicação entre containers

### Benefícios:
- ✅ **Flexibilidade Total**: Mesmo código funciona em ambos os ambientes
- ✅ **Automático**: Sem necessidade de configurações manuais
- ✅ **Consistente**: Proxy correto para cada cenário
- ✅ **Otimizado**: Builds Docker mais eficientes
- ✅ **Manutenível**: Único ponto de configuração

### Validação:
- ✅ `start_backend.sh` funciona com proxy local
- ✅ `docker-compose up` funciona com proxy Docker
- ✅ Build otimizado com .dockerignore
- ✅ Dependências limpas no package.json

---

## [2026-04-26] Atualização da Documentação do Projeto

### Arquivos Modificados:
- [tree.txt](tree.txt)
- [README.md](README.md)

### Problema:
A documentação do projeto estava desatualizada e não refletia a estrutura real dos arquivos e funcionalidades implementadas.

### Correções:

#### 1. tree.txt
- **Removidos**: Arquivos inexistentes (EmitirFolha.pdf, FolhaExemplo.*, etc.)
- **Adicionados**: Arquivos existentes não listados (.env.example, .gitignore, metadata.json, etc.)
- **Corrigido**: Nome `env` → `.env`
- **Atualizada**: Estrutura completa de diretórios (.claude/, .git/, node_modules/, venv/)

#### 2. README.md
- **Funcionalidades**: Atualizadas para refletir sistema simplificado (apenas Dia + Tipo)
- **Navegação**: Adicionada descrição da navegação entre profissionais
- **Como Usar**: Removidas referências a preenchimento de horários
- **Estrutura**: Atualizada com listagem completa e detalhada dos arquivos
- **Pré-preenchimento**: Simplificada descrição da funcionalidade

### Resultado:
- ✅ Documentação 100% alinhada com estrutura real do projeto
- ✅ Descrição precisa das funcionalidades atuais
- ✅ Facilita manutenção e onboarding de novos desenvolvedores

---

## [2026-04-26] Ampliação do Campo de Nome do Servidor no Navegador

### Arquivos Modificados:
- [src/components/EmployeeNavigator.tsx](src/components/EmployeeNavigator.tsx)
- [src/App.tsx](src/App.tsx)

### Problema:
O campo `<select>` de seleção do servidor exibia o nome truncado (ex.: "ALLANA DA SILVA S...") porque a classe `min-w-0` permitia que o elemento encolhesse indefinidamente, e o container pai tinha `min-w-[400px]`, insuficiente para nomes longos.

### Correção:
- **`EmployeeNavigator.tsx`**: Alterada classe do `<select>` de `flex-1 min-w-0` para `flex-1 min-w-[280px]`, garantindo largura mínima para exibição do nome completo.
- **`App.tsx`**: Aumentada a `min-w` do container do navegador de `min-w-[400px]` para `min-w-[700px]`, dando mais espaço total ao componente.

---

## [2026-04-26] Correção Pré Preenchimento — não propagar tipos diferentes de CPIP/CURSO

### Arquivos Modificados:
- [src/App.tsx](src/App.tsx)

### Problema:
Ao realizar o pré preenchimento, dias cuja condição `temCpipCurso` era satisfeita apenas pelo turno 2 (ex.: `tipo_turno2 = 'CPIP'`) tinham o valor bruto do turno 1 copiado para o novo mês (ex.: `'ATESTADO DE COMPARECIMENTO'`), pois o padrão era salvo com `lancamento.tipo || 'TRABALHO'` sem verificar se o valor era CPIP/CURSO.

### Correção (`src/App.tsx` — `handlePreFill`):
- Declarada constante `CPIP_CURSO = ['CPIP', 'CURSO']` antes do loop.
- Condição `temCpipCurso` refatorada para usar `CPIP_CURSO.includes(...)`.
- Ao registrar o padrão, cada turno é armazenado como CPIP/CURSO somente se ele próprio pertencer à lista; caso contrário, cai para `'TRABALHO'`.

---

## [2026-04-26] Pré Preenchimento de CPIP/CURSO e Botão Limpar Lançamentos

### Arquivos Modificados:
- [src/App.tsx](src/App.tsx)
- [src/components/EmployeeNavigator.tsx](src/components/EmployeeNavigator.tsx)

### Alterações:

#### 1. `src/App.tsx` — Duas novas funções e novo estado

- **`isPreFilling`** (estado): controla o loading do botão durante a busca na API.
- **`handlePreFill`**: busca todas as folhas do profissional no mesmo ano (`getFolhasPonto({ profissional_id, ano })`), filtra excluindo o mês atual, ordena pela mais próxima e itera sobre os lançamentos à procura de dias com `tipo` **ou** `tipo_turno2` igual a `'CPIP'` ou `'CURSO'`. Para cada dia da semana (seg=1...sex=5) encontrado, registra o padrão `{tipo, tipo_turno2}` usando a primeira ocorrência. Aplica o padrão ao mês atual via `setEntries`.
- **`handleClearEntries`**: reseta todos os `entries` para `type: 'TRABALHO'` e `type_turno2: 'TRABALHO'`.
- Novos props `onPreFill`, `onClear` e `isPreFilling` passados ao `EmployeeNavigator`.

#### 2. `src/components/EmployeeNavigator.tsx` — Layout reorganizado em duas linhas

- Adicionados props `onPreFill`, `onClear`, `isPreFilling` à interface `Props`.
- Importados ícones `ClipboardList` e `X` do `lucide-react`.
- Layout reestruturado de linha única para **duas linhas**:
  - **Linha 1**: botões `< >` · indicador `N de Total` · dropdown de seleção · botões Novo (verde) e Excluir (vermelho).
  - **Linha 2**: botão **Pré Preenchimento** (âmbar) · botão **Limpar Lançamentos** (cinza).
- Removido bloco redundante "Nome atual" (o nome já aparece no dropdown).

### Comportamento do Algoritmo:
1. Busca folhas do mesmo ano excluindo o mês atual.
2. Ordena pela folha mais próxima (menor diferença de mês).
3. Verifica `tipo` **e** `tipo_turno2` — necessário porque o padrão pode estar apenas no turno 2 (ex: usuário id=114 tem CPIP somente em `tipo_turno2`).
4. Para cada dia da semana com CPIP/CURSO, registra a primeira ocorrência encontrada.
5. Aplica o padrão a todos os dias equivalentes no novo mês.

### Objetivo:
Permitir o reaproveitamento do padrão semanal de `CPIP` e `CURSO FORMAÇÃO CONTINUADA` de folhas anteriores do mesmo ano, evitando retrabalho ao abrir um novo mês para profissionais com lançamentos regulares dessas ocorrências.

---

## [2026-04-25] Sincronização de Tipos de Lançamento: LIC. ACOMP. PESSOA DOENTE, AFAST DOACAO SANGUE ART 62, ABONO DE PONTO BIMESTRAL LEI

### Arquivos Modificados:
- [src/types.ts](src/types.ts)
- [database/migrations/007_add_type_lic_acomp_pessoa_doente.sql](database/migrations/007_add_type_lic_acomp_pessoa_doente.sql) (novo)
- [database/full_setup.sql](database/full_setup.sql)

### Alterações:

#### 1. `src/types.ts` — Três novos tipos adicionados
- Adicionados ao union type `EntryType` e ao array `ENTRY_TYPES`:
  - `'LIC. ACOMP. PESSOA DOENTE'`
  - `'AFAST DOACAO SANGUE ART 62'`
  - `'ABONO DE PONTO BIMESTRAL LEI'`

#### 2. Migration `007_add_type_lic_acomp_pessoa_doente.sql`
- Adiciona os três novos tipos ao ENUM das colunas `tipo` e `tipo_turno2` de `lancamentos_diarios`.
- Destinada a instalações frescas via migrations (1-6 → 7).
- **ATENÇÃO**: Não deve ser aplicada ao banco de produção existente pois ele já possui esses valores no ENUM.

#### 3. `full_setup.sql`
- ENUM atualizado para incluir os três novos tipos, garantindo que novas implantações Docker já iniciem com todos os tipos disponíveis.

### Causa Raiz do Problema:
Os três tipos de lançamento foram adicionados diretamente ao banco de dados de produção (via ALTER TABLE manual) sem que os arquivos do projeto fossem atualizados. Ao baixar o projeto do git e restaurar o banco, o frontend não exibia esses lançamentos pois o TypeScript não os reconhecia como `EntryType` válidos — o registro id 13335 (`LIC. ACOMP. PESSOA DOENTE`) ficava invisível na grade diária.

### Como Identificar Novos Tipos Ausentes:
```sql
-- No banco de produção, listar todos os tipos distintos usados:
SELECT tipo, COUNT(*) FROM lancamentos_diarios GROUP BY tipo ORDER BY qtd DESC;
SELECT tipo_turno2, COUNT(*) FROM lancamentos_diarios GROUP BY tipo_turno2;
-- Comparar com o array ENTRY_TYPES em src/types.ts
```

Este arquivo registra as alterações significativas realizadas no projeto para facilitar o acompanhamento e a manutenção.
---

## [2026-04-24] Correção de Mojibake no ENUM — FALTA PARALISAÇÃO e ATESTADO DE COMPARECIMENTO

### Arquivos Modificados:
- [add_entry_type.py](add_entry_type.py)
- Banco de dados MySQL (via Docker exec)

### Alterações:

#### 1. `add_entry_type.py` — Adicionado `--default-character-set=utf8mb4` ao comando `mysql`
- **Antes**: `["docker", "exec", "-i", container, "mysql", "-u", ...]`
- **Depois**: `["docker", "exec", "-i", container, "mysql", "--default-character-set=utf8mb4", "-u", ...]`

#### 2. Banco de dados — ENUM recriado com valores corretos
- As migrations 005 (FALTA PARALISAÇÃO) e 006 (ATESTADO DE COMPARECIMENTO) foram aplicadas sem o flag de charset, causando Mojibake: os bytes UTF-8 de `Ç` (0xC3 0x87) e `Ã` (0xC3 0x83) foram interpretados como caracteres cp1252 (`‡` e `ƒ`) e armazenados corrompidos no ENUM.
- Correção aplicada via `ALTER TABLE ... MODIFY COLUMN tipo ENUM(...) / tipo_turno2 ENUM(...)` com `--default-character-set=utf8mb4`, restaurando os valores corretos nas colunas `tipo` e `tipo_turno2` de `lancamentos_diarios`.

### Causa Raiz do Erro:
`add_entry_type.py` chamava `mysql` via Docker sem `--default-character-set=utf8mb4`. O arquivo de migration (UTF-8) era lido com charset padrão do servidor (latin1/cp1252), corrompendo os caracteres acentuados do ENUM. O resultado era erro `1265 (01000): Data truncated for column 'tipo' at row 1` ao tentar salvar qualquer lançamento com os novos tipos.

### Como Diagnosticar Problemas Similares:
```sql
-- Verificar bytes reais do ENUM (Mojibake aparece como 'Ã‡', 'Ãƒ', etc.)
SELECT COLUMN_TYPE FROM information_schema.COLUMNS
WHERE TABLE_NAME='lancamentos_diarios' AND COLUMN_NAME='tipo';

-- Testar inserção direta
INSERT INTO lancamentos_diarios (folha_ponto_id, dia, tipo, observacao, tipo_turno2, observacao_turno2)
VALUES (1, 99, 'FALTA PARALISAÇÃO', '', 'TRABALHO', '');
DELETE FROM lancamentos_diarios WHERE dia=99;
```

---

## [2026-04-22] Script de Adição de Tipos de Lançamento e Correção de ENUM

### Arquivos Modificados/Criados:
- [add_entry_type.py](add_entry_type.py) (novo)
- [database/full_setup.sql](database/full_setup.sql)
- [database/migrations/001_create_tables.sql](database/migrations/001_create_tables.sql)
- [database/migrations/004_add_abono_art151_type.sql](database/migrations/004_add_abono_art151_type.sql) (novo)
- [src/types.ts](src/types.ts)

### Alterações:

#### 1. `src/types.ts` — Novo tipo `ABONO DE PONTO ART 151 LEI`
- Adicionado ao union type `EntryType` e ao array `ENTRY_TYPES`.

#### 2. Migration `004_add_abono_art151_type.sql`
- Adiciona `'ABONO DE PONTO ART 151 LEI'` ao ENUM das colunas `tipo` e `tipo_turno2` de `lancamentos_diarios`.
- Aplicada ao banco existente via Docker (container `folhaponto-mysql`).

#### 3. `full_setup.sql` e `migrations/001_create_tables.sql`
- ENUMs atualizados para incluir `'ABONO DE PONTO ART 151 LEI'`, garantindo que novas implantações Docker já iniciem com o tipo disponível.

#### 4. `add_entry_type.py` — Script de manutenção
- Script interativo para adicionar novos tipos de lançamento sem edição manual de arquivos.
- Atualiza automaticamente: `src/types.ts`, `full_setup.sql`, `migrations/001_create_tables.sql`, cria migration numerada e aplica no banco via Docker.
- Uso: `python3 add_entry_type.py`

### Causa Raiz do Erro Original:
`types.ts` foi atualizado com `'ABONO DE PONTO ART 151 LEI'` mas o ENUM do MySQL não incluía o valor, resultando em erro `1265 Data truncated for column 'tipo'` ao salvar.

---

## [2026-04-22] Correção de Acesso via Rede Local (LAN)

### Arquivos Modificados:
- [.env](.env)

### Alterações:

#### 1. `.env` — `VITE_API_URL` esvaziado
- **Antes**: `VITE_API_URL=http://localhost:5000/api`
- **Depois**: `VITE_API_URL=`

### Causa Raiz:
O Vite embute o valor de `VITE_API_URL` no bundle JavaScript no momento do build/dev. Com o valor `http://localhost:5000/api`, o navegador de qualquer outra máquina na rede tentava conectar na porta 5000 do **próprio localhost dela**, e não no servidor. Isso causava falha em todas as chamadas à API quando o sistema era acessado de outra máquina.

### Solução:
Deixar `VITE_API_URL` vazio faz o código em `src/services/api.ts` usar o fallback `'/api'` (URL relativa). O proxy do Vite — configurado em `vite.config.ts` — encaminha automaticamente `/api/*` para o Flask (`localhost:5000`) **no lado do servidor**, resolvendo o problema sem alterar nenhum código-fonte.

### Observação sobre Firewall:
Caso o sistema ainda não seja acessível na LAN após esta correção, verificar se o UFW está ativo e liberar as portas:
```bash
sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp
sudo ufw status
```

---

## [2026-04-17] Sincronização do Schema Docker com Estado Atual do Banco

### Arquivos Modificados:
- [database/full_setup.sql](database/full_setup.sql)
- [database/migrations/001_create_tables.sql](database/migrations/001_create_tables.sql)
- [database/README.md](database/README.md)
- [database/MODIFICATION_MEMORY.md](database/MODIFICATION_MEMORY.md)
- [database/migrations/README.md](database/migrations/README.md)

### Alterações:

#### 1. `database/full_setup.sql` — Schema completo para inicialização Docker
- Adicionada coluna `tipo_turno2 ENUM(...) NULL` na tabela `lancamentos_diarios`
- Adicionada coluna `observacao_turno2 TEXT NULL` na tabela `lancamentos_diarios`
- Adicionado índice `idx_tipo_turno2`
- Este arquivo é o script de init usado pelo MySQL no Docker (`docker-entrypoint-initdb.d`)

#### 2. `database/migrations/001_create_tables.sql` — Script de criação manual
- Atualizado ENUM de `tipo` para incluir `CPIP`, `CURSO`, `ABONO_NIVER`, `FERIADO` (estava na versão antiga)
- Adicionadas as mesmas colunas `tipo_turno2`, `observacao_turno2` e índice `idx_tipo_turno2`

### Causa Raiz:
A migration `003_add_second_turn_columns.sql` havia adicionado as colunas no banco de dados local, mas os arquivos de criação inicial nunca foram atualizados. Ao baixar a imagem Docker em uma nova máquina, o banco inicializava sem as colunas `tipo_turno2`/`observacao_turno2`, causando erro `Unknown column` ao salvar lançamentos.

### Objetivo:
Garantir que `full_setup.sql` (inicialização Docker) sempre reflita o schema completo atual. Novas implantações agora funcionam diretamente sem necessidade de executar migrations manualmente.

---

## [2026-04-17] Correção de Acesso Remoto e Limpeza de Dependências

### Arquivos Modificados:
- [src/services/api.ts](src/services/api.ts)
- [vite.config.ts](vite.config.ts)
- [requirements.txt](requirements.txt)

### Alterações:

#### 1. `src/services/api.ts` — URL da API relativa
- **Antes**: `process.env.REACT_APP_API_URL || 'http://localhost:5000/api'`
- **Depois**: `import.meta.env.VITE_API_URL || '/api'`
- Corrigido uso incorreto de `process.env.REACT_APP_*` (não funciona no Vite; a sintaxe correta é `import.meta.env.VITE_*`).
- URL hardcoded `localhost` causava falha em acessos remotos: o browser da outra máquina tentava conectar no próprio `localhost` dela, não no servidor.
- Com `/api` relativo, o browser usa o mesmo host do frontend. O proxy do Vite (dev) e o Nginx (produção Docker) roteiam para o Flask.

#### 2. `vite.config.ts` — Proxy para desenvolvimento local
- Adicionada configuração de proxy no servidor de desenvolvimento Vite:
  ```typescript
  proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } }
  ```
- Garante que `npm run dev` continue funcionando com o Flask local sem expor `localhost:5000` diretamente ao browser.

#### 3. `requirements.txt` — Separação de dependências
- Removidas dependências Node.js/npm que estavam misturadas no arquivo Python (`react@^19.0.0`, `vite@^6.2.0`, etc.).
- O `pip` do container Docker do backend falhava ao tentar instalar esses pacotes como se fossem Python.
- Dependências do frontend permanecem exclusivamente no `package.json`.

### Objetivo:
Corrigir falha onde profissionais cadastrados não apareciam ao acessar o sistema de outra máquina na rede, e corrigir quebra do build Docker do backend causada por `requirements.txt` com conteúdo inválido para pip.

---

## [2026-04-12] Impressão Preenche A4 Completo

### Arquivos Modificados:
- [src/index.css](file:///home/luiz/Documents/FolhapontogoogleAi/src/index.css)
- [src/components/TimesheetPreview.tsx](file:///home/luiz/Documents/FolhapontogoogleAi/src/components/TimesheetPreview.tsx)
- [src/components/TimesheetSummaryPreview.tsx](file:///home/luiz/Documents/FolhapontogoogleAi/src/components/TimesheetSummaryPreview.tsx)
- [src/App.tsx](file:///home/luiz/Documents/FolhapontogoogleAi/src/App.tsx)

### Alterações:
- **CSS (`index.css`)**: Adicionado `@page { size: A4; margin: 0 }` e classes CSS de impressão (`.print-page`, `.print-page-2`, `.print-wrapper`, `.print-page-table-section`, `.print-message-box`)
- **Página 1**: `TimesheetPreview` agora ocupa exatamente `210mm × 297mm` no print; tabela distribui 31 linhas uniformemente com trick `tbody tr { height: 1% }`
- **Página 2**: `TimesheetSummaryPreview` agora ocupa exatamente `210mm × 297mm` no print; caixa MENSAGEM cresce para preencher o restante
- **Wrapper**: `motion.div` do preview recebe `.print-wrapper` para zerar espaçamentos durante a impressão

### Objetivo:
Garantir que ao imprimir ou salvar em PDF, Página 1 e Página 2 preencham integralmente a folha A4, sem espaços em branco, fiel ao documento de referência `FolhaExemplo.pdf`.

---

## [2026-03-31] Implementação de Segundo Turno e Padrão TRABALHO NORMAL

### Arquivos Modificados:
- [database/migrations/003_add_second_turn_columns.sql](file:///home/luiz/Documents/FolhapontogoogleAi/database/migrations/003_add_second_turn_columns.sql) (novo)
- [backend/app.py](file:///home/luiz/Documents/FolhapontogoogleAi/backend/app.py)
- [src/types.ts](file:///home/luiz/Documents/FolhapontogoogleAi/src/types.ts)
- [src/components/TimesheetGrid.tsx](file:///home/luiz/Documents/FolhapontogoogleAi/src/components/TimesheetGrid.tsx)
- [src/components/TimesheetPreview.tsx](file:///home/luiz/Documents/FolhapontogoogleAi/src/components/TimesheetPreview.tsx)
- [src/services/api.ts](file:///home/luiz/Documents/FolhapontogoogleAi/src/services/api.ts)
- [src/App.tsx](file:///home/luiz/Documents/FolhapontogoogleAi/src/App.tsx)

### Alterações:
- **Banco de Dados**: Migration executada adicionando `tipo_turno2` e `observacao_turno2`
- **Backend**: API atualizada para salvar/carregar dados do segundo turno
- **Frontend**: Interface com duas colunas de lançamento independentes
- **Controle**: Segunda coluna habilitada apenas para carga horária de 40h
- **Padrão**: "TRABALHO NORMAL" definido como padrão para todos os lançamentos
- **Compatibilidade**: Mantida com dados existentes

### Objetivo:
Implementar suporte a lançamentos independentes por turno com controle automático por carga horária e estabelecer "TRABALHO NORMAL" como padrão consistente em todo o sistema.

---

## [2026-03-30] Melhoria na Inicialização do Backend

### Arquivos Modificados:
- [start_backend.sh](file:///home/luiz/Documents/FolhapontogoogleAi/start_backend.sh)
- [README_SETUP.md](file:///home/luiz/Documents/FolhapontogoogleAi/README_SETUP.md)
- [README.md](file:///home/luiz/Documents/FolhapontogoogleAi/README.md)

### Alterações:
- Adicionada verificação automática do container Docker MySQL (**meu-mysql**).
- O script agora verifica se o Docker está instalado no sistema.
- Se o container **meu-mysql** existir mas estiver parado, o script tentará iniciá-lo automaticamente antes de subir a API Flask.
- Adicionadas mensagens de alerta caso o container não seja encontrado ou o Docker não esteja disponível.
- Atualizada toda a documentação de setup para refletir o nome correto do container (**meu-mysql**) e a nova funcionalidade de automação.

### Objetivo:
Garantir que o banco de dados esteja operante antes que a aplicação tente se conectar, reduzindo erros de "Connection Refused" na inicialização.

---

## [2026-03-30] Implementação de Docker Compose e Seeding de Dados

### Arquivos Modificados:
- [docker-compose.yml](file:///home/luiz/Documents/FolhapontogoogleAi/docker-compose.yml)
- [backend/Dockerfile](file:///home/luiz/Documents/FolhapontogoogleAi/backend/Dockerfile)
- [Dockerfile](file:///home/luiz/Documents/FolhapontogoogleAi/Dockerfile)
- [database/full_setup.sql](file:///home/luiz/Documents/FolhapontogoogleAi/database/full_setup.sql)
- [README.md](file:///home/luiz/Documents/FolhapontogoogleAi/README.md)
- [README_SETUP.md](file:///home/luiz/Documents/FolhapontogoogleAi/README_SETUP.md)

### Alterações:
- Criado arquivo `docker-compose.yml` para orquestração completa dos serviços (DB, Backend, Frontend).
- Criados `Dockerfile`s específicos para o Backend (Flask) e Frontend (React/Vite).
- Desenvolvido script SQL abrangente (`full_setup.sql`) contendo a estrutura de tabelas e dados de exemplo (profissional "Ana Claudia", folha de ponto e lançamentos).
- Atualizado o `README.md` com instruções rápidas para desenvolvimento usando `docker-compose up`.
- Reestruturado o `README_SETUP.md` para separar a configuração via Docker Compose da configuração manual.

### Objetivo:
Simplificar drasticamente o setup inicial do projeto para novos desenvolvedores e garantir um ambiente de teste consistente com dados pré-populados.

---

## [2026-03-30] Matrícula Opcional, Exclusão e Inclusão de Profissionais

### Arquivos Modificados:
- `database/migrations/001_create_tables.sql`
- `database/full_setup.sql`
- `database/migrations/002_make_matricula_optional.sql` (novo)
- `backend/app.py`
- `src/components/EmployeeForm.tsx`
- `src/components/EmployeeNavigator.tsx`
- `src/App.tsx`

### Alterações:
- **Banco de Dados**: Tornada a coluna `matricula` como NULL (opcional) na tabela `profissionais`.
- **Backend**: Atualizadas as rotas `POST /api/profissionais` e `PUT /api/profissionais/<id>` para permitir matrícula vazia/NULL.
- **Frontend - EmployeeForm**: Campo de matrícula agora é opcional com placeholder indicativo.
- **Frontend - EmployeeNavigator**: 
  - Adicionado botão de excluir (lixeira) ao lado do nome do profissional.
  - Adicionado botão "Novo" (usuário) para criar novo cadastro.
  - Indicador visual "NOVO" quando criando novo profissional.
  - Desabilita navegação anterior/próximo durante criação de novo.
- **Frontend - App.tsx**: 
  - Implementada função `handleDeleteProfissional` com confirmação antes de excluir.
  - Implementada função `handleNewProfissional` para limpar formulário e criar novo cadastro.
  - Validação de nome obrigatório ao salvar.
  - Recarrega lista de profissionais após salvar novo cadastro.

### Objetivo:
Permitir o cadastro de servidores que não possuem matrícula (ex: contratados temporários, prestadores de serviço), possibilitar a exclusão de cadastros de profissionais e adicionar funcionalidade de criar novos profissionais diretamente pela interface do sistema.

---
