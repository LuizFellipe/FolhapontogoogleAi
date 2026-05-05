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
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-6">
        <h2 className="text-lg font-semibold text-stone-800 tracking-tight">Resumo da Frequência (Página 2)</h2>
      </div>
      <div className="rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-stone-50/80 border-b border-stone-200">
            <tr className="text-stone-500 uppercase text-[10px] tracking-wider font-semibold">
              <th className="px-3 py-3 text-center whitespace-nowrap">Oper.</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Código</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Carga</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Nº meses</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Nº horas/dias</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Dia Início</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Dia Fim</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 bg-white">
            {entries.map((entry, index) => (
              <tr key={index} className="hover:bg-stone-50/60 transition-colors group">
                <td className="p-1.5">
                  <select
                    value={entry.operation}
                    onChange={(e) => handleEntryChange(index, 'operation', e.target.value as any)}
                    className="w-full text-center bg-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-md py-1.5 transition-all outline-none cursor-pointer text-stone-700 font-medium"
                  >
                    <option value="">-</option>
                    <option value="I">I</option>
                    <option value="A">A</option>
                    <option value="E">E</option>
                  </select>
                </td>
                <td className="p-1.5">
                  <input
                    type="text"
                    value={entry.code}
                    onChange={(e) => handleEntryChange(index, 'code', e.target.value)}
                    className="w-full text-center bg-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-md py-1.5 transition-all outline-none font-mono text-stone-700 placeholder:text-stone-300"
                    placeholder="00000"
                    maxLength={5}
                  />
                </td>
                <td className="p-1.5">
                  <input
                    type="text"
                    value={entry.carga}
                    onChange={(e) => handleEntryChange(index, 'carga', e.target.value)}
                    className="w-full text-center bg-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-md py-1.5 transition-all outline-none font-mono text-stone-700 placeholder:text-stone-300"
                    placeholder="0"
                    maxLength={1}
                  />
                </td>
                <td className="p-1.5">
                  <input
                    type="text"
                    value={entry.months}
                    onChange={(e) => handleEntryChange(index, 'months', e.target.value)}
                    className="w-full text-center bg-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-md py-1.5 transition-all outline-none font-mono text-stone-700 placeholder:text-stone-300"
                    placeholder="00"
                    maxLength={2}
                  />
                </td>
                <td className="p-1.5">
                  <input
                    type="text"
                    value={entry.hoursDays}
                    onChange={(e) => handleEntryChange(index, 'hoursDays', e.target.value)}
                    className="w-full text-center bg-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-md py-1.5 transition-all outline-none font-mono text-stone-700 placeholder:text-stone-300"
                    placeholder="00000"
                    maxLength={5}
                  />
                </td>
                <td className="p-1.5">
                  <input
                    type="text"
                    value={entry.startDay}
                    onChange={(e) => handleEntryChange(index, 'startDay', e.target.value)}
                    className="w-full text-center bg-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-md py-1.5 transition-all outline-none font-mono text-stone-700 placeholder:text-stone-300"
                    placeholder="00"
                    maxLength={2}
                  />
                </td>
                <td className="p-1.5">
                  <input
                    type="text"
                    value={entry.endDay}
                    onChange={(e) => handleEntryChange(index, 'endDay', e.target.value)}
                    className="w-full text-center bg-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-md py-1.5 transition-all outline-none font-mono text-stone-700 placeholder:text-stone-300"
                    placeholder="00"
                    maxLength={2}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-stone-400 italic flex items-center gap-1.5 px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
        Legenda Operação: I - Inclusão, A - Alteração, E - Exclusão
      </p>
    </div>
  );
};
