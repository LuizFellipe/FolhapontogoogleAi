# MODIFICATION_MEMORY.md - Histórico de Alterações

Este arquivo registra as modificações significativas realizadas nos componentes e lógica do sistema.

---

## [2026-05-04] - Refatoração: Relatório de Adicional Noturno via View `vw_adicional_noturno`

### 🔴 Problema
Relatório de Adicional Noturno utilizava os dados do `vw_folhas_lancamento` (shared com Lançamentos) e aplicava filtros de turno/dias-úteis no frontend, lógica incorreta e acoplada.

### ✅ Solução
- **Backend** (`backend/app.py`): novo endpoint `GET /api/relatorio/adicional-noturno?mes=&ano=` consultando `vw_adicional_noturno`.
- **API** (`src/services/api.ts`): novo método `getAdicionaNoturnoRelatorio(mes, ano)`.
- **ReportsModal** (`src/components/ReportsModal.tsx`):
  - State separado: `adicionaData / isLoadingAdiciona / nenhumaAdiciona`.
  - `useEffect` independente — fetch só ocorre quando `reportType === 'adicional_noturno'`.
  - `ReportAdicionaNoturno` reescrito: recebe `AdicionalNoturnoProf[]` agrupado por `fp.id`; `horas = count de linhas` (view já pré-filtra tudo via WHERE).

### 📋 SQL da View (referência)
```sql
WHERE (ld.tipo IN ('TRABALHO','CPIP','CURSO') OR ld.tipo_turno2 IN ('TRABALHO','CPIP','CURSO'))
  AND (p.turno1 = 'Noturno' OR p.turno2 = 'Noturno')
```
Cada linha = 1 lançamento válido = 1h de adicional noturno.

### 🎯 Resultado
Contagem correta e desacoplada. Relatório de Lançamentos não alterado.

---



### 🔴 Problema
Carregamento do relatório de lançamentos executava N+1 queries: `getFolhasPonto` → `Promise.all(N × getFolhaPonto)`. Com muitos profissionais, cada abertura do modal disparava dezenas de requisições.

### ✅ Solução
- **Backend** (`backend/app.py`): novo endpoint `GET /api/relatorio/lancamentos?mes=&ano=` que consulta diretamente a view `vw_folhas_lancamento`, retornando todas as linhas do período em uma única query.
- **Frontend API** (`src/services/api.ts`): novo método `getLancamentosRelatorio(mes, ano)`.
- **ReportsModal** (`src/components/ReportsModal.tsx`): `useEffect` substituído — agrupa as linhas da view por `profissional_id` em memória, eliminando o loop de requisições individuais. Dependência `profissionais` removida do array do effect (a view já traz nome/matrícula/turnos).

### 🎯 Resultado
1 req no lugar de N+1. Relatório significativamente mais rápido para meses com muitos profissionais.

---

## [2026-05-04] - Correção: Filtro de Mês no Gerador de Relatórios

### 🔴 Problema Identificado
O filtro de mês no `ReportsModal` enviava `filterMonth + 1` para a API (`mes: filterMonth + 1`), mas o banco de dados armazena o mês com índice 0-based (Janeiro=0, Abril=3). O `+1` causava mismatch — selecionar Abril (index 3) enviava `mes=4` ao backend, retornando 0 resultados.

### ✅ Solução Aplicada
#### `src/components/ReportsModal.tsx` — linha ~282
```diff
- mes: filterMonth + 1,
+ mes: filterMonth,
```

### 🎯 Objetivo
Alinhar o filtro da query com a convenção 0-indexed do banco de dados, igual ao que as demais partes do sistema já faziam corretamente.

---

## [2026-05-04] - Correção: Relatório de Lançamentos Efetuados

### 🔴 Problemas Corrigidos

#### 1. `EXCLUDED_FROM_REPORT` excluía tipos indevidos
- `CURSO` e `FERIADO` estavam no set de exclusão — não deveriam estar.
- SQL de referência exclui **apenas** `TRABALHO` e `CPIP`.
- Agora: `const EXCLUDED_FROM_REPORT = new Set(['TRABALHO', 'CPIP'])`.

#### 2. Profissionais sem ocorrências apareciam na tabela
- Todos os profissionais com folha no período eram listados, mesmo sem eventos especiais.
- Comportamento corrigido: filtragem via `profsComOcorrencia` — só exibe quem tem `ranges.length > 0`.
- Mensagem "Nenhuma ocorrência especial registrada" exibida quando ninguém tem eventos.

### ✅ Arquivos Modificados
- `src/components/ReportsModal.tsx`

### 🎯 Objetivo
Alinhar o relatório de Lançamentos com o SQL de referência: exibir FERIADO, CURSO e demais tipos especiais; ocultar profissionais sem ocorrências.

---

## [2026-05-03] - Funcionalidade: Modal de Relatórios Gerenciais (ReportsModal)


### 🔍 Alterações Realizadas

#### 1. ReportsModal.tsx — Novo componente
- Modal `max-w-5xl` com dois relatórios que cobrem **todos os profissionais** com folha no mês/ano selecionado:
  - **Lançamentos Efetuados**: filtra entradas não-triviais (excluindo TRABALHO, CPIP, CURSO), agrupa dias consecutivos com mesmo tipo em ranges `{ diaInicio, diaFim }`, renderiza uma linha de cabeçalho por profissional (matrícula + nome) seguida de linhas de evento — layout SIGFP (Matrícula / Nome·Evento / Início / Fim / Obs).
  - **Adicional Noturno**: filtra profissionais com "NOTURNO" em `turno1` ou `turno2`, conta dias úteis (Seg–Sex) onde `tipo ∈ { TRABALHO, CPIP, CURSO }` (1 dia = 1 hora), exibe total por profissional e grand total no `<tfoot>`.
- **Carregamento**: `useEffect` dispara em `isOpen`/`filterMonth`/`filterYear` → `getFolhasPonto({ mes, ano })` (sem filtro de profissional) → `Promise.all` para buscar lancamentos de todas as folhas → cross-referencia `profissional_id` com array `profissionais` do App.tsx para obter `turno1`/`turno2`.
- **Props**: `{ isOpen, onClose, profissionais: any[], initialMonth: number, initialYear: number }`.
- **Interface `ProfData`**: `{ profissionalId, nome, matricula, turno1, turno2, lancamentos[] }`.
- **Botão "Imprimir"**: chama `window.print()`.

#### 2. EmployeeNavigator.tsx — Novo botão e prop
- Adicionado `FileText` às importações do `lucide-react`.
- Adicionada prop `onOpenReportsModal?: () => void` à interface `Props`.
- Inserido botão **"Relatórios"** (fundo `teal-700`, ícone `FileText`) na linha 2 de ações, após "Gerar em Lote".

#### 3. App.tsx — Integração do modal
- Novo estado: `showReportsModal: boolean`.
- Prop `onOpenReportsModal={() => setShowReportsModal(true)}` passada ao `EmployeeNavigator`.
- Renderização de `<ReportsModal isOpen={showReportsModal} onClose={...} profissionais={profissionais} initialMonth={month} initialYear={year} />`.

### ✅ Arquivos Modificados
- `src/components/ReportsModal.tsx` *(novo)*
- `src/components/EmployeeNavigator.tsx`
- `src/App.tsx`

### 🎯 Objetivo
Oferecer relatórios gerenciais mensais com visão consolidada de todos os profissionais: ocorrências de lançamentos especiais e horas de adicional noturno.

---

## [2026-05-03] - Refatoração: Persistência de Feriados no Banco de Dados

### 🔍 Alterações Realizadas

#### 1. Banco de Dados e Backend
- Criada nova tabela `feriados` no MySQL (`database/migrations/011_create_feriados_table.sql`).
- Implementados endpoints de CRUD (`GET`, `POST`, `DELETE`) em `backend/app.py`.

#### 2. Integração Frontend
- Atualizado `api.ts` com os novos métodos para a entidade Feriados.
- `HolidayModal.tsx` modificado para buscar, criar e excluir feriados via API em vez de `localStorage`.

### 🎯 Objetivo
Garantir a consistência e persistência centralizada dos dados de feriados entre sessões e usuários.

---

## [2026-05-03] - Funcionalidade: Lançamento de Feriados (HolidayModal)

### 🔍 Alterações Realizadas

#### 1. HolidayModal.tsx — Novo componente
- Modal dedicado à gestão de feriados locais/específicos:
  - **Inputs**: Dia, Mês, Ano e Nome do Feriado.
  - **Lista**: Exibe os feriados cadastrados para o ano selecionado.
  - **Ações**: "Aplicar" atualiza o dia na grade de lançamentos com o `tipo` 'FERIADO' e a `observacao` com o nome inserido. "Reverter" desfaz a alteração voltando o dia para 'TRABALHO NORMAL'. "Excluir" remove o feriado do registro.
  - **Armazenamento**: Feriados cadastrados ficam persistidos no `localStorage`.

#### 2. App.tsx e EmployeeNavigator.tsx — Integração
- **`EmployeeNavigator.tsx`**: Adicionado botão "Feriados" (ícone Calendar) que chama a prop `onOpenHolidayModal`.
- **`App.tsx`**: Inclusão dos estados do modal, renderização do `<HolidayModal />` e métodos `handleApplyHoliday` e `handleRemoveHolidayEffect` que alteram localmente a lista de `entries`.

### ✅ Arquivos Modificados
- `src/components/HolidayModal.tsx` *(novo)*
- `src/components/EmployeeNavigator.tsx`
- `src/App.tsx`

### 🎯 Objetivo
Permitir aos usuários cadastrar feriados e aplicá-los rapidamente nas folhas de ponto com observações customizadas.

---

## [2026-05-02] - Melhoria: Proporção dos boxes no Resumo da Frequência

### 🔍 Alterações Realizadas

#### 1. TimesheetSummaryPreview.tsx — Tamanho dos boxes de dígitos e operação

- `renderDigits`: classe alterada de `w-3.5 h-5` para `w-5 h-6` (14×20px → 20×24px).
- `renderOperation`: classe alterada de `w-4 h-5` para `w-5 h-6` (16×20px → 20×24px).
- Boxes agora são aproximadamente quadrados, mais fiéis à imagem de referência oficial.
- Espaçamento `gap-x-8` mantido. Layout `items-center` mantido.

### ✅ Arquivos Modificados
- `src/components/TimesheetSummaryPreview.tsx`

### 🎯 Objetivo
Aproximar o visual da seção "RESUMO DA FREQUÊNCIA" à proporção dos boxes presentes no documento oficial de referência.

---

## [2026-05-01] - Correção: SummaryForm sem linhas em folhas sem resumo salvo

### 🔴 Problema Identificado
Ao navegar para folhas onde `resumo_folha` possuía 0 registros (folhas criadas antes da implementação do save de resumo, geradas em lote ou inseridas manualmente), o `SummaryForm` renderizava 0 linhas, impossibilitando o preenchimento do Resumo da Frequência.

### 🔍 Causa Raiz
`src/App.tsx:415` — quando `loadCompleteTimesheet` encontra a folha mas `resumo_folha` retorna array vazio, `setSummaryEntries([])` era chamado sem fallback. O branch `else` (folha inexistente) já usava `initialSummary`, mas o caminho "folha existe + resumo vazio" não tinha tratamento.

### ✅ Solução Aplicada

#### `src/App.tsx` — linha 415
```typescript
// Antes:
setSummaryEntries(timesheetData.summaryEntries);
// Depois:
setSummaryEntries(timesheetData.summaryEntries.length > 0 ? timesheetData.summaryEntries : initialSummary);
```

### 🎯 Objetivo
Garantir que o SummaryForm sempre exiba 8 linhas editáveis, mesmo quando a tabela `resumo_folha` não possui entradas para o `folha_ponto_id` consultado.

---

## [2026-05-01] - Auditoria: Impacto da Refatoração de Tipos de Lançamento

### Contexto
Refatoração em `src/types.ts` renomeou values de `EntryType` e adicionou campo `code` ao `ENTRY_TYPES`. Foi realizada varredura completa dos componentes para identificar impactos.

### Resultado da Auditoria

| Componente | Uso de ENTRY_TYPES/EntryType | Impacto | Ação |
|---|---|---|---|
| `TimesheetGrid.tsx` | `ENTRY_TYPES.map(t => <option value={t.value}>{t.label}</option>)` | Nenhum — iteração dinâmica | Sem alteração |
| `TimesheetPreview.tsx` | `ENTRY_TYPES.find(t => t.value === type)` | Nenhum — lookup dinâmico | Sem alteração |
| `TimesheetSummaryPreview.tsx` | `{ code: '256', desc: 'TRE' }` em tabela de referência | Cosmético — texto informativo, não validação de dados | Sem alteração |
| `BatchTimesheetModal.tsx` | Sem referência direta a tipos | Nenhum | Sem alteração |
| `EmployeeNavigator.tsx` | Sem referência direta a tipos | Nenhum | Sem alteração |

### Conclusão
Todos os componentes que usam tipos de lançamento fazem isso via iteração dinâmica sobre `ENTRY_TYPES` — nenhum value está hardcoded nos componentes. A adição do campo `code` em `ENTRY_TYPES` não quebra nenhum componente existente pois nenhum desestrutura a lista com tipo fixo.

---

## [2026-04-29] - Documentação: Sincronização de README e Árvore de Componentes

### 🔍 Alterações Realizadas

#### 1. src/components/tree.txt — Estrutura atualizada
- Inclusão de `BatchTimesheetModal.tsx` na listagem da pasta.
- Inclusão do próprio `tree.txt` na listagem.

#### 2. src/components/README.md — Descrição do TimesheetGrid atualizada
- Texto ajustado para refletir o comportamento atual do componente, com suporte a lançamentos por dois turnos e habilitação do segundo turno por carga horária.
- Removida referência desatualizada à limpeza automática de campos de horário.

### ✅ Arquivos Modificados
- `src/components/tree.txt`
- `src/components/README.md`

### 🎯 Objetivo
Eliminar inconsistências entre documentação, histórico e estrutura real dos arquivos em `src/components`.

---

## [2026-04-27] - Funcionalidade: Geração em Lote de Folhas de Ponto

### 🔍 Alterações Realizadas

#### 1. BatchTimesheetModal.tsx — Novo componente
- Modal de seleção para geração em lote com os seguintes elementos:
  - **Filtro de cargo**: dropdown com valores únicos extraídos da lista de profissionais (ex.: PROFESSOR TEMPORÁRIO, PROF. DE EDU. BASICA).
  - **Seleção de Mês e Ano**: controles independentes de período de referência do lote.
  - **Lista de profissionais com checkboxes**: exibe nome, cargo e matrícula (se houver); permite seleção individual.
  - **Selecionar todos**: checkbox que marca/desmarca todos os profissionais visíveis no filtro ativo.
  - **Barra de progresso**: exibida durante a geração, mostrando `atual/total — nome do profissional em processamento`.
  - **Botão "Gerar (N selecionados)"**: desabilitado quando nenhum profissional está selecionado ou enquanto a geração está em andamento.

#### 2. EmployeeNavigator.tsx — Nova prop e botão
- Adicionada prop `onBatchGenerate?: () => void` à interface `Props`.
- Adicionado ícone `Printer` às importações do `lucide-react`.
- Inserido botão **"Gerar em Lote"** (fundo `stone-800`, ícone impressora) na Linha 2 de ações, ao lado dos botões Pré Preenchimento e Limpar Lançamentos.

### ✅ Arquivos Modificados
- `src/components/BatchTimesheetModal.tsx` *(novo)*
- `src/components/EmployeeNavigator.tsx`

### 🎯 Objetivo
Permitir a geração simultânea de folhas de ponto para múltiplos profissionais em um único mês/ano, aplicando pré-preenchimento de CPIP/CURSO automaticamente quando a folha ainda não existe, e enviando tudo para impressão de uma só vez.

---

## [2026-04-26] - Melhoria: Ampliação do Campo de Nome do Servidor no Navegador

### 🔍 Alterações Realizadas

#### 1. EmployeeNavigator.tsx — Largura mínima do `<select>`
- Classe alterada de `flex-1 min-w-0` para `flex-1 min-w-[280px]`.
- `min-w-0` permitia que o elemento encolhesse indefinidamente, truncando nomes longos (ex.: "ALLANA DA SILVA S...").
- Com `min-w-[280px]`, o campo garante espaço suficiente para exibir o nome completo.

### ✅ Arquivos Modificados
- `src/components/EmployeeNavigator.tsx`

### 🎯 Objetivo
Exibir o nome completo do servidor no campo de seleção do navegador, sem truncamento.

---

## [2026-04-26] - Funcionalidade: Pré Preenchimento de CPIP/CURSO e Botão Limpar Lançamentos

### 🔍 Alterações Realizadas

#### 1. EmployeeNavigator.tsx — Reestruturação de layout e novos props
- Adicionados props à interface `Props`: `onPreFill`, `onClear`, `isPreFilling`.
- Importados ícones `ClipboardList` e `X` do `lucide-react`.
- Layout reestruturado de linha única para **duas linhas**:
  - **Linha 1**: botões `< >` · indicador `N de Total` · dropdown de seleção · botões Novo (verde) e Excluir (vermelho).
  - **Linha 2**: botão **Pré Preenchimento** (âmbar, com estado de loading) · botão **Limpar Lançamentos** (cinza).
- Removido bloco redundante "Nome atual" (o nome já aparece no dropdown).
- Botões desabilitados quando `isNewProfissional` é verdadeiro.

### ✅ Arquivos Modificados
- `src/components/EmployeeNavigator.tsx`

### 🎯 Objetivo
Permitir o reaproveitamento do padrão semanal de `CPIP` e `CURSO FORMAÇÃO CONTINUADA` de folhas anteriores do mesmo ano, e resetar todos os lançamentos para TRABALHO NORMAL com um clique.

---

## [2026-03-30] - Funcionalidade: Matrícula Opcional, Exclusão e Inclusão de Profissionais

### 🔍 Alterações Realizadas

#### 1. EmployeeForm.tsx — Campo matrícula opcional
- Campo de matrícula passa a aceitar valor vazio, com placeholder indicativo de que é opcional.

#### 2. EmployeeNavigator.tsx — Novos controles de cadastro
- Adicionado botão **Excluir** (ícone lixeira, vermelho) ao lado do nome do profissional.
- Adicionado botão **Novo** (ícone usuário, verde) para criar novo cadastro em branco.
- Indicador visual **"NOVO"** (badge verde) substitui o contador "N de Total" durante a criação.
- Botões Anterior/Próximo desabilitados durante a criação de novo cadastro.

### ✅ Arquivos Modificados
- `src/components/EmployeeForm.tsx`
- `src/components/EmployeeNavigator.tsx`

### 🎯 Objetivo
Permitir o cadastro de servidores sem matrícula, possibilitar a exclusão de cadastros e adicionar funcionalidade de criar novos profissionais diretamente pela interface.

---

## [2026-04-12] - Melhoria: Impressão Preenche A4 Completo

### 🔍 Alterações Realizadas

#### 1. src/index.css — Regras de Impressão
- **`@page { size: A4 portrait; margin: 0; }`**: Elimina as margens padrão do browser ao imprimir, cedendo controle de espaçamento para os próprios componentes.
- **`.print-wrapper`**: Zera `padding`, `margin` e `gap` do wrapper `motion.div` do preview durante a impressão.
- **`.print-page`**: Força o `TimesheetPreview` a ocupar exatamente `210mm × 297mm` como coluna flex.
- **`.print-page-table-section`**: Seção da tabela + observações cresce (`flex: 1`) para preencher o espaço disponível.
- **`tbody tr { height: 1% }`**: Distribui as 31 linhas da tabela uniformemente ao longo da altura restante.
- **`.print-page-2`**: Força o `TimesheetSummaryPreview` a ocupar exatamente `210mm × 297mm`.
- **`.print-page-2 .print-message-box { flex: 1 }`**: Caixa MENSAGEM cresce para preencher o espaço restante da Página 2.

#### 2. TimesheetPreview.tsx — Página 1
- Adicionada classe `print-page` e `break-after-page` ao `div` externo.
- Tabela e caixa de Observações envolvidas em `<div className="print-page-table-section">` para suporte ao crescimento vertical.

#### 3. TimesheetSummaryPreview.tsx — Página 2
- Adicionada classe `print-page-2` ao `div` externo.
- Adicionada classe `print-message-box` ao `div` da MENSAGEM para crescimento vertical.

#### 4. App.tsx
- Adicionada classe `print-wrapper` ao `motion.div` do modo preview para eliminar `py-4` e `space-y-8` durante a impressão.

### ✅ Arquivos Modificados
- `src/index.css`
- `src/components/TimesheetPreview.tsx`
- `src/components/TimesheetSummaryPreview.tsx`
- `src/App.tsx`

### 🎯 Objetivo
Garantir que ao imprimir ou salvar em PDF, cada página (Página 1 e Página 2) preencha integralmente a folha A4, sem espaços em branco, fiel ao documento de referência (`FolhaExemplo.pdf`).

---

## [2026-03-31] - Implementação: Segundo Turno Independente e Padrão TRABALHO NORMAL

### 🔍 Alterações Realizadas

#### 1. TimesheetGrid.tsx - Interface de Lançamentos
- **Segunda Coluna**: Adicionada coluna "Tipo Turno 2" com controle por carga horária
- **Controle Automático**: Segunda coluna habilitada apenas para carga 40h
- **Padrão TRABALHO**: Ambas as colunas iniciam com "TRABALHO NORMAL"
- **Props**: Nova prop `employeeCh` para controle de exibição
- **Selects Independentes**: Dois selects para lançamentos por turno

#### 2. TimesheetPreview.tsx - Visualização para Impressão
- **Removida Lógica 40h**: Eliminada complexa verificação de carga horária
- **Nova Função**: `getEntryDisplay()` com parâmetro `turnNumber`
- **Exibição Independente**: Cada turno exibido sem condicionais
- **Compatibilidade**: Trata dados existentes com fallback para 'TRABALHO'

### ✅ Arquivos Modificados
- `src/components/TimesheetGrid.tsx`
- `src/components/TimesheetPreview.tsx`

### 🎯 Objetivo
Implementar suporte a lançamentos independentes por turno com controle automático por carga horária e definir "TRABALHO NORMAL" como padrão consistente.

---

## [2026-03-31] - Melhoria: Visualização de Carga Horária (40h) e Lançamentos Especiais

### 🔍 Alterações Realizadas
1. **Padr padrão de Visualização para 40h**:
   - Quando o servidor possui carga horária de "40" horas, os lançamentos especiais (Férias, Atestado, etc.) agora são replicados na **Segunda Coluna de Assinatura**.
   - Isso garante que ambos os turnos do servidor sejam devidamente preenchidos visualmente com a justificativa do afastamento.

2. **Preenchimento de Horários com Travessões**:
   - Células de "Entrada" e "Saída" agora são preenchidas com travessões (`----------`) nos dias de lançamentos especiais (tudo que não for "TRABALHO NORMAL").
   - Se a carga horária for de 40h, os travessões também são aplicados nas colunas de entrada/saída do segundo turno.

### ✅ Arquivos Modificados
- `src/components/TimesheetPreview.tsx`

---

## [2026-03-30] - Correção: Validação do Campo "Nome"

### 🔴 Problema Identificado
Ao tentar salvar alterações em um servidor existente, o sistema retornava um erro de "campo Nome obrigatório", mesmo quando o usuário já havia preenchido o campo. 

### 🔍 Causa Raiz
Inconsistência de nomenclatura entre o frontend e o backend:
1. O backend (`backend/app.py`) retornava o nome do profissional como `profissional_nome` em algumas rotas de consulta (devido a um alias no SQL).
2. O frontend (`src/services/api.ts`) esperava o campo `nome`. 
3. Isso resultava em um valor `undefined` no estado local do profissional (`employee.name`), que era enviado vazio ao backend durante o salvamento.

### ✅ Soluções Aplicadas

#### Frontend (`src/services/api.ts`)
- O método `convertProfissionalToEmployee` foi atualizado para aceitar tanto `nome` quanto `profissional_nome`.
```typescript
name: profissionalData.nome || profissionalData.profissional_nome,
```

#### Backend (`backend/app.py`)
- As consultas SQL nas rotas `GET /api/folhas-ponto` e `GET /api/folhas-ponto/<id>` foram ajustadas para incluir o campo `nome` de forma explícita, além do alias `profissional_nome`.
```sql
SELECT f.*, p.nome as profissional_nome, p.nome, p.matricula ...
```

---

> [!NOTE]
> Estas alterações garantem o funcionamento correto do layout oficial da folha de ponto e a persistência dos dados do servidor.

### Ajustes na Geração em Lote
- **Data**: 2026-05-03
- **Arquivo**: `BatchTimesheetModal.tsx`, `App.tsx`
- **Descrição**: Adição do botão de "Imprimir" isolado da lógica de pré-preenchimento, e botão "Limpar Seleção" no modal de geração em lote.
- **Motivo**: Permitir imprimir as folhas sem forçar a aplicação de pré-preenchimento e melhorar usabilidade na hora de desmarcar itens.
