import React from 'react';
import { DailyEntry, ENTRY_TYPES } from '../types';

interface Props {
  entries: DailyEntry[];
  month: number;
  year: number;
  onChange: (entries: DailyEntry[]) => void;
  employeeCh: string; // carga horária para controle do segundo turno
}

export const TimesheetGrid: React.FC<Props> = ({ entries, month, year, onChange, employeeCh }) => {
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
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 overflow-x-auto">
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
                  className={`${weekend ? 'bg-amber-50/40' : 'hover:bg-stone-50/60'} transition-colors group`}
                >
                  <td className={`px-4 py-2 font-mono font-medium ${weekend ? 'text-amber-700/60' : 'text-stone-500'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider">{getDayOfWeek(entry.day)}</span>
                      <span>{String(entry.day).padStart(2, '0')}</span>
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
