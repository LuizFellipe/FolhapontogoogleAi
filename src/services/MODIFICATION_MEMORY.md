# Histórico de Modificações - Camada de Serviços

## Registro de Alterações

### 2026-04-26 - Verificação de Documentação
- **Motivo**: Verificação inicial da documentação vs estrutura atual
- **Ações**: 
  - Criado arquivo MODIFICATION_MEMORY.md para tracking
  - Verificada consistência de README.md e tree.txt
  - Confirmada estrutura atual: README.md, api.ts, tree.txt

### [Datas Anteriores - Simplificação do Sistema]
- **api.ts**: Simplificado para suportar apenas dia + tipo de lançamento
- **Removidos**: Campos de horário (entry1, exit1, entry2, exit2)
- **Mantidos**: Funcionalidades essenciais de profissional e folha de ponto
- **Compatibilidade**: Backend mantido para compatibilidade

## Estrutura Atual

```
src/services/
├── README.md              # Documentação da camada de serviços
├── api.ts                 # Serviço principal de comunicação com backend
├── tree.txt               # Estrutura de diretórios
└── MODIFICATION_MEMORY.md # Este arquivo - histórico de alterações
```

## Funcionalidades Principais (api.ts)

### Gerenciamento de Profissionais
- `getProfissionais()` - Lista todos os profissionais
- `createProfissional()` - Cria novo profissional
- `updateProfissional()` - Atualiza profissional existente
- `deleteProfissional()` - Remove profissional

### Gerenciamento de Folhas de Ponto
- `getFolhasPonto()` - Lista folhas (filtro: profissional, mês, ano)
- `getFolhaPonto(id)` - Busca folha completa com lançamentos
- `saveCompleteTimesheet()` - Salva folha completa (profissional + lançamentos)

### Conversão de Dados
- `convertEmployeeToProfissional()` - Frontend → Backend
- `convertProfissionalToEmployee()` - Backend → Frontend

## Configuração
- **API URL**: Variável `VITE_API_URL` (padrão: `/api`)
- **Proxy**: Vite (dev) / Nginx (produção)
- **Backend**: Flask API na porta 5000

## Notas de Manutenção
- Sistema simplificado para apenas dia + tipo de lançamento
- Campos de horário removidos da interface mas mantidos no backend para compatibilidade
- Matrícula como chave primária para profissionais
- Validação de duplicação de matrícula implementada
