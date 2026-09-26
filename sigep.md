# Arquitetura e Integração dos Dados Complementares do SIGEP

Este documento detalha o plano e a arquitetura implementada para integrar as **Fichas Cadastrais do SIGEP** (`sigep/ficha.cadastral.*.json`), geradas a partir do script `sigep/extrair_fichas.py`, ao sistema de Folha de Ponto.

---

## 1. Visão Geral da Arquitetura

```
+-------------------------------------------------------------+
|                 Ficha Cadastral SIGEP (PDFs)               |
+-------------------------------------------------------------+
                              |
                              v extrair_fichas.py
+-------------------------------------------------------------+
|             sigep/ficha.cadastral.DD.MM.YYYY.json           |
+-------------------------------------------------------------+
                              |
                              v GET /api/sigep/fichas-cadastrais
+-------------------------------------------------------------+
|              Backend Flask (backend/app.py)                 |
+-------------------------------------------------------------+
        |                                       |
        | POST /api/sigep/sincronizar           | GET / PUT
        | (Upsert idempotente)                  | /api/profissionais/:id/complementar
        v                                       v
+-------------------------------+       +------------------------------------+
|         MySQL Database        |       |        Frontend React (Vite)       |
|                               |       |                                    |
| - profissionais (base)        | <---> | 1. SyncEducaModal + SyncSigepTab   |
| - profissionais_complementar  |       | 2. EmployeeForm +                  |
| - profissional_cargas_horarias|       |    ComplementaryDataWidget (Dock)  |
| - profissional_cursos         |       +------------------------------------+
| - profissional_habilitacoes   |
| - profissional_componentes    |
+-------------------------------+
```

### Princípios da Modelagem
1. **Regra de Não-Duplicação**: Campos que já residem na tabela principal `profissionais` (`nome`, `cargo`, `funcao`, `carga_horaria`, `unidade_lotacao`, `ua`, `exercicio`, `disciplina`, `status`, `turno1`, `turno2`) **não** foram duplicados nas tabelas complementares.
2. **Separação Relacional 1:1 e 1:N**:
   - Dados cadastrais e documentais únicos por servidor ficam na tabela 1:1 `profissionais_complementar`.
   - Vínculos com cardinalidade múltipla ficam em 4 tabelas 1:N dedicadas (`cargas`, `cursos`, `habilitações`, `componentes`).
3. **Casamento por Matrícula Normalizada**:
   - Matrículas com pontuação ou zeros à esquerda (`0123.456-7`, `01234567`, `1234567`) são normalizadas tanto no Python quanto no TypeScript (`_norm_mat` em `backend/app.py` / `normMat` exportado de `src/services/api.ts`).
4. **Dock Minimizado por Padrão**:
   - Dentro de `EmployeeForm.tsx`, o acesso aos dados da ficha cadastral se dá por um dock flutuante no canto inferior direito que não polui o formulário diário de folhas, permitindo expansão sob demanda para modal completo com edição direta.

---

## 2. Banco de Dados (MySQL)

**Migration:** `database/migrations/023_create_dados_complementares_sigep.sql`

**Migration 024:** `database/migrations/024_drop_colunas_redundantes_sigep.sql` (remove `matricula`/`criado_em` redundantes das tabelas 1:N).

O schema completo (tipos e colunas) está na migration 023 — fonte única, não duplicado aqui.

- **`profissionais_complementar`** (1:1, `profissional_id` UNIQUE, FK `ON DELETE CASCADE`): documentos (CPF, CI, PIS, título), dados pessoais, filiação, endereço, `telefones` (JSON), dados funcionais SIGEP e `arquivo_origem`. No backend, a lista de colunas vive em `COMP_COLS` (`backend/app.py`).
- **`profissional_cargas_horarias`** (1:N): `tipo_carga`, `unidade`, `cre`, `coord_externa`, `lotacao`, `turno`, `atuacao`.
- **`profissional_cursos`** (1:N): `curso`, `instituicao`, `emissao`, `utilizacao`, `data_utilizacao`, `carga_horaria`.
- **`profissional_habilitacoes`** (1:N): `habilitacao`.
- **`profissional_componentes`** (1:N): `componente`.

---

## 3. Endpoints da API (Backend Flask)

Implementados em `backend/app.py`:

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/sigep/fichas-cadastrais` | Localiza o JSON mais recente em `sigep/ficha.cadastral.*.json` (pela data `DD.MM.YYYY` do nome) e retorna metadados (totais) e as 5 tabelas. |
| `POST` | `/api/sigep/sincronizar` | Executa importação/upsert no MySQL. Recebe opcionalmente `{"matriculas": [...]}`. Mapeia servidores por matrícula normalizada, atualiza `profissionais_complementar` e substitui registros filhos 1:N de forma transacional atômica. |
| `GET` | `/api/profissionais/<id>/complementar` | Retorna o registro complementar do servidor juntamente com suas cargas, cursos, habilitações e componentes. |
| `PUT` | `/api/profissionais/<id>/complementar` | Upsert (cria ou atualiza) dos dados cadastrais enviados pelo modal. Não sobrescreve `arquivo_origem`. |

---

## 4. Componentes Frontend (React / TypeScript)

### 4.1 Componentes Criados

1. **`src/components/SyncSigepTab.tsx`**:
   - Aba embutida no modal de sincronização.
   - Apresenta cabeçalho com metadados do JSON ativo (totalizadores de servidores, cargas, cursos, etc.).
   - Sistema de filtros: **Prontos para Sincronizar** (encontrados no MySQL), **Não Cadastrados na Base** (alerta amarelo) e **Todos da Ficha**.
   - Busca instantânea por Nome, Matrícula ou CPF.
   - Cards expansíveis com detalhes de cada servidor e badges de cargas/cursos/habilitações.
   - Botão para sincronizar todos os elegíveis ou os itens individualmente marcados.

2. **`src/components/ComplementaryDataWidget.tsx`**:
   - Widget flutuante posicionado no canto inferior direito (`fixed bottom-4 right-4`).
   - **Padrão Minimizado**: Barra compacta com ícone, matrícula e indicador visual de status no BD (verde = sincronizado, âmbar = pendente).
   - **Modo Expandido**: Modal responsivo com 6 abas temáticas:
     1. *Documentação & Pessoal* (com botão para copiar CPF e documentos).
     2. *Endereço & Contatos* (telefones e email).
     3. *Dados Funcionais SIGEP* (admissão, especialidade, PCD, readaptação).
     4. *Cargas Horárias* (unidades, lotação, CRE e turnos).
     5. *Cursos & Progressões* (tabela com curso, instituição, horas e lei).
     6. *Habilitações & Componentes* (chips de disciplinas).
   - Ação de **Salvar Alterações** diretamente no banco de dados via API.

### 4.2 Componentes Modificados

1. **`src/components/SyncEducaModal.tsx`**:
   - Adicionado seletor de módulos no topo:
     - `EducaSync (Dados Básicos da Folha)`
     - `SIGEP (Fichas Cadastrais Complementares)` (renderiza `SyncSigepTab`).
2. **`src/components/EmployeeForm.tsx`**:
   - Adicionada prop `profissionalId?: number`.
   - Renderiza o `<ComplementaryDataWidget />` integrado ao contexto do servidor atual.
3. **`src/App.tsx`**:
   - Atualizada a chamada de `<EmployeeForm />` para repassar `profissionalId={profissionais[currentProfissionalIndex]?.id}`.
4. **`src/services/api.ts`**:
   - Adicionados os métodos `getSigepFichasCadastrais()`, `sincronizarSigep()`, `getProfissionalComplementar()` e `updateProfissionalComplementar()`, e o helper `normMat` (usado por `SyncEducaModal` e `SyncSigepTab`).

---

## 5. Como Operar o Fluxo

1. **Gerar JSON atualizado do SIGEP**:
   ```bash
   cd sigep
   python3 extrair_fichas.py
   ```
2. **Sincronizar no Sistema**:
   - No cabeçalho da aplicação, clicar em **Sincronizar Educa**.
   - Clicar na aba **SIGEP (Fichas Cadastrais Complementares)**.
   - Clicar em **Selecionar Todos Prontos** e depois em **Sincronizar Complementares**.
3. **Consultar e Editar no Formulário**:
   - Ao navegar pelos servidores na tela principal, o dock minimizado no canto inferior direito exibirá os dados daquele servidor.
   - Clique em **Expandir** para ver todas as informações, copiar CPF ou atualizar telefones e endereços.
