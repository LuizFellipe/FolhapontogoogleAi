import React from 'react';
import { SummaryEntry } from '../types';

interface Props {
  entries: SummaryEntry[];
  onChange: (entries: SummaryEntry[]) => void;
}

export const SummaryForm: React.FC<Props> = ({ entries, onChange }) => {
  const handleEntryChange = (index: number, field: keyof SummaryEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    onChange(newEntries);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 overflow-x-auto">
      <h2 className="text-lg font-semibold mb-4 text-stone-800 border-b pb-2">Resumo da Frequência (Página 2)</h2>
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-widest font-bold">
            <th className="p-2 border border-stone-200 text-center">Oper.</th>
            <th className="p-2 border border-stone-200 text-center">Código</th>
            <th className="p-2 border border-stone-200 text-center">Carga</th>
            <th className="p-2 border border-stone-200 text-center">Nº meses</th>
            <th className="p-2 border border-stone-200 text-center">Nº horas/dias</th>
            <th className="p-2 border border-stone-200 text-center">Dia Início</th>
            <th className="p-2 border border-stone-200 text-center">Dia Fim</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={index} className="hover:bg-stone-50 transition-colors">
              <td className="p-1 border border-stone-200">
                <select
                  value={entry.operation}
                  onChange={(e) => handleEntryChange(index, 'operation', e.target.value as any)}
                  className="w-full text-center bg-transparent focus:outline-none"
                >
                  <option value="">-</option>
                  <option value="I">I</option>
                  <option value="A">A</option>
                  <option value="E">E</option>
                </select>
              </td>
              <td className="p-1 border border-stone-200">
                <input
                  type="text"
                  value={entry.code}
                  onChange={(e) => handleEntryChange(index, 'code', e.target.value)}
                  className="w-full text-center bg-transparent focus:outline-none font-mono"
                  placeholder="00000"
                  maxLength={5}
                />
              </td>
              <td className="p-1 border border-stone-200">
                <input
                  type="text"
                  value={entry.carga}
                  onChange={(e) => handleEntryChange(index, 'carga', e.target.value)}
                  className="w-full text-center bg-transparent focus:outline-none font-mono"
                  placeholder="0"
                  maxLength={1}
                />
              </td>
              <td className="p-1 border border-stone-200">
                <input
                  type="text"
                  value={entry.months}
                  onChange={(e) => handleEntryChange(index, 'months', e.target.value)}
                  className="w-full text-center bg-transparent focus:outline-none font-mono"
                  placeholder="00"
                  maxLength={2}
                />
              </td>
              <td className="p-1 border border-stone-200">
                <input
                  type="text"
                  value={entry.hoursDays}
                  onChange={(e) => handleEntryChange(index, 'hoursDays', e.target.value)}
                  className="w-full text-center bg-transparent focus:outline-none font-mono"
                  placeholder="00000"
                  maxLength={5}
                />
              </td>
              <td className="p-1 border border-stone-200">
                <input
                  type="text"
                  value={entry.startDay}
                  onChange={(e) => handleEntryChange(index, 'startDay', e.target.value)}
                  className="w-full text-center bg-transparent focus:outline-none font-mono"
                  placeholder="00"
                  maxLength={2}
                />
              </td>
              <td className="p-1 border border-stone-200">
                <input
                  type="text"
                  value={entry.endDay}
                  onChange={(e) => handleEntryChange(index, 'endDay', e.target.value)}
                  className="w-full text-center bg-transparent focus:outline-none font-mono"
                  placeholder="00"
                  maxLength={2}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10px] text-stone-400 italic">
        Legenda Operação: I - Inclusão, A - Alteração, E - Exclusão
      </p>
    </div>
  );
};
