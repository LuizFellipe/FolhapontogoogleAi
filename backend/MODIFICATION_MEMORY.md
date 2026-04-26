# Memória de Modificação - Backend (backend/)

## [2026-04-26] Correção de Serialização JSON e Validação de Matrícula

### Arquivos Modificados:
- **app.py**: Corrigida serialização de datetime/timedelta e validação de matrícula

### Alterações:
- **Função execute_query()**:
  - Adicionada conversão de objetos datetime/timedelta para strings serializáveis
  - Previne erro "Object of type timedelta is not JSON serializable"
  - Aplica a todas as queries do sistema

- **Endpoints de Profissionais**:
  - **create_profissional()**: Matrícula agora é o único campo obrigatório
  - **update_profissional()**: Validação alterada para exigir apenas matrícula
  - Adicionada verificação de matrícula duplicada em CREATE e UPDATE
  - Campos opcionais usam fallback `data.get('campo', '')`

### Objetivo:
Corrigir erros de salvamento e duplicação de matrícula, estabelecendo matrícula como chave primária verdadeira.

---

## [2026-03-31] Suporte a Segundo Turno em Lançamentos Diários

### Arquivos Modificados:
- **app.py**: Atualizada rota de lançamentos para suportar segundo turno

### Alterações:
- **Endpoint `/api/folhas-ponto/<int:folha_ponto_id>/lancamentos`**:
  - Adicionados campos `tipo_turno2` e `observacao_turno2` no INSERT
  - Atualizada query SQL para incluir novos campos
  - Mantida compatibilidade com estrutura existente

### Objetivo:
Implementar suporte a lançamentos independentes por turno, permitindo que cada dia tenha tipos diferentes para cada turno (matutino/vespertino).

---

## [2026-03-26] Remoção de Lógica de Horários

**Data:** 2026-03-26
**Objetivo:** Remover lógica de persistência de horários nos lançamentos diários.

### Arquivo Modificado:
1. **app.py**:
   - Alteração na rota `/api/folhas-ponto/<int:folha_ponto_id>/lancamentos` para remover as colunas `entrada1, entrada2, saida1, saida2` da query SQL de `INSERT` e dos parâmetros correspondentes.

---

## [2026-03-20] Implementação Inicial da API

**Data:** 2026-03-20
**Objetivo:** Criação inicial da API backend para o sistema Folha de Ponto.

### Arquivos Criados:
1. **app.py**: 
   - Estrutura inicial da API Flask
   - Endpoints para profissionais, folhas de ponto e lançamentos
   - Conexão com banco de dados MySQL
   - Funções helper para execução de queries

2. **Dockerfile**: Configuração para containerização
3. **README.md**: Documentação inicial da API
4. **MODIFICATION_MEMORY.md**: Registro de modificações

### Funcionalidades Implementadas:
- Gerenciamento de profissionais (CRUD)
- Gerenciamento de folhas de ponto (CRUD)
- Salvamento de lançamentos diários
- Conexão segura com MySQL
- Tratamento de erros e validação
