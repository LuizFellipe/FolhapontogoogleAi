import React, { useState, useEffect } from 'react';
import { X, FileText, Printer, BarChart2, List } from 'lucide-react';
import { MONTHS, ENTRY_TYPES } from '../types';
import { apiService } from '../services/api';


// ─── Types ────────────────────────────────────────────────────────────────────

type SortBy = 'nome' | 'matricula';

/** Um range do Relatório de Eventos vindo de GET /api/sigep/eventos */
interface EventoRange {
  folha_ponto_id: number;
  nome: string;
  matricula: string;
  tipo: string;
  dia_inicio: number;
  dia_fim: number;
  turnos: string; // "MAT", "MAT, VESP"...
  sync_status: 'JA_EXISTIA' | 'LANCADO' | null;
  sincronizado_em: string | null; // 'YYYY-MM-DD HH:MM:SS'
}

interface ProfData {
  profissionalId: number;
  nome: string;
  matricula: string;
  ranges: EventoRange[];
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(day: number, month: number, year: number): string {
  return `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
}

function isWeekday(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month, day).getDay();
  return dow !== 0 && dow !== 6;
}

function normalizeMatricula(m?: string): string {
  return (m || '').replace(/\D/g, '');
}

function compareProf(
  a: { matricula?: string; nome: string },
  b: { matricula?: string; nome: string },
  sortBy: SortBy
): number {
  if (sortBy === 'matricula') {
    const matA = (a.matricula || '').trim();
    const matB = (b.matricula || '').trim();
    if (matA && matB) {
      const cmp = matA.localeCompare(matB, 'pt-BR', { numeric: true });
      if (cmp !== 0) return cmp;
    } else if (matA && !matB) {
      return -1;
    } else if (!matA && matB) {
      return 1;
    }
    return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
  }
  return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
}

// ─── Report: Lançamentos ──────────────────────────────────────────────────────

const ReportLancamentos: React.FC<{
  allProfData: ProfData[];
  filterMonth: number;
  filterYear: number;
  sortBy: SortBy;
}> = ({ allProfData, filterMonth, filterYear, sortBy }) => {
  if (allProfData.length === 0) {
    return (
      <p className="text-center text-sm text-stone-400 py-8 border border-dashed border-stone-200 rounded-lg">
        Nenhuma folha encontrada para {MONTHS[filterMonth]} de {filterYear}.
      </p>
    );
  }

  // Ordena os profissionais pelo critério selecionado e filtra os que têm ocorrência
  const sortedProfData = [...allProfData].sort((a, b) => compareProf(a, b, sortBy));
  const profsComOcorrencia = sortedProfData.map(prof => ({ prof, ranges: prof.ranges }));

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
            <th className="py-3 px-4 w-28">SIGEP</th>
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
                      {ENTRY_TYPES.find(t => t.value === r.tipo)?.label ?? r.tipo}
                    </div>
                  </td>
                  <td className="py-2 px-4">
                    <span className="text-[10px] font-semibold text-stone-600 bg-stone-100 rounded px-2 py-0.5 tracking-wide">
                      {r.turnos}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-stone-600">{formatDate(r.dia_inicio, filterMonth, filterYear)}</td>
                  <td className="py-2 px-4 text-stone-600">{formatDate(r.dia_fim, filterMonth, filterYear)}</td>
                  <td className="py-2 px-4 text-xs">
                    {r.sincronizado_em ? (
                      <span
                        className="text-emerald-700 font-semibold"
                        title={r.sync_status === 'LANCADO' ? 'Lançado pelo robô' : 'Já constava no SIGEP'}
                      >
                        ✓ {r.sincronizado_em.slice(0, 10).split('-').reverse().join('/')}
                      </span>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
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
  sortBy: SortBy;
}> = ({ adicionaData, isLoading, filterMonth, filterYear, sortBy }) => {
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
  const sortedData = [...adicionaData].sort((a, b) => compareProf(a, b, sortBy));

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
          {sortedData.map(prof => {
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

// ─── Report: Resumo Anual ─────────────────────────────────────────────────────

interface ResumoRow {
  nome: string;
  matricula: string;
  tipo: string;
  total: number;
}

const ReportResumo: React.FC<{
  resumoData: ResumoRow[];
  isLoading: boolean;
  filterYear: number;
  sortBy: SortBy;
}> = ({ resumoData, isLoading, filterYear, sortBy }) => {
  if (isLoading) return null;

  if (resumoData.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500 text-sm border border-dashed border-stone-200 rounded-lg">
        <List className="w-8 h-8 mx-auto mb-2 text-stone-300" />
        <p>Nenhuma ocorrência encontrada para {filterYear}.</p>
      </div>
    );
  }

  // Agrupar por matricula ou nome — um profissional tem N folhas_ponto (uma por mês)
  const byProf = new Map<string, { nome: string; matricula: string; tipos: { tipo: string; label: string; total: number }[] }>();
  let totalGeral = 0;
  for (const r of resumoData) {
    const key = r.matricula ? `mat_${r.matricula}` : `nome_${r.nome}`;
    if (!byProf.has(key)) {
      byProf.set(key, { nome: r.nome, matricula: r.matricula, tipos: [] });
    }
    const label = ENTRY_TYPES.find(t => t.value === r.tipo)?.label ?? r.tipo;
    byProf.get(key)!.tipos.push({ tipo: r.tipo, label, total: r.total });
    totalGeral += r.total;
  }

  const profsList = Array.from(byProf.values()).sort((a, b) => compareProf(a, b, sortBy));

  return (
    <div className="overflow-x-auto border border-stone-200 rounded-xl bg-white shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-stone-50 text-[10px] font-bold text-stone-500 uppercase tracking-wider border-b border-stone-200">
          <tr>
            <th className="py-3 px-4 w-28">Matrícula</th>
            <th className="py-3 px-4">Nome / Tipo de Ocorrência</th>
            <th className="py-3 px-4 w-24 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {profsList.map((prof, pi) => (
            <React.Fragment key={pi}>
              <tr className="bg-stone-50/50">
                <td className="py-2.5 px-4 font-mono text-xs text-stone-500">{prof.matricula || '—'}</td>
                <td className="py-2.5 px-4 font-semibold text-stone-900 uppercase" colSpan={2}>{prof.nome}</td>
              </tr>
              {prof.tipos.map((t, i) => (
                <tr key={i} className="hover:bg-stone-50 transition-colors group">
                  <td className="py-2 px-4" />
                  <td className="py-2 px-4 text-stone-700 font-medium uppercase">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-300 group-hover:bg-stone-500 transition-colors shrink-0" />
                      {t.label}
                    </div>
                  </td>
                  <td className="py-2 px-4 text-right text-stone-700 font-semibold">{t.total}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot className="bg-stone-50 border-t border-stone-200">
          <tr>
            <td colSpan={2} className="py-3 px-4 text-xs text-stone-500 font-medium">
              Total de ocorrências no período
            </td>
            <td className="py-3 px-4 text-right font-bold text-stone-900 text-base">{totalGeral}</td>
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
  const [reportType, setReportType] = useState<'lancamentos' | 'adicional_noturno' | 'resumo'>('lancamentos');
  const [sortBy, setSortBy] = useState<SortBy>('nome');
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

  // ── state: Relatório de Resumo ───────────────────────────────────────────────
  const [resumoData, setResumoData] = useState<ResumoRow[]>([]);
  const [isLoadingResumo, setIsLoadingResumo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFilterMonth(initialMonth);
      setFilterYear(initialYear);
    }
  }, [isOpen, initialMonth, initialYear]);

  // Função auxiliar para verificar se o profissional está ativo
  const isProfissionalAtivo = (matricula?: string, nome?: string): boolean => {
    if (!profissionais || profissionais.length === 0) return true;

    // Busca por matrícula normalizada
    const normMat = normalizeMatricula(matricula);
    if (normMat) {
      const prof = profissionais.find(p => normalizeMatricula(p.matricula) === normMat);
      if (prof) return prof.status !== 'INATIVO';
    }

    // Busca por nome
    if (nome && nome.trim()) {
      const prof = profissionais.find(
        p => p.nome && p.nome.trim().toUpperCase() === nome.trim().toUpperCase()
      );
      if (prof) return prof.status !== 'INATIVO';
    }

    return true;
  };

  // ── fetch: Lançamentos ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || reportType !== 'lancamentos') return;
    const load = async () => {
      setIsLoadingEntries(true);
      setNenhuma(false);
      setAllProfData([]);
      try {
        // Ranges montados no backend (fonte única com o robô sigep/lancar_eventos.py)
        const rows: EventoRange[] = await apiService.getSigepEventos(filterMonth, filterYear);

        // Agrupa por folha (backend já descarta inativos)
        const map = new Map<number, ProfData>();
        for (const r of rows || []) {
          if (!map.has(r.folha_ponto_id)) {
            map.set(r.folha_ponto_id, {
              profissionalId: r.folha_ponto_id,
              nome: r.nome ?? '—',
              matricula: r.matricula ?? '',
              ranges: [],
            });
          }
          map.get(r.folha_ponto_id)!.ranges.push(r);
        }

        const valid = Array.from(map.values());
        if (valid.length === 0) {
          setNenhuma(true);
        } else {
          setAllProfData(valid);
        }
      } catch {
        setNenhuma(true);
      } finally {
        setIsLoadingEntries(false);
      }
    };
    load();
  }, [isOpen, reportType, filterMonth, filterYear, profissionais]);

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

        // Agrupa por fp.id, conta linhas (horas) filtrando inativos
        const map = new Map<number, AdicionalNoturnoProf>();
        for (const r of rows) {
          if (!isProfissionalAtivo(r.matricula, r.nome)) continue;

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
        if (valid.length === 0) {
          setNenhumaAdiciona(true);
        } else {
          setAdicionaData(valid);
        }
      } catch {
        setNenhumaAdiciona(true);
      } finally {
        setIsLoadingAdiciona(false);
      }
    };
    load();
  }, [isOpen, reportType, filterMonth, filterYear, profissionais]);

  // ── fetch: Resumo ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || reportType !== 'resumo') return;
    const load = async () => {
      setIsLoadingResumo(true);
      setResumoData([]);
      try {
        const rows: ResumoRow[] = await apiService.getResumoRelatorio(filterYear);
        const filtered = (rows || []).filter(r => isProfissionalAtivo(r.matricula, r.nome));
        setResumoData(filtered);
      } catch {
        setResumoData([]);
      } finally {
        setIsLoadingResumo(false);
      }
    };
    load();
  }, [isOpen, reportType, filterYear, profissionais]);

  if (!isOpen) return null;

  const periodoInicio = formatDate(1, filterMonth, filterYear);
  const ultimoDia = new Date(filterYear, filterMonth + 1, 0).getDate();
  const periodoFim = formatDate(ultimoDia, filterMonth, filterYear);

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
              <button
                onClick={() => setReportType('resumo')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-stone-200 ${reportType === 'resumo' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-100'
                  }`}
              >
                <List className="w-3.5 h-3.5" />
                Resumo
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Ordenação</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortBy)}
              className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 font-medium text-stone-700"
            >
              <option value="nome">Ordem Alfabética</option>
              <option value="matricula">Ordem de Matrícula</option>
            </select>
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
          {(isLoadingEntries || isLoadingAdiciona || isLoadingResumo) && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <div className="animate-spin w-6 h-6 border-2 border-stone-300 border-t-stone-600 rounded-full" />
            </div>
          )}

          <div className="text-center mb-8">
            <h1 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-stone-900 print:text-black">
              {reportType === 'lancamentos'
                ? 'Relatório de Eventos'
                : reportType === 'adicional_noturno'
                  ? 'Relatório de Adicional Noturno'
                  : 'Resumo de Ocorrências'}
            </h1>
            <p className="text-sm font-medium text-stone-500 mt-1.5 print:text-stone-600">
              {reportType === 'resumo'
                ? <>Janeiro a {MONTHS[new Date().getMonth()]} de <span className="text-stone-800 print:text-black">{filterYear}</span></>
                : <>Período de apuração: <span className="text-stone-800 print:text-black">{periodoInicio}</span> a <span className="text-stone-800 print:text-black">{periodoFim}</span></>
              }
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
                sortBy={sortBy}
              />
            )
          ) : reportType === 'adicional_noturno' ? (
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
                sortBy={sortBy}
              />
            )
          ) : (
            <ReportResumo
              resumoData={resumoData}
              isLoading={isLoadingResumo}
              filterYear={filterYear}
              sortBy={sortBy}
            />
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
