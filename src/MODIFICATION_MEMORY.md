# Memória de Modificação - Frontend (src/)

## [2026-06-10] Limpeza: Remoção de `observation`/`observation_turno2` da interface `DailyEntry`

### Arquivos Modificados:
- **types.ts**
- **App.tsx**
- **services/api.ts**

### Alterações Detalhadas:

#### 1. `types.ts` — interface `DailyEntry`
- Removidos campos `observation: string` e `observation_turno2: string`.

#### 2. `App.tsx`
- Removidas todas as atribuições `observation`/`observation_turno2` em:
  - `computePreFillEntries` (inicialização de entries)
  - `handleApplyHoliday` / `handleRemoveHolidayEffect`
  - `handleApplyRecesso` / `handleRemoveRecessoEffect`
  - geração em lote (loop de recessos selecionados)
  - `useEffect` de inicialização mensal
  - array de entries vazias para impressão rápida

#### 3. `services/api.ts`
- Save: removidos `observacao: entry.observation` e `observacao_turno2: entry.observation_turno2` do mapeamento de lancamentos.
- Load: removidos `observation: lancamento.observacao` e `observation_turno2: lancamento.observacao_turno2` do mapeamento de retorno.

### 🎯 Objetivo
Estes campos armazenavam labels de feriado/recesso no banco mas nunca foram exibidos em nenhuma tela ou relatório. Remoção coordenada com `components/ReportsModal.tsx`, `backend/app.py` e migration `015_remove_observacao_columns.sql`.

---

## [2026-06-09] Funcionalidade: Aplicação de Recessos na Folha de Ponto

### Arquivos Modificados:
- **App.tsx**

### Alterações Detalhadas:

#### 1. Import de `Recesso`
- Adicionado à importação existente de `HolidayModal`: `import { HolidayModal, Holiday, Recesso } from './components/HolidayModal'`.

#### 2. `handleApplyRecesso(recesso: Recesso)` — novo handler
- Itera de `dia_inicio/mes_inicio/ano_inicio` até `dia_fim/mes_fim/ano_fim` usando `Date` JS.
- Para cada dia do range que pertença ao `month/year` atual:
  - Define `type = 'RECESSO'`.
  - CH=40: define `type_turno2 = 'RECESSO'` e `observation_turno2 = recesso.label`.
  - CH=20: mantém `type_turno2` e `observation_turno2` intocados.
  - Define `observation = recesso.label`.
- Chama `handleEntriesChange(newEntries)` + auto-save (mesmo padrão de `handleApplyHoliday`).
- Exibe `alert` se nenhum dia do range pertencer ao mês/ano atual.

#### 3. `handleRemoveRecessoEffect(recesso: Recesso)` — novo handler
- Mesmo percurso de datas que `handleApplyRecesso`.
- Reverte apenas os dias cujo `type === 'RECESSO'` para `type='TRABALHO'`, `type_turno2='TRABALHO'`, `observation=''`, `observation_turno2=''`.
- Chama `handleEntriesChange` + auto-save.

#### 4. `<HolidayModal>` — novas props
- `onApplyRecesso={handleApplyRecesso}` e `onRemoveRecessoEffect={handleRemoveRecessoEffect}` passados ao componente.

### 🎯 Objetivo
Integrar a lógica de aplicação/reversão de recessos ao App.tsx, permitindo marcar em lote dias de um período como `RECESSO` com auto-save imediato, seguindo o mesmo padrão já estabelecido para feriados.

---

## [2026-05-03] Funcionalidade: Modal de Relatórios Gerenciais (ReportsModal)

### Arquivos Modificados/Criados:
- **components/ReportsModal.tsx** *(novo)*
- **components/EmployeeNavigator.tsx**
- **App.tsx**

### Alterações Detalhadas:

#### 1. ReportsModal.tsx — Novo componente
- Dois relatórios cobrindo **todos os profissionais** com folha no período selecionado (mês/ano):
  - **Lançamentos Efetuados**: entries não-triviais (excluindo TRABALHO, CPIP, CURSO) agrupadas em ranges de dias consecutivos com mesmo tipo. Layout SIGFP: cabeçalho por profissional (matrícula + nome) + linhas de evento (Início / Fim / Obs).
  - **Adicional Noturno**: filtra profissionais com "NOTURNO" em `turno1`/`turno2`; conta dias úteis (Seg–Sex) com tipo TRABALHO/CPIP/CURSO — 1 dia = 1 hora; exibe total por profissional e grand total.
- Carregamento via `getFolhasPonto({ mes, ano })` + `Promise.all` para lancamentos; cross-referencia `profissional_id` com array `profissionais` para obter `turno1`/`turno2`.
- Props: `{ isOpen, onClose, profissionais: any[], initialMonth, initialYear }`.
- Botão "Imprimir" chama `window.print()`.

#### 2. EmployeeNavigator.tsx — Nova prop e botão
- Adicionada prop `onOpenReportsModal?: () => void`.
- Botão **"Relatórios"** (`teal-700`, ícone `FileText`) inserido na linha 2, após "Gerar em Lote".

#### 3. App.tsx — Integração
- Estado `showReportsModal: boolean` criado.
- `<ReportsModal>` renderizado com `profissionais`, `initialMonth` e `initialYear`.

### Objetivo:
Relatórios mensais consolidados: ocorrências de lançamentos especiais e horas de adicional noturno para todos os profissionais do período.

---

## [2026-05-03] Funcionalidade: Auto-save de Feriados na Folha de Ponto

### Arquivos Modificados:
- **App.tsx**

### Alterações Detalhadas:

#### 1. `handleApplyHoliday` e `handleRemoveHolidayEffect`
- Implementado auto-salvamento imediato (`apiService.saveCompleteTimesheet`) na folha de ponto sempre que um feriado é aplicado ou revertido na grade de horários.
- Adicionado estado de salvamento visual (`setSaveStatus('saving')` e `'saved'`) transparente ao usuário, garantindo persistência sem depender do clique no botão "Salvar".

### 🎯 Objetivo
Evitar a perda da aplicação do feriado ao recarregar a página ou navegar de profissional sem antes salvar manualmente, garantindo persistência em banco de dados em tempo real.

---

## [2026-05-03] Funcionalidade: Auto-preenchimento do Resumo da Frequência (Página 2)

### Arquivos Modificados:
- **App.tsx**

### Alterações Detalhadas:

#### 1. `computeSummaryFromEntries(entries, ch)` — nova função pura (fora do componente)
- Recebe o array de `DailyEntry` e a carga horária (`ch`) do profissional.
- Determina `carga`: `'3'` se `ch` contém `'40'`, senão `'1'`.
- Para cada entry, verifica `type` (turno1) e `type_turno2` em `ENTRY_TYPES`; coleta apenas os que possuem `code != null`.
- Deduplica pares `(codigo, dia)` — turno1 e turno2 no mesmo dia com o mesmo código contam como 1 dia.
- Agrupa dias por código e detecta sequências consecutivas (ex: dias 3,4,5 → uma linha com `horas_dias='00003'`).
- Para cada sequência gera 1 `SummaryEntry`: `operation='I'`, `code`, `carga`, `months='01'`, `hoursDays` zero-pad 5, `startDay/endDay` zero-pad 2.
- Preenche sempre 8 linhas (vazias quando necessário) e retorna `rows.slice(0, 8)`.

#### 2. `handleEntriesChange(newEntries)` — novo handler
- Substitui o `onChange={setEntries}` direto do `TimesheetGrid`.
- Chama `setEntries(newEntries)` + `setSummaryEntries(computeSummaryFromEntries(newEntries, employee.ch))`.
- Garante que o Resumo da Frequência seja recalculado a cada alteração de lançamento.

#### 3. `handleClearEntries` — atualizado
- Após resetar entries para TRABALHO (código null), chama `setSummaryEntries(initialSummary)` diretamente (resultado equivalente ao compute, mas sem overhead).

#### 4. `handlePreFill` — atualizado
- Substituído `setEntries(newEntries)` por `handleEntriesChange(newEntries)`, recalculando o resumo após o pré-preenchimento.

#### 5. Carregamento do banco (loadExistingTimesheet) — inalterado
- Continua usando os dados de `resumo_folha` do banco. O auto-compute só age em alterações manuais via UI.

### Comportamento por carga horária:
| Carga | Campo `carga` no resumo |
|-------|------------------------|
| 20h   | `1`                    |
| 40h   | `3`                    |

### Exemplo:
> Servidor 20h — Abono TRE (código `00256`) nos dias 5, 6 e 7:
> → `{ operation:'I', code:'00256', carga:'1', months:'01', hoursDays:'00003', startDay:'05', endDay:'07' }`

### ✅ Arquivos Modificados
- `src/App.tsx`

### 🎯 Objetivo
Eliminar o preenchimento manual do Resumo da Frequência: ao selecionar lançamentos com código oficial na grade diária, a Página 2 é preenchida automaticamente com operação, código, carga, meses e intervalo de dias.

---

## [2026-04-27] Funcionalidade: Geração em Lote de Folhas de Ponto

### Arquivos Modificados/Criados:
- **components/BatchTimesheetModal.tsx** *(novo)*
- **components/EmployeeNavigator.tsx**
- **App.tsx**
- **index.css**

### Alterações Detalhadas:

#### 1. Novo Componente — `BatchTimesheetModal.tsx`
- Modal completo para seleção e geração em lote, com: filtro de cargo (dropdown com valores únicos), seleção de mês e ano, lista de profissionais com checkboxes individuais, botão "Selecionar todos", barra de progresso durante processamento e botão "Gerar (N selecionados)".

#### 2. `EmployeeNavigator.tsx`
- Adicionada prop `onBatchGenerate?: () => void`.
- Importado ícone `Printer` do `lucide-react`.
- Novo botão **"Gerar em Lote"** na linha 2 de ações (ao lado de Pré Preenchimento e Limpar).

#### 3. `App.tsx`
- **`computePreFillEntries(profissionalId, targetMonth, targetYear)`**: função extraída da lógica de pré-preenchimento existente, reutilizável de forma assíncrona para calcular o padrão semanal de CPIP/CURSO de qualquer profissional e mês.
- **`handlePreFill`**: refatorado para chamar `computePreFillEntries` e aplicar via `setEntries` (comportamento idêntico ao anterior).
- **`handleBatchGenerate(selectedIds, mes, ano)`**: para cada profissional selecionado, verifica se a folha existe no mês/ano escolhido:
  - **Existe**: carrega os dados existentes.
  - **Não existe**: cria a folha, aplica pré-preenchimento CPIP/CURSO, salva os lançamentos no banco e então carrega os dados.
  - Ao final, adiciona `batch-printing` ao `document.body`, chama `window.print()` e limpa o estado no evento `afterprint`.
- **Div `batch-print-content`**: container oculto com `TimesheetPreview` + `TimesheetSummaryPreview` para cada folha do lote.
- **`<BatchTimesheetModal>`**: montado no JSX com controle via estado `showBatchModal`.
- Novos estados: `showBatchModal`, `isGeneratingBatch`, `batchProgress`, `batchTimesheets`.

#### 4. `index.css`
- Classe `.batch-print-content { display: none }` para ocultar o container normalmente.
- Regras `@media print` com `body.batch-printing`: exibe `.batch-print-content` e oculta `header`, `main` e `.no-print` durante a impressão em lote.

### Objetivo:
Permitir a geração simultânea de folhas de ponto para múltiplos profissionais em um único mês/ano, com pré-preenchimento automático de CPIP/CURSO quando a folha ainda não existe, e impressão unificada de todas as folhas em sequência.

---

## [2026-04-17] Correção de Acesso Remoto — URL da API

### Arquivos Modificados:
- **services/api.ts**: Alterada a constante `API_BASE_URL`

### Alterações Detalhadas:
- **Antes**: `process.env.REACT_APP_API_URL || 'http://localhost:5000/api'`
- **Depois**: `import.meta.env.VITE_API_URL || '/api'`

### Motivação:
- `process.env.REACT_APP_*` não é reconhecido pelo Vite (usa `import.meta.env.VITE_*`), portanto a variável nunca era lida e o fallback hardcoded `localhost` sempre era aplicado.
- `http://localhost:5000/api` no JS compilado é interpretado pelo browser da máquina remota, onde `localhost` aponta para ela mesma — não para o servidor. Isso fazia com que profissionais cadastrados não aparecessem ao acessar de outra máquina na rede.
- Com URL relativa `/api`, o browser aponta para o mesmo host do frontend. Em dev, o proxy do Vite roteia para `http://localhost:5000`; em produção Docker, o Nginx proxy já faz esse roteamento.

### Objetivo:
Garantir que o sistema funcione corretamente tanto no acesso local quanto no acesso remoto por qualquer máquina na rede.

---

## [2026-04-12] Impressão Preenche A4 Completo

### Arquivos Modificados:
- **index.css**: `@page { margin: 0 }` + classes CSS dedicadas para impressão (`.print-page`, `.print-page-2`, `.print-wrapper`, `.print-page-table-section`, `.print-message-box`)
- **components/TimesheetPreview.tsx**: Adicionadas classes `print-page`, `break-after-page` e wrapper `print-page-table-section`
- **components/TimesheetSummaryPreview.tsx**: Adicionadas classes `print-page-2` e `print-message-box`
- **App.tsx**: Adicionada classe `print-wrapper` ao `motion.div` do preview

### Alterações Detalhadas:

#### 1. Regras CSS (index.css)
- **`@page`**: Tamanho A4 sem margens do browser — componentes controlam seu próprio espaçamento interno
- **`.print-page`**: `210mm × 297mm`, `display: flex; flex-direction: column` para Página 1
- **`.print-page-table-section`**: `flex: 1` — tabela + observações crescem para preencher altura disponível
- **Trick `tbody tr { height: 1% }`**: Distribui 31 linhas uniformemente na altura da tabela
- **`.print-page-2`**: `210mm × 297mm`, `display: flex; flex-direction: column` para Página 2
- **`.print-message-box`**: `flex: 1` — MENSAGEM cresce para preencher espaço restante da Página 2
- **`.print-wrapper`**: Zera padding/margin/gap do wrapper do preview no print

#### 2. Componentes
- `TimesheetPreview`: classes de impressão no container externo, seção de tabela em wrapper flex
- `TimesheetSummaryPreview`: classes de impressão no container externo, MENSAGEM com flex grow

### Objetivo:
Garantir que Página 1 e Página 2 preencham integralmente o A4 ao imprimir ou salvar em PDF, sem espaços em branco, fiel ao `FolhaExemplo.pdf`.

---

## [2026-03-31] Implementação de Segundo Turno e Padrão TRABALHO NORMAL

### Arquivos Modificados:
- **types.ts**: Adicionado suporte a `type_turno2` e removida opção "NÃO APLICÁVEL"
- **components/TimesheetGrid.tsx**: Implementada segunda coluna com controle por carga horária
- **components/TimesheetPreview.tsx**: Removida lógica de 40h e ajustada exibição independente
- **services/api.ts**: Adaptada conversão para novos campos
- **App.tsx**: Atualizada inicialização e props

### Alterações Detalhadas:

#### 1. Tipos (types.ts)
- **DailyEntry**: Adicionado `type_turno2: EntryType` e `observation_turno2: string`
- **ENTRY_TYPES**: Removida opção vazia, mantido apenas tipos válidos
- **Padrão**: "TRABALHO NORMAL" como estado base para todos os lançamentos

#### 2. Interface Principal (TimesheetGrid.tsx)
- **Nova prop**: `employeeCh` para controle de exibição do segundo turno
- **Cabeçalho**: "Tipo Turno 1" e "Tipo Turno 2" (condicional)
- **Controle**: Segunda coluna habilitada apenas para carga 40h
- **Selects**: Dois selects independentes com padrão "TRABALHO NORMAL"

#### 3. Preview (TimesheetPreview.tsx)
- **Removida**: Lógica complexa de `is40Hours`
- **Nova função**: `getEntryDisplay()` com parâmetro `turnNumber`
- **Exibição**: Independente para cada turno sem condicionais

#### 4. API Frontend (services/api.ts)
- **Salvamento**: Envia `tipo_turno2` e `observacao_turno2` para backend
- **Carregamento**: Mapeia novos campos com fallback para 'TRABALHO'
- **Compatibilidade**: Trata dados existentes com null

#### 5. Aplicação (App.tsx)
- **Inicialização**: Entries com `type_turno2: 'TRABALHO'`
- **Props**: Passa `employee.ch` para TimesheetGrid
- **Controle**: Lógica de carga horária para habilitar segundo turno

### Objetivo:
Implementar suporte a lançamentos independentes por turno com controle automático por carga horária e definir "TRABALHO NORMAL" como padrão consistente.

---

## [2026-04-20] Simplificação Completa do Sistema - Apenas Dia + Tipo

**Data:** 2026-04-20
**Objetivo:** Sistema ultra-simplificado com apenas **Dia + Tipo de Lançamento**, removendo todos os campos desnecessários.

### Arquivos Modificados:
1. **types.ts**: 
   - **DailyEntry**: Reduzida para apenas `day` e `type`
   - **Removidos**: entry1, exit1, entry2, exit2, observation, type_turno2, observation_turno2
   - **ENTRY_TYPES**: Mantidos apenas tipos essenciais de lançamento

2. **App.tsx**:
   - **Removido TimesheetGrid**: Substituído por tabela inline simplificada
   - **Tabela**: 2 colunas apenas (Dia + Tipo)
   - **Inicialização**: Entries criadas apenas com dia e tipo
   - **Importação**: Adicionado ENTRY_TYPES do types.ts

3. **services/api.ts**:
   - **Salvamento**: Apenas dia + tipo + campos vazios para compatibilidade
   - **Carregamento**: Apenas dia + tipo do banco
   - **Conversão**: Simplificada para essencial

4. **components/TimesheetPreview.tsx**:
   - **Layout**: Reduzido para 2 colunas
   - **Cabeçalho**: Simplificado sem turnos e horários
   - **Corpo**: Apenas dia + tipo de lançamento
   - **Logo**: Substituído por placeholder textual

5. **components/TimesheetGrid.tsx**: 
   - **Removido**: Componente complexo substituído por tabela inline
   - **Simplificado**: Sistema agora usa abordagem direta em App.tsx

### Estrutura Final Implementada:
```
Dia | Tipo de Lançamento
01  | Trabalho Normal
02  | FÉRIAS
03  | ATESTADO
```

### Benefícios Alcançados:
- ✅ Interface ultra-simplificada e direta
- ✅ Fluxo objetivo sem campos desnecessários
- ✅ Banco de dados limpo com dados essenciais
- ✅ Foco no essencial sem complexidade
- ✅ Manutenção simplificada
- ✅ Performance melhorada

### Funcionalidades Mantidas:
- ✅ Seleção de tipo de lançamento
- ✅ Navegação entre profissionais
- ✅ Salvamento e carregamento
- ✅ Preview para impressão
- ✅ Resumo da folha

---

## [2026-03-26] Remoção de Campos de Horário

**Data:** 2026-03-26
**Objetivo:** Remover campos de horário da interface de lançamentos sem alterar a visualização final da folha.

### Arquivos Modificados:
1. **components/TimesheetGrid.tsx**: 
   - Remoção das colunas "Entrada 1", "Saída 1", "Entrada 2" e "Saída 2" do cabeçalho.
   - Remoção dos campos de `<input>` correspondentes no corpo da tabela.
2. **services/api.ts**:
   - Ajuste no método `saveCompleteTimesheet` para não enviar mais `entrada1, entrada2, saida1, saida2` ao backend.
   - Ajuste no método `loadCompleteTimesheet` para injetar strings vazias (`''`) nesses campos, garantindo que o componente de visualização (`TimesheetPreview.tsx`) continue funcionando sem alterações de layout.
