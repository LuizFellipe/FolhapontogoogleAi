# Camada de Serviços (Services)

Esta pasta centraliza a comunicação do frontend React com a API backend (Flask).

## Arquivos

### `api.ts`
O serviço principal de comunicação com o backend, utilizando o padrão `ApiService`.

## Principais Funcionalidades

O `apiService` encapsula toda a lógica de persistência de dados:

1.  **Gerenciamento de Profissionais**
    -   `getProfissionais()`: Lista todos os profissionais
    -   `getProfissional(id)`: Busca profissional específico
    -   `createProfissional()`: Cria novo profissional
    -   `updateProfissional()`: Atualiza profissional existente
    -   `deleteProfissional()`: Remove profissional
    -   Realiza busca e atualização baseada na matrícula única do servidor.
    -   Validação automática de duplicação de matrícula.

2.  **Gerenciamento de Folhas de Ponto**
    -   `getFolhasPonto()`: Filtra por Profissional, Mês e Ano.
    -   `getFolhaPonto(id)`: Busca uma folha completa com todos os lançamentos diários e resumo da página 2.
    -   `createFolhaPonto()`: Cria nova folha de ponto
    -   `updateFolhaPonto()`: Atualiza folha existente
    -   `deleteFolhaPonto()`: Remove folha de ponto

3.  **Persistência em Lote**
    -   `saveLancamentosDiarios()`: Envia todos os eventos da Página 1 para o servidor.
    -   `saveResumoFolha()`: Envia as entradas da Página 2 para o servidor.
    -   Suporte a dois turnos independentes (carga horária 20h/40h).

4.  **Gestão de Feriados**
    -   `getFeriados()`: Lista feriados (opcionalmente por ano)
    -   `createFeriado()`: Cadastra novo feriado
    -   `deleteFeriado()`: Remove feriado

5.  **Gestão de Recessos**
    -   `getRecessos(ano?)`: Lista recessos (opcionalmente por ano)
    -   `createRecesso(data)`: Cadastra novo recesso com data início e fim
    -   `deleteRecesso(id)`: Remove recesso

6.  **Relatórios**
    -   `getLancamentosRelatorio()`: Relatório de lançamentos por período
    -   `getAdicionaNoturnoRelatorio()`: Relatório de adicional noturno
    -   `getAtestadosBimestrais(matricula, ano)`: Consulta contagem de atestados médicos por bimestre civil.

7.  **Helpers e Consultas**
    -   `getTiposLancamento()`: Consulta a lista de tipos de lançamento (valor, label, código) do banco de dados.
    -   `convertEmployeeToProfissional()`: Mapeia objetos do frontend para o formato aceito pelo banco de dados (MySQL).
    -   `convertProfissionalToEmployee()`: Converte do banco para o estado do React.
    -   `saveCompleteTimesheet()`: Orquestrador que agrupa a criação/atualização de profissional, folha, lançamentos e resumo em uma única chamada lógica para o usuário.
    -   `loadCompleteTimesheet()`: Carrega folha completa com todos os dados associados.

8.  **Saúde da API**
    -   `healthCheck()`: Verifica status da API e conexão com banco de dados

## Configuração
O serviço utiliza a variável de ambiente `VITE_API_URL` para definir o endereço do backend. Por padrão, usa o caminho relativo `/api`, que é roteado pelo proxy do Vite (em desenvolvimento) ou pelo proxy reverso do Nginx (em produção via Docker). Isso garante que o frontend funcione corretamente tanto em acesso local quanto em acesso remoto pela rede.

```bash
# .env.local (opcional — necessário apenas para apontar para outro host)
VITE_API_URL=http://outro-servidor:5000/api
```

> **Nota:** Não utilize `http://localhost:5000/api` como valor fixo, pois `localhost` no contexto do browser sempre aponta para a máquina do usuário, causando falha de conexão em acessos remotos.

## Como Usar
No componente React, importe e chame os métodos assíncronos:
```typescript
import { apiService } from '../services/api';

const carregarDados = async () => {
    const servidores = await apiService.getProfissionais();
    // ...
};
```
