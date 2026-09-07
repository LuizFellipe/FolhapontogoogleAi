---
name: sync-docs
description: "Reconcilia documentação com código após uma sessão de desenvolvimento. Detecta arquivos modificados via git diff HEAD, atualiza README.md das pastas afetadas (frontend), e para implementações grandes (novo router/model/migration/service/page) atualiza seções específicas de ARCHITECTURE.md e SDD_Merenda_Escolar.md — sempre com confirmação do usuário antes de tocar docs globais. Usa graphify para navegar docs existentes sem ler arquivos gigantes. Ao final oferece commit + push."
---

# /sync-docs

Reconcilia a documentação do projeto com o código que mudou desde o último commit.
Chame esta skill antes de commitar, ao final de uma sessão de desenvolvimento.

## O que você deve fazer quando esta skill for invocada

### Passo 1 — Detectar o que mudou

Execute os comandos abaixo e analise o resultado completo:

```bash
git status --short
git diff HEAD --stat
```

`git status --short` é essencial porque captura **todos** os estados:
- `M ` = staged (já no index)
- ` M` = unstaged (modificado mas não staged)
- `A ` = novo arquivo staged
- `??` = untracked (arquivo novo nunca adicionado)
- ` D` = deletado

Classifique cada arquivo nas categorias abaixo para guiar os passos seguintes:

| Categoria | Exemplos |
|-----------|---------|
| **Código backend** | `backend/routers/`, `backend/models/`, `backend/services/`, `alembic/versions/`, `backend/schemas/` |
| **Código frontend** | `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/services/`, `frontend/src/hooks/` |
| **Configuração/regras** | `.claude/`, `.agents/`, `.gemini/`, `.env`, `docker-compose.yml`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` |
| **Documentação** | `README.md`, `ARCHITECTURE.md`, `CONTEXT.md`, `SDD_Merenda_Escolar.md` |
| **Graphify (auto-gerado)** | `graphify-out/` (qualquer arquivo sob este diretório) |

Se não houver nenhum arquivo fora de `graphify-out/`, informe: "Nenhuma alteração relevante detectada. Nada a sincronizar." e encerre.

---

### Passo 2 — Atualizar READMEs locais das pastas afetadas

Para cada pasta que contenha arquivos modificados ou novos, verifique se existe um `README.md` nessa pasta.

**Pastas com README.md conhecidas no projeto:**
- `frontend/src/`
- `frontend/src/components/`
- `frontend/src/pages/`
- `frontend/src/pages/preparos/`
- `frontend/src/pages/recebimentos/`
- `frontend/src/services/`

**Regras:**
- Se a pasta **não** tem `README.md`: ignore completamente (não crie um novo).
- Se a pasta **tem** `README.md`:
  1. Leia o README atual.
  2. Leia o diff específico dos arquivos daquela pasta: `git diff HEAD -- <arquivo>`
  3. Compare o que está documentado com o que o código faz agora.
  4. **Só edite o README se houver discrepância real** — linha faltando numa tabela, propósito desatualizado, componente novo não listado, etc.
  5. Preserve todo o conteúdo existente que ainda é preciso. Não reescreva seções que não mudaram.

---

### Passo 3 — Detectar sinais de implementação grande

Verifique se algum **arquivo novo** (não apenas modificado) aparece nos diretórios abaixo:

| Diretório | Sinal |
|-----------|-------|
| `backend/routers/` | Novo router/endpoint |
| `backend/models/` | Novo model/tabela |
| `alembic/versions/` | Nova migration |
| `backend/services/` | Novo serviço de negócio |
| `frontend/src/pages/` | Nova página/rota |

Se **nenhum** sinal for detectado: pule para o Passo 5 (sinalização de CONTEXT.md).

Se **algum** sinal for detectado: liste para o usuário o que foi encontrado e quais seções dos docs globais seriam atualizadas (tabela abaixo), e **pergunte se deseja prosseguir**:

```
Detectei as seguintes mudanças que afetam a documentação global:
- [arquivo novo] → [seção que seria atualizada]

Deseja atualizar ARCHITECTURE.md e/ou SDD_Merenda_Escolar.md? (s/n)
```

---

### Passo 4 — Atualizar docs globais (somente se o usuário confirmar)

Use `graphify query` para localizar a seção exata antes de ler o arquivo grande. Exemplos:

```bash
graphify query "onde está a tabela de routers ativos no ARCHITECTURE.md"
graphify query "onde está listada a estrutura de services no ARCHITECTURE.md"
graphify query "onde está a tabela de status de módulos no SDD"
```

Em seguida, leia **apenas a seção relevante** do arquivo (não o arquivo inteiro) e atualize somente o trecho desatualizado:

| Sinal | Seção em ARCHITECTURE.md | Seção em SDD_Merenda_Escolar.md |
|-------|--------------------------|----------------------------------|
| Novo router | Tabela "Routers ativos" + bloco `routers/` em "Estrutura de arquivos implementada" | Tabela de status de módulos |
| Novo model | Tabela "SQLAlchemy Models (14 tabelas)" | — |
| Nova migration | Lista `alembic/versions/` em "Estrutura de arquivos implementada" | — |
| Novo service | Lista `services/` em "Estrutura de arquivos implementada" | — |
| Nova page | Tabela de rotas em `App.tsx` + bloco `pages/` em `frontend/src/` | Tabela de status de módulos |

**Regra de escrita:** só altere o que está desatualizado. Não reformate o documento inteiro.

---

### Passo 5 — Sinalizar novos termos de domínio (CONTEXT.md)

Analise o diff em busca de termos que pareçam conceitos de negócio novos: nomes de classes de domínio, constantes de enum, tipos de operação, nomes de fluxos. Compare com o que já está documentado em `CONTEXT.md`.

**Nunca escreva no CONTEXT.md automaticamente.** Em vez disso, informe ao usuário:

```
Os seguintes termos novos não aparecem no CONTEXT.md — considere documentá-los:
- <Termo A>: encontrado em <arquivo>
- <Termo B>: encontrado em <arquivo>
```

Se não houver termos novos, não mencione o CONTEXT.md.

---

### Passo 6 — Preparar e oferecer commit

#### 6a — Listar todos os arquivos para o commit

Monte uma lista completa de **todos** os arquivos modificados/novos/deletados detectados no Passo 1, agrupados por categoria. Exclua automaticamente os arquivos de `graphify-out/` (são auto-gerados) — mas liste-os separadamente e pergunte se devem entrar.

Apresente ao usuário:

```
📦 Arquivos que seriam incluídos no commit:

  Código:
    M  backend/services/relatorio_service.py
    M  frontend/src/pages/Relatorios.tsx
    D  GEMINI.md

  Configuração:
    M  .claude/settings.json
    M  .agents/rules/graphify.md
    M  .gemini/settings.json

  Documentação (atualizada por esta skill):
    M  frontend/src/pages/README.md

  ⚙️  Graphify (auto-gerado — excluído por padrão):
    M  graphify-out/graph.json
    M  graphify-out/...

Incluir arquivos do graphify-out/ no commit? (s/n)
```

Aguarde a resposta sobre o graphify antes de continuar.

#### 6b — Gerar mensagem de commit descritiva

Analise o conjunto de arquivos que serão commitados e gere uma mensagem de commit que descreva **o que realmente mudou**, seguindo o padrão do projeto (veja `git log --oneline -5` para calibrar o estilo).

A mensagem deve:
- Ser em português, imperativo, concisa (1 linha + corpo opcional)
- Descrever a mudança de negócio/funcionalidade, não os nomes de arquivo
- Mencionar o módulo afetado quando relevante (M-REL, M-PR, etc.)
- Incluir a atualização de docs se for relevante

Exemplos de boas mensagens:
```
Ajuste em exportação do Relatório Semanal e correção de totais por dia
Adição de filtro por semana em Recebimentos; cozinheiros veem preparos de outros
```

Mostre a mensagem gerada ao usuário e pergunte se aprova ou quer alterar antes de commitar.

#### 6c — Executar commit e push

Após aprovação da mensagem:

```bash
git add <lista de arquivos aprovados>
git status   # confirmar o que está staged antes de commitar
```

Mostre o resultado do `git status` e peça confirmação final antes de commitar.

```bash
git commit -m "<mensagem aprovada>"
git push
```

Se o usuário recusar o commit: encerre informando que todas as alterações (incluindo os docs atualizados pela skill) estão no working tree, prontas para o próximo `git add`/`git commit` manual.
