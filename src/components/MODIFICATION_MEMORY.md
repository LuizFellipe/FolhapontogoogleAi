# MODIFICATION_MEMORY.md - Histórico de Alterações

Este arquivo registra as modificações significativas realizadas nos componentes e lógica do sistema.

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
