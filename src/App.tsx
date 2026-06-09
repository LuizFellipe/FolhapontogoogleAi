import { useState, useEffect } from 'react';
import { EmployeeForm } from './components/EmployeeForm';
import { TimesheetGrid } from './components/TimesheetGrid';
import { TimesheetPreview } from './components/TimesheetPreview';
import { TimesheetSummaryPreview } from './components/TimesheetSummaryPreview';
import { SummaryForm } from './components/SummaryForm';
import { EmployeeNavigator } from './components/EmployeeNavigator';
import { BatchTimesheetModal } from './components/BatchTimesheetModal';
import { HolidayModal, Holiday, Recesso } from './components/HolidayModal';
import { ReportsModal } from './components/ReportsModal';
import { TimesheetData, EmployeeData, DailyEntry, EntryType, SummaryEntry, MONTHS, ENTRY_TYPES } from './types';
import { Printer, FileText, Settings, Download, Save, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiService } from './services/api';

const computeSummaryFromEntries = (
  entries: DailyEntry[],
  ch: string,
  entryTypes: { value: string; code: string | null }[] = ENTRY_TYPES,
): SummaryEntry[] => {
  const cargaValue = String(ch || '').toLowerCase().includes('40') ? '3' : '1';

  const seen = new Set<string>();
  const codeDays: { code: string; day: number }[] = [];

  for (const entry of entries) {
    const t1 = entryTypes.find(t => t.value === entry.type);
    if (t1?.code != null) {
      const key = `${t1.code}-${entry.day}`;
      if (!seen.has(key)) { seen.add(key); codeDays.push({ code: t1.code, day: entry.day }); }
    }
    const t2 = entryTypes.find(t => t.value === entry.type_turno2);
    if (t2?.code != null) {
      const key = `${t2.code}-${entry.day}`;
      if (!seen.has(key)) { seen.add(key); codeDays.push({ code: t2.code, day: entry.day }); }
    }
  }

  const codeMap = new Map<string, number[]>();
  for (const { code, day } of codeDays) {
    if (!codeMap.has(code)) codeMap.set(code, []);
    codeMap.get(code)!.push(day);
  }

  const rows: SummaryEntry[] = [];
  for (const [code, days] of codeMap) {
    days.sort((a, b) => a - b);
    let i = 0;
    while (i < days.length) {
      let j = i;
      while (j + 1 < days.length && days[j + 1] === days[j] + 1) j++;
      rows.push({
        operation: 'I',
        code,
        carga: cargaValue,
        months: '01',
        hoursDays: String(j - i + 1).padStart(5, '0'),
        startDay: String(days[i]).padStart(2, '0'),
        endDay: String(days[j]).padStart(2, '0'),
      });
      i = j + 1;
    }
  }

  while (rows.length < 8) {
    rows.push({ operation: '', code: '', carga: '', months: '', hoursDays: '', startDay: '', endDay: '' });
  }
  return rows.slice(0, 8);
};

const initialEmployee: EmployeeData = {
  name: '',
  registration: '',
  cargo: 'PROFESSOR DE EDUC. BASICA 07-PV4',
  ua: '005',
  exercicio: '990210000029',
  ch: '20',
  funcao: '',
  unidade: 'CENTRO DE EDUC PROF ESCOLA TEC DO GUARA PROF TERESA ONDINA M',
  shift1: 'Noturno',
  shift2: ''
};

const initialSummary: SummaryEntry[] = Array.from({ length: 8 }, () => ({
  operation: '',
  code: '',
  carga: '',
  months: '',
  hoursDays: '',
  startDay: '',
  endDay: ''
}));

export default function App() {
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  
  const [employee, setEmployee] = useState<EmployeeData>(initialEmployee);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [summaryEntries, setSummaryEntries] = useState<SummaryEntry[]>(initialSummary);
  const [observations, setObservations] = useState('');
  
  // Estados para controle de salvamento e carregamento
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [currentTimesheetId, setCurrentTimesheetId] = useState<number | null>(null);
  
  // Estados para navegação de profissionais
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [currentProfissionalIndex, setCurrentProfissionalIndex] = useState<number>(0);
  const [isLoadingProfissionais, setIsLoadingProfissionais] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isPreFilling, setIsPreFilling] = useState(false);

  // Estados para geração em lote
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentName: string } | undefined>();
  const [batchTimesheets, setBatchTimesheets] = useState<TimesheetData[]>([]);

  // Estados para Modal de Feriados
  const [showHolidayModal, setShowHolidayModal] = useState(false);

  // Estados para Modal de Relatórios
  const [showReportsModal, setShowReportsModal] = useState(false);

  const [dynamicTypes, setDynamicTypes] = useState<typeof ENTRY_TYPES>(ENTRY_TYPES);

  // Carregar profissionais e tipos de lançamento na inicialização
  useEffect(() => {
    loadProfissionais();
    apiService.getTiposLancamento().then(tipos => {
      if (tipos.length > 0)
        setDynamicTypes(tipos.map(t => ({ value: t.valor as EntryType, label: t.label, code: t.codigo ?? null })));
    }).catch(() => {});
  }, []);

  // Carregar lista de profissionais
  const loadProfissionais = async () => {
    try {
      setIsLoadingProfissionais(true);
      const profissionaisData = await apiService.getProfissionais();
      
      // Ordenar alfabeticamente por nome
      const sortedProfissionais = profissionaisData.sort((a: any, b: any) => 
        a.nome.localeCompare(b.nome)
      );
      
      setProfissionais(sortedProfissionais);
      
      // Encontrar o índice do profissional atual baseado na matrícula
      const currentIndex = sortedProfissionais.findIndex((p: any) => 
        p.matricula === employee.registration
      );
      
      if (currentIndex !== -1) {
        setCurrentProfissionalIndex(currentIndex);
      } else if (sortedProfissionais.length > 0) {
        // Se não encontrar, usar o primeiro profissional
        setCurrentProfissionalIndex(0);
        const firstProfissional = sortedProfissionais[0];
        setEmployee(apiService.convertProfissionalToEmployee(firstProfissional));
      }
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
    } finally {
      setIsLoadingProfissionais(false);
    }
  };

  // Navegar para profissional por índice
  const navigateToProfissional = async (index: number) => {
    if (index < 0 || index >= profissionais.length || index === currentProfissionalIndex || isNavigating) {
      return;
    }

    try {
      setIsNavigating(true);
      
      // Salvar folha atual antes de navegar
      if (saveStatus !== 'idle') {
        await saveTimesheet();
      }
      
      setCurrentProfissionalIndex(index);
      const newProfissional = profissionais[index];
      setEmployee(apiService.convertProfissionalToEmployee(newProfissional));
    } catch (error) {
      console.error('Erro ao navegar para profissional:', error);
    } finally {
      setIsNavigating(false);
    }
  };

  // Deletar profissional
  const handleDeleteProfissional = async (id: number, nome: string) => {
    const confirmacao = window.confirm(`Tem certeza que deseja excluir o profissional "${nome}"?\n\nEsta ação não pode ser desfeita e excluirá todas as folhas de ponto associadas.`);
    
    if (!confirmacao) {
      return;
    }

    try {
      await apiService.deleteProfissional(id);
      
      // Recarregar lista de profissionais
      await loadProfissionais();
      
      // Resetar formulário para o primeiro profissional ou vazio
      if (profissionais.length > 1) {
        const newIndex = Math.min(currentProfissionalIndex, profissionais.length - 2);
        setCurrentProfissionalIndex(newIndex);
        setEmployee(apiService.convertProfissionalToEmployee(profissionais[newIndex]));
      } else {
        setEmployee(initialEmployee);
        setCurrentProfissionalIndex(0);
      }
      
      alert('Profissional excluído com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir profissional:', error);
      alert('Erro ao excluir profissional: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const handleEntriesChange = (newEntries: DailyEntry[]) => {
    setEntries(newEntries);
    setSummaryEntries(computeSummaryFromEntries(newEntries, employee.ch, dynamicTypes));
  };

  // Limpar todos os lançamentos para TRABALHO NORMAL
  const handleClearEntries = () => {
    const cleared = entries.map(e => ({ ...e, type: 'TRABALHO' as const, type_turno2: 'TRABALHO' as const }));
    setEntries(cleared);
    setSummaryEntries(initialSummary);
  };

  // Calcula entradas com pré preenchimento de CPIP/CURSO de folha anterior do mesmo ano.
  // Retorna array de DailyEntry com o padrão aplicado (ou TRABALHO para todos se não houver padrão).
  const computePreFillEntries = async (
    profissionalId: number,
    targetMonth: number,
    targetYear: number
  ): Promise<DailyEntry[]> => {
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const defaultEntries = (): DailyEntry[] =>
      Array.from({ length: daysInMonth }, (_, i) => ({
        day: i + 1, type: 'TRABALHO' as EntryType, type_turno2: 'TRABALHO' as EntryType,
        entry1: '', exit1: '', entry2: '', exit2: '',
        observation: '', observation_turno2: ''
      }));

    const folhasDoAno = await apiService.getFolhasPonto({ profissional_id: profissionalId, ano: targetYear });
    const folhasAnteriores = folhasDoAno.filter((f: any) => f.mes !== targetMonth);
    if (folhasAnteriores.length === 0) return defaultEntries();

    // Sort: closest month first; tie-break: prefer months BEFORE target (most recent past)
    folhasAnteriores.sort((a: any, b: any) => {
      const distA = Math.abs(a.mes - targetMonth);
      const distB = Math.abs(b.mes - targetMonth);
      if (distA !== distB) return distA - distB;
      const aIsBefore = a.mes < targetMonth;
      const bIsBefore = b.mes < targetMonth;
      if (aIsBefore && !bIsBefore) return -1;
      if (!aIsBefore && bIsBefore) return 1;
      return b.mes - a.mes;
    });

    const pattern = new Map<string, { tipo: string; tipo_turno2: string }>();
    const TARGET_TYPES = ['CPIP', 'CURSO', 'TRACEJADO'];

    for (const folha of folhasAnteriores) {
      const dados = await apiService.getFolhaPonto(folha.id);
      for (const lancamento of dados.lancamentos) {
        const tem = TARGET_TYPES.includes(lancamento.tipo) || TARGET_TYPES.includes(lancamento.tipo_turno2);
        if (!tem) continue;
        const dow = new Date(folha.ano, folha.mes, lancamento.dia).getDay();
        if (dow < 1 || dow > 5) continue;
        const key = `${dow}`;
        if (!pattern.has(key)) {
          pattern.set(key, {
            tipo: TARGET_TYPES.includes(lancamento.tipo) ? lancamento.tipo : 'TRABALHO',
            tipo_turno2: TARGET_TYPES.includes(lancamento.tipo_turno2) ? lancamento.tipo_turno2 : 'TRABALHO',
          });
        }
      }
      if (pattern.size > 0) break;
    }

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dow = new Date(targetYear, targetMonth, day).getDay();
      const key = `${dow}`;
      const p = pattern.get(key);
      return {
        day,
        type: (p?.tipo || 'TRABALHO') as EntryType,
        type_turno2: (p?.tipo_turno2 || 'TRABALHO') as EntryType,
        entry1: '', exit1: '', entry2: '', exit2: '',
        observation: '', observation_turno2: ''
      };
    });
  };

  // Pré preenchimento individual: replica padrão semanal de CPIP/CURSO de folha anterior do mesmo ano
  const handlePreFill = async () => {
    const currentProfissional = profissionais[currentProfissionalIndex];
    if (!currentProfissional) {
      alert('Selecione um servidor para realizar o pré preenchimento.');
      return;
    }

    try {
      setIsPreFilling(true);

      const folhasDoAno = await apiService.getFolhasPonto({
        profissional_id: currentProfissional.id,
        ano: year,
      });

      const folhasAnteriores = folhasDoAno.filter((f: any) => f.mes !== month);

      if (folhasAnteriores.length === 0) {
        alert(`Nenhuma folha de ponto encontrada em ${year} para este servidor.`);
        return;
      }

      const newEntries = await computePreFillEntries(currentProfissional.id, month, year);

      const hasPattern = newEntries.some(e => e.type !== 'TRABALHO' || e.type_turno2 !== 'TRABALHO');
      if (!hasPattern) {
        alert('Nenhum padrão de CPIP ou CURSO FORMAÇÃO CONTINUADA encontrado nas folhas anteriores.');
        return;
      }

      handleEntriesChange(newEntries);

      const obsText = "CURSO FORMACAO CONTINUADA DE ACORDO MEMORANDO/CIRC 59/2025 - SEE/SUBEB DE 18/02/2025 - SEI 00080.00049147/2025-76";
      setObservations(prev => {
        if (!prev.includes(obsText)) {
          return prev ? `${prev}\n${obsText}` : obsText;
        }
        return prev;
      });
    } catch (error) {
      console.error('Erro no pré preenchimento:', error);
      alert('Erro ao realizar pré preenchimento.');
    } finally {
      setIsPreFilling(false);
    }
  };

  // Geração em lote: processa cada profissional selecionado e abre impressão
  const handleBatchGenerate = async (selectedIds: number[], mes: number, ano: number, selectedRecessos: Recesso[] = []) => {
    setIsGeneratingBatch(true);
    const results: TimesheetData[] = [];

    try {
      for (let i = 0; i < selectedIds.length; i++) {
        const profId = selectedIds[i];
        const prof = profissionais.find((p: any) => p.id === profId);
        setBatchProgress({ current: i + 1, total: selectedIds.length, currentName: prof?.nome || '' });

        const folhas = await apiService.getFolhasPonto({ profissional_id: profId, mes, ano });

        if (folhas.length > 0) {
          const data = await apiService.loadCompleteTimesheet(profId, mes, ano);
          if (data) results.push(data);
        } else {
          let entries = await computePreFillEntries(profId, mes, ano);
          const isCh20 = String(prof?.carga_horaria || '').includes('20');
          if (isCh20) {
            entries = entries.map(e => ({ ...e, type_turno2: 'TRABALHO' as EntryType, observation_turno2: '' }));
          }
          for (const recesso of selectedRecessos) {
            const inicio = new Date(recesso.yearInicio, recesso.monthInicio, recesso.dayInicio);
            const fim = new Date(recesso.yearFim, recesso.monthFim, recesso.dayFim);
            for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
              if (d.getMonth() === mes && d.getFullYear() === ano) {
                const dia = d.getDate();
                const idx = entries.findIndex(e => e.day === dia);
                if (idx !== -1) {
                  entries[idx] = {
                    ...entries[idx],
                    type: 'RECESSO' as EntryType,
                    type_turno2: isCh20 ? entries[idx].type_turno2 : 'RECESSO' as EntryType,
                    observation: recesso.label,
                    observation_turno2: isCh20 ? entries[idx].observation_turno2 : recesso.label,
                  };
                }
              }
            }
          }
          const hasPattern = entries.some(e => e.type !== 'TRABALHO' || e.type_turno2 !== 'TRABALHO');
          const obsText = "CURSO FORMACAO CONTINUADA DE ACORDO MEMORANDO/CIRC 59/2025 - SEE/SUBEB DE 18/02/2025 - SEI 00080.00049147/2025-76";

          const novaFolha = await apiService.createFolhaPonto({ profissional_id: profId, mes, ano, observacoes: hasPattern ? obsText : '' });
          const lancamentos = entries.map(e => ({
            dia: e.day, tipo: e.type, tipo_turno2: e.type_turno2,
            observacao: e.observation, observacao_turno2: e.observation_turno2
          }));
          await apiService.saveLancamentosDiarios(novaFolha.id, lancamentos);
          const data = await apiService.loadCompleteTimesheet(profId, mes, ano);
          if (data) results.push(data);
        }
      }

      setBatchTimesheets(results);
      setShowBatchModal(false);

      // Aguarda renderização e dispara impressão em lote
      setTimeout(() => {
        document.body.classList.add('batch-printing');
        window.print();
        const cleanup = () => {
          document.body.classList.remove('batch-printing');
          setBatchTimesheets([]);
          window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
      }, 100);
    } catch (error) {
      console.error('Erro na geração em lote:', error);
      alert('Erro ao gerar folhas em lote.');
    } finally {
      setIsGeneratingBatch(false);
      setBatchProgress(undefined);
    }
  };

  // Impressão em lote: apenas carrega e imprime, sem gerar (pré-preenchimento) ou salvar
  const handleBatchPrintOnly = async (selectedIds: number[], mes: number, ano: number) => {
    setIsGeneratingBatch(true);
    const results: TimesheetData[] = [];

    try {
      for (let i = 0; i < selectedIds.length; i++) {
        const profId = selectedIds[i];
        const prof = profissionais.find((p: any) => p.id === profId);
        setBatchProgress({ current: i + 1, total: selectedIds.length, currentName: prof?.nome || '' });

        const folhas = await apiService.getFolhasPonto({ profissional_id: profId, mes, ano });

        if (folhas.length > 0) {
          const data = await apiService.loadCompleteTimesheet(profId, mes, ano);
          if (data) results.push(data);
        } else {
          // Cria folha vazia temporária para impressão (não salva)
          const employeeData = apiService.convertProfissionalToEmployee(prof);
          const daysInMonth = new Date(ano, mes + 1, 0).getDate();
          const emptyEntries = Array.from({ length: daysInMonth }, (_, j) => ({
            day: j + 1, type: 'TRABALHO' as any, type_turno2: 'TRABALHO' as any,
            entry1: '', exit1: '', entry2: '', exit2: '',
            observation: '', observation_turno2: ''
          }));
          
          results.push({
            month: mes,
            year: ano,
            employee: employeeData,
            entries: emptyEntries,
            summaryEntries: Array.from({ length: 8 }, () => ({
              operation: '', code: '', carga: '', months: '', hoursDays: '', startDay: '', endDay: ''
            })),
            observations: ''
          });
        }
      }

      setBatchTimesheets(results);
      setShowBatchModal(false);

      // Aguarda renderização e dispara impressão
      setTimeout(() => {
        document.body.classList.add('batch-printing');
        window.print();
        const cleanup = () => {
          document.body.classList.remove('batch-printing');
          setBatchTimesheets([]);
          window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
      }, 100);
    } catch (error) {
      console.error('Erro na impressão em lote:', error);
      alert('Erro ao imprimir folhas em lote.');
    } finally {
      setIsGeneratingBatch(false);
      setBatchProgress(undefined);
    }
  };

  // Feriados: Aplicar na folha atual
  const handleApplyHoliday = async (holiday: Holiday) => {
    if (month === holiday.month && year === holiday.year) {
      const newEntries = [...entries];
      const entryIndex = newEntries.findIndex(e => e.day === holiday.day);
      if (entryIndex !== -1) {
        const isCh20 = String(employee.ch || '').includes('20');
        newEntries[entryIndex] = {
          ...newEntries[entryIndex],
          type: 'FERIADO',
          type_turno2: isCh20 ? newEntries[entryIndex].type_turno2 : 'FERIADO',
          observation: holiday.label,
          observation_turno2: isCh20 ? newEntries[entryIndex].observation_turno2 : holiday.label
        };
        handleEntriesChange(newEntries);

        // Auto-save
        if (employee.name) {
          setSaveStatus('saving');
          try {
            const dataToSave: TimesheetData = {
              month,
              year,
              employee,
              entries: newEntries,
              summaryEntries: computeSummaryFromEntries(newEntries, employee.ch, dynamicTypes),
              observations
            };
            const result = await apiService.saveCompleteTimesheet(dataToSave);
            if (result.success) {
              if (result.folhaPontoId) setCurrentTimesheetId(result.folhaPontoId);
              setSaveStatus('saved');
              setTimeout(() => setSaveStatus('idle'), 3000);
            }
          } catch (error) {
            console.error('Erro ao auto-salvar folha de ponto após aplicar feriado:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
          }
        }
      }
    } else {
      alert('O feriado selecionado não pertence ao mês/ano da folha atual.');
    }
  };

  // Feriados: Reverter efeito na folha atual
  const handleRemoveHolidayEffect = async (holiday: Holiday) => {
    if (month === holiday.month && year === holiday.year) {
      const newEntries = [...entries];
      const entryIndex = newEntries.findIndex(e => e.day === holiday.day);
      if (entryIndex !== -1 && newEntries[entryIndex].type === 'FERIADO') {
        newEntries[entryIndex] = {
          ...newEntries[entryIndex],
          type: 'TRABALHO',
          type_turno2: 'TRABALHO',
          observation: '',
          observation_turno2: ''
        };
        handleEntriesChange(newEntries);

        // Auto-save
        if (employee.name) {
          setSaveStatus('saving');
          try {
            const dataToSave: TimesheetData = {
              month,
              year,
              employee,
              entries: newEntries,
              summaryEntries: computeSummaryFromEntries(newEntries, employee.ch, dynamicTypes),
              observations
            };
            const result = await apiService.saveCompleteTimesheet(dataToSave);
            if (result.success) {
              if (result.folhaPontoId) setCurrentTimesheetId(result.folhaPontoId);
              setSaveStatus('saved');
              setTimeout(() => setSaveStatus('idle'), 3000);
            }
          } catch (error) {
            console.error('Erro ao auto-salvar folha de ponto após remover feriado:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
          }
        }
      }
    }
  };

  // Recessos: Aplicar range na folha atual
  const handleApplyRecesso = async (recesso: Recesso) => {
    const inicio = new Date(recesso.yearInicio, recesso.monthInicio, recesso.dayInicio);
    const fim = new Date(recesso.yearFim, recesso.monthFim, recesso.dayFim);
    const isCh20 = String(employee.ch || '').includes('20');

    const newEntries = [...entries];
    let changed = false;

    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      if (d.getMonth() === month && d.getFullYear() === year) {
        const dia = d.getDate();
        const idx = newEntries.findIndex(e => e.day === dia);
        if (idx !== -1) {
          newEntries[idx] = {
            ...newEntries[idx],
            type: 'RECESSO',
            type_turno2: isCh20 ? newEntries[idx].type_turno2 : 'RECESSO',
            observation: recesso.label,
            observation_turno2: isCh20 ? newEntries[idx].observation_turno2 : recesso.label
          };
          changed = true;
        }
      }
    }

    if (!changed) {
      alert('O recesso selecionado não possui dias no mês/ano da folha atual.');
      return;
    }

    handleEntriesChange(newEntries);

    if (employee.name) {
      setSaveStatus('saving');
      try {
        const dataToSave: TimesheetData = {
          month,
          year,
          employee,
          entries: newEntries,
          summaryEntries: computeSummaryFromEntries(newEntries, employee.ch, dynamicTypes),
          observations
        };
        const result = await apiService.saveCompleteTimesheet(dataToSave);
        if (result.success) {
          if (result.folhaPontoId) setCurrentTimesheetId(result.folhaPontoId);
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 3000);
        }
      } catch (error) {
        console.error('Erro ao auto-salvar folha de ponto após aplicar recesso:', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }
  };

  // Recessos: Reverter range na folha atual
  const handleRemoveRecessoEffect = async (recesso: Recesso) => {
    const inicio = new Date(recesso.yearInicio, recesso.monthInicio, recesso.dayInicio);
    const fim = new Date(recesso.yearFim, recesso.monthFim, recesso.dayFim);

    const newEntries = [...entries];
    let changed = false;

    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      if (d.getMonth() === month && d.getFullYear() === year) {
        const dia = d.getDate();
        const idx = newEntries.findIndex(e => e.day === dia);
        if (idx !== -1 && newEntries[idx].type === 'RECESSO') {
          newEntries[idx] = {
            ...newEntries[idx],
            type: 'TRABALHO',
            type_turno2: 'TRABALHO',
            observation: '',
            observation_turno2: ''
          };
          changed = true;
        }
      }
    }

    if (!changed) return;

    handleEntriesChange(newEntries);

    if (employee.name) {
      setSaveStatus('saving');
      try {
        const dataToSave: TimesheetData = {
          month,
          year,
          employee,
          entries: newEntries,
          summaryEntries: computeSummaryFromEntries(newEntries, employee.ch, dynamicTypes),
          observations
        };
        const result = await apiService.saveCompleteTimesheet(dataToSave);
        if (result.success) {
          if (result.folhaPontoId) setCurrentTimesheetId(result.folhaPontoId);
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 3000);
        }
      } catch (error) {
        console.error('Erro ao auto-salvar folha de ponto após remover recesso:', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }
  };

  // Criar novo profissional
  const handleNewProfissional = () => {
    // Salvar folha atual antes de criar novo
    if (saveStatus !== 'idle') {
      saveTimesheet();
    }
    
    // Limpar formulário com dados vazios
    setEmployee({
      name: '',
      registration: '',
      cargo: '',
      ua: '005',
      exercicio: '990210000029',
      ch: '',
      funcao: '',
      unidade: 'CENTRO DE EDUC PROF ESCOLA TEC DO GUARA PROF TERESA ONDINA M',
      shift1: '',
      shift2: ''
    });
    
    setSummaryEntries(initialSummary);
    setObservations('');
    setCurrentTimesheetId(null);
    
    // Resetar índice para -1 (nenhum profissional selecionado)
    setCurrentProfissionalIndex(-1);
    
    // Focar no campo de nome
    setTimeout(() => {
      const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
      if (nameInput) {
        nameInput.focus();
      }
    }, 100);
  };

  // Initialize entries when month/year changes
  useEffect(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const newEntries: DailyEntry[] = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      type: 'TRABALHO',
      type_turno2: 'TRABALHO',
      entry1: '',
      exit1: '',
      entry2: '',
      exit2: '',
      observation: '',
      observation_turno2: ''
    }));
    setEntries(newEntries);
    
    // Tentar carregar folha existente quando mudar mês/ano
    if (profissionais.length > 0) {
      loadExistingTimesheet();
    }
  }, [month, year, currentProfissionalIndex]);

  // Carregar folha de ponto existente
  const loadExistingTimesheet = async () => {
    if (profissionais.length === 0) return;
    
    try {
      setIsLoading(true);
      
      const currentProfissional = profissionais[currentProfissionalIndex];
      if (!currentProfissional) return;
      
      const timesheetData = await apiService.loadCompleteTimesheet(
        currentProfissional.id,
        month,
        year
      );
      
      if (timesheetData) {
        setEmployee(timesheetData.employee);
        setEntries(timesheetData.entries);
        setSummaryEntries(timesheetData.summaryEntries.length > 0 ? timesheetData.summaryEntries : initialSummary);
        setObservations(timesheetData.observations);
        
        // Buscar o ID da folha
        const folhas = await apiService.getFolhasPonto({
          profissional_id: currentProfissional.id,
          mes: month,
          ano: year
        });
        if (folhas.length > 0) {
          setCurrentTimesheetId(folhas[0].id);
        }
      } else {
        // Se não encontrar folha, resetar com dados do profissional atual
        const employeeData = apiService.convertProfissionalToEmployee(currentProfissional);
        setEmployee(employeeData);
        setSummaryEntries(initialSummary);
        setObservations('');
        setCurrentTimesheetId(null);
      }
    } catch (error) {
      console.error('Erro ao carregar folha existente:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Salvar folha de ponto completa
  const saveTimesheet = async () => {
    try {
      setSaveStatus('saving');
      
      // Validar campos obrigatórios
      if (!employee.name) {
        alert('Por favor, preencha pelo menos o nome do servidor.');
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
        return;
      }
      
      const timesheetData: TimesheetData = {
        month,
        year,
        employee,
        entries,
        summaryEntries,
        observations
      };
      
      const result = await apiService.saveCompleteTimesheet(timesheetData);
      
      if (result.success) {
        setCurrentTimesheetId(result.folhaPontoId);
        setSaveStatus('saved');
        
        // Recarregar profissionais para atualizar a lista com o novo cadastro
        await loadProfissionais();
        
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error: any) {
      console.error('Erro ao salvar folha de ponto:', error);
      setSaveStatus('error');
      
      // Exibir mensagem de erro mais amigável
      const errorMessage = error.message || 'Erro ao salvar folha de ponto';
      
      // Se for erro de matrícula duplicada, mostrar alerta específico
      if (errorMessage.includes('Matrícula') && errorMessage.includes('já está')) {
        alert(errorMessage);
      } else {
        alert('Erro ao salvar: ' + errorMessage);
      }
      
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const timesheetData: TimesheetData = {
    month,
    year,
    employee,
    entries,
    summaryEntries,
    observations
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Navigation Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-stone-900 p-2 rounded-lg">
              <FileText className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900">Folha de Ponto</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('edit')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === 'edit' 
                ? 'bg-stone-900 text-white shadow-md' 
                : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setView('preview')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === 'preview' 
                ? 'bg-stone-900 text-white shadow-md' 
                : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Visualizar
            </button>
            <div className="w-px h-6 bg-stone-200 mx-2" />
            
            {/* Botão de Salvar */}
            <button
              onClick={saveTimesheet}
              disabled={saveStatus === 'saving'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                saveStatus === 'saving' 
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : saveStatus === 'saved'
                  ? 'bg-green-600 text-white'
                  : saveStatus === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Save className="w-4 h-4" />
              {saveStatus === 'saving' ? 'Salvando...' : 
               saveStatus === 'saved' ? 'Salvo!' :
               saveStatus === 'error' ? 'Erro' : 'Salvar'}
            </button>
            
            {/* Indicador de status do banco */}
            <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <Database className="w-3 h-3" />
              MySQL
            </div>
            
            <div className="w-px h-6 bg-stone-200 mx-2" />
            
            <button
              onClick={handlePrint}
              className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
              title="Imprimir"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {view === 'edit' ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 no-print"
            >
              {/* Controls */}
              <div className="flex flex-wrap items-end gap-4 bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Mês de Referência</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Ano</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200 w-24"
                  />
                </div>
                
                {/* Navegação de Profissionais */}
                <div className="flex flex-col gap-1 flex-1 min-w-[700px]">
                  <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Servidor</label>
                  <EmployeeNavigator
                    profissionais={profissionais}
                    currentIndex={currentProfissionalIndex}
                    isLoading={isLoadingProfissionais || isNavigating}
                    onNavigate={navigateToProfissional}
                    onDelete={handleDeleteProfissional}
                    onNew={handleNewProfissional}
                    onPreFill={handlePreFill}
                    onClear={handleClearEntries}
                    onBatchGenerate={() => setShowBatchModal(true)}
                    onOpenHolidayModal={() => setShowHolidayModal(true)}
                    onOpenReportsModal={() => setShowReportsModal(true)}
                    isPreFilling={isPreFilling}
                  />
                </div>
                
                <div className="flex-1" />
                <button 
                  onClick={() => setView('preview')}
                  className="flex items-center gap-2 bg-stone-900 text-white px-6 py-2 rounded-xl font-medium hover:bg-stone-800 transition-all shadow-lg shadow-stone-200"
                >
                  <Download className="w-4 h-4" />
                  Gerar Folha
                </button>
              </div>

              <EmployeeForm data={employee} onChange={setEmployee} />
              
              <TimesheetGrid
                entries={entries}
                month={month}
                year={year}
                onChange={handleEntriesChange}
                employeeCh={employee.ch}
                entryTypes={dynamicTypes}
              />

              <SummaryForm 
                entries={summaryEntries} 
                onChange={setSummaryEntries} 
              />

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <h2 className="text-lg font-semibold mb-4 text-stone-800 border-b pb-2">Observações</h2>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="w-full h-32 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all resize-none"
                  placeholder="Informações adicionais..."
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-4 space-y-8 print-wrapper"
            >
              <div className="mb-6 flex justify-center no-print">
                <div className="bg-stone-900/5 px-4 py-2 rounded-full text-stone-600 text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4 animate-spin-slow" />
                  Modo de Visualização para Impressão (Página 1 e 2)
                </div>
              </div>
              <TimesheetPreview data={timesheetData} />
              <TimesheetSummaryPreview data={timesheetData} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 no-print md:hidden">
        <button
          onClick={handlePrint}
          className="bg-stone-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95"
        >
          <Printer className="w-6 h-6" />
        </button>
      </div>

      {/* Conteúdo de impressão em lote — oculto normalmente, exibido apenas ao imprimir em lote */}
      <div className="batch-print-content">
        {batchTimesheets.map((ts, idx) => (
          <div key={idx}>
            <TimesheetPreview data={ts} />
            <TimesheetSummaryPreview data={ts} />
          </div>
        ))}
      </div>

      <BatchTimesheetModal
        isOpen={showBatchModal}
        profissionais={profissionais}
        onClose={() => setShowBatchModal(false)}
        onGenerate={handleBatchGenerate}
        onPrintOnly={handleBatchPrintOnly}
        isGenerating={isGeneratingBatch}
        progress={batchProgress}
      />

      <HolidayModal
        isOpen={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
        onApply={handleApplyHoliday}
        onRemoveEffect={handleRemoveHolidayEffect}
        onApplyRecesso={handleApplyRecesso}
        onRemoveRecessoEffect={handleRemoveRecessoEffect}
        currentMonth={month}
        currentYear={year}
      />

      <ReportsModal
        isOpen={showReportsModal}
        onClose={() => setShowReportsModal(false)}
        profissionais={profissionais}
        initialMonth={month}
        initialYear={year}
      />
    </div>
  );
}
