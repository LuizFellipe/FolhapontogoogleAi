import React from 'react';
import { TimesheetData, MONTHS, ENTRY_TYPES } from '../types';
import logo from '../logo.png';

interface Props {
  data: TimesheetData;
}

export const TimesheetPreview: React.FC<Props> = ({ data }) => {
  const isWeekend = (day: number) => {
    const date = new Date(data.year, data.month, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const isCh20 = String(data.employee.ch || '').trim() === '20';

  const getEntryDisplay = (entry: any, turnNumber: 1 | 2) => {
    const type = turnNumber === 1 ? entry.type : (entry.type_turno2 || 'TRABALHO');
    if (!type || type === 'TRABALHO') return '';
    if (type === 'TRACEJADO') return '__tracejado__'; // sentinel: célula assinatura usa dashLine; entrada/saída usa dashes via display != ''
    const typeOption = ENTRY_TYPES.find(t => t.value === type);
    const label = typeOption ? typeOption.label : type;
    return `--- ${label} ---`;
  };

  return (
    <div className="print-page bg-white p-4 sm:p-6 shadow-lg max-w-[210mm] mx-auto text-[10px] font-sans leading-tight border border-stone-300 break-after-page">
      {/* Header Box 1 */}
      <div className="border border-black flex items-center h-16 overflow-hidden">
        <div className="w-24 h-full flex items-center justify-center p-2 shrink-0">
          <img src={logo} alt="Logo" className="max-h-full max-w-full object-contain filter grayscale" />
        </div>
        <div className="flex-1 text-center py-2">
          <h1 className="text-2xl font-normal tracking-tight">SECRETARIA DE ESTADO DE EDUCAÇÃO</h1>
          <p className="text-[11px] mt-1 font-medium">CNPJ: 00.394.676/0001-07</p>
        </div>
      </div>

      {/* Header Box 2 */}
      <div className="border border-black border-t-0 flex justify-between items-center px-2 py-1 uppercase font-normal text-[14px]">
        <span>Folha de Frequência</span>
        <div className="flex gap-4">
          <span className="text-[12px]">REFERÊNCIA:</span>
          <span className="text-[12px]">{MONTHS[data.month]} / {data.year}</span>
        </div>
      </div>

      {/* Info Box 3 (UA e Exercício) */}
      <div className="border border-black border-t-0 p-1 px-2 text-[11px] leading-relaxed">
        <div className="flex gap-4">
          <span className="font-normal w-8">UA:</span>
          <span className="w-12">{data.employee.ua}</span>
          <span className="uppercase">COORDENAÇÃO REGIONAL DE ENSINO DO GUARÁ</span>
        </div>
        <div className="flex gap-4">
          <span className="font-normal w-16">Exercício:</span>
          <span className="w-24">{data.employee.exercicio}</span>
          <span className="uppercase">{data.employee.unidade}</span>
        </div>
      </div>

      {/* Info Box 4 (Matrícula, Nome, Cargo, CH, Função) */}
      <div className="border border-black border-t-0 p-1 px-2 text-[11px] leading-relaxed mb-1">
        <div className="flex gap-12">
          <div className="flex gap-2">
            <span className="font-normal">Matrícula:</span>
            <span>{data.employee.registration}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-normal">Nome:</span>
            <span className="uppercase">{data.employee.name}</span>
          </div>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-2 shrink-0">
            <span className="font-normal">Cargo/Especialidade:</span>
            <span className="uppercase">{data.employee.cargo}</span>
          </div>
          <div className="flex-1 flex flex-col min-w-0 px-2">
            <span className="font-normal">Disciplina:</span>
            <span className="uppercase line-clamp-2 break-words leading-tight">
              {data.employee.disciplina || ''}
            </span>
          </div>
          <div className="flex gap-2 shrink-0 mr-12">
            <span className="font-normal">C.H.</span>
            <span>{data.employee.ch}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="font-normal">Função:</span>
          <span className="uppercase">{data.employee.funcao}</span>
        </div>
      </div>

      {/* Grid + Observações — seção que cresce no print para preencher a página */}
      <div className="print-page-table-section flex-1 flex flex-col">
        <table className="w-full border-collapse border border-black mb-1">
          <thead className="text-[9px] uppercase font-bold">
            <tr>
              <th className="border border-black p-1 w-10 text-center" rowSpan={2}>Dia</th>
              <th className="border border-black p-1 text-center bg-stone-50" colSpan={3}>TURNO: {data.employee.shift1}</th>
              <th className="border border-black p-1 text-center bg-stone-50" colSpan={3}>TURNO: {data.employee.shift2}</th>
            </tr>
            <tr>
              <th className="border border-black p-1 w-40">Assinatura do Servidor</th>
              <th className="border border-black p-1 w-14">Entrada</th>
              <th className="border border-black p-1 w-14">Saída</th>
              <th className="border border-black p-1 w-40">Assinatura do Servidor</th>
              <th className="border border-black p-1 w-14">Entrada</th>
              <th className="border border-black p-1 w-14">Saída</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((entry) => {
              const weekend = isWeekend(entry.day);
              const display1 = getEntryDisplay(entry, 1);
              const display2 = getEntryDisplay(entry, 2);
              const isWork1 = entry.type === 'TRABALHO';
              const isWork2 = (entry.type_turno2 || 'TRABALHO') === 'TRABALHO';
              const isTracejado1 = entry.type === 'TRACEJADO';
              const isTracejado2 = (entry.type_turno2 || 'TRABALHO') === 'TRACEJADO';
              const dashes = "------";
              const dashLine = <div className="w-full border-b border-black" />;

              return (
                <tr key={entry.day} className={weekend ? 'bg-stone-300' : ''}>
                  <td className="border border-black py-[3px] px-1 text-center font-bold">{String(entry.day).padStart(2, '0')}</td>
                  <td className="border border-black py-[3px] px-1 text-center italic text-[8.5px] whitespace-nowrap overflow-hidden">{isTracejado1 ? dashLine : display1}</td>
                  <td className="border border-black py-[3px] px-1 text-center tracking-widest whitespace-nowrap overflow-hidden">{isWork1 ? entry.entry1 : (display1 ? dashes : '')}</td>
                  <td className="border border-black py-[3px] px-1 text-center tracking-widest whitespace-nowrap overflow-hidden">{isWork1 ? entry.exit1 : (display1 ? dashes : '')}</td>
                  <td className="border border-black py-[3px] px-1 text-center italic text-[8.5px] whitespace-nowrap overflow-hidden">{isCh20 ? dashLine : (isTracejado2 ? dashLine : display2)}</td>
                  <td className="border border-black py-[3px] px-1 text-center tracking-widest whitespace-nowrap overflow-hidden">{isCh20 ? dashes : (isWork2 ? entry.entry2 : (display2 ? dashes : ''))}</td>
                  <td className="border border-black py-[3px] px-1 text-center tracking-widest whitespace-nowrap overflow-hidden">{isCh20 ? dashes : (isWork2 ? entry.exit2 : (display2 ? dashes : ''))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Observations */}
        <div className="border border-black p-2 h-16">
          <span className="font-bold">Observações:</span>
          <p className="mt-1 text-[9px]">{data.observations}</p>
        </div>
      </div>

    </div>
  );
};
