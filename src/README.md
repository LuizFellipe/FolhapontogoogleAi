# Código Fonte do Frontend (Source Code)

Esta pasta concentra toda a lógica de aplicação e componentes da interface do usuário (UI) desenvolvida com **React 18+** e **TypeScript**.

## Estrutura da Pasta

-   **`components/`**: Contém todos os componentes modulares da UI (formulários, grades, pré-visualizações para impressão).
-   **`services/`**: Camada de serviço de API e regras de comunicação externa.
-   **`types.ts`**: Arquivo central de definições de tipos TypeScript (Interfaces de Servidor, Folha de Ponto e Lançamentos). Inclui suporte a `type_turno2` para lançamentos independentes por turno. Garante a consistência dos dados em toda a aplicação.
-   **`App.tsx`**: O orquestrador principal do frontend. Gerencia o estado global da folha selecionada, roteamento de telas e botões de ação do cabeçalho (Salvar, Imprimir, Novo Profissional).
    - **Novo**: Implementa funções `handleNewProfissional()` e `handleDeleteProfissional()` para CRUD completo.
    - **Validação**: Verifica nome obrigatório antes de salvar.
    - **Integração**: Recarrega lista de profissionais após criar/excluir.
    - **PDF cadastral SIGEP**: Passa cadastro persistido e estado de carregamento/salvamento/navegação ao `EmployeeForm`; a emissão exige que nome, matrícula, cargo, função e CH estejam salvos, além dos complementares.
    - **Segundo Turno**: Inicializa entries com `type_turno2: 'TRABALHO'` e passa carga horária para controle de colunas.
    - **Auto-resumo**: `computeSummaryFromEntries(entries, ch)` — função pura (fora do componente) que recalcula automaticamente o `summaryEntries` (Página 2) sempre que os lançamentos diários são alterados. Agrupa dias consecutivos com o mesmo código, deduplica turno1/turno2 no mesmo dia e define `carga` conforme a carga horária (`1` para 20h, `3` para 40h).
    - **Auto-save**: Persiste automaticamente as alterações da folha no banco de dados em tempo real sempre que um Feriado é aplicado ou revertido via modal.
    - **Impressão em Lote**: Implementa `handleBatchPrintOnly` para imprimir múltiplas folhas de ponto selecionadas sem forçar salvar no BD ou realizar pré-preenchimento.
    - **Modal de Relatórios**: Estado `showReportsModal` controla o `<ReportsModal>` que recebe `profissionais` (array completo), `initialMonth` e `initialYear`. Relatórios operam sobre todas as folhas do período via API.
    - **Sincronização EducaSync**: Estado `showSyncModal` orquestra o `<SyncEducaModal>` para conciliação em lote entre os dados locais do banco de dados e os registros gerados pelo extrator PDF EducaSync.
    - **Entrega e Devolução**: Integra os componentes `<TimesheetDeliveryModal>` e `<ReturnMemoModal>` para geração de memorandos oficiais de encaminhamento e devolução de servidores à UNIGEP.
    - **Tipos Dinâmicos**: Carrega a lista oficial de tipos de lançamento (`ENTRY_TYPES`) diretamente do banco de dados na inicialização, garantindo sincronia entre frontend e backend.
    - **`main.tsx`**: Ponto de entrada oficial da aplicação React montando a estrutura do DOM no `index.html`.
-   **`index.css`**: Contém todas as declarações de estilos globais, configurações do Tailwind CSS e definições de layout para impressão (como quebras de página controladas).
-   **`logo.png`**: Logotipo utilizado no cabeçalho e na folha de ponto oficial.

## Padrões Técnicos
-   **Arquitetura baseada em Componentes**: Componentes reutilizáveis e isolados.
-   **Hooks de Estado**: Utiliza `useState` e `useEffect` para controle de interface.
-   **Tailwind CSS**: Estilização baseada em utilitários (`p-4`, `flex`, `hidden`, etc.).
-   **Framer Motion**: Animações fluidas entre as páginas da folha e painéis laterais.

## Como Desenvolver
O código fonte é processado pelo **Vite**. Para rodar o ambiente de desenvolvimento:
```bash
npm run dev
```
O servidor de desenvolvimento servirá a aplicação em `http://localhost:5173`.
