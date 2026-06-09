import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Trash2, CheckCircle2, RotateCcw, Coffee } from 'lucide-react';
import { MONTHS } from '../types';
import { apiService } from '../services/api';

export interface Holiday {
  id: number | string;
  day: number;
  month: number;
  year: number;
  label: string;
}

export interface Recesso {
  id: number | string;
  dayInicio: number;
  monthInicio: number;
  yearInicio: number;
  dayFim: number;
  monthFim: number;
  yearFim: number;
  label: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApply: (holiday: Holiday) => void;
  onRemoveEffect: (holiday: Holiday) => void;
  onApplyRecesso: (recesso: Recesso) => void;
  onRemoveRecessoEffect: (recesso: Recesso) => void;
  currentMonth: number;
  currentYear: number;
}

export const HolidayModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onApply,
  onRemoveEffect,
  onApplyRecesso,
  onRemoveRecessoEffect,
  currentMonth,
  currentYear
}) => {
  const [activeTab, setActiveTab] = useState<'feriados' | 'recessos'>('feriados');

  // Feriados state
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [day, setDay] = useState<number>(1);
  const [month, setMonth] = useState<number>(currentMonth);
  const [year, setYear] = useState<number>(currentYear);
  const [label, setLabel] = useState('FERIADO');
  const [isLoading, setIsLoading] = useState(false);

  // Recessos state
  const [recessos, setRecessos] = useState<Recesso[]>([]);
  const [rDayInicio, setRDayInicio] = useState<number>(1);
  const [rMonthInicio, setRMonthInicio] = useState<number>(currentMonth);
  const [rYearInicio, setRYearInicio] = useState<number>(currentYear);
  const [rDayFim, setRDayFim] = useState<number>(1);
  const [rMonthFim, setRMonthFim] = useState<number>(currentMonth);
  const [rYearFim, setRYearFim] = useState<number>(currentYear);
  const [rLabel, setRLabel] = useState('RECESSO');
  const [isLoadingRecessos, setIsLoadingRecessos] = useState(false);

  const loadHolidays = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getFeriados(currentYear);
      setHolidays(data.map((h: any) => ({
        id: h.id,
        day: h.dia,
        month: h.mes,
        year: h.ano,
        label: h.label
      })));
    } catch (e) {
      console.error('Error loading holidays', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecessos = async () => {
    try {
      setIsLoadingRecessos(true);
      const data = await apiService.getRecessos(currentYear);
      setRecessos(data.map((r: any) => ({
        id: r.id,
        dayInicio: r.dia_inicio,
        monthInicio: r.mes_inicio,
        yearInicio: r.ano_inicio,
        dayFim: r.dia_fim,
        monthFim: r.mes_fim,
        yearFim: r.ano_fim,
        label: r.label
      })));
    } catch (e) {
      console.error('Error loading recessos', e);
    } finally {
      setIsLoadingRecessos(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setMonth(currentMonth);
      setYear(currentYear);
      setRMonthInicio(currentMonth);
      setRYearInicio(currentYear);
      setRMonthFim(currentMonth);
      setRYearFim(currentYear);
      loadHolidays();
      loadRecessos();
    }
  }, [isOpen, currentMonth, currentYear]);

  // Feriados handlers
  const handleAdd = async () => {
    if (!label.trim() || day < 1 || day > 31) return;
    try {
      const result = await apiService.createFeriado({
        dia: day,
        mes: month,
        ano: year,
        label: label.trim().toUpperCase()
      });
      const newHoliday: Holiday = {
        id: result.id,
        day,
        month,
        year,
        label: label.trim().toUpperCase()
      };
      setHolidays([...holidays, newHoliday]);
      setLabel('FERIADO');
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar feriado');
    }
  };

  const handleDelete = async (id: number | string) => {
    try {
      const holidayToRemove = holidays.find(h => h.id === id);
      if (holidayToRemove) {
        onRemoveEffect(holidayToRemove);
      }
      if (typeof id === 'number') {
        await apiService.deleteFeriado(id);
      }
      setHolidays(holidays.filter(h => h.id !== id));
    } catch (e: any) {
      alert(e.message || 'Erro ao excluir feriado');
    }
  };

  // Recessos handlers
  const handleAddRecesso = async () => {
    if (!rLabel.trim()) return;
    try {
      const result = await apiService.createRecesso({
        dia_inicio: rDayInicio,
        mes_inicio: rMonthInicio,
        ano_inicio: rYearInicio,
        dia_fim: rDayFim,
        mes_fim: rMonthFim,
        ano_fim: rYearFim,
        label: rLabel.trim().toUpperCase()
      });
      const newRecesso: Recesso = {
        id: result.id,
        dayInicio: rDayInicio,
        monthInicio: rMonthInicio,
        yearInicio: rYearInicio,
        dayFim: rDayFim,
        monthFim: rMonthFim,
        yearFim: rYearFim,
        label: rLabel.trim().toUpperCase()
      };
      setRecessos([...recessos, newRecesso]);
      setRLabel('RECESSO');
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar recesso');
    }
  };

  const handleDeleteRecesso = async (id: number | string) => {
    try {
      const recessoToRemove = recessos.find(r => r.id === id);
      if (recessoToRemove) {
        onRemoveRecessoEffect(recessoToRemove);
      }
      if (typeof id === 'number') {
        await apiService.deleteRecesso(id);
      }
      setRecessos(recessos.filter(r => r.id !== id));
    } catch (e: any) {
      alert(e.message || 'Erro ao excluir recesso');
    }
  };

  const filteredHolidays = holidays.filter(h => h.year === year).sort((a, b) => {
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  });

  const filteredRecessos = recessos
    .filter(r => r.yearInicio === currentYear || r.yearFim === currentYear)
    .sort((a, b) => {
      if (a.monthInicio !== b.monthInicio) return a.monthInicio - b.monthInicio;
      return a.dayInicio - b.dayInicio;
    });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-stone-700" />
            <h2 className="text-lg font-bold text-stone-900">Datas Especiais</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:bg-stone-100 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 pb-0 border-b border-stone-200">
          <button
            onClick={() => setActiveTab('feriados')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 transition-all ${
              activeTab === 'feriados'
                ? 'bg-white border-stone-200 text-stone-900 -mb-px z-10'
                : 'bg-stone-50 border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Feriados
          </button>
          <button
            onClick={() => setActiveTab('recessos')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 transition-all ${
              activeTab === 'recessos'
                ? 'bg-white border-stone-200 text-stone-900 -mb-px z-10'
                : 'bg-stone-50 border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <Coffee className="w-4 h-4" />
            Recessos
          </button>
        </div>

        {/* ── ABA FERIADOS ── */}
        {activeTab === 'feriados' && (
          <>
            <div className="flex flex-wrap items-end gap-3 px-6 py-4 border-b border-stone-100 bg-stone-50">
              <div className="flex flex-col gap-1 w-16">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Dia</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                  className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Mês</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 w-24">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Ano</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200"
                />
              </div>
              <div className="flex flex-col gap-1 flex-[2] min-w-[200px]">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Nome do Feriado</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: FERIADO - NATAL"
                  className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 uppercase"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={!label.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-all h-[38px]"
              >
                <Plus className="w-4 h-4" />
                Incluir
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 relative">
              {isLoading && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                  <div className="animate-spin w-6 h-6 border-2 border-stone-300 border-t-stone-600 rounded-full"></div>
                </div>
              )}
              <h3 className="text-sm font-medium text-stone-700 mb-3">Feriados Cadastrados em {year}</h3>

              {filteredHolidays.length === 0 ? (
                <p className="text-sm text-stone-400 py-4 text-center border border-dashed border-stone-200 rounded-lg">
                  Nenhum feriado cadastrado para o ano de {year}.
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredHolidays.map((h) => (
                    <li key={h.id} className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-lg hover:border-stone-300 transition-all">
                      <div>
                        <p className="text-sm font-medium text-stone-900">
                          {String(h.day).padStart(2, '0')} de {MONTHS[h.month]}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5">{h.label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onApply(h)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md text-xs font-medium transition-colors"
                          title="Aplicar este feriado na folha atual"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aplicar
                        </button>
                        <button
                          onClick={() => onRemoveEffect(h)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md text-xs font-medium transition-colors"
                          title="Remover efeito deste feriado na folha atual"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reverter
                        </button>
                        <div className="w-px h-5 bg-stone-200 mx-1"></div>
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Excluir feriado"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {/* ── ABA RECESSOS ── */}
        {activeTab === 'recessos' && (
          <>
            {/* Formulário */}
            <div className="flex flex-col gap-3 px-6 py-4 border-b border-stone-100 bg-stone-50">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Início</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={rDayInicio}
                      onChange={(e) => setRDayInicio(Number(e.target.value))}
                      placeholder="Dia"
                      className="w-16 px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200"
                    />
                    <select
                      value={rMonthInicio}
                      onChange={(e) => setRMonthInicio(Number(e.target.value))}
                      className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200"
                    >
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i}>{m}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={rYearInicio}
                      onChange={(e) => setRYearInicio(Number(e.target.value))}
                      className="w-24 px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Fim</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={rDayFim}
                      onChange={(e) => setRDayFim(Number(e.target.value))}
                      placeholder="Dia"
                      className="w-16 px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200"
                    />
                    <select
                      value={rMonthFim}
                      onChange={(e) => setRMonthFim(Number(e.target.value))}
                      className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200"
                    >
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i}>{m}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={rYearFim}
                      onChange={(e) => setRYearFim(Number(e.target.value))}
                      className="w-24 px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Nome do Recesso</label>
                  <input
                    type="text"
                    value={rLabel}
                    onChange={(e) => setRLabel(e.target.value)}
                    placeholder="Ex: RECESSO DE FIM DE ANO"
                    className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 uppercase"
                  />
                </div>
                <button
                  onClick={handleAddRecesso}
                  disabled={!rLabel.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-all h-[38px]"
                >
                  <Plus className="w-4 h-4" />
                  Incluir
                </button>
              </div>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1 px-6 py-4 relative">
              {isLoadingRecessos && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                  <div className="animate-spin w-6 h-6 border-2 border-stone-300 border-t-stone-600 rounded-full"></div>
                </div>
              )}
              <h3 className="text-sm font-medium text-stone-700 mb-3">Recessos Cadastrados em {currentYear}</h3>

              {filteredRecessos.length === 0 ? (
                <p className="text-sm text-stone-400 py-4 text-center border border-dashed border-stone-200 rounded-lg">
                  Nenhum recesso cadastrado para o ano de {currentYear}.
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredRecessos.map((r) => (
                    <li key={r.id} className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-lg hover:border-stone-300 transition-all">
                      <div>
                        <p className="text-sm font-medium text-stone-900">
                          {String(r.dayInicio).padStart(2, '0')} de {MONTHS[r.monthInicio]} de {r.yearInicio}
                          {' → '}
                          {String(r.dayFim).padStart(2, '0')} de {MONTHS[r.monthFim]} de {r.yearFim}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5">{r.label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onApplyRecesso(r)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md text-xs font-medium transition-colors"
                          title="Aplicar recesso na folha atual"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aplicar
                        </button>
                        <button
                          onClick={() => onRemoveRecessoEffect(r)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md text-xs font-medium transition-colors"
                          title="Reverter efeito do recesso na folha atual"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reverter
                        </button>
                        <div className="w-px h-5 bg-stone-200 mx-1"></div>
                        <button
                          onClick={() => handleDeleteRecesso(r.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Excluir recesso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

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
