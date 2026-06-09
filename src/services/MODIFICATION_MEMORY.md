# Histórico de Modificações - Camada de Serviços

## Registro de Alterações

### 2026-06-09 - Adição de Métodos para Recessos
- **Motivo**: Nova funcionalidade de gestão de recessos (períodos com data início + fim)
- **Ações**:
  - Adicionado `getRecessos(ano?)` em `api.ts` — `GET /api/recessos?ano=<ano>`
  - Adicionado `createRecesso(data)` em `api.ts` — `POST /api/recessos`
  - Adicionado `deleteRecesso(id)` em `api.ts` — `DELETE /api/recessos/<id>`
  - Mesma estrutura dos métodos de feriados já existentes

### 2026-05-04 - Atualização Completa da Documentação
- **Motivo**: Documentação desatualizada em relação à implementação atual
- **Ações**: 
  - Atualizado README.md com todas as funcionalidades implementadas
  - Removida referência à simplificação excessiva do sistema
  - Adicionada documentação de funcionalidades expandidas
  - Corrigido MODIFICATION_MEMORY.md para refletir estado atual

### 2026-04-26 - Verificação de Documentação
- **Motivo**: Verificação inicial da documentação vs estrutura atual
- **Ações**: 
  - Criado arquivo MODIFICATION_MEMORY.md para tracking
  - Verificada consistência de README.md e tree.txt
  - Confirmada estrutura atual: README.md, api.ts, tree.txt

### [Datas Anteriores - Evolução do Sistema]
- **api.ts**: Evoluído de sistema simplificado para suporte completo
- **Implementados**: Suporte a dois turnos independentes (20h/40h)
- **Adicionados**: CRUD completo, feriados, relatórios, health check
- **Validações**: Prevenção de duplicação de matrícula
- **Compatibilidade**: Mantida com backend e dados existentes

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
- `getProfissional(id)` - Busca profissional específico
- `createProfissional()` - Cria novo profissional
- `updateProfissional()` - Atualiza profissional existente
- `deleteProfissional()` - Remove profissional
- Validação automática de duplicação de matrícula

### Gerenciamento de Folhas de Ponto
- `getFolhasPonto()` - Lista folhas (filtro: profissional, mês, ano)
- `getFolhaPonto(id)` - Busca folha completa com lançamentos
- `createFolhaPonto()` - Cria nova folha de ponto
- `updateFolhaPonto()` - Atualiza folha existente
- `deleteFolhaPonto()` - Remove folha de ponto
- `saveCompleteTimesheet()` - Salva folha completa (profissional + lançamentos)
- `loadCompleteTimesheet()` - Carrega folha completa com todos os dados

### Persistência e Lançamentos
- `saveLancamentosDiarios()` - Salva lançamentos diários em lote
- `saveResumoFolha()` - Salva resumo da folha (página 2)
- Suporte a dois turnos independentes (carga horária 20h/40h)

### Gestão de Feriados
- `getFeriados()` - Lista feriados (opcionalmente por ano)
- `createFeriado()` - Cadastra novo feriado
- `deleteFeriado()` - Remove feriado

### Relatórios
- `getLancamentosRelatorio()` - Relatório de lançamentos por período
- `getAdicionaNoturnoRelatorio()` - Relatório de adicional noturno

### Saúde da API
- `healthCheck()` - Verifica status da API e conexão com banco

### Conversão de Dados
- `convertEmployeeToProfissional()` - Frontend → Backend
- `convertProfissionalToEmployee()` - Backend → Frontend

## Configuração
- **API URL**: Variável `VITE_API_URL` (padrão: `/api`)
- **Proxy**: Vite (dev) / Nginx (produção)
- **Backend**: Flask API na porta 5000

## Notas de Manutenção
- Sistema completo com suporte a dois turnos independentes
- Campos de horário mantidos no backend para compatibilidade histórica
- Matrícula como chave primária para profissionais com validação de duplicação
- Padrão "TRABALHO NORMAL" para todos os lançamentos não especificados
- Funcionalidades expandidas: feriados, relatórios, health check
- Interface controla exibição do segundo turno por carga horária (20h/40h)
