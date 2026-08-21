import React, { useState, useMemo, useEffect } from 'react';
import { X, Send, CheckSquare, Square, Printer } from 'lucide-react';
import { MONTHS } from '../types';
import logoSrc from '../logo.png';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profissional {
  id: number;
  nome: string;
  matricula: string;
  cargo: string;
  carga_horaria?: string | number;
  status?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profissionais: Profissional[];
  initialMonth: number;
  initialYear: number;
}

type Vinculo = 'EFETIVOS' | 'TEMPORARIOS';
type SortBy = 'nome' | 'matricula';

// ─── Constants ────────────────────────────────────────────────────────────────

const CARGO_FILTERS_EFETIVO = [
  { key: 'ANA.POL.PUB', label: 'ANA.POL.PUB.G.E' },
  { key: 'PEDAGOGO', label: 'PEDAGOGO' },
  { key: 'PROFESSOR DE EDUC. BASICA', label: 'PROF. DE EDUC. BÁSICA' },
];

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function abbreviateCargo(cargo: string): string {
  const c = (cargo || '').toUpperCase();
  if (c.includes('TEMP')) return 'PROF TEMP';
  if (c.includes('PROFESSOR DE EDUC. BASICA') || c.includes('PROF DE EDUC')) return 'PROF';
  if (c.includes('PEDAGOGO')) return 'PEDAGOGO';
  if (c.includes('ANA.POL')) return 'ANA.POL.PUB.G.E';
  // Generic: take first segment before space
  const first = (cargo || '').split(' ')[0];
  return first || cargo;
}

function todayLabel(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')} de ${MONTH_NAMES_PT[d.getMonth()]} de ${d.getFullYear()}`;
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

// ─── Print Document ───────────────────────────────────────────────────────────

const PrintDocument: React.FC<{
  vinculo: Vinculo;
  mesLabel: string;
  filterYear: number;
  memoNum: string;
  dataEmissao: string;
  selectedProfs: Profissional[];
}> = ({ vinculo, mesLabel, filterYear, memoNum, dataEmissao, selectedProfs }) => {
  const textoEfetivo =
    `Declaro que as informações lançadas na(s) Folha(s) de Frequência estão em conformidade ` +
    `com o(s) registro(s) cadastrado(s) no Sistema Único de Gestão de Recursos Humanos (SIGRH) ` +
    `e atesto que a(s) Folha(s) de Frequência referentes ao mês de ${mesLabel.toUpperCase()}/${filterYear} ` +
    `do(s) servidor(e)s abaixo relacionado(s);`;

  const textoTemporario =
    `Segue em anexo as Folhas de Frequência referente ao mês de ${mesLabel.toUpperCase()}/${filterYear} ` +
    `dos Contratos Temporários abaixo relacionados, devidamente assinadas, conferidas e atestadas.`;

  return (
    <div
      className="delivery-print-page"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '14mm 18mm 12mm 18mm',
        fontFamily: 'Times New Roman, Times, serif',
        fontSize: '12pt',
        color: '#000',
        background: '#fff',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Institutional header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
        <img
          src={logoSrc}
          alt="Logo GDF"
          style={{ width: '52px', height: '52px', objectFit: 'contain', flexShrink: 0 }}
        />
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', lineHeight: 1.3 }}>
          <div style={{ fontSize: '13pt' }}>GOVERNO DO DISTRITO FEDERAL</div>
          <div style={{ fontSize: '11pt' }}>SECRETARIA DE ESTADO DE EDUCAÇÃO</div>
          <div style={{ fontSize: '11pt' }}>SUBSECRETARIA DE GESTÃO DOS PROFISSIONAIS DA EDUCAÇÃO</div>
          <div style={{ fontSize: '11pt' }}>CENTRO DE EDUCAÇÃO PROFISSIONAL ESCOLA TÉCNICA DO GUARÁ</div>
        </div>
      </div>

      {/* MEMO nº / Data */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11pt', marginBottom: '24px' }}>
        <span>MEMO nº&nbsp;&nbsp;&nbsp;&nbsp;{memoNum}</span>
        <span>GUARA-DF, {dataEmissao}.</span>
      </div>

      {/* Salutation */}
      <p style={{ fontSize: '11pt', marginBottom: '24px' }}>Senhor(a) Coordenador(a),</p>

      {/* Body text */}
      <p style={{ fontSize: '11pt', textAlign: 'justify', marginBottom: '24px', lineHeight: 1.4 }}>
        {vinculo === 'EFETIVOS' ? textoEfetivo : textoTemporario}
      </p>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', marginBottom: '40px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', fontWeight: 'normal', paddingBottom: '4px', width: '130px' }}>Matrícula</th>
            <th style={{ textAlign: 'left', fontWeight: 'normal', paddingBottom: '4px' }}>Nome do Servidor</th>
            <th style={{ textAlign: 'left', fontWeight: 'normal', paddingBottom: '4px', width: '105px' }}>Cargo</th>
          </tr>
          <tr>
            <td colSpan={3} style={{ borderTop: '1px solid #000', paddingBottom: '2px' }} />
          </tr>
        </thead>
        <tbody>
          {selectedProfs.map((p) => (
            <tr key={p.id}>
              <td style={{ padding: '2px 0' }}>{p.matricula || '—'}</td>
              <td style={{ padding: '2px 0', textTransform: 'uppercase' }}>{p.nome}</td>
              <td style={{ padding: '2px 0' }}>{abbreviateCargo(p.cargo)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} style={{ borderTop: '1px solid #000', paddingTop: '4px' }} />
          </tr>
        </tbody>
      </table>

      {/* Footer — pushed to bottom, never split across pages */}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
        }}
      >
        {/* Left: stamp box */}
        <div
          style={{
            border: '1px solid #000',
            width: '300px',
            height: '150px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '10px',
            fontSize: '10pt',
            textAlign: 'center',
          }}
        >
          Carimbo / Assinatura do Responsável
        </div>

        {/* Right: receipt box */}
        <div
          style={{
            border: '1px solid #000',
            width: '300px',
            fontSize: '9pt',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ borderBottom: '1px solid #000', padding: '8px 8px 6px', textAlign: 'center' }}>
            <div>RECEBIDO NA UNIGEP GUARA EM</div>
            <div style={{ marginTop: '2px' }}>__________ / __________ / __________</div>
          </div>
          <div style={{ borderBottom: '1px solid #000', padding: '8px', textAlign: 'center' }}>
            ÀS __________ HORAS E __________ MINUTOS
          </div>
          <div style={{ display: 'flex', flex: 1, alignItems: 'flex-end', padding: '0 8px 8px', gap: '12px' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000', paddingTop: '2px', marginTop: '24px' }}>visto</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000', paddingTop: '2px', marginTop: '24px' }}>matrícula</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────

export const TimesheetDeliveryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  profissionais,
  initialMonth,
  initialYear,
}) => {
  const [vinculo, setVinculo] = useState<Vinculo>('EFETIVOS');
  const [sortBy, setSortBy] = useState<SortBy>('nome');
  const [filterMonth, setFilterMonth] = useState(initialMonth);
  const [filterYear, setFilterYear] = useState(initialYear);
  const [memoNum, setMemoNum] = useState('01');
  const [dataEmissao, setDataEmissao] = useState(todayLabel);
  const [selectedCargoFilters, setSelectedCargoFilters] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setFilterMonth(initialMonth);
      setFilterYear(initialYear);
      setSelectedIds(new Set());
      setSelectedCargoFilters(new Set());
      setVinculo('EFETIVOS');
      setSortBy('nome');
    }
  }, [isOpen, initialMonth, initialYear]);

  // Filter by vínculo (apenas profissionais ativos)
  const profsByVinculo = useMemo(() => {
    return profissionais.filter((p) => {
      if (p.status === 'INATIVO') return false;
      const isTemp = (p.cargo || '').toUpperCase().includes('TEMP');
      return vinculo === 'TEMPORARIOS' ? isTemp : !isTemp;
    });
  }, [profissionais, vinculo]);

  // Filter by selected cargo (multi)
  const filtered = useMemo(() => {
    if (selectedCargoFilters.size === 0) return profsByVinculo;
    return profsByVinculo.filter((p) => {
      const cargoUp = (p.cargo || '').toUpperCase();
      return [...selectedCargoFilters].some((f) => cargoUp.includes(f));
    });
  }, [profsByVinculo, selectedCargoFilters]);

  // Sorted by selected sort order
  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => compareProf(a, b, sortBy));
  }, [filtered, sortBy]);

  // Only selected, sorted
  const selectedProfs = useMemo(() => {
    return sortedFiltered.filter((p) => selectedIds.has(p.id));
  }, [sortedFiltered, selectedIds]);

  const allFilteredSelected =
    sortedFiltered.length > 0 && sortedFiltered.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        sortedFiltered.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        sortedFiltered.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCargoFilter = (key: string) => {
    setSelectedCargoFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    // Clear selection on filter change to avoid stale picks
    setSelectedIds(new Set());
  };

  const handleVinculoChange = (v: Vinculo) => {
    setVinculo(v);
    setSelectedIds(new Set());
    setSelectedCargoFilters(new Set());
  };

  const mesLabel = MONTHS[filterMonth];

  if (!isOpen) return null;

  return (
    <>
      {/* ── Modal UI (hidden when printing) ── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 no-print">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col max-h-[92vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-stone-700" />
              <h2 className="text-lg font-bold text-stone-900">Entrega de Folhas de Ponto</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-500 hover:bg-stone-100 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-end gap-4 px-6 py-4 border-b border-stone-100 bg-stone-50/50">
            {/* Vínculo toggle */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Vínculo</label>
              <div className="flex rounded-lg overflow-hidden border border-stone-200">
                <button
                  onClick={() => handleVinculoChange('EFETIVOS')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    vinculo === 'EFETIVOS'
                      ? 'bg-stone-900 text-white'
                      : 'bg-white text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Efetivos
                </button>
                <button
                  onClick={() => handleVinculoChange('TEMPORARIOS')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-l border-stone-200 ${
                    vinculo === 'TEMPORARIOS'
                      ? 'bg-stone-900 text-white'
                      : 'bg-white text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Temporários
                </button>
              </div>
            </div>

            {/* Ordenação */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Ordenação</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 font-medium text-stone-700"
              >
                <option value="nome">Ordem Alfabética</option>
                <option value="matricula">Ordem de Matrícula</option>
              </select>
            </div>

            {/* Mês */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Mês</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(Number(e.target.value))}
                className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
            </div>

            {/* Ano */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Ano</label>
              <input
                type="number"
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm w-24 focus:outline-none focus:ring-2 focus:ring-stone-200"
              />
            </div>

            {/* MEMO nº */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">MEMO nº</label>
              <input
                type="text"
                value={memoNum}
                onChange={(e) => setMemoNum(e.target.value)}
                className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm w-20 focus:outline-none focus:ring-2 focus:ring-stone-200"
              />
            </div>

            {/* Data de emissão */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Data</label>
              <input
                type="text"
                value={dataEmissao}
                onChange={(e) => setDataEmissao(e.target.value)}
                className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm w-60 focus:outline-none focus:ring-2 focus:ring-stone-200"
              />
            </div>

            {/* Print button */}
            <div className="ml-auto flex items-end">
              <button
                onClick={() => window.print()}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-700 transition-all h-[38px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4" />
                Imprimir ({selectedIds.size})
              </button>
            </div>
          </div>

          {/* Body: cargo filters + professional list */}
          <div className="flex flex-1 min-h-0">
            {/* Cargo filter sidebar (only for EFETIVOS) */}
            {vinculo === 'EFETIVOS' && (
              <div className="w-52 border-r border-stone-100 px-4 py-4 flex-shrink-0 bg-stone-50/30">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">Cargo</p>
                <div className="space-y-2.5">
                  {CARGO_FILTERS_EFETIVO.map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center gap-2 cursor-pointer text-sm text-stone-700 hover:text-stone-900"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCargoFilters.has(f.key)}
                        onChange={() => toggleCargoFilter(f.key)}
                        className="w-4 h-4 accent-stone-800"
                      />
                      <span>{f.label}</span>
                    </label>
                  ))}
                  {selectedCargoFilters.size > 0 && (
                    <button
                      onClick={() => {
                        setSelectedCargoFilters(new Set());
                        setSelectedIds(new Set());
                      }}
                      className="mt-2 text-xs text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Professional list */}
            <div className="flex flex-col flex-1 min-h-0">
              {/* Select all row */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-stone-100">
                <button
                  onClick={toggleSelectAll}
                  disabled={sortedFiltered.length === 0}
                  className="flex items-center gap-2 text-sm font-medium text-stone-700 hover:text-stone-900 disabled:opacity-50"
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="w-4 h-4 text-stone-800" />
                  ) : (
                    <Square className="w-4 h-4 text-stone-400" />
                  )}
                  Selecionar todos ({sortedFiltered.length})
                </button>
                {selectedIds.size > 0 && (
                  <span className="text-xs text-stone-500 ml-auto">
                    {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Scrollable list */}
              <div className="overflow-y-auto flex-1 px-4 py-2">
                {sortedFiltered.length === 0 ? (
                  <p className="text-sm text-stone-400 py-6 text-center">
                    Nenhum profissional encontrado para este vínculo/filtro.
                  </p>
                ) : (
                  <ul className="divide-y divide-stone-100">
                    {sortedFiltered.map((p) => (
                      <li key={p.id}>
                        <label className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-stone-50 -mx-2 px-2 rounded-lg">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleOne(p.id)}
                            className="w-4 h-4 accent-stone-800"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-900 truncate">{p.nome}</p>
                            <p className="text-xs text-stone-500">
                              {abbreviateCargo(p.cargo)}
                              {p.matricula ? ` · ${p.matricula}` : ''}
                            </p>
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200">
            <button
              onClick={() => setSelectedIds(new Set())}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-all disabled:opacity-50"
            >
              Limpar Seleção
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* ── Print content — hidden on screen, rendered when printing ── */}
      <div className="hidden print:block">
        <PrintDocument
          vinculo={vinculo}
          mesLabel={mesLabel}
          filterYear={filterYear}
          memoNum={memoNum}
          dataEmissao={dataEmissao}
          selectedProfs={selectedProfs}
        />
      </div>
    </>
  );
};
