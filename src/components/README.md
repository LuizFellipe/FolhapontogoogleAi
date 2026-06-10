# Componentes da Interface (UI Components)

Esta pasta contém todos os componentes React modulares utilizados para construir a interface de usuário do sistema Folha de Ponto.

## Estrutura da Pasta

### 📝 Formulários de Preenchimento (Edição)

-   **`EmployeeForm.tsx`**: Gerencia o formulário de dados cadastrais do servidor (Nome, Matrícula, UA, Carga Horária, Lotação e Turnos). Valida campos obrigatórios.
-   **`EmployeeNavigator.tsx`**: Componente de navegação e busca que permite selecionar profissionais cadastrados, alternar visualizações e criar novas folhas. Expõe as ações: **Novo**, **Excluir**, **Pré Preenchimento**, **Limpar Lançamentos**, **Feriados**, **Gerar em Lote** e **Relatórios**.
-   **`BatchTimesheetModal.tsx`**: Modal de geração em lote de folhas de ponto. Permite filtrar profissionais por cargo e carga horária (CH), selecionar o mês/ano de referência e marcar múltiplos profissionais via checkboxes. Oferece opções para Limpar Seleção, Gerar com Pré-preenchimento (com barra de progresso e impressão automática) e Imprimir apenas (sem preenchimento ou persistência).
-   **`ReportsModal.tsx`**: Modal de relatórios gerenciais para o período selecionado (mês/ano). Contém dois relatórios que abrangem **todos os profissionais** com folha cadastrada no período:
    -   **Lançamentos Efetuados**: lista eventos não-triviais (excluindo TRABALHO NORMAL, CPIP e CURSO) agrupados em ranges de dias consecutivos com o mesmo tipo, seguindo o layout SIGFP (colunas: Matrícula, Nome/Evento, Início, Fim, Obs). Uma linha de cabeçalho por profissional seguida de linhas de evento. Dados via `getLancamentosRelatorio` → `vw_folhas_lancamento`.
    -   **Adicional Noturno**: exibe apenas profissionais com turno1 = 'Noturno' ou turno2 = 'Noturno'; conta lançamentos via `vw_adicional_noturno` (view já pré-filtra profissionais noturnos e tipos TRABALHO/CPIP/CURSO); cada linha na view = 1h de adicional; exibe total por profissional e grand total no rodapé. Dados via `getAdicionaNoturnoRelatorio`.
    -   Cada relatório tem seu próprio estado e `useEffect` independente — fetch só ocorre quando o relatório está ativo. Botão "Imprimir" chama `window.print()`.
-   **`HolidayModal.tsx`**: Modal com duas abas para gestão de datas especiais:
    -   **Aba Feriados**: cadastro de feriados por Dia/Mês/Ano/Label com botões Aplicar (marca o dia como `FERIADO` na folha atual via `tipo`/`tipo_turno2`), Reverter e Excluir.
    -   **Aba Recessos**: cadastro de períodos de recesso com Data Início e Data Fim (dia/mês/ano) e Label. Ao clicar Aplicar, todos os dias do range que pertencem ao mês/ano da folha atual são marcados como `RECESSO` via `tipo`/`tipo_turno2` (respeita CH: turno 2 só é alterado em CH=40). Botões Reverter e Excluir seguem o mesmo padrão visual.
    -   Exporta as interfaces `Holiday` e `Recesso` e recebe as props `onApply`, `onRemoveEffect`, `onApplyRecesso` e `onRemoveRecessoEffect`. Persistência via API (`/api/feriados` e `/api/recessos`).
-   **`SummaryForm.tsx`**: Gerencia a grade de preenchimento da **Página 2** (Resumo da Frequência). Permite adicionar códigos de operação (Inclusão, Alteração, Exclusão) e códigos de ocorrência.
-   **`TimesheetGrid.tsx`**: Grade principal da **Página 1** para lançamentos diários (Trabalho Normal, Férias, Atestado, etc.). Suporta lançamentos por **dois turnos** (Turno 1 e Turno 2), com o segundo turno habilitado conforme a carga horária. Possui funcionalidade de copiar o padrão de preenchimento de semanas anteriores (botão "Copiar Semana" flutuante exibido ao passar o mouse sobre os dias úteis).

### 📄 Visualizações para Impressão (Preview)

-   **`TimesheetPreview.tsx`**: Renderiza a **Página 1** da folha de ponto seguindo o layout oficial da Secretaria de Educação.
    -   **Preenchimento A4 Completo**: Em modo de impressão, ocupa toda a página A4 via classes CSS `print-page` + `print-page-table-section`, distribuindo as 31 linhas da tabela uniformemente com o trick `tbody tr { height: 1% }`.
    -   **Preenchimento**: Invalida automaticamente campos de entrada/saída com travessões (`---`) em dias de lançamentos especiais.
    -   **CH=20 — 2º Turno bloqueado**: Quando `data.employee.ch === '20'`, as colunas do Turno 2 (Assinatura, Entrada, Saída) são preenchidas com traços (`-- -- -- ...` e `------`) em todas as linhas, indicando que o 2º turno não se aplica ao profissional.
    -   **Quebra de Página**: Usa `break-after-page` para forçar a Página 2 em uma nova folha ao imprimir.
-   **`TimesheetSummaryPreview.tsx`**: Renderiza a **Página 2** (Resumo) e a **Tabela de Códigos**. Utiliza estilização específica para os números em formato "U" (`|_|`) e linhas de tabela oficiais.
    -   **Preenchimento A4 Completo**: Em modo de impressão, ocupa toda a página A4 via classe `print-page-2`. A caixa MENSAGEM cresce (`flex: 1`) para preencher o espaço restante.

## Padrões Adotados
-   **React + TypeScript**: Todos os componentes são tipados para maior segurança.
-   **Tailwind CSS**: Estilização baseada em utilitários para responsividade e consistência visual.
-   **Lucide React**: Biblioteca de ícones (Impressora, Salvar, Lixeira, etc.).
-   **Framer Motion**: Utilizado para animações suaves de transição entre seções.

## Como Usar
Estes componentes são importados e orquestrados pelo `App.tsx` para formar a estrutura completa da aplicação.
