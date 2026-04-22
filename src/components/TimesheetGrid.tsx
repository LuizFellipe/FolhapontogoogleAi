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
  const isWeekend = (day: number) => {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 is Sunday, 6 is Saturday
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

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 overflow-x-auto">
      <h2 className="text-lg font-semibold mb-4 text-stone-800 border-b pb-2">Lançamentos Diários</h2>
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-widest font-bold">
            <th className="p-2 border border-stone-200 w-12 text-center">Dia</th>
            <th className="p-2 border border-stone-200 min-w-[150px]">Tipo Turno 1</th>
            {isSecondTurnEnabled() && (
              <th className="p-2 border border-stone-200 min-w-[150px]">Tipo Turno 2</th>
            )}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const weekend = isWeekend(entry.day);
            const secondTurnEnabled = isSecondTurnEnabled();
            return (
              <tr 
                key={entry.day} 
                className={`${weekend ? 'bg-stone-100' : 'hover:bg-stone-50'} transition-colors`}
              >
                <td className="p-2 border border-stone-200 text-center font-mono font-medium">
                  {String(entry.day).padStart(2, '0')}
                </td>
                <td className="p-2 border border-stone-200">
                  <select
                    value={entry.type}
                    onChange={(e) => handleEntryChange(entry.day, 'type', e.target.value)}
                    className="w-full bg-transparent focus:outline-none"
                  >
                    {ENTRY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </td>
                {secondTurnEnabled && (
                  <td className="p-2 border border-stone-200">
                    <select
                      value={entry.type_turno2 || 'TRABALHO'}
                      onChange={(e) => handleEntryChange(entry.day, 'type_turno2', e.target.value)}
                      className="w-full bg-transparent focus:outline-none"
                      disabled={!secondTurnEnabled}
                    >
                      {ENTRY_TYPES.map((t) => (
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
  );
};
