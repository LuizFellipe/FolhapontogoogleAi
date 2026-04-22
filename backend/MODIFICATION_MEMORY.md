# Memória de Modificação - Backend (backend/)

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
