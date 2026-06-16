import React, { useState, useMemo, useEffect } from 'react';
import { X, CornerUpLeft, Printer } from 'lucide-react';
import { MONTHS } from '../types';
import logoSrc from '../logo.png';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profissional {
  id: number;
  nome: string;
  matricula: string;
  cargo: string;
  carga_horaria?: string | number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profissionais: Profissional[];
  initialMonth: number;
  initialYear: number;
}

type Vinculo = 'EFETIVOS' | 'TEMPORARIOS';

// ─── Constants ────────────────────────────────────────────────────────────────

const CARGO_FILTERS_EFETIVO = [
  { key: 'ANA.POL.PUB', label: 'ANA.POL.PUB.G.E' },
  { key: 'PEDAGOGO', label: 'PEDAGOGO' },
  { key: 'PROFESSOR DE EDUC. BASICA', label: 'PROF. DE EDUC. BÁSICA' },
];

const MOTIVOS_DEVOLUCAO = [
  { codigo: '008', label: 'LOTACAO PROVISORIA' },
  { codigo: '024', label: 'PERMUTA' },
  { codigo: '025', label: 'AMPLIACAO DE CARGA HORARIA' },
  { codigo: '028', label: 'REDUCAO DE CARGA HORARIA' },
  { codigo: '033', label: 'CONCESSAO DE CARGA HORARIA-CAE' },
  { codigo: '034', label: 'REVERSAO DE CARGA HORARIA-CAE' },
  { codigo: '035', label: 'CANCELAMENTO 40 HS - CAE' },
  { codigo: '036', label: 'CONC. C. HORARIA-CAE (C.COMISSIO)' },
  { codigo: '038', label: 'INGRESSO NO CARGO - PROVISORIO' },
  { codigo: '100', label: 'Lotação Definitiva Sede' },
  { codigo: '101', label: 'Lotação Definitiva Plano Piloto' },
  { codigo: '102', label: 'Lotação Definitiva Brazlândia' },
  { codigo: '103', label: 'Lotação Definitiva Ceilândia' },
  { codigo: '104', label: 'Lotação Definitiva Gama' },
  { codigo: '105', label: 'Lotação Definitiva Guará' },
  { codigo: '106', label: 'Lotação Definitiva Núcleo Bandeirante' },
  { codigo: '107', label: 'Lotação Definitiva Planaltina' },
  { codigo: '108', label: 'Lotação Definitiva Sobradinho' },
  { codigo: '109', label: 'Lotação Definitiva Taguatinga' },
  { codigo: '110', label: 'Lotação Definitiva Samambaia' },
  { codigo: '111', label: 'Lotação Definitiva Paranoá' },
  { codigo: '112', label: 'Lotação Definitiva Santa Maria' },
  { codigo: '113', label: 'Lotação Definitiva São Sebastião' },
  { codigo: '114', label: 'Lotação Definitiva Recanto das Emas' },
  { codigo: '171', label: 'CANCELAMENTO CONCURSO REMOCAO' },
  { codigo: '000', label: 'A PEDIDO' },
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
  const first = (cargo || '').split(' ')[0];
  return first || cargo;
}

function todayLabel(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')} de ${MONTH_NAMES_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

// ─── Form Data Interface ──────────────────────────────────────────────────────

interface MemoFormData {
  admissao: string;
  ultimoDia: string;
  carga: string;
  turno: string;
  abonoPossuiDias: string;
  abonoEstenso: string;
  abonoUsufruiu: 'nao_usufruiu' | 'usufruiu' | 'nao_faz_jus';
  ltsDias: string;
  ltsEstenso: string;
  ltsUsufruiu: 'nao_usufruiu' | 'usufruiu';
  treDias: string;
  treEstenso: string;
  treUsufruiu: boolean;
  motivoCodigo: string;
  motivoLabel: string;
  observacoes: string;
}

// ─── Print Document — fiel ao MemoDevolucao.pdf ───────────────────────────────

const PrintDocument: React.FC<{
  profissional: Profissional | null;
  memoNum: string;
  dataEmissao: string;
  form: MemoFormData;
}> = ({ profissional, memoNum, dataEmissao, form }) => {
  if (!profissional) return null;

  const motivoTexto = form.motivoCodigo
    ? `${form.motivoLabel} (${form.motivoCodigo})`
    : '___________________';

  const ck = (v: boolean) => v ? 'X' : ' ';
  const writtenDays = (n: string, ext: string) =>
    `${n || '01'}  ( ${ext || '            '} )`;

  const carga1 = form.carga === '1' || form.carga === 'ambos';
  const carga2 = form.carga === '2' || form.carga === 'ambos';
  const turnoMat = form.turno === '1' || form.turno === 'ambos';
  const turnoVesp = form.turno === '2' || form.turno === 'ambos';
  const turnoNot = form.turno === 'noturno';

  // Shared cell style
  const B = '1px solid #000';
  const cell = (extra?: React.CSSProperties): React.CSSProperties => ({
    border: B,
    padding: '3px 5px',
    fontSize: '9pt',
    fontFamily: 'Arial, Helvetica, sans-serif',
    verticalAlign: 'top',
    color: '#000',
    ...extra,
  });
  const lbl: React.CSSProperties = {
    display: 'block',
    fontSize: '7.5pt',
    marginBottom: '1px',
  };

  return (
    <div
      className="delivery-print-page"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '10mm 14mm 10mm 14mm',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '10pt',
        color: '#000',
        background: '#fff',
        boxSizing: 'border-box',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '18%' }} />
          <col style={{ width: '42%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '23%' }} />
        </colgroup>
        <tbody>

          {/* ── Row 1: Logo + Título + MEMO info (mesma célula) ── */}
          <tr>
            <td colSpan={4} style={cell({ padding: '0' })}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    {/* Logo */}
                    <td rowSpan={2} style={{ width: '80px', textAlign: 'center', verticalAlign: 'middle', padding: '6px 8px', border: 'none' }}>
                      <img
                        src={logoSrc}
                        alt="Logo GDF"
                        style={{ width: '62px', height: '62px', objectFit: 'contain' }}
                      />
                    </td>
                    {/* Título */}
                    <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13pt', padding: '8px 8px 2px 8px', border: 'none' }}>
                      Memorando de Devolução
                    </td>
                  </tr>
                  <tr>
                    {/* MEMO nº / Guará / data — abaixo do título, na mesma coluna do logo */}
                    <td style={{ fontSize: '9pt', padding: '2px 8px 6px 8px', border: 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>MEMO nº&nbsp;&nbsp;{memoNum}</span>
                        <span>Guará</span>
                        <span>-DF, {dataEmissao}.</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* ── Row 2: Nome da escola ── */}
          <tr>
            <td colSpan={4} style={cell({ fontSize: '9pt' })}>
              CENTRO DE EDUCAÇÃO PROFISSIONAL ESCOLA TÉCNICA DO GUARÁ PROFESSORA
            </td>
          </tr>

          {/* ── Row 3: Ao(À) | Código ── */}
          <tr>
            <td colSpan={3} style={cell({ fontSize: '9pt' })}>
              Ao(À) UNIDADE REGIONAL DE GESTÃO DE PESSOAS
            </td>
            <td style={cell({ fontSize: '9pt', whiteSpace: 'nowrap' })}>
              Código: 990210000029
            </td>
          </tr>

          {/* ── Espaçamento intencional entre Ao(À) e Nome ── */}
          <tr>
            <td colSpan={4} style={{ height: '6px' }} />
          </tr>

          {/* ── Row 4: Nome (full width, bold) ── */}
          <tr>
            <td colSpan={4} style={cell({ paddingTop: '4px', paddingBottom: '4px' })}>
              <span style={lbl}>Nome</span>
              <strong style={{ fontSize: '10pt', textTransform: 'uppercase' }}>
                {profissional.nome}
              </strong>
            </td>
          </tr>

          {/* ── Row 6: Matrícula | Disciplina | Série | Cargo ── */}
          <tr>
            <td style={cell()}>
              <span style={lbl}>Matrícula</span>
              {profissional.matricula || '—'}
            </td>
            <td style={cell()}>
              <span style={lbl}>Disciplina</span>
              {profissional.cargo || '—'}
            </td>
            <td style={cell()}>
              <span style={lbl}>Série</span>
              &nbsp;
            </td>
            <td style={cell()}>
              <span style={lbl}>Cargo</span>
              {abbreviateCargo(profissional.cargo)}
            </td>
          </tr>

          {/* ── Row 7: Carga | Data Admissão | Turno ── */}
          <tr>
            <td style={cell()}>
              <span style={lbl}>Carga</span>
              1 ({ck(carga1)})&nbsp;&nbsp;2 ({ck(carga2)})
            </td>
            <td style={cell()}>
              <span style={lbl}>Data Admissão</span>
              {form.admissao || '___/___/______'}
            </td>
            <td colSpan={2} style={cell()}>
              <span style={lbl}>Turno</span>
              Mat. ({ck(turnoMat)})&nbsp;&nbsp;Vesp. ({ck(turnoVesp)})&nbsp;&nbsp;Not. ({ck(turnoNot)})
            </td>
          </tr>

          {/* ── Row 8: Informamos / Motivo ── */}
          <tr>
            <td colSpan={4} style={cell({ lineHeight: 1.7, padding: '5px 6px' })}>
              <div>
                Informamos que o último dia de frequência nesta unidade foi{' '}
                <strong>{form.ultimoDia || '___/___/______'}</strong>.
              </div>
              <div>
                Motivo: <strong>{motivoTexto}</strong>
              </div>
            </td>
          </tr>


        </tbody>
      </table>

      {/* ── Informamos ainda — caixa separada ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginTop: '8px' }}>
        <tbody>
          <tr>
            <td style={cell({ lineHeight: 1.9, padding: '6px 8px' })}>
              <div>Informamos ainda que:</div>
              <div style={{ marginTop: '4px' }}>
                ( {ck(form.abonoUsufruiu === 'nao_usufruiu')} ) Não usufruiu abono.
              </div>
              <div>
                ( {ck(form.abonoUsufruiu === 'usufruiu')} ) Usufruiu&nbsp;&nbsp;
                {writtenDays(form.abonoPossuiDias, form.abonoEstenso)} dia(s) de abono(s) - Lei Complementar&nbsp;840/2011.
              </div>
              <div>
                ( {ck(form.abonoUsufruiu === 'nao_faz_jus')} ) Não faz juz ao abono.
              </div>
              <div style={{ marginTop: '6px' }}>
                ( {ck(form.ltsUsufruiu === 'nao_usufruiu')} ) Não usufruiu LTS (Portaria n° 40 de 11/03/2011)
              </div>
              <div>
                ( {ck(form.ltsUsufruiu === 'usufruiu')} ) Usufruiu&nbsp;&nbsp;
                {writtenDays(form.ltsDias, form.ltsEstenso)} dia(s) de LTS (Portaria n° 40 de 11/03/2011)
              </div>
              <div style={{ marginTop: '6px' }}>
                ( {ck(form.treUsufruiu)} ) Usufruiu&nbsp;&nbsp;
                {writtenDays(form.treDias, form.treEstenso)} dia(s) do T.R.E.
              </div>
              {form.observacoes && (
                <div style={{ marginTop: '6px' }}>
                  <strong>Obs:</strong> {form.observacoes}
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Assinaturas — caixa separada ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginTop: '8px' }}>
        <tbody>
          <tr>
            <td style={cell({ height: '180px', textAlign: 'center', verticalAlign: 'bottom', padding: '0 8px 12px' })}>
              <div style={{ borderTop: '1px solid #000', width: '70%', margin: '0 auto 5px' }} />
              Assinatura do(a) Servidor(a)
            </td>
            <td style={cell({ height: '180px', textAlign: 'center', verticalAlign: 'bottom', padding: '0 8px 12px' })}>
              <div style={{ borderTop: '1px solid #000', width: '70%', margin: '0 auto 5px' }} />
              Carimbo e Assinatura do(a) Diretor(a)
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────

const emptyForm = (): MemoFormData => ({
  admissao: '',
  ultimoDia: '',
  carga: '1',
  turno: 'ambos',
  abonoPossuiDias: '',
  abonoEstenso: '',
  abonoUsufruiu: 'nao_usufruiu',
  ltsDias: '',
  ltsEstenso: '',
  ltsUsufruiu: 'nao_usufruiu',
  treDias: '',
  treEstenso: '',
  treUsufruiu: false,
  motivoCodigo: '',
  motivoLabel: '',
  observacoes: '',
});

export const ReturnMemoModal: React.FC<Props> = ({
  isOpen,
  onClose,
  profissionais,
  initialMonth,
  initialYear,
}) => {
  const [vinculo, setVinculo] = useState<Vinculo>('EFETIVOS');
  const [filterMonth, setFilterMonth] = useState(initialMonth);
  const [filterYear, setFilterYear] = useState(initialYear);
  const [memoNum, setMemoNum] = useState('01');
  const [dataEmissao, setDataEmissao] = useState(todayLabel);
  const [selectedCargoFilters, setSelectedCargoFilters] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<MemoFormData>(emptyForm());
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setFilterMonth(initialMonth);
      setFilterYear(initialYear);
      setSelectedId(null);
      setSelectedCargoFilters(new Set());
      setVinculo('EFETIVOS');
      setForm(emptyForm());
    }
  }, [isOpen, initialMonth, initialYear]);

  // Filter by vínculo
  const profsByVinculo = useMemo(() => {
    return profissionais.filter((p) => {
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

  // Sorted alphabetically
  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [filtered]);

  const selectedProf = useMemo(
    () => sortedFiltered.find((p) => p.id === selectedId) ?? null,
    [sortedFiltered, selectedId],
  );

  const toggleCargoFilter = (key: string) => {
    setSelectedCargoFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSelectedId(null);
  };

  const handleVinculoChange = (v: Vinculo) => {
    setVinculo(v);
    setSelectedId(null);
    setSelectedCargoFilters(new Set());
    setForm(emptyForm());
  };

  const handleSelectProf = (id: number) => {
    setSelectedId(id);
    setForm(emptyForm());
  };

  const handleMotivoChange = (codigo: string) => {
    const m = MOTIVOS_DEVOLUCAO.find((m) => m.codigo === codigo);
    setForm((prev) => ({ ...prev, motivoCodigo: codigo, motivoLabel: m?.label ?? '' }));
  };

  const updateForm = (patch: Partial<MemoFormData>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const maskDate = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const parseDate = (str: string): Date | null => {
    const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (isNaN(d.getTime())) return null;
    if (d.getDate() !== Number(m[1])) return null; // rejeita 31/02 etc
    return d;
  };

  const validateDates = (admissao: string, ultimoDia: string) => {
    const anoAtual = new Date().getFullYear();
    const dAdm = parseDate(admissao);
    const dUlt = parseDate(ultimoDia);

    if (dUlt) {
      if (dUlt.getFullYear() !== anoAtual) {
        setAlertMsg(
          `Atenção: o último dia trabalhado (${ultimoDia}) está em ${dUlt.getFullYear()}, ` +
          `diferente do ano atual (${anoAtual}). Verifique se a data está correta.`
        );
        return;
      }
      if (dUlt > new Date()) {
        setAlertMsg(
          `Atenção: o último dia trabalhado (${ultimoDia}) é uma data futura. Verifique se a data está correta.`
        );
        return;
      }
    }

    if (dAdm && dUlt) {
      if (dUlt < dAdm) {
        setAlertMsg(
          `Inconsistência: o último dia trabalhado (${ultimoDia}) é anterior à data de admissão (${admissao}). Verifique os dados.`
        );
        return;
      }
      const diffAnos = dUlt.getFullYear() - dAdm.getFullYear();
      if (diffAnos > 50) {
        setAlertMsg(
          `Atenção: há mais de 50 anos entre a admissão (${admissao}) e o último dia trabalhado (${ultimoDia}). Confirme se os dados estão corretos.`
        );
        return;
      }
    }

    if (dAdm && dAdm > new Date()) {
      setAlertMsg(
        `Atenção: a data de admissão (${admissao}) é uma data futura. Verifique se está correta.`
      );
      return;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ── Modal UI (hidden when printing) ── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 no-print">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 flex flex-col max-h-[92vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <CornerUpLeft className="w-5 h-5 text-stone-700" />
              <h2 className="text-lg font-bold text-stone-900">Memorando de Devolução</h2>
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
                disabled={selectedId === null}
                className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-700 transition-all h-[38px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Cargo filter sidebar (only for EFETIVOS) */}
            {vinculo === 'EFETIVOS' && (
              <div className="w-48 border-r border-stone-100 px-4 py-4 flex-shrink-0 bg-stone-50/30 overflow-y-auto">
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
                      onClick={() => { setSelectedCargoFilters(new Set()); setSelectedId(null); }}
                      className="mt-2 text-xs text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Left: professional list */}
            <div className="w-64 flex-shrink-0 border-r border-stone-100 flex flex-col min-h-0">
              <div className="px-4 py-2.5 border-b border-stone-100 bg-stone-50/50">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Profissional ({sortedFiltered.length})
                </p>
              </div>
              <div className="overflow-y-auto flex-1 px-3 py-2">
                {sortedFiltered.length === 0 ? (
                  <p className="text-sm text-stone-400 py-6 text-center">
                    Nenhum profissional encontrado.
                  </p>
                ) : (
                  <ul className="divide-y divide-stone-100">
                    {sortedFiltered.map((p) => (
                      <li key={p.id}>
                        <label className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-stone-50 -mx-1 px-1 rounded-lg">
                          <input
                            type="radio"
                            name="selectedProf"
                            checked={selectedId === p.id}
                            onChange={() => handleSelectProf(p.id)}
                            className="w-4 h-4 accent-stone-800 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-900 truncate">{p.nome}</p>
                            <p className="text-xs text-stone-500 truncate">
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

            {/* Right: form fields */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {selectedProf ? (
                <div className="space-y-4">
                  {/* Read-only info */}
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Servidor Selecionado</p>
                    <p className="text-sm font-semibold text-stone-900 uppercase">{selectedProf.nome}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{selectedProf.cargo} · Matrícula: {selectedProf.matricula || '—'}</p>
                  </div>

                  {/* Grid of fields */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Admissão */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Data de Admissão</label>
                      <input
                        type="text"
                        placeholder="dd/mm/aaaa"
                        value={form.admissao}
                        onChange={(e) => updateForm({ admissao: maskDate(e.target.value) })}
                        onBlur={(e) => validateDates(e.target.value, form.ultimoDia)}
                        className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200"
                      />
                    </div>

                    {/* Último dia */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Último Dia Trabalhado</label>
                      <input
                        type="text"
                        placeholder="dd/mm/aaaa"
                        value={form.ultimoDia}
                        onChange={(e) => updateForm({ ultimoDia: maskDate(e.target.value) })}
                        onBlur={(e) => validateDates(form.admissao, e.target.value)}
                        className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200"
                      />
                    </div>

                    {/* Carga */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Carga</label>
                      <select
                        value={form.carga}
                        onChange={(e) => updateForm({ carga: e.target.value })}
                        className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200"
                      >
                        <option value="1">1 — 20h</option>
                        <option value="2">2 — 40h</option>
                        <option value="ambos">Ambas (1 e 2)</option>
                      </select>
                    </div>

                    {/* Turno */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Turno</label>
                      <select
                        value={form.turno}
                        onChange={(e) => updateForm({ turno: e.target.value })}
                        className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200"
                      >
                        <option value="ambos">Matutino / Vespertino</option>
                        <option value="1">Matutino</option>
                        <option value="2">Vespertino</option>
                        <option value="noturno">Noturno</option>
                      </select>
                    </div>
                  </div>

                  {/* Motivo */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Motivo da Devolução</label>
                    <select
                      value={form.motivoCodigo}
                      onChange={(e) => handleMotivoChange(e.target.value)}
                      className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200"
                    >
                      <option value="">Selecione o motivo...</option>
                      {MOTIVOS_DEVOLUCAO.map((m) => (
                        <option key={m.codigo} value={m.codigo}>
                          {m.codigo} — {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-stone-100 pt-3">
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">Abono / LTS / TRE</p>

                    {/* Abono */}
                    <div className="mb-3">
                      <label className="text-xs font-medium text-stone-600 mb-1.5 block">Abono (Lei Complementar 840/2011)</label>
                      <div className="flex flex-wrap items-center gap-3">
                        {[
                          { value: 'nao_usufruiu', label: 'Não usufruiu' },
                          { value: 'nao_faz_jus', label: 'Não faz jus' },
                          { value: 'usufruiu', label: 'Usufruiu' },
                        ].map((opt) => (
                          <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer text-sm text-stone-700">
                            <input
                              type="radio"
                              name="abonoUsufruiu"
                              checked={form.abonoUsufruiu === opt.value}
                              onChange={() => updateForm({ abonoUsufruiu: opt.value as MemoFormData['abonoUsufruiu'] })}
                              className="w-3.5 h-3.5 accent-stone-800"
                            />
                            {opt.label}
                          </label>
                        ))}
                        {form.abonoUsufruiu === 'usufruiu' && (
                          <>
                            <input
                              type="text"
                              value={form.abonoPossuiDias}
                              onChange={(e) => updateForm({ abonoPossuiDias: e.target.value })}
                              placeholder="Nº dias (ex: 01)"
                              className="w-28 px-2 py-1 bg-white border border-stone-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-stone-300"
                            />
                            <input
                              type="text"
                              value={form.abonoEstenso}
                              onChange={(e) => updateForm({ abonoEstenso: e.target.value })}
                              placeholder="Por extenso (ex: um)"
                              className="w-36 px-2 py-1 bg-white border border-stone-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-stone-300"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {/* LTS */}
                    <div className="mb-3">
                      <label className="text-xs font-medium text-stone-600 mb-1.5 block">LTS (Portaria n° 40 de 11/03/2011)</label>
                      <div className="flex flex-wrap items-center gap-3">
                        {[
                          { value: 'nao_usufruiu', label: 'Não usufruiu' },
                          { value: 'usufruiu', label: 'Usufruiu' },
                        ].map((opt) => (
                          <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer text-sm text-stone-700">
                            <input
                              type="radio"
                              name="ltsUsufruiu"
                              checked={form.ltsUsufruiu === opt.value}
                              onChange={() => updateForm({ ltsUsufruiu: opt.value as MemoFormData['ltsUsufruiu'] })}
                              className="w-3.5 h-3.5 accent-stone-800"
                            />
                            {opt.label}
                          </label>
                        ))}
                        {form.ltsUsufruiu === 'usufruiu' && (
                          <>
                            <input
                              type="text"
                              value={form.ltsDias}
                              onChange={(e) => updateForm({ ltsDias: e.target.value })}
                              placeholder="Nº dias (ex: 01)"
                              className="w-28 px-2 py-1 bg-white border border-stone-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-stone-300"
                            />
                            <input
                              type="text"
                              value={form.ltsEstenso}
                              onChange={(e) => updateForm({ ltsEstenso: e.target.value })}
                              placeholder="Por extenso (ex: um)"
                              className="w-36 px-2 py-1 bg-white border border-stone-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-stone-300"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {/* TRE */}
                    <div className="mb-1">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-stone-700">
                        <input
                          type="checkbox"
                          checked={form.treUsufruiu}
                          onChange={(e) => updateForm({ treUsufruiu: e.target.checked })}
                          className="w-4 h-4 accent-stone-800"
                        />
                        <span className="text-xs font-medium text-stone-600 uppercase tracking-wider">Usufruiu TRE</span>
                      </label>
                      {form.treUsufruiu && (
                        <div className="flex gap-2 mt-1.5">
                          <input
                            type="text"
                            value={form.treDias}
                            onChange={(e) => updateForm({ treDias: e.target.value })}
                            placeholder="Nº dias (ex: 01)"
                            className="w-28 px-2 py-1 bg-white border border-stone-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-stone-300"
                          />
                          <input
                            type="text"
                            value={form.treEstenso}
                            onChange={(e) => updateForm({ treEstenso: e.target.value })}
                            placeholder="Por extenso (ex: um)"
                            className="w-36 px-2 py-1 bg-white border border-stone-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-stone-300"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Observações */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Observações</label>
                    <textarea
                      rows={2}
                      value={form.observacoes}
                      onChange={(e) => updateForm({ observacoes: e.target.value })}
                      className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 resize-none"
                      placeholder="Informações adicionais..."
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center">
                  <div>
                    <CornerUpLeft className="w-10 h-10 text-stone-200 mx-auto mb-3" />
                    <p className="text-sm text-stone-400">
                      Selecione um profissional na lista<br />para preencher o memorando.
                    </p>
                  </div>
                </div>
              )}
            </div>
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

      {/* ── Modal de alerta de datas ── */}
      {alertMsg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-100 bg-amber-50">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span className="font-semibold text-amber-800 text-sm">Verificação de Datas</span>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-stone-700 leading-relaxed">{alertMsg}</p>
            </div>
            <div className="flex justify-end px-5 pb-4">
              <button
                onClick={() => setAlertMsg(null)}
                className="px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-700 transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Print content — hidden on screen, rendered when printing ── */}
      <div className="hidden print:block">
        <PrintDocument
          profissional={selectedProf}
          memoNum={memoNum}
          dataEmissao={dataEmissao}
          form={form}
        />
      </div>
    </>
  );
};
