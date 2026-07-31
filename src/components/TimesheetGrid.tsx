import React, { useState, useEffect, useCallback } from 'react';
import { DailyEntry, ENTRY_TYPES } from '../types';
import { apiService, AtestadosBimestraisResponse, AtestadosComparecimentoResponse } from '../services/api';

interface Props {
  entries: DailyEntry[];
  month: number;
  year: number;
  onChange: (entries: DailyEntry[]) => void;
  employeeCh: string; // carga horária para controle do segundo turno
  matricula: string;  // matrícula do profissional para checagem bimestral
  entryTypes?: { value: string; label: string; code: string | null }[];
}

const ATESTADO_VALUE = 'ATESTADO MEDICO DE ATE 03';

/** Tipos sujeitos ao limite anual de 12 comparecimentos. */
const COMPARECIMENTO_VALUES = [
  'ATESTADO DE COMPARECIMENTO',        // servidor
  'ATESTADO COMPARECIMENTO P.',        // pessoa da família
  // NOTA: 'ATESTADO COMPARECIMENTO A' (acompanhante/subsaúde) não entra no limite
] as const;

/** Calcula o bimestre civil (1-6) a partir do mês 0-indexed. */
const getBimestre = (month: number): 1 | 2 | 3 | 4 | 5 | 6 =>
  (Math.floor(month / 2) + 1) as 1 | 2 | 3 | 4 | 5 | 6;

/** Retorna o count da view bimestral para o bimestre do mês informado. */
const getCountFromView = (
  data: AtestadosBimestraisResponse,
  month: number
): number => {
  const bim = getBimestre(month);
  const key = `bimestre${bim}` as keyof AtestadosBimestraisResponse;
  return data[key] ?? 0;
};

/**
 * Acumula os comparecimentos persistidos no banco de Janeiro até (month - 1).
 * O mês atual (month) é intencionalmente excluído aqui: ele é contabilizado
 * separadamente pela contagem dos entries em tela, evitando dupla contagem
 * caso o usuário tenha salvo e reaberto o mesmo mês.
 */
const getComparecimentoBanco = (
  data: AtestadosComparecimentoResponse,
  month: number
): number => {
  let total = 0;
  for (let m = 0; m < month; m++) {
    const key = `mes${m}` as keyof AtestadosComparecimentoResponse;
    total += data[key] ?? 0;
  }
  return total;
};

export const TimesheetGrid: React.FC<Props> = ({
  entries,
  month,
  year,
  onChange,
  employeeCh,
  matricula,
  entryTypes = ENTRY_TYPES,
}) => {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [atestadosData, setAtestadosData] = useState<AtestadosBimestraisResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [comparecimentoData, setComparecimentoData] = useState<AtestadosComparecimentoResponse | null>(null);
  const [modalComparecimentoVisible, setModalComparecimentoVisible] = useState(false);

  const DAY_ABBR = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

  // Carrega contagem bimestral ao montar / trocar profissional ou ano
  useEffect(() => {
    if (!matricula) {
      setAtestadosData(null);
      return;
    }
    let cancelled = false;
    apiService.getAtestadosBimestrais(matricula, year).then((data) => {
      if (!cancelled) setAtestadosData(data);
    }).catch(() => {
      if (!cancelled) setAtestadosData(null);
    });
    return () => { cancelled = true; };
  }, [matricula, year]);

  // Carrega contagem anual de comparecimento ao montar / trocar profissional ou ano
  useEffect(() => {
    if (!matricula) {
      setComparecimentoData(null);
      return;
    }
    let cancelled = false;
    apiService.getAtestadosComparecimento(matricula, year).then((data) => {
      if (!cancelled) setComparecimentoData(data);
    }).catch(() => {
      if (!cancelled) setComparecimentoData(null);
    });
    return () => { cancelled = true; };
  }, [matricula, year]);

  const isWeekend = (day: number) => {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const getDayOfWeek = (day: number) => {
    return DAY_ABBR[new Date(year, month, day).getDay()];
  };

  // Verifica se segundo turno está habilitado baseado na carga horária
  const isSecondTurnEnabled = () => {
    const ch = String(employeeCh || '').toLowerCase();
    return ch.includes('40');
  };

  const getCopyPatternState = () => {
    if (hoveredDay === null) return null;
    
    const date = new Date(year, month, hoveredDay);
    const dayOfWeek = date.getDay();
    
    // Final de semana -> sem botão
    if (dayOfWeek === 0 || dayOfWeek === 6) return null;
    
    const mondayDay = hoveredDay - dayOfWeek + 1;
    const fridayDay = mondayDay + 4;
    
    // Semana atual inteiramente no mês?
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    if (mondayDay < 1 || fridayDay > daysInMonth) return null;
    
    const prevMondayDay = mondayDay - 7;
    const prevFridayDay = prevMondayDay + 4;
    
    // Semana anterior inteiramente no mesmo mês?
    if (prevMondayDay < 1) return null;
    
    const secondTurnEnabled = isSecondTurnEnabled();
    let hasSpecialEntry = false;
    
    // Verifica se semana anterior tem todos os dias úteis e se possui algo != TRABALHO
    for (let i = 0; i < 5; i++) {
      const sourceDay = prevMondayDay + i;
      const entry = entries.find(e => e.day === sourceDay);
      if (!entry) return null; 
      
      if (entry.type !== 'TRABALHO') hasSpecialEntry = true;
      if (secondTurnEnabled && entry.type_turno2 && entry.type_turno2 !== 'TRABALHO') hasSpecialEntry = true;
    }
    
    if (!hasSpecialEntry) return null;
    
    // Verifica se a semana atual também possui todos os dias na grade (para poder sobrescrever)
    for (let i = 0; i < 5; i++) {
      const targetDay = mondayDay + i;
      const entry = entries.find(e => e.day === targetDay);
      if (!entry) return null;
    }

    return { mondayDay, prevMondayDay };
  };

  const handleCopyWeek = (mondayDay: number, prevMondayDay: number) => {
    const newEntries = [...entries];
    const secondTurnEnabled = isSecondTurnEnabled();
    
    for (let i = 0; i < 5; i++) {
      const sourceDay = prevMondayDay + i;
      const targetDay = mondayDay + i;
      
      const sourceEntry = entries.find(e => e.day === sourceDay);
      const targetIndex = newEntries.findIndex(e => e.day === targetDay);
      
      if (sourceEntry && targetIndex !== -1) {
        newEntries[targetIndex] = {
          ...newEntries[targetIndex],
          type: sourceEntry.type,
          ...(secondTurnEnabled ? { type_turno2: sourceEntry.type_turno2 } : {})
        };
      }
    }
    
    onChange(newEntries);
    setHoveredDay(null);
  };

  const copyState = getCopyPatternState();

  /**
   * Verifica se o lançamento de ATESTADO_VALUE deve ser bloqueado.
   * Regra: se a view retorna >= 1 ocorrência no bimestre civil atual → bloquear.
   */
  const isAtestadoBloqueado = useCallback((): boolean => {
    if (!atestadosData) return false; // sem dados → não bloqueia (fail-open)
    return getCountFromView(atestadosData, month) >= 1;
  }, [atestadosData, month]);

  /**
   * Verifica se novos comparecimentos devem ser bloqueados.
   * Regra: banco (jan..mês-1) + tela (mês atual) >= 12 → bloquear.
   * Fail-open: sem dados do banco não bloqueia.
   */
  const isComparecimentoBloqueado = useCallback((): boolean => {
    if (!comparecimentoData) return false; // fail-open

    // Ocorrências persistidas nos meses anteriores ao mês em edição
    const dosBanco = getComparecimentoBanco(comparecimentoData, month);

    // Ocorrências visíveis na tela no mês atual (ainda não salvas ou já salvas — 
    // o banco exclui o mês atual da soma acima, então não há dupla contagem)
    const daTela = entries.filter(
      (e) =>
        COMPARECIMENTO_VALUES.includes(e.type as typeof COMPARECIMENTO_VALUES[number]) ||
        (e.type_turno2 != null &&
          COMPARECIMENTO_VALUES.includes(e.type_turno2 as typeof COMPARECIMENTO_VALUES[number]))
    ).length;

    return dosBanco + daTela >= 12;
  }, [comparecimentoData, month, entries]);

  const handleEntryChange = (day: number, field: keyof DailyEntry, value: string) => {
    // Checagem de regra bimestral: hard-block no ATESTADO MEDICO DE ATE 03
    if (value === ATESTADO_VALUE && isAtestadoBloqueado()) {
      setModalVisible(true);
      return; // não aplica a mudança
    }

    // Checagem de regra anual: hard-block nos tipos de comparecimento (máx. 12/ano)
    if (
      COMPARECIMENTO_VALUES.includes(value as typeof COMPARECIMENTO_VALUES[number]) &&
      isComparecimentoBloqueado()
    ) {
      setModalComparecimentoVisible(true);
      return; // não aplica a mudança
    }

    const newEntries = entries.map((entry) => {
      if (entry.day === day) {
        return { ...entry, [field]: value };
      }
      return entry;
    });
    onChange(newEntries);
  };

  const sortedEntryTypes = [...entryTypes].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

  const bimestre = getBimestre(month);
  const bimestreLabel = `${bimestre}º Bimestre/${year}`;

  return (
    <>
      {/* Modal de hard-block — atestado duplicado no bimestre */}
      {modalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-amber-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-stone-800 mb-1">
                  Atestado já registrado neste Bimestre Civil
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Já existe um <strong>ATESTADO MÉDICO DE ATÉ 03 DIAS</strong> lançado no{' '}
                  <strong>{bimestreLabel}</strong>.
                </p>
                <p className="text-sm text-stone-600 leading-relaxed mt-2">
                  O segundo atestado deverá ser lançado como{' '}
                  <strong className="text-blue-700">LICENÇA MÉDICA OU ODONTOLÓGICA</strong>.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setModalVisible(false)}
                className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                OK, entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de hard-block — limite anual de 12 comparecimentos atingido */}
      {modalComparecimentoVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-rose-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-stone-800 mb-1">
                  Limite anual de comparecimentos atingido
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Este profissional já atingiu o limite de{' '}
                  <strong>12 atestados de comparecimento</strong> no ano de{' '}
                  <strong>{year}</strong>.
                </p>
                <p className="text-sm text-stone-600 leading-relaxed mt-2">
                  Novos lançamentos de <strong>ATESTADO DE COMPARECIMENTO</strong> ou{' '}
                  <strong>ATESTADO DE COMPARECIMENTO ACOMPANHANTE</strong> não são permitidos.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setModalComparecimentoVisible(false)}
                className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                OK, entendi
              </button>
            </div>
          </div>
        </div>
      )}

      <div 
        className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 overflow-x-auto relative"
        onMouseLeave={() => setHoveredDay(null)}
      >
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-6">
          <h2 className="text-lg font-semibold text-stone-800 tracking-tight">Lançamentos Diários</h2>
        </div>
        <div className="rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-50/80 border-b border-stone-200">
              <tr className="text-stone-500 uppercase text-[10px] tracking-wider font-semibold">
                <th className="px-4 py-3 w-16 text-center whitespace-nowrap">Dia</th>
                <th className="px-4 py-3 min-w-[150px]">Tipo Turno 1</th>
                {isSecondTurnEnabled() && (
                  <th className="px-4 py-3 min-w-[150px]">Tipo Turno 2</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {entries.map((entry) => {
                const weekend = isWeekend(entry.day);
                const secondTurnEnabled = isSecondTurnEnabled();
                return (
                  <tr 
                    key={entry.day} 
                    className={`${weekend ? 'bg-amber-50/40' : 'hover:bg-stone-50/60'} transition-colors group relative`}
                    onMouseEnter={() => setHoveredDay(entry.day)}
                  >
                    <td className={`px-4 py-2 font-mono font-medium ${weekend ? 'text-amber-700/60' : 'text-stone-500'} relative`}>
                      <div className="flex items-center gap-2 relative">
                        <span className="text-[10px] uppercase tracking-wider">{getDayOfWeek(entry.day)}</span>
                        <span>{String(entry.day).padStart(2, '0')}</span>
                        {hoveredDay === entry.day && copyState && (
                          <button
                            onClick={() => handleCopyWeek(copyState.mondayDay, copyState.prevMondayDay)}
                            className="absolute left-full ml-4 bg-blue-600 text-white rounded p-1.5 shadow-md hover:bg-blue-700 hover:scale-105 transition-all flex items-center gap-1 z-20 whitespace-nowrap cursor-pointer"
                            title="Copiar padrão da semana anterior"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                            <span className="text-[10px] font-semibold pr-1">Copiar</span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-1.5">
                      <select
                        value={entry.type}
                        onChange={(e) => handleEntryChange(entry.day, 'type', e.target.value)}
                        className={`w-full bg-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-md py-2 px-3 transition-all outline-none cursor-pointer ${weekend ? 'text-amber-900/80' : 'text-stone-700'}`}
                      >
                        {sortedEntryTypes.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </td>
                    {secondTurnEnabled && (
                      <td className="p-1.5">
                        <select
                          value={entry.type_turno2 || 'TRABALHO'}
                          onChange={(e) => handleEntryChange(entry.day, 'type_turno2', e.target.value)}
                          className={`w-full bg-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-md py-2 px-3 transition-all outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${weekend ? 'text-amber-900/80' : 'text-stone-700'}`}
                          disabled={!secondTurnEnabled}
                        >
                          {sortedEntryTypes.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
