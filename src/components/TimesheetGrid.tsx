import React, { useState } from 'react';
import { DailyEntry, ENTRY_TYPES } from '../types';

interface Props {
  entries: DailyEntry[];
  month: number;
  year: number;
  onChange: (entries: DailyEntry[]) => void;
  employeeCh: string; // carga horária para controle do segundo turno
}

export const TimesheetGrid: React.FC<Props> = ({ entries, month, year, onChange, employeeCh }) => {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const DAY_ABBR = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

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

  const handleEntryChange = (day: number, field: keyof DailyEntry, value: string) => {
    const newEntries = entries.map((entry) => {
      if (entry.day === day) {
        return { ...entry, [field]: value };
      }
      return entry;
    });
    onChange(newEntries);
  };

  const sortedEntryTypes = [...ENTRY_TYPES].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

  return (
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
  );
};
