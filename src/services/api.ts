/**
 * Serviço de API para comunicação com o backend
 * Gerencia todas as requisições HTTP para o sistema de folha de ponto
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Error in ${endpoint}:`, error);
      throw error;
    }
  }

  // Profissionais
  async getProfissionais() {
    return this.request<any[]>('/profissionais');
  }

  async getProfissional(id: number) {
    return this.request<any>(`/profissionais/${id}`);
  }

  async createProfissional(data: any) {
    return this.request<any>('/profissionais', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProfissional(id: number, data: any) {
    return this.request<any>(`/profissionais/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProfissional(id: number) {
    return this.request<any>(`/profissionais/${id}`, {
      method: 'DELETE',
    });
  }

  // Folhas de Ponto
  async getFolhasPonto(filters?: { profissional_id?: number; mes?: number; ano?: number }) {
    const params = new URLSearchParams();
    if (filters?.profissional_id) params.append('profissional_id', filters.profissional_id.toString());
    if (filters?.mes != null) params.append('mes', filters.mes.toString());
    if (filters?.ano) params.append('ano', filters.ano.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `/folhas-ponto?${queryString}` : '/folhas-ponto';
    
    return this.request<any[]>(endpoint);
  }

  async getFolhaPonto(id: number) {
    return this.request<{
      folha_ponto: any;
      lancamentos: any[];
      resumo: any[];
    }>(`/folhas-ponto/${id}`);
  }

  async createFolhaPonto(data: any) {
    return this.request<any>('/folhas-ponto', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFolhaPonto(id: number, data: any) {
    return this.request<any>(`/folhas-ponto/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFolhaPonto(id: number) {
    return this.request<any>(`/folhas-ponto/${id}`, {
      method: 'DELETE',
    });
  }

  // Lançamentos Diários
  async saveLancamentosDiarios(folhaPontoId: number, lancamentos: any[]) {
    return this.request<any>(`/folhas-ponto/${folhaPontoId}/lancamentos`, {
      method: 'POST',
      body: JSON.stringify({ lancamentos }),
    });
  }

  // Resumo
  async saveResumoFolha(folhaPontoId: number, resumoEntries: any[]) {
    return this.request<any>(`/folhas-ponto/${folhaPontoId}/resumo`, {
      method: 'POST',
      body: JSON.stringify({ resumo_entries: resumoEntries }),
    });
  }

  // Feriados
  async getFeriados(ano?: number) {
    const url = ano ? `/feriados?ano=${ano}` : '/feriados';
    return this.request<any[]>(url);
  }

  async createFeriado(data: any) {
    return this.request<any>('/feriados', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteFeriado(id: number) {
    return this.request<any>(`/feriados/${id}`, {
      method: 'DELETE',
    });
  }

  // Relatórios — view vw_folhas_lancamento
  async getLancamentosRelatorio(mes: number, ano: number) {
    return this.request<any[]>(`/relatorio/lancamentos?mes=${mes}&ano=${ano}`);
  }

  // Saúde da API
  async healthCheck() {
    return this.request<{ status: string; database: string }>('/health');
  }

  // Método utilitário para converter dados do frontend para o backend
  convertEmployeeToProfissional(employeeData: any) {
    return {
      nome: employeeData.name,
      matricula: employeeData.registration,
      cargo: employeeData.cargo,
      ua: employeeData.ua,
      exercicio: employeeData.exercicio,
      carga_horaria: employeeData.ch,
      funcao: employeeData.funcao,
      unidade_lotacao: employeeData.unidade,
      turno1: employeeData.shift1,
      turno2: employeeData.shift2,
    };
  }

  // Método utilitário para converter dados do backend para o frontend
  convertProfissionalToEmployee(profissionalData: any) {
    return {
      name: profissionalData.nome || profissionalData.profissional_nome,
      registration: profissionalData.matricula,
      cargo: profissionalData.cargo,
      ua: profissionalData.ua,
      exercicio: profissionalData.exercicio,
      ch: profissionalData.carga_horaria,
      funcao: profissionalData.funcao || '',
      unidade: profissionalData.unidade_lotacao,
      shift1: profissionalData.turno1 || '',
      shift2: profissionalData.turno2 || '',
    };
  }

  // Método para salvar folha de ponto completa
  async saveCompleteTimesheet(timesheetData: any) {
    try {
      // Primeiro, encontrar ou criar o profissional
      let profissionalId;
      let isNewProfissional = false;
      
      // Buscar profissional existente pela matrícula (apenas se matrícula foi fornecida)
      const profissionais = await this.getProfissionais();
      let existingProfissional = null;
      
      if (timesheetData.employee.registration) {
        existingProfissional = profissionais.find((p: any) => 
          p.matricula === timesheetData.employee.registration
        );
      }
      
      if (existingProfissional) {
        // Atualizar profissional existente
        profissionalId = existingProfissional.id;
        const profissionalData = this.convertEmployeeToProfissional(timesheetData.employee);
        
        // Verificar se a matrícula foi alterada
        if (existingProfissional.matricula !== profissionalData.matricula) {
          // Verificar se a nova matrícula já existe
          const matriculaExists = profissionais.find((p: any) => 
            p.matricula === profissionalData.matricula && p.id !== existingProfissional.id
          );
          
          if (matriculaExists) {
            throw new Error(`Matrícula '${profissionalData.matricula}' já está em uso por outro profissional. Mantendo a matrícula original.`);
          }
        }
        
        await this.updateProfissional(profissionalId, profissionalData);
      } else {
        // Verificar se a matrícula já existe antes de criar (apenas se matrícula foi fornecida)
        if (timesheetData.employee.registration) {
          const matriculaExists = profissionais.find((p: any) => 
            p.matricula === timesheetData.employee.registration
          );
          
          if (matriculaExists) {
            throw new Error(`Matrícula '${timesheetData.employee.registration}' já está cadastrada no sistema.`);
          }
        }
        
        // Criar novo profissional
        const profissional = this.convertEmployeeToProfissional(timesheetData.employee);
        const createdProfissional = await this.createProfissional(profissional);
        profissionalId = createdProfissional.id;
        isNewProfissional = true;
      }

      // Criar ou atualizar folha de ponto
      const folhaPontoPayload = {
        profissional_id: profissionalId,
        mes: timesheetData.month,
        ano: timesheetData.year,
        observacoes: timesheetData.observations,
      };

      let folhaPontoId;
      const existingFolhas = await this.getFolhasPonto({
        profissional_id: profissionalId,
        mes: timesheetData.month,
        ano: timesheetData.year,
      });

      if (existingFolhas.length > 0) {
        // Atualizar folha existente
        folhaPontoId = existingFolhas[0].id;
        await this.updateFolhaPonto(folhaPontoId, folhaPontoPayload);
      } else {
        // Criar nova folha
        const createdFolha = await this.createFolhaPonto(folhaPontoPayload);
        folhaPontoId = createdFolha.id;
      }

      // Salvar lançamentos diários
      if (timesheetData.entries && timesheetData.entries.length > 0) {
        // Converter entries para lancamentos com campos em português
        const lancamentos = timesheetData.entries.map((entry: any) => ({
          dia: entry.day,
          tipo: entry.type,
          observacao: entry.observation,
          tipo_turno2: entry.type_turno2,
          observacao_turno2: entry.observation_turno2
        }));
        
        await this.saveLancamentosDiarios(folhaPontoId, lancamentos);
      }

      // Salvar resumo
      if (timesheetData.summaryEntries && timesheetData.summaryEntries.length > 0) {
        // Converter summaryEntries para resumo_entries com campos em português
        const resumoEntries = timesheetData.summaryEntries.map((entry: any) => ({
          operacao: entry.operation,
          codigo: entry.code,
          carga: entry.carga,
          meses: entry.months,
          horas_dias: entry.hoursDays,
          dia_inicio: entry.startDay,
          dia_fim: entry.endDay
        }));
        
        await this.saveResumoFolha(folhaPontoId, resumoEntries);
      }

      return { success: true, folhaPontoId };
    } catch (error) {
      console.error('Error saving complete timesheet:', error);
      throw error;
    }
  }

  // Método para carregar folha de ponto completa
  async loadCompleteTimesheet(profissionalId: number, mes: number, ano: number) {
    try {
      const folhas = await this.getFolhasPonto({
        profissional_id: profissionalId,
        mes,
        ano,
      });

      if (folhas.length === 0) {
        return null;
      }

      const folhaPontoId = folhas[0].id;
      const completeData = await this.getFolhaPonto(folhaPontoId);

      // Converter para o formato esperado pelo frontend
      return {
        month: completeData.folha_ponto.mes,
        year: completeData.folha_ponto.ano,
        employee: this.convertProfissionalToEmployee(completeData.folha_ponto),
        entries: completeData.lancamentos.map((lancamento: any) => ({
          day: lancamento.dia,
          type: lancamento.tipo,
          type_turno2: lancamento.tipo_turno2 || 'TRABALHO',
          entry1: '',
          exit1: '',
          entry2: '',
          exit2: '',
          observation: lancamento.observacao,
          observation_turno2: lancamento.observacao_turno2
        })),
        summaryEntries: completeData.resumo.map((resumo: any) => ({
          operation: resumo.operacao,
          code: resumo.codigo,
          carga: resumo.carga,
          months: resumo.meses,
          hoursDays: resumo.horas_dias,
          startDay: resumo.dia_inicio,
          endDay: resumo.dia_fim
        })),
        observations: completeData.folha_ponto.observacoes,
      };
    } catch (error) {
      console.error('Error loading complete timesheet:', error);
      throw error;
    }
  }
}

// Exportar uma instância única do serviço
export const apiService = new ApiService();
export default apiService;
