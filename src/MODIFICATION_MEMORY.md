# Memória de Modificação - Frontend (src/)

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
