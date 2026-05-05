import React, { useState, useEffect } from 'react';
import { X, FileText, Printer, BarChart2 } from 'lucide-react';
import { MONTHS, ENTRY_TYPES } from '../types';
import { apiService } from '../services/api';


// ─── Types ────────────────────────────────────────────────────────────────────

interface Lancamento {
  dia: number;
  tipo: string;
  observation: string;
  tipo_turno2: string;
  observation_turno2: string;
}

interface ProfData {
  profissionalId: number;
  nome: string;
  matricula: string;
  turno1: string;
  turno2: string;
  lancamentos: Lancamento[];
}

/** Uma linha retornada pela vw_adicional_noturno */
interface AdicionalNoturnoRow {
  id: number;        // fp.id (folha_ponto id)
  nome: string;
  matricula: string;
  turno1: string;
  turno2: string;
  dia: number;
  mes: number;
  ano: number;
}

/** Profissional agrupado para o relatório de adicional noturno */
interface AdicionalNoturnoProf {
  profissionalId: number;
  nome: string;
  matricula: string;
  turno1: string;
  turno2: string;
  horas: number; // count de lançamentos válidos na view
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profissionais: any[];
  initialMonth: number;
  initialYear: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXCLUDED_FROM_REPORT = new Set(['TRABALHO', 'CPIP', 'CURSO']);
const WORKED_TYPES = new Set(['TRABALHO', 'CPIP', 'CURSO']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(day: number, month: number, year: number): string {
  return `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
}

function isWeekday(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month, day).getDay();
  return dow !== 0 && dow !== 6;
}

// ─── Report: Lançamentos ──────────────────────────────────────────────────────

interface EntryRange {
  tipo: string;
  label: string;
  diaInicio: number;
  diaFim: number;
  observation: string;
  turnoLabel: string; // MAT | VESP | NOT
}

/** Abrevia o nome do turno para MAT / VESP / NOT */
function abbreviateTurno(turno: string): string {
  const u = (turno || '').toUpperCase();
  if (u.includes('NOT')) return 'NOT';
  if (u.includes('VESP')) return 'VESP';
  return 'MAT';
}

/** Ordena e une turno labels em ordem canônica: MAT → VESP → NOT */
function ordenarTurnos(turnos: Set<string>): string {
  return ['MAT', 'VESP', 'NOT'].filter(t => turnos.has(t)).join(', ');
}

/**
 * Agrupa entradas por tipo, acumula turno labels por dia num Set e constrói
 * ranges de dias consecutivos. Mesmo evento nos dois turnos → 1 linha "MAT, VESP".
 */
function buildRangesLancamentos(
  lancamentos: Lancamento[],
  turno1: string,
  turno2: string,
): EntryRange[] {
  const t1 = abbreviateTurno(turno1);
  const t2 = abbreviateTurno(turno2);

  // tipo → dia → Set<turnoLabel>
  const byTipo = new Map<string, Map<number, Set<string>>>();

  const addEntry = (dia: number, tipo: string, turnoLabel: string) => {
    if (!tipo) return;
    if (EXCLUDED_FROM_REPORT.has(tipo)) return;
    if (!byTipo.has(tipo)) byTipo.set(tipo, new Map());
    const diaMap = byTipo.get(tipo)!;
    if (!diaMap.has(dia)) diaMap.set(dia, new Set());
    diaMap.get(dia)!.add(turnoLabel);
  };

  for (const l of lancamentos) {
    addEntry(l.dia, l.tipo, t1);
    if (l.tipo_turno2) addEntry(l.dia, l.tipo_turno2, t2);
  }

  const ranges: EntryRange[] = [];

  for (const [tipo, diaMap] of byTipo.entries()) {
    const label = ENTRY_TYPES.find(t => t.value === tipo)?.label ?? tipo;
    const dias = Array.from(diaMap.keys()).sort((a, b) => a - b);

    let start = dias[0];
    let end = dias[0];
    const turnosRange = new Set<string>(diaMap.get(dias[0])!);

    for (let i = 1; i < dias.length; i++) {
      if (dias[i] === end + 1) {
        end = dias[i];
        diaMap.get(dias[i])!.forEach(t => turnosRange.add(t));
      } else {
        ranges.push({ tipo, label, diaInicio: start, diaFim: end, observation: '', turnoLabel: ordenarTurnos(turnosRange) });
        start = dias[i];
        end = dias[i];
        turnosRange.clear();
        diaMap.get(dias[i])!.forEach(t => turnosRange.add(t));
      }
    }
    ranges.push({ tipo, label, diaInicio: start, diaFim: end, observation: '', turnoLabel: ordenarTurnos(turnosRange) });
  }

  ranges.sort((a, b) => a.diaInicio - b.diaInicio || a.label.localeCompare(b.label, 'pt-BR'));
  return ranges;
}

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

  // Só exibe profissionais com ao menos 1 ocorrência especial (espelha WHERE do SQL)
  const profsComOcorrencia = allProfData
    .map(prof => ({ prof, ranges: buildRangesLancamentos(prof.lancamentos, prof.turno1, prof.turno2) }))
    .filter(({ ranges }) => ranges.length > 0);

  if (profsComOcorrencia.length === 0) {
    return (
      <p className="text-center text-sm text-stone-400 py-8 border border-dashed border-stone-200 rounded-lg">
        Nenhuma ocorrência especial registrada em {MONTHS[filterMonth]} de {filterYear}.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-stone-200 rounded-xl bg-white shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-stone-50 text-[10px] font-bold text-stone-500 uppercase tracking-wider border-b border-stone-200">
          <tr>
            <th className="py-3 px-4 w-28">Matrícula</th>
            <th className="py-3 px-4">Nome / Evento</th>
            <th className="py-3 px-4 w-16">Turno</th>
            <th className="py-3 px-4 w-28">Início</th>
            <th className="py-3 px-4 w-28">Fim</th>
            <th className="py-3 px-4 w-32">Obs</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {profsComOcorrencia.map(({ prof, ranges }) => (
            <React.Fragment key={prof.profissionalId}>
              <tr className="bg-stone-50/50">
                <td className="py-2.5 px-4 font-mono text-xs text-stone-500">{prof.matricula || '—'}</td>
                <td className="py-2.5 px-4 font-semibold text-stone-900 uppercase" colSpan={5}>{prof.nome}</td>
              </tr>
              {ranges.map((r, i) => (
                <tr key={i} className="hover:bg-stone-50 transition-colors group">
                  <td className="py-2 px-4" />
                  <td className="py-2 px-4 text-stone-700 font-medium uppercase">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-300 group-hover:bg-stone-500 transition-colors shrink-0" />
                      {r.label}
                    </div>
                  </td>
                  <td className="py-2 px-4">
                    <span className="text-[10px] font-semibold text-stone-600 bg-stone-100 rounded px-2 py-0.5 tracking-wide">
                      {r.turnoLabel}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-stone-600">{formatDate(r.diaInicio, filterMonth, filterYear)}</td>
                  <td className="py-2 px-4 text-stone-600">{formatDate(r.diaFim, filterMonth, filterYear)}</td>
                  <td className="py-2 px-4 text-xs text-stone-400 italic">{r.observation || '—'}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Report: Adicional Noturno ────────────────────────────────────────────────

/**
 * Consome dados já agrupados vindos da vw_adicional_noturno.
 * Cada linha na view = 1 lançamento válido = 1h de adicional noturno.
 */
const ReportAdicionaNoturno: React.FC<{
  adicionaData: AdicionalNoturnoProf[];
  isLoading: boolean;
  filterMonth: number;
  filterYear: number;
}> = ({ adicionaData, isLoading, filterMonth, filterYear }) => {
  if (isLoading) return null; // spinner já exibido pelo pai

  if (adicionaData.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500 text-sm border border-dashed border-stone-200 rounded-lg">
        <BarChart2 className="w-8 h-8 mx-auto mb-2 text-stone-300" />
        <p>Nenhum profissional com turno noturno encontrado para {MONTHS[filterMonth]} de {filterYear}.</p>
      </div>
    );
  }

  let totalGeral = 0;

  return (
    <div className="overflow-x-auto border border-stone-200 rounded-xl bg-white shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-stone-50 text-[10px] font-bold text-stone-500 uppercase tracking-wider border-b border-stone-200">
          <tr>
            <th className="py-3 px-4 w-28">Matrícula</th>
            <th className="py-3 px-4">Nome</th>
            <th className="py-3 px-4 w-40">Turno(s) Noturno</th>
            <th className="py-3 px-4 w-24 text-right">Lançamentos</th>
            <th className="py-3 px-4 w-24 text-right">Horas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {adicionaData.map(prof => {
            totalGeral += prof.horas;
            const turnos = [prof.turno1, prof.turno2]
              .filter(t => (t || '').toUpperCase().includes('NOTURNO'))
              .join(', ');
            return (
              <tr key={prof.profissionalId} className="hover:bg-stone-50 transition-colors">
                <td className="py-3 px-4 font-mono text-xs text-stone-500">{prof.matricula || '—'}</td>
                <td className="py-3 px-4 font-semibold text-stone-900 uppercase">{prof.nome}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold uppercase tracking-wide">
                    {turnos || '—'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-stone-600">{prof.horas}</td>
                <td className="py-3 px-4 text-right font-bold text-stone-900">{String(prof.horas).padStart(3, '0')}:00</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-stone-50 border-t border-stone-200">
          <tr>
            <td colSpan={4} className="py-3 px-4 text-xs text-stone-500 font-medium">
              Total de horas de adicional noturno no período
            </td>
            <td className="py-3 px-4 text-right font-bold text-stone-900 text-base">
              {String(totalGeral).padStart(3, '0')}:00
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────

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

  // ── state: Relatório de Lançamentos ──────────────────────────────────────────
  const [allProfData, setAllProfData] = useState<ProfData[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [nenhuma, setNenhuma] = useState(false);

  // ── state: Relatório de Adicional Noturno ────────────────────────────────────
  const [adicionaData, setAdicionaData] = useState<AdicionalNoturnoProf[]>([]);
  const [isLoadingAdiciona, setIsLoadingAdiciona] = useState(false);
  const [nenhumaAdiciona, setNenhumaAdiciona] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFilterMonth(initialMonth);
      setFilterYear(initialYear);
    }
  }, [isOpen, initialMonth, initialYear]);

  // ── fetch: Lançamentos ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || reportType !== 'lancamentos') return;
    const load = async () => {
      setIsLoadingEntries(true);
      setNenhuma(false);
      setAllProfData([]);
      try {
        // Uma única query via view vw_folhas_lancamento — sem N+1
        const rows: any[] = await apiService.getLancamentosRelatorio(filterMonth, filterYear);

        if (!rows || rows.length === 0) {
          setNenhuma(true);
          return;
        }

        // Agrupa por fp.id (folha_ponto id)
        const map = new Map<number, ProfData>();
        for (const r of rows) {
          const fid: number = r.id;
          if (!map.has(fid)) {
            map.set(fid, {
              profissionalId: fid,
              nome: r.nome ?? '—',
              matricula: r.matricula ?? '',
              turno1: r.turno1 ?? '',
              turno2: r.turno2 ?? '',
              lancamentos: [],
            });
          }
          if (r.dia != null) {
            map.get(fid)!.lancamentos.push({
              dia: r.dia,
              tipo: r.tipo || '',
              observation: '',
              tipo_turno2: r.tipo_turno2 || '',
              observation_turno2: '',
            });
          }
        }

        const valid = Array.from(map.values());
        valid.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        setAllProfData(valid);
      } catch {
        setNenhuma(true);
      } finally {
        setIsLoadingEntries(false);
      }
    };
    load();
  }, [isOpen, reportType, filterMonth, filterYear]);

  // ── fetch: Adicional Noturno ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || reportType !== 'adicional_noturno') return;
    const load = async () => {
      setIsLoadingAdiciona(true);
      setNenhumaAdiciona(false);
      setAdicionaData([]);
      try {
        // vw_adicional_noturno: só profissionais noturnos + só lançamentos válidos
        // Cada linha = 1 lançamento = 1h de adicional noturno
        const rows: AdicionalNoturnoRow[] = await apiService.getAdicionaNoturnoRelatorio(filterMonth, filterYear);

        if (!rows || rows.length === 0) {
          setNenhumaAdiciona(true);
          return;
        }

        // Agrupa por fp.id, conta linhas (horas)
        const map = new Map<number, AdicionalNoturnoProf>();
        for (const r of rows) {
          const fid = r.id;
          if (!map.has(fid)) {
            map.set(fid, {
              profissionalId: fid,
              nome: r.nome ?? '—',
              matricula: r.matricula ?? '',
              turno1: r.turno1 ?? '',
              turno2: r.turno2 ?? '',
              horas: 0,
            });
          }
          // Conta só dias úteis (Seg–Sex); sábado e domingo descartados
          if (r.dia != null && isWeekday(r.ano, r.mes, r.dia)) {
            map.get(fid)!.horas += 1;
          }
        }

        const valid = Array.from(map.values());
        valid.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        setAdicionaData(valid);
      } catch {
        setNenhumaAdiciona(true);
      } finally {
        setIsLoadingAdiciona(false);
      }
    };
    load();
  }, [isOpen, reportType, filterMonth, filterYear]);

  if (!isOpen) return null;

  const periodoInicio = formatDate(1, filterMonth, filterYear);
  const ultimoDia = new Date(filterYear, filterMonth + 1, 0).getDate();
  const periodoFim = formatDate(ultimoDia, filterMonth, filterYear);
  const unidade = profissionais[0]?.unidade_lotacao ?? '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:bg-transparent print:relative print:inset-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:w-full print:mx-0 print:rounded-none">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 no-print">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-stone-700" />
            <h2 className="text-lg font-bold text-stone-900">Relatórios</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-500 hover:bg-stone-100 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap items-end gap-4 px-6 py-4 border-b border-stone-100 bg-stone-50/50 no-print">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Relatório</label>
            <div className="flex rounded-lg overflow-hidden border border-stone-200">
              <button
                onClick={() => setReportType('lancamentos')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${reportType === 'lancamentos' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-100'
                  }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Lançamentos
              </button>
              <button
                onClick={() => setReportType('adicional_noturno')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-stone-200 ${reportType === 'adicional_noturno' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-100'
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
        <div className="overflow-y-auto flex-1 px-6 py-6 relative print:overflow-visible print:p-0">
          {(isLoadingEntries || isLoadingAdiciona) && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <div className="animate-spin w-6 h-6 border-2 border-stone-300 border-t-stone-600 rounded-full" />
            </div>
          )}

          <div className="text-center mb-8">
            <h1 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-stone-900 print:text-black">
              {reportType === 'lancamentos'
                ? 'Relatório de Eventos'
                : 'Relatório de Adicional Noturno'}
            </h1>
            <p className="text-sm font-medium text-stone-500 mt-1.5 print:text-stone-600">
              Período de apuração: <span className="text-stone-800 print:text-black">{periodoInicio}</span> a <span className="text-stone-800 print:text-black">{periodoFim}</span>
            </p>
          </div>

          {reportType === 'lancamentos' ? (
            nenhuma ? (
              <p className="text-center text-sm text-stone-400 py-8 border border-dashed border-stone-200 rounded-lg">
                Nenhuma folha de ponto encontrada para {MONTHS[filterMonth]} de {filterYear}.
              </p>
            ) : (
              <ReportLancamentos
                allProfData={allProfData}
                filterMonth={filterMonth}
                filterYear={filterYear}
              />
            )
          ) : (
            nenhumaAdiciona ? (
              <p className="text-center text-sm text-stone-400 py-8 border border-dashed border-stone-200 rounded-lg">
                Nenhum lançamento noturno encontrado para {MONTHS[filterMonth]} de {filterYear}.
              </p>
            ) : (
              <ReportAdicionaNoturno
                adicionaData={adicionaData}
                isLoading={isLoadingAdiciona}
                filterMonth={filterMonth}
                filterYear={filterYear}
              />
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 no-print">
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
