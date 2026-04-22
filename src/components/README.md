# Componentes da Interface (UI Components)

Esta pasta contém todos os componentes React modulares utilizados para construir a interface de usuário do sistema Folha de Ponto.

## Estrutura da Pasta

### 📝 Formulários de Preenchimento (Edição)

-   **`EmployeeForm.tsx`**: Gerencia o formulário de dados cadastrais do servidor (Nome, Matrícula, UA, Carga Horária, Lotação e Turnos). Valida campos obrigatórios.
-   **`EmployeeNavigator.tsx`**: Componente de navegação e busca que permite selecionar profissionais cadastrados, alternar visualizações e criar novas folhas.
-   **`SummaryForm.tsx`**: Gerencia a grade de preenchimento da **Página 2** (Resumo da Frequência). Permite adicionar códigos de operação (Inclusão, Alteração, Exclusão) e códigos de ocorrência.
-   **`TimesheetGrid.tsx`**: Grade principal da **Página 1** para lançamentos diários (Trabalho Normal, Férias, Atestado, etc.). Automatiza a limpeza de campos de horário quando uma ocorrência é selecionada.

### 📄 Visualizações para Impressão (Preview)

-   **`TimesheetPreview.tsx`**: Renderiza a **Página 1** da folha de ponto seguindo o layout oficial da Secretaria de Educação.
    -   **Preenchimento A4 Completo**: Em modo de impressão, ocupa toda a página A4 via classes CSS `print-page` + `print-page-table-section`, distribuindo as 31 linhas da tabela uniformemente com o trick `tbody tr { height: 1% }`.
    -   **Preenchimento**: Invalida automaticamente campos de entrada/saída com travessões (`---`) em dias de lançamentos especiais.
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
