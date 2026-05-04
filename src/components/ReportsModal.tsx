import React, { useState, useEffect } from 'react';
import { X, FileText, Printer, BarChart2 } from 'lucide-react';
import { MONTHS, ENTRY_TYPES } from '../types';
import { apiService } from '../services/api';

interface EntryRange {
  tipo: string;
  label: string;
  diaInicio: number;
  diaFim: number;
  observation: string;
}

interface ProfData {
  profissionalId: number;
  nome: string;
  matricula: string;
  turno1: string;
  turno2: string;
  lancamentos: { dia: number; tipo: string; observation: string; tipo_turno2: string; observation_turno2: string }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profissionais: any[];
  initialMonth: number;
  initialYear: number;
}

// Tipos que NÃO aparecem no relatório de lançamentos especiais
const EXCLUDED_FROM_REPORT = new Set(['TRABALHO', 'CPIP', 'CURSO', 'FERIADO']);
// Tipos que contam como dia trabalhado para cálculo de adicional noturno
const WORKED_TYPES = new Set(['TRABALHO', 'CPIP', 'CURSO']);

function formatDate(day: number, month: number, year: number): string {
  return `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
}

function isWeekday(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month, day).getDay();
  return dow !== 0 && dow !== 6;
}

function buildRanges(lancamentos: ProfData['lancamentos'], filterMonth: number, filterYear: number): EntryRange[] {
  // Expand each day into individual entries for turno1 and turno2
  const expanded: { dia: number; tipo: string; observation: string }[] = [];
  for (const l of lancamentos) {
    if (!EXCLUDED_FROM_REPORT.has(l.tipo)) {
      expanded.push({ dia: l.dia, tipo: l.tipo, observation: l.observation });
    }
    if (l.tipo_turno2 && !EXCLUDED_FROM_REPORT.has(l.tipo_turno2) && l.tipo_turno2 !== l.tipo) {
      expanded.push({ dia: l.dia, tipo: l.tipo_turno2, observation: l.observation_turno2 });
    }
  }

  expanded.sort((a, b) => a.dia - b.dia);

  const ranges: EntryRange[] = [];
  for (const entry of expanded) {
    const entryLabel = ENTRY_TYPES.find(t => t.value === entry.tipo)?.label ?? entry.tipo;
    const last = ranges[ranges.length - 1];
    if (last && last.tipo === entry.tipo && last.diaFim === entry.dia - 1) {
      last.diaFim = entry.dia;
    } else {
      ranges.push({ tipo: entry.tipo, label: entryLabel, diaInicio: entry.dia, diaFim: entry.dia, observation: entry.observation });
    }
  }
  return ranges;
}

function calcHorasNoturno(lancamentos: ProfData['lancamentos'], filterYear: number, filterMonth: number): number {
  return lancamentos.filter(
    l => isWeekday(filterYear, filterMonth, l.dia) && (WORKED_TYPES.has(l.tipo) || WORKED_TYPES.has(l.tipo_turno2))
  ).length;
}

export const ReportsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  profissionais,
  initialMonth,
  initialYear,
}) => {
  const [reportType, setReportType] = useState<'lancamentos' | 'adicional_noturno'>('lancamentos');
  const [filterMonth, setFilterMonth] = useState(initialMonth);
  const [filterYear, setFilterYear] = useState(initialYear);
  const [allProfData, setAllProfData] = useState<ProfData[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [nenhuma, setNenhuma] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFilterMonth(initialMonth);
      setFilterYear(initialYear);
    }
  }, [isOpen, initialMonth, initialYear]);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setIsLoadingEntries(true);
      setNenhuma(false);
      setAllProfData([]);
      try {
        const folhas: any[] = await apiService.getFolhasPonto({
          mes: filterMonth + 1,
          ano: filterYear,
        });

        if (!folhas || folhas.length === 0) {
          setNenhuma(true);
          return;
        }

        // Busca lancamentos de todas as folhas em paralelo
        const results = await Promise.all(
          folhas.map(async (folha: any) => {
            try {
              const data = await apiService.getFolhaPonto(folha.id);
              const raw: any[] = data.lancamentos || [];
              // Busca dados de turno da lista de profissionais
              const prof = profissionais.find((p: any) => p.id === folha.profissional_id);
              return {
                profissionalId: folha.profissional_id,
                nome: folha.profissional_nome || folha.nome || prof?.nome || '—',
                matricula: folha.matricula || prof?.matricula || '',
                turno1: prof?.turno1 || '',
                turno2: prof?.turno2 || '',
                lancamentos: raw.map((l: any) => ({
                  dia: l.dia,
                  tipo: l.tipo || 'TRABALHO',
                  observation: l.observacao || '',
                  tipo_turno2: l.tipo_turno2 || 'TRABALHO',
                  observation_turno2: l.observacao_turno2 || '',
                })),
              } as ProfData;
            } catch {
              return null;
            }
          })
        );

        const valid = results.filter((r): r is ProfData => r !== null);
        valid.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        setAllProfData(valid);
      } catch {
        setNenhuma(true);
      } finally {
        setIsLoadingEntries(false);
      }
    };
    load();
  }, [isOpen, filterMonth, filterYear, profissionais]);

  if (!isOpen) return null;

  const periodoInicio = formatDate(1, filterMonth, filterYear);
  const ultimoDia = new Date(filterYear, filterMonth + 1, 0).getDate();
  const periodoFim = formatDate(ultimoDia, filterMonth, filterYear);
  const unidade = profissionais[0]?.unidade_lotacao ?? '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-stone-700" />
            <h2 className="text-lg font-bold text-stone-900">Relatórios</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-500 hover:bg-stone-100 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap items-end gap-3 px-6 py-4 border-b border-stone-100 bg-stone-50">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Relatório</label>
            <div className="flex rounded-lg overflow-hidden border border-stone-200">
              <button
                onClick={() => setReportType('lancamentos')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  reportType === 'lancamentos' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Lançamentos
              </button>
              <button
                onClick={() => setReportType('adicional_noturno')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-stone-200 ${
                  reportType === 'adicional_noturno' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-100'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                Adicional Noturno
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Mês</label>
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(Number(e.target.value))}
              className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200"
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
              value={filterYear}
              onChange={e => setFilterYear(Number(e.target.value))}
              className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm w-24 focus:outline-none focus:ring-2 focus:ring-stone-200"
            />
          </div>

          <div className="ml-auto flex items-end">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-700 transition-all h-[38px]"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="overflow-y-auto flex-1 px-6 py-4 relative">
          {isLoadingEntries && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <div className="animate-spin w-6 h-6 border-2 border-stone-300 border-t-stone-600 rounded-full" />
            </div>
          )}

          {/* Cabeçalho SIGFP */}
          <div className="text-center mb-4">
            <p className="font-bold text-sm uppercase">GOVERNO DO DISTRITO FEDERAL</p>
            <p className="font-bold text-sm uppercase">SECRETARIA DE ESTADO DE EDUCAÇÃO DO DISTRITO FEDERAL</p>
            <p className="font-bold text-sm uppercase">SUBSECRETARIA DE GESTÃO DE PESSOAS</p>
            {unidade && <p className="text-xs mt-2 uppercase">{unidade}</p>}
            <p className="text-sm font-semibold mt-3 uppercase">
              {reportType === 'lancamentos'
                ? 'LISTAGEM DO LANÇAMENTO DE EVENTOS PARA SIMPLES CONFERÊNCIA'
                : 'RELATÓRIO DE ADICIONAL NOTURNO'}
            </p>
            <p className="text-sm">
              Lançamentos Efetuados no Período de {periodoInicio} a {periodoFim}
            </p>
          </div>

          {nenhuma ? (
            <p className="text-center text-sm text-stone-400 py-8 border border-dashed border-stone-200 rounded-lg">
              Nenhuma folha de ponto encontrada para {MONTHS[filterMonth]} de {filterYear}.
            </p>
          ) : reportType === 'lancamentos' ? (
            <ReportLancamentos
              allProfData={allProfData}
              filterMonth={filterMonth}
              filterYear={filterYear}
            />
          ) : (
            <ReportAdicionaNoturno
              allProfData={allProfData}
              filterMonth={filterMonth}
              filterYear={filterYear}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const ReportLancamentos: React.FC<{
  allProfData: ProfData[];
  filterMonth: number;
  filterYear: number;
}> = ({ allProfData, filterMonth, filterYear }) => {
  if (allProfData.length === 0) {
    return (
      <p className="text-center text-sm text-stone-400 py-8 border border-dashed border-stone-200 rounded-lg">
        Nenhuma folha encontrada para {MONTHS[filterMonth]} de {filterYear}.
      </p>
    );
  }

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b-2 border-stone-800">
          <th className="text-left py-1 px-2 font-semibold w-28">Matrícula</th>
          <th className="text-left py-1 px-2 font-semibold">Nome/Evento</th>
          <th className="text-left py-1 px-2 font-semibold w-28">Início</th>
          <th className="text-left py-1 px-2 font-semibold w-28">Fim</th>
          <th className="text-left py-1 px-2 font-semibold w-32">Obs</th>
        </tr>
      </thead>
      <tbody>
        {allProfData.map(prof => {
          const ranges = buildRanges(prof.lancamentos, filterMonth, filterYear);
          return (
            <React.Fragment key={prof.profissionalId}>
              <tr className="border-b border-stone-300 bg-stone-50">
                <td className="py-1 px-2 font-medium">{prof.matricula || '—'}</td>
                <td className="py-1 px-2 font-semibold uppercase">{prof.nome}</td>
                <td className="py-1 px-2" />
                <td className="py-1 px-2" />
                <td className="py-1 px-2" />
              </tr>
              {ranges.length === 0 ? (
                <tr className="border-b border-stone-100">
                  <td className="py-1 px-2" />
                  <td className="py-1 px-2 text-xs text-stone-400 italic" colSpan={4}>
                    Sem ocorrências especiais
                  </td>
                </tr>
              ) : (
                ranges.map((r, i) => (
                  <tr key={i} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-1 px-2" />
                    <td className="py-1 px-2 uppercase">{r.label}</td>
                    <td className="py-1 px-2">{formatDate(r.diaInicio, filterMonth, filterYear)}</td>
                    <td className="py-1 px-2">{formatDate(r.diaFim, filterMonth, filterYear)}</td>
                    <td className="py-1 px-2 text-xs text-stone-500">{r.observation || ''}</td>
                  </tr>
                ))
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
};

const ReportAdicionaNoturno: React.FC<{
  allProfData: ProfData[];
  filterMonth: number;
  filterYear: number;
}> = ({ allProfData, filterMonth, filterYear }) => {
  const comNoturno = allProfData.filter(p =>
    p.turno1.toUpperCase().includes('NOTURNO') || p.turno2.toUpperCase().includes('NOTURNO')
  );

  if (comNoturno.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500 text-sm border border-dashed border-stone-200 rounded-lg">
        <BarChart2 className="w-8 h-8 mx-auto mb-2 text-stone-300" />
        <p>Nenhum profissional com turno noturno encontrado para {MONTHS[filterMonth]} de {filterYear}.</p>
      </div>
    );
  }

  let totalGeral = 0;

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b-2 border-stone-800">
          <th className="text-left py-1 px-2 font-semibold w-28">Matrícula</th>
          <th className="text-left py-1 px-2 font-semibold">Nome</th>
          <th className="text-left py-1 px-2 font-semibold w-36">Turno(s) Noturno</th>
          <th className="text-right py-1 px-2 font-semibold w-24">Horas</th>
        </tr>
      </thead>
      <tbody>
        {comNoturno.map(prof => {
          const horas = calcHorasNoturno(prof.lancamentos, filterYear, filterMonth);
          totalGeral += horas;
          const turnos = [prof.turno1, prof.turno2]
            .filter(t => t.toUpperCase().includes('NOTURNO'))
            .join(', ');
          return (
            <tr key={prof.profissionalId} className="border-b border-stone-100 hover:bg-stone-50">
              <td className="py-1.5 px-2">{prof.matricula || '—'}</td>
              <td className="py-1.5 px-2 uppercase font-medium">{prof.nome}</td>
              <td className="py-1.5 px-2 text-xs uppercase">{turnos}</td>
              <td className="py-1.5 px-2 text-right font-bold">{String(horas).padStart(3, '0')}:00</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-stone-800">
          <td colSpan={3} className="py-2 px-2 text-xs text-stone-500 italic">
            Dias úteis (seg–sex) com TRABALHO NORMAL, CPIP ou CURSO. Cada dia = 1h de adicional noturno.
          </td>
          <td className="py-2 px-2 text-right font-bold text-stone-800">
            {String(totalGeral).padStart(3, '0')}:00
          </td>
        </tr>
      </tfoot>
    </table>
  );
};
