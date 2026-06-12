import React, { useState, useMemo, useEffect } from 'react';
import { X, Printer, CheckSquare, Square, Users } from 'lucide-react';
import { MONTHS } from '../types';
import { Recesso } from './HolidayModal';
import { apiService } from '../services/api';

interface Profissional {
  id: number;
  nome: string;
  matricula: string;
  cargo: string;
  carga_horaria?: string | number;
}

interface Props {
  isOpen: boolean;
  profissionais: Profissional[];
  onClose: () => void;
  onGenerate: (selectedIds: number[], mes: number, ano: number, selectedRecessos: Recesso[]) => void;
  onPrintOnly?: (selectedIds: number[], mes: number, ano: number) => void;
  isGenerating: boolean;
  progress?: { current: number; total: number; currentName: string };
}

export const BatchTimesheetModal: React.FC<Props> = ({
  isOpen,
  profissionais,
  onClose,
  onGenerate,
  onPrintOnly,
  isGenerating,
  progress,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [cargoFilter, setCargoFilter] = useState('TODOS');
  const [chFilter, setChFilter] = useState('TODAS');
  const [selectedMes, setSelectedMes] = useState(new Date().getMonth());
  const [selectedAno, setSelectedAno] = useState(new Date().getFullYear());
  const [recessos, setRecessos] = useState<Recesso[]>([]);
  const [selectedRecessoIds, setSelectedRecessoIds] = useState<Set<number | string>>(new Set());

  const isSingleDay = (r: Recesso) =>
    r.dayInicio === r.dayFim &&
    r.monthInicio === r.monthFim &&
    r.yearInicio === r.yearFim;

  // Reiniciar seleção ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setCargoFilter('TODOS');
      setChFilter('TODAS');
      setSelectedRecessoIds(new Set());
      setRecessos([]);
    }
  }, [isOpen]);

  // Buscar recessos ao abrir o modal
  useEffect(() => {
    if (!isOpen) {
      setRecessos([]);
      setSelectedRecessoIds(new Set());
      return;
    }
    apiService.getRecessos(selectedAno).then((data: any[]) => {
      setRecessos(data.map((r: any) => ({
        id: r.id,
        dayInicio: r.dia_inicio,
        monthInicio: r.mes_inicio,
        yearInicio: r.ano_inicio,
        dayFim: r.dia_fim,
        monthFim: r.mes_fim,
        yearFim: r.ano_fim,
        label: r.label,
      })));
      setSelectedRecessoIds(new Set());
    }).catch(() => setRecessos([]));
  }, [isOpen, selectedAno]);

  // Desmarcar recessos multi-dia ao trocar para cargo sem professor
  useEffect(() => {
    if (cargoFilter !== 'PROFESSOR DE EDUC. BASICA') {
      setSelectedRecessoIds(prev => {
        const next = new Set(prev);
        recessos.filter(r => !isSingleDay(r)).forEach(r => next.delete(r.id));
        return next;
      });
    }
  }, [cargoFilter]);

  const CARGO_FILTERS = [
    'ANA.POL.PUB.G.E',
    'PEDAGOGO',
    'PROFESSOR DE EDUC. BASICA',
    'TEMP'
  ];

  const filtered = useMemo(
    () => {
      let result = profissionais;
      
      if (cargoFilter !== 'TODOS') {
        result = result.filter((p) => p.cargo && p.cargo.toUpperCase().includes(cargoFilter));
      }

      if (chFilter !== 'TODAS') {
        result = result.filter((p) => String(p.carga_horaria || '').includes(chFilter));
      }

      return result;
    },
    [profissionais, cargoFilter, chFilter]
  );

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.add(p.id));
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-stone-700" />
            <h2 className="text-lg font-bold text-stone-900">Geração em Lote de Folhas de Ponto</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 text-stone-500 hover:bg-stone-100 rounded-lg transition-all disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap gap-4 px-6 py-4 border-b border-stone-100 bg-stone-50">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Cargo</label>
            <select
              value={cargoFilter}
              onChange={(e) => setCargoFilter(e.target.value)}
              disabled={isGenerating}
              className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 disabled:opacity-50"
            >
              <option value="TODOS">TODOS OS CARGOS</option>
              {CARGO_FILTERS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">CH</label>
            <select
              value={chFilter}
              onChange={(e) => setChFilter(e.target.value)}
              disabled={isGenerating}
              className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 disabled:opacity-50"
            >
              <option value="TODAS">TODAS</option>
              <option value="20">20H</option>
              <option value="40">40H</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Mês</label>
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(Number(e.target.value))}
              disabled={isGenerating}
              className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 disabled:opacity-50"
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
              value={selectedAno}
              onChange={(e) => setSelectedAno(Number(e.target.value))}
              disabled={isGenerating}
              className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 w-24 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Recessos */}
        {recessos.length > 0 && recessos.some(r => isSingleDay(r) || cargoFilter === 'PROFESSOR DE EDUC. BASICA') && (
          <div className="px-6 py-3 border-b border-stone-100 bg-stone-50">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Recessos para aplicar no pré-preenchimento</p>
            <ul className="space-y-1">
              {recessos
                .filter(r => isSingleDay(r) || cargoFilter === 'PROFESSOR DE EDUC. BASICA')
                .map((r) => (
                  <li key={r.id}>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-stone-700 hover:text-stone-900">
                      <input
                        type="checkbox"
                        checked={selectedRecessoIds.has(r.id)}
                        onChange={() => {
                          setSelectedRecessoIds(prev => {
                            const next = new Set(prev);
                            if (next.has(r.id)) next.delete(r.id);
                            else next.add(r.id);
                            return next;
                          });
                        }}
                        disabled={isGenerating}
                        className="w-4 h-4 accent-stone-800"
                      />
                      <span className="font-medium">{r.label}</span>
                      <span className="text-stone-400 text-xs">
                        {r.dayInicio}/{r.monthInicio + 1}/{r.yearInicio} → {r.dayFim}/{r.monthFim + 1}/{r.yearFim}
                      </span>
                      {!isSingleDay(r) && (
                        <span className="text-xs text-amber-600 font-medium">(multi-dia · só PROF. BÁSICA)</span>
                      )}
                    </label>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* Selecionar todos */}
        <div className="flex items-center gap-3 px-6 py-2 border-b border-stone-100">
          <button
            onClick={toggleSelectAll}
            disabled={isGenerating || filtered.length === 0}
            className="flex items-center gap-2 text-sm font-medium text-stone-700 hover:text-stone-900 disabled:opacity-50"
          >
            {allFilteredSelected ? (
              <CheckSquare className="w-4 h-4 text-stone-800" />
            ) : (
              <Square className="w-4 h-4 text-stone-400" />
            )}
            Selecionar todos ({filtered.length})
          </button>
          {selectedIds.size > 0 && (
            <span className="text-xs text-stone-500 ml-auto">
              {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Lista de profissionais */}
        <div className="overflow-y-auto flex-1 px-6 py-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">Nenhum profissional encontrado.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {filtered.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-stone-50 -mx-2 px-2 rounded-lg">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      disabled={isGenerating}
                      className="w-4 h-4 accent-stone-800"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{p.nome}</p>
                      <p className="text-xs text-stone-500">
                        {p.cargo}
                        {p.matricula ? ` · ${p.matricula}` : ''}
                      </p>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Barra de progresso */}
        {isGenerating && progress && (
          <div className="px-6 py-3 border-t border-stone-100 bg-amber-50">
            <div className="flex justify-between text-xs text-stone-600 mb-1">
              <span className="truncate max-w-xs">{progress.currentName}</span>
              <span className="flex-shrink-0 ml-2">{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-stone-200 rounded-full h-1.5">
              <div
                className="bg-stone-800 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200">
          <div>
            <button
              onClick={() => setSelectedIds(new Set())}
              disabled={selectedIds.size === 0 || isGenerating}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-all disabled:opacity-50"
            >
              Limpar Seleção
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => onGenerate([...selectedIds], selectedMes, selectedAno, recessos.filter(r => selectedRecessoIds.has(r.id)))}
              disabled={selectedIds.size === 0 || isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-200 disabled:opacity-50 transition-all"
            >
              Gerar c/ Pré-preenchimento
            </button>
            <button
              onClick={() => onPrintOnly && onPrintOnly([...selectedIds], selectedMes, selectedAno)}
              disabled={selectedIds.size === 0 || isGenerating}
              className="flex items-center gap-2 px-5 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Printer className="w-4 h-4" />
              {isGenerating
                ? 'Processando...'
                : `Imprimir (${selectedIds.size} selecionado${selectedIds.size !== 1 ? 's' : ''})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
