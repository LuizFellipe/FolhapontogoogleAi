# Memória de Modificações do Projeto

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
