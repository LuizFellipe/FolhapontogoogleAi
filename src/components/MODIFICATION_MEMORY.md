# MODIFICATION_MEMORY.md - Histórico de Alterações

---

## [2026-06-25] - Correção: 3ª página em branco ao imprimir no Chrome

### 🔴 Problema Identificado
Ao clicar em Imprimir (Ctrl+P) no Google Chrome, o preview do navegador exibia 3 páginas — a 3ª saindo completamente em branco. Na visualização em tela ("Visualizar"), apenas as 2 páginas corretas eram exibidas.

### 🔍 Causa Raiz
Combinação de espaçamentos residuais nos containers pai que, somados à altura fixa de 297mm das páginas, geravam overflow para uma 3ª página:
1. **`space-y-8`** no wrapper de preview (`App.tsx`) adicionava `margin-top: 2rem` na Página 2 via Tailwind, não zerado pelo CSS de impressão.
2. **`py-8`** no `<main>`, **`pb-20`** e **`min-h-screen`** no root div contribuíam com padding/min-height extras.
3. **`break-before-page`** na Página 2 era redundante com `break-after-page` da Página 1, podendo causar dupla quebra em alguns browsers.

### ✅ Soluções Aplicadas

#### 1. `src/index.css` — Reset agressivo dos containers no `@media print`
- Nova regra zera `#root`, `#root > *`, `main` e `.print-wrapper`: `display: block`, `width/height: auto`, `padding/margin/gap: 0`, `min-height: 0`, `max-width: none`, `border: none`, `background: none`, `overflow: visible`.
- `.print-wrapper > *` recebe `margin: 0 !important` para anular o `space-y-8` do Tailwind.
- `.print-page` recebe `page-break-after: always !important` (mais compatível com Chrome que `break-after: page`).
- `.print-page-2` recebe `page-break-after: avoid !important` e `break-after: avoid !important` para impedir 3ª página.

#### 2. `src/components/TimesheetSummaryPreview.tsx` — Remoção de classes redundantes
- Removida classe `break-before-page` (redundante com `page-break-after: always` da Página 1).
- Adicionada classe `print:mt-0` para garantir margem zero no print.

### ✅ Arquivos Modificados
- `src/index.css`
- `src/components/TimesheetSummaryPreview.tsx`

### 🎯 Objetivo
Garantir que a impressão no Google Chrome gere exatamente 2 páginas A4 (Página 1 e Página 2), sem página em branco adicional.

---

## [2026-06-15] - Ajustes de Layout e Validações de Data: ReturnMemoModal

### 🔍 Alterações Realizadas

#### 1. `src/components/ReturnMemoModal.tsx` — Refinamentos de layout e validações

**Layout do documento impresso (`PrintDocument`):**
- Cabeçalho reestruturado: logo, título e linha "MEMO nº / Guará / data" agora ficam na **mesma célula**, usando CSS Grid (2 colunas). Logo ocupa as 2 linhas à esquerda; título na linha superior direita; MEMO nº/Guará/data na linha inferior direita — fiel ao `layout_memo.jpg` original.
- Brasão aumentado de 44px → 62px.
- Espaçador de 6px inserido entre a linha "Ao(À) UNIDADE REGIONAL" e a célula "Nome", replicando o espaçamento intencional do original.
- Área de assinatura ampliada: 90px → 180px de altura.
- Fonte alterada de `Times New Roman` para `Arial, Helvetica, sans-serif` em todo o documento impresso, aproximando do original.

**Máscara de data:**
- Campos "Data de Admissão" e "Último Dia Trabalhado" recebem máscara automática `dd/mm/aaaa` via função `maskDate` (filtra dígitos e insere barras conforme digitação).

**Validação de datas com modal de alerta:**
- Função `parseDate` valida data completa (rejeita datas inválidas como 31/02).
- Função `validateDates` disparada no `onBlur` de ambos os campos, com 5 verificações:
  1. Último dia em ano diferente do atual.
  2. Último dia no futuro.
  3. Último dia anterior à data de admissão.
  4. Diferença > 50 anos entre admissão e último dia.
  5. Data de admissão no futuro.
- Estado `alertMsg` controla exibição de modal de alerta (z-index 60, estilo âmbar), sem bloquear preenchimento. Fecha ao clicar "Entendido".

### ✅ Arquivos Modificados
- `src/components/ReturnMemoModal.tsx`

---

## [2026-06-15] - Funcionalidade: Modal de Memorando de Devolução (ReturnMemoModal)

### 🔍 Alterações Realizadas

#### 1. `src/components/ReturnMemoModal.tsx` — Novo componente
- Modal para geração do memorando oficial de devolução de servidor à UNIGEP.
- **Campos do cabeçalho**: Vínculo (EFETIVOS | TEMPORÁRIOS), Mês, Ano, MEMO nº, Data de emissão.
- **Seleção individual**: radio buttons — somente 1 profissional por vez (diferença do TimesheetDeliveryModal).
- **Filtro de cargo** (sidebar, somente EFETIVOS): ANA.POL.PUB.G.E, PEDAGOGO, PROF. DE EDUC. BÁSICA.
- **Painel de detalhes** (aparece ao selecionar profissional):
  - Matrícula/Nome readonly (vindos do cadastro).
  - Data de Admissão, Último Dia Trabalhado (texto livre).
  - Carga (1=20h / 2=40h / Ambas), Turno (Matutino/Vespertino/Noturno).
  - Abono: radio Não usufruiu / Não faz jus / Usufruiu + campo de dias.
  - LTS (Portaria 40/2011): radio Não usufruiu / Usufruiu + campo de dias.
  - TRE: checkbox + campo de dias.
  - **Motivo da Devolução**: select com 27 motivos oficiais (008 a 000).
  - Observações (textarea).
- **Impressão A4** (`window.print()`): `PrintDocument` fiel ao `MemoDevolucao.pdf` oficial:
  - Cabeçalho institucional (logo 52px + 4 linhas hierárquicas).
  - Título "Memorando de Devolução" sublinhado.
  - MEMO nº / GUARÁ-DF data.
  - Destinatário "Ao(À) UNIDADE REGIONAL DE GESTÃO DE PESSOAS".
  - Tabela Nome/Matrícula/Disciplina/Cargo/Carga/Admissão/Turno.
  - Texto de último dia + Motivo.
  - Checklist de Abono / LTS / TRE com marcações ( X ) conforme seleção.
  - Rodapé: Assinatura do Servidor + caixa Carimbo/Assinatura do Diretor.
- **Lista de motivos**: 27 códigos oficiais (008 LOTACAO PROVISORIA … 000 A PEDIDO).
- Reutiliza classe `.delivery-print-page` (já existente no CSS).

#### 2. `src/components/EmployeeNavigator.tsx` — Novo botão
- Adicionado ícone `CornerUpLeft` ao import do lucide-react.
- Adicionada prop `onOpenReturnMemoModal?: () => void`.
- Botão "Memo Devolução" inserido no grupo DOCUMENTOS, após "Entrega de Folhas", com estilo outline neutro idêntico.

#### 3. `src/App.tsx` — Integração
- Import de `ReturnMemoModal`.
- Estado `showReturnMemoModal: boolean`.
- Prop `onOpenReturnMemoModal={() => setShowReturnMemoModal(true)}` passada ao `EmployeeNavigator`.
- Renderização de `<ReturnMemoModal ... />` após `<TimesheetDeliveryModal />`.

### ✅ Arquivos Modificados
- `src/components/ReturnMemoModal.tsx` *(novo)*
- `src/components/EmployeeNavigator.tsx`
- `src/App.tsx`

### 🎯 Objetivo
Gerar o memorando oficial de devolução de servidor, fiel ao PDF `MemoDevolucao.pdf`, com seleção individual de profissional, formulário completo de dados (carga, turno, abono, LTS, TRE, motivo) e 27 motivos oficiais codificados.

---

## [2026-06-15] - Ajuste de fidelidade visual: Memo de Devolução (ReturnMemoModal — PrintDocument)

### 🔍 Alterações Realizadas (`src/components/ReturnMemoModal.tsx` — componente `PrintDocument`)

#### 1. Estrutura geral → tabela com bordas
- `PrintDocument` reescrito de `flex` com divs soltos para **tabela HTML** com `borderCollapse: collapse` e `1px solid #000` em cada célula.
- `<colgroup>` define 4 colunas: 18% / 42% / 17% / 23% — garante alinhamento consistente em todo o documento.

#### 2. Linha de cabeçalho
- Logo (44px) + "Memorando de Devolução" em bold 12pt centralizados dentro da célula bordada (colspan=4).

#### 3. Linha MEMO nº / data
- Própria célula bordada (colspan=4): `MEMO nº {num}  Guará -DF, {data}.`

#### 4. Linhas institucionais
- Linha escola CETEG (colspan=4).
- Linha Ao(À) UNIDADE... | Código: 990210000029 (3 + 1 colunas).

#### 5. Bloco servidor (3 linhas de células)
- **Nome**: colspan=4, texto uppercase em `<strong>` 10pt com label "Nome" em 7.5pt acima.
- **Matrícula | Disciplina | Série | Cargo**: 4 células individuais com label mini acima de cada valor.
- **Carga 1(X) 2(X) | Data Admissão | Turno Mat/Vesp/Not**: carga e admissão em 1 célula cada; turno em colspan=2.

#### 6. Bloco de texto + Informamos ainda
- Dois blocos bordados (colspan=4) separados: primeiro com "último dia + motivo", segundo com checklist de Abono / LTS / TRE em `( X )` / `(   )`.

#### 7. Rodapé
- Dois blocos lado a lado (colspan=2 cada): "Assinatura do(a) Servidor(a)" | "Carimbo e Assinatura do(a) Diretor(a)".

### ✅ Arquivos Modificados
- `src/components/ReturnMemoModal.tsx`
- `src/components/README.md`

### 🎯 Objetivo
Tornar o memorando impresso idêntico ao `layout_memo.jpg` e `MemoDevolucao.pdf` oficiais, substituindo layout flex ad-hoc por estrutura de tabela com bordas bem definidas — padrão dos documentos SEEDF.

---

## [2026-06-15] - UX/UI: Reorganização e despoluição do EmployeeNavigator


### 🔍 Alterações Realizadas (`src/components/EmployeeNavigator.tsx`)

#### 1. Reorganização da Linha 2 por escopo
- Ações agrupadas em **dois clusters rotulados** (eyebrow `text-[10px] uppercase tracking-wider text-stone-400`):
  - **FOLHA ATUAL** (edita a folha do profissional atual): Pré Preenchimento · Limpar · Feriados.
  - **DOCUMENTOS** (escopo global): Relatórios · Entrega de Folhas · Gerar em Lote.
- Grupo DOCUMENTOS reordenado (antes: Lote → Relatórios → Entrega) e envolvido no mesmo container `bg-stone-50 border border-stone-200 rounded-xl p-1.5` do grupo FOLHA ATUAL (simetria).

#### 2. Paleta — monocromático + 3 sinais semânticos
- **Eliminados** os accents indigo e teal. Cor agora só carrega significado:
  - verde = criar (Novo); vermelho = destruir (Excluir); amber = ação primária (Pré Preenchimento, único âncora visual).
- Três níveis de botão: *primário* (amber), *ghost* stone (Limpar, Feriados), *outline neutro* `bg-white border-stone-300` (Relatórios, Entrega, Lote).
- Feriados: `text-indigo-700` → ghost stone. Lote: `bg-stone-800` → outline. Relatórios: `bg-teal-700` → outline. Entrega: `bg-indigo-700` → outline.

#### 3. Acessibilidade
- Adicionado `focus-visible:ring-2` a todos os botões de ação (incluindo Novo, Excluir, Feriados, Relatórios, Entrega, Lote).
- Linha 2 mantém `flex-wrap` (responsivo).

### ✅ Arquivos Modificados
- `src/components/EmployeeNavigator.tsx`

### 🎯 Objetivo
Reduzir poluição visual (arco-íris de accents) e reorganizar botões por função/escopo, com layout mais moderno e simples. Mudança 100% presentacional — props, wiring e API inalterados.

---

## [2026-06-15] - Ajuste de fidelidade visual: Memo de Entrega (TimesheetDeliveryModal)

### 🔍 Alterações Realizadas (`src/components/TimesheetDeliveryModal.tsx` — componente `PrintDocument`)

#### 1. Cabeçalho institucional
- 1ª linha "GOVERNO DO DISTRITO FEDERAL" em **13pt**; demais 3 linhas em **11pt**, `lineHeight 1.3` (hierarquia igual ao PDF).
- Logo reduzida de 64px → **52px**.

#### 2. Espaçamento / tipografia do corpo
- Parágrafo do corpo `lineHeight` 1.55 → **1.4**.
- Folgas verticais MEMO/data, vocativo e corpo de 28px → **24px**.

#### 3. Texto dos parágrafos
- Mês renderizado em **CAIXA ALTA** (`mesLabel.toUpperCase()`) nos dois vínculos (ex.: JUNHO/2026).
- Texto Efetivo encerra com `;` ("...abaixo relacionado(s);").

#### 4. Tabela
- Fonte das linhas (Matrícula/Nome/Cargo) 11pt → **9.5pt**.
- Coluna **Cargo** estreitada (150px → **105px**) → encosta a coluna mais à direita da página.

#### 5. Rodapé reformulado (fiel a `fim_relatorio_folhaponto_ambos.jpg`)
- Caixa esquerda Carimbo/Assinatura: **300×150**, texto centralizado na base.
- Caixa direita UNIGEP: título "RECEBIDO NA UNIGEP GUARA EM" + data `___/___/___` na **mesma célula**; linha "ÀS ... MINUTOS"; base com duas linhas de assinatura (borda superior) rotuladas `visto` / `matrícula` (sem divisória vertical).
- Container do rodapé com **`breakInside`/`pageBreakInside: avoid`** → nunca dividido entre 2 páginas.

### ✅ Arquivos Modificados
- `src/components/TimesheetDeliveryModal.tsx`
- `src/components/README.md`

### 🎯 Objetivo
Aproximar ao máximo o memorando impresso dos PDFs oficiais `MemoEntregaFP.pdf` (Efetivos) e `MemoEntregaContrato.pdf` (Temporários), corrigindo tipografia, alinhamento da coluna Cargo e impedindo quebra do rodapé entre páginas.

---

## [2026-06-15] - Funcionalidade: Modal de Entrega de Folhas de Ponto (TimesheetDeliveryModal)

### 🔍 Alterações Realizadas

#### 1. `src/components/TimesheetDeliveryModal.tsx` — Novo componente
- Modal para geração do memorando de encaminhamento de folhas de ponto à UNIGEP.
- **Campos do cabeçalho**: Vínculo (EFETIVOS | TEMPORÁRIOS), Mês, Ano, MEMO nº (manual), Data de emissão.
- **Filtro de vínculo**: EFETIVOS → `!cargo.includes('TEMP')`; TEMPORÁRIOS → `cargo.includes('TEMP')`.
- **Filtro de cargo multi-seleção** (somente EFETIVOS): ANA.POL.PUB.G.E, PEDAGOGO, PROF. DE EDUC. BÁSICA — checkboxes que podem ser combinados simultaneamente.
- **Lista de profissionais**: todos do vínculo/filtro ativo, ordem alfabética, checkbox individual + "Selecionar todos".
- **Impressão A4** (`window.print()`): `PrintDocument` usa inline styles + classe `delivery-print-page`. Cabeçalho institucional com `logo.png`, MEMO nº / data, vocativo "Senhor(a) Coordenador(a),", parágrafo diferenciado por vínculo, tabela Matrícula · Nome (uppercase) · Cargo (abreviado), rodapé com 2 caixas (assinatura e recebimento UNIGEP).
- **`abbreviateCargo()`**: TEMP → 'PROF TEMP'; PROFESSOR DE EDUC. BASICA → 'PROF'; PEDAGOGO → 'PEDAGOGO'; ANA.POL → 'ANA.POL.PUB.G.E'; demais → primeiro segmento.
- **Isolamento de impressão**: modal UI usa classe `no-print`; conteúdo A4 usa `hidden print:block` — ao imprimir, apenas o documento aparece.

#### 2. `src/components/EmployeeNavigator.tsx` — Novo botão
- Adicionada prop `onOpenDeliveryModal?: () => void`.
- Adicionado ícone `Send` ao import do lucide-react.
- Botão "Entrega de Folhas" (fundo `indigo-700`) inserido no Grupo 2 de ações, após o botão "Relatórios".

#### 3. `src/App.tsx` — Integração
- Import de `TimesheetDeliveryModal`.
- Estado `showDeliveryModal: boolean`.
- Prop `onOpenDeliveryModal={() => setShowDeliveryModal(true)}` passada ao `EmployeeNavigator`.
- Renderização de `<TimesheetDeliveryModal ... />` após o `<ReportsModal />`.

#### 4. `src/index.css` — Regra de impressão
- Adicionada regra `.delivery-print-page` em `@media print`: `width: 210mm`, `min-height: 297mm`, `page-break-after: always`.

### ✅ Arquivos Modificados
- `src/components/TimesheetDeliveryModal.tsx` *(novo)*
- `src/components/EmployeeNavigator.tsx`
- `src/App.tsx`
- `src/index.css`

### 🎯 Objetivo
Gerar o memorando oficial de encaminhamento das folhas de ponto à UNIGEP, em formato A4 fiel aos modelos `modal_formato_relatorio_folhaponto_efetivo.jpg` e `modal_formato_relatorio_folhaponto_temporario.jpg`, com seleção multi-cargo e distinção clara entre vínculos Efetivo e Temporário.

---



### 🔍 Alterações Realizadas

#### 1. `database/migrations/016_create_vw_eventos_consolidados.sql` — View já existente
- `vw_relatorio_atestados_bimestrais`: agrupa ocorrências de `ATESTADO MEDICO DE ATE 03`
  por bimestre civil (0-indexed: bimestre1=meses 0-1, bimestre2=meses 2-3, ..., bimestre6=meses 10-11).
- Dias consecutivos com o mesmo tipo = **1 ocorrência** (via `NOT EXISTS` detectando início de sequência).
- Cobre `tipo` **e** `tipo_turno2` — qualquer turno conta.

#### 2. `backend/app.py` — Novo endpoint
- `GET /api/atestados-bimestrais?matricula=<mat>&ano=<ano>`
- Consulta `vw_relatorio_atestados_bimestrais` filtrando por matrícula + ano.
- Retorna `{ bimestre1..6: number }`. Sem dados → retorna zeros.

#### 3. `src/services/api.ts` — Nova interface + método
- Interface exportada: `AtestadosBimestraisResponse { bimestre1..6: number }`.
- Método: `getAtestadosBimestrais(matricula, ano)` → chama o novo endpoint.

#### 4. `src/components/TimesheetGrid.tsx` — Checagem + Modal
- Nova prop: `matricula: string`.
- `useEffect` carrega contagem bimestral ao montar / trocar profissional ou ano.
- `handleEntryChange`: se `value === 'ATESTADO MEDICO DE ATE 03'` e view retorna `>= 1`
  ocorrência no bimestre civil do mês atual → **hard-block** (não aplica mudança).
- Modal de aviso inline: exibe bimestre + ano, instrui usar LICENÇA MÉDICA OU ODONTOLÓGICA.
- Helper `getBimestre(month)` → bimestre 1-6. `getCountFromView(data, month)` → leitura tipada.

#### 5. `src/App.tsx` — Prop nova
- `<TimesheetGrid matricula={employee.registration} ...>` passado ao componente.

### ✅ Arquivos Modificados
- `backend/app.py`
- `src/services/api.ts`
- `src/components/TimesheetGrid.tsx`
- `src/App.tsx`

### 🎯 Objetivo
Garantir que apenas 1 ATESTADO MÉDICO DE ATÉ 03 DIAS seja lançado por bimestre civil
diretamente pela escola. O segundo atestado exige LICENÇA MÉDICA OU ODONTOLÓGICA (homologação).

---

## [2026-06-12] - Ajuste: Adicional Noturno conta somente TRABALHO NORMAL + remoção de dead code

### 🔍 Alterações Realizadas

#### 1. vw_adicional_noturno (banco de dados) — filtro de tipo restrito
- View ajustada para retornar apenas lançamentos com `tipo = 'TRABALHO'` (TRABALHO NORMAL).
- Anteriormente incluía `TRABALHO`, `CPIP` e `CURSO` no WHERE, o que inflava a contagem.
- Nenhuma alteração necessária no frontend: `ReportAdicionaNoturno` já era agnóstico ao tipo, delegando o filtro inteiramente à view.

#### 2. ReportsModal.tsx — remoção de `WORKED_TYPES`
- Removida constante `WORKED_TYPES = new Set(['TRABALHO', 'CPIP', 'CURSO'])` (linha 57).
- Era dead code: nunca referenciada em nenhuma lógica do componente.

### ✅ Arquivos Modificados
- `vw_adicional_noturno` (banco de dados)
- `src/components/ReportsModal.tsx`

### 🎯 Objetivo
Garantir que a contagem de horas de adicional noturno reflita somente dias de TRABALHO NORMAL, excluindo CPIP e CURSO que não geram direito ao adicional.

---

## [2026-06-12] - Melhoria: Regra de Recesso por Duração + Aplicação em Folhas Existentes no Lote

### 🔍 Alterações Realizadas

#### 1. BatchTimesheetModal.tsx — Exibição de recessos por tipo e cargo
- Removida constante `showRecessos` (dependia exclusivamente de `cargoFilter === 'PROFESSOR DE EDUC. BASICA'`).
- Adicionado helper `isSingleDay(r: Recesso)`: `dayInicio === dayFim && monthInicio === monthFim && yearInicio === yearFim`.
- Recessos agora são **sempre** buscados via API ao abrir o modal (independente do cargo).
- Seção de recessos exibida quando existe ao menos um recesso de 1 dia OU cargo = PROFESSOR DE EDUC. BASICA.
- Lista filtrada: recessos multi-dia só aparecem quando cargo = PROFESSOR; recessos de 1 dia aparecem para qualquer cargo.
- Badge `(multi-dia · só PROF. BÁSICA)` exibido em recessos com duração > 1 dia.
- `useEffect` de cleanup: ao trocar cargo para não-PROFESSOR, desmarca automaticamente recessos multi-dia do `selectedRecessoIds`.

#### 2. App.tsx — Função auxiliar `applyRecessosToEntries` + aplicação em folhas existentes
- Adicionados `RECESSO_REPLACEABLE = new Set(['TRABALHO', 'CPIP', 'CURSO'])` e função `applyRecessosToEntries` acima de `handleBatchGenerate`.
- Regras da função:
  - Recesso multi-dia: só aplicado se profissional for PROFESSOR DE EDUC. BASICA.
  - Recesso 1 dia: aplicado para qualquer profissional.
  - Só substitui dias cujo tipo atual seja `TRABALHO`, `CPIP` ou `CURSO` — nunca sobrescreve Férias, Atestados, Feriados, etc.
  - Verifica mês/ano (`d.getMonth() !== mes || d.getFullYear() !== ano`) — não aplica recesso fora do mês da folha.
- `handleBatchGenerate` — branch `if (folhas.length > 0)`:
  - **Antes**: sempre só carregava a folha existente.
  - **Agora**: se há `selectedRecessos`, carrega as entradas existentes, aplica recessos via `applyRecessosToEntries`, salva via `saveLancamentosDiarios` e recarrega; sem recessos o comportamento original é preservado.
- Branch `else` (folha nova): substituído o loop de recessos inline pela chamada a `applyRecessosToEntries` (elimina duplicação).

### ✅ Arquivos Modificados
- `src/components/BatchTimesheetModal.tsx`
- `src/App.tsx`

### 🎯 Objetivo
Permitir que recessos de 1 dia sejam aplicados a todos os profissionais (não apenas PROFESSOR DE EDUC. BASICA) durante a geração em lote, e garantir que recessos sejam aplicados mesmo em folhas já existentes — desde que o dia não tenha um lançamento especial (Férias, Atestado, Feriado, etc.).

---

Este arquivo registra as modificações significativas realizadas nos componentes e lógica do sistema.

---

## [2026-06-10] - Limpeza: Remoção de `observation`/`observation_turno2` de todos os componentes

### 🔍 Alterações Realizadas

#### 1. ReportsModal.tsx
- Removidos campos `observation` e `observation_turno2` da interface `Lancamento`.
- Removido campo `observation` da interface `EntryRange`.
- Removida coluna "Obs" do cabeçalho da tabela de Lançamentos Efetuados.
- Removida célula de dados correspondente; `colSpan` do cabeçalho de profissional ajustado de 5 para 4.
- Removidas as atribuições `observation: ''` e `observation_turno2: ''` no loop de load da view e em `buildRangesLancamentos`.

### ✅ Arquivos Modificados
- `src/components/ReportsModal.tsx`

### 🎯 Objetivo
Remover dados mortos: `observation`/`observation_turno2` eram armazenados no banco mas nunca exibidos em nenhuma tela ou relatório. Parte da limpeza coordenada com `src/types.ts`, `src/App.tsx`, `src/services/api.ts`, `backend/app.py` e migration `015`.

---

## [2026-06-09] - Funcionalidade: Aba "Recessos" no HolidayModal

### 🔍 Alterações Realizadas

#### 1. HolidayModal.tsx — Sistema de abas + nova interface Recesso
- Modal renomeado internamente para "Datas Especiais" e dividido em duas abas (`activeTab: 'feriados' | 'recessos'`).
- **Aba Feriados**: conteúdo e comportamento originais preservados sem alteração.
- **Aba Recessos**: nova funcionalidade completa:
  - Formulário com campos de Data Início (dia/mês/ano), Data Fim (dia/mês/ano) e Label.
  - Lista de recessos do ano atual com botões **Aplicar** (emerald), **Reverter** (amber) e **Excluir** (red) — mesmo padrão visual dos feriados.
  - `loadRecessos()` busca dados via `apiService.getRecessos(currentYear)`.
- Nova interface exportada: `Recesso { id, dayInicio, monthInicio, yearInicio, dayFim, monthFim, yearFim, label }`.
- Novas props: `onApplyRecesso: (r: Recesso) => void` e `onRemoveRecessoEffect: (r: Recesso) => void`.
- Ícone `Coffee` (lucide-react) usado na aba Recessos.

### ✅ Arquivos Modificados
- `src/components/HolidayModal.tsx`
- `src/components/README.md`

### 🎯 Objetivo
Permitir o cadastro e aplicação de períodos de recesso (data início + fim) diretamente no modal de datas especiais, marcando em lote todos os dias do range na folha atual como tipo `RECESSO`.

---

## [2026-05-15] - Funcionalidade: Botão de Cópia Rápida de Padrão Semanal

### 🔍 Alterações Realizadas

#### 1. TimesheetGrid.tsx — Botão Flutuante de Pré-preenchimento (Copiar Semana)
- Implementada a exibição dinâmica de um botão de cópia na célula de "Dia" ao passar o mouse sobre uma linha que seja um dia útil (SEG a SEX).
- O botão só aparece se a semana atual estiver completa dentro do mês e se a **semana anterior** também constar integralmente no mesmo mês.
- Adicionada verificação rigorosa do conteúdo da semana anterior: o botão é exibido apenas se houver algum lançamento diferente de "TRABALHO NORMAL" nos dias úteis da semana passada.
- Lógica inteligente de cópia respeita a carga horária (CH): para profissionais de 40h, copia o padrão de ambos os turnos; para 20h, copia apenas o Turno 1.

### ✅ Arquivos Modificados
- `src/components/TimesheetGrid.tsx`
- `src/components/README.md`

### 🎯 Objetivo
Acelerar o preenchimento da folha de ponto, permitindo aos usuários repetirem facilmente padrões de lançamentos especiais ocorridos na semana anterior com apenas um clique.

---

## [2026-05-15] - Funcionalidade: Filtro de Carga Horária na Geração em Lote

### 🔍 Alterações Realizadas

#### 1. BatchTimesheetModal.tsx — Filtro CH
- Interface `Profissional` atualizada para suportar `carga_horaria` (vindo do backend).
- Adicionado estado e dropdown para filtrar a lista de profissionais por `CH` (TODAS, 20H, 40H).
- O `useMemo` de profissionais filtrados agora verifica `carga_horaria` caso o filtro selecionado seja diferente de 'TODAS'.

### ✅ Arquivos Modificados
- `src/components/BatchTimesheetModal.tsx`
- `src/components/README.md`

### 🎯 Objetivo
Permitir a geração em lote específica por jornada de trabalho (ex: gerar apenas folhas de servidores com CH 20), agilizando a impressão.

---

## [2026-05-06] - Melhoria: 2º Turno com Traços para Profissionais CH=20

### 🔍 Alterações Realizadas

#### 1. TimesheetPreview.tsx — Preenchimento do 2º Turno com traços

- Adicionadas constantes `isCh20` e `sigDashes` antes do `return`.
- Quando `data.employee.ch === '20'`, as células do Turno 2 passam a exibir traços em todas as linhas:
  - **Assinatura do Servidor**: `"-- -- -- -- -- -- -- -- -- --"` com `tracking-widest` (preenche a coluna larga w-40).
  - **Entrada / Saída**: `"------"` (constante `dashes` já existente).
- Para CH=40, o comportamento permanece inalterado.

### ✅ Arquivos Modificados
- `src/components/TimesheetPreview.tsx`

### 🎯 Objetivo
Indicar visualmente que o 2º turno não se aplica ao profissional de 20 horas, alinhando o layout ao documento oficial onde campos sem turno são preenchidos com traços ao invés de ficarem em branco.

---

## [2026-05-04] - UX/UI: Melhoria Visual dos Formulários de Resumo e Lançamentos

### 🔍 Alterações Realizadas

#### 1. SummaryForm.tsx e TimesheetGrid.tsx — Modernização do UI
- Reestruturação visual das tabelas adotando o padrão `divide-y` mais limpo e legível.
- Cores de hover, bordas e fundos ajustadas com estilo moderno (`ui-ux-pro-max`).
- Inclusão de transições suaves e anéis de foco (`focus:ring-2`, `focus:bg-white`) nos `selects` e `inputs` para feedback tátil aprimorado.
- Melhoria no destaque visual aos fins de semana na grade de Lançamentos Diários (`bg-amber-50/40`, texto ambarino).
- O layout geral e disposição (grids e items) permaneceram idênticos para evitar quebra de fluxo.

### 🎯 Objetivo
Elevar a estética e usabilidade da grade principal e do Resumo (Página 2), trazendo visual premium sem alterar a estrutura da aplicação.

---
## [2026-05-04] - UX/UI: Reorganização Visual do Formulário de Servidor

### 🔍 Alterações Realizadas

#### 1. EmployeeForm.tsx — Modernização do Formulário
- Reestruturação completa do layout seguindo os padrões visuais do `EmployeeNavigator.tsx`.
- Campos organizados em "cards" semânticos (`Identificação`, `Atuação e Lotação`, `Jornada e Turnos`) com bordas suaves (`border-stone-200`) e fundo leve (`bg-stone-50/50`).
- Labels atualizadas para melhor legibilidade (`uppercase`, `tracking-wider`, `text-stone-500`).
- Inputs e Selects atualizados para fundo branco (`bg-white`), bordas definidas (`border-stone-300`) e interações de foco consistentes.
- Nenhuma funcionalidade ou mapeamento de dados foi alterado.

### 🎯 Objetivo
Melhorar a ergonomia visual do formulário de preenchimento, agrupando informações lógicas de forma intuitiva para o usuário, alinhando a estética com as diretrizes UI/UX estabelecidas nos demais componentes.

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
  - **Ações**: "Aplicar" atualiza o dia na grade de lançamentos com o `tipo` 'FERIADO'. "Reverter" desfaz a alteração voltando o dia para 'TRABALHO NORMAL'. "Excluir" remove o feriado do registro.
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
