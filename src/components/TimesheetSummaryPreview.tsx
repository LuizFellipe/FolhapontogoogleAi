import React from 'react';
import { TimesheetData, MONTHS } from '../types';
interface Props {
  data: TimesheetData;
}

export const TimesheetSummaryPreview: React.FC<Props> = ({ data }) => {
  const renderDigits = (value: string, length: number) => {
    const chars = value ? value.padStart(length, '0').split('') : Array(length).fill('');
    return (
      <div className="flex">
        {chars.map((digit, i) => (
          <div 
            key={i} 
            className="w-5 h-6 border-b border-l border-black flex items-center justify-center last:border-r text-[9px] font-bold"
          >
            {digit}
          </div>
        ))}
      </div>
    );
  };

  const renderOperation = (op: string) => (
    <div className="w-5 h-6 border-b border-l border-r border-black flex items-center justify-center font-bold">
      {op}
    </div>
  );

  const codesTable = [
    { code: '10264', desc: 'Gratificação por exercício Zona Rural - GAZR (CPMDF)' },
    { code: '10265', desc: 'Gratificação de Atividade de Ensino Especial - GAEE' },
    { code: '10270', desc: 'Gratificação de Atividade Pedagógica - GAPED' },
    { code: '10368', desc: 'Gratificação de Atividade de Docência em Estabelecimento de Ensino Diferenciado – GADEED' },
    { code: '10384', desc: 'Gratificação de Atividade de Docência em Estabelecimento de Restrição de Liberdade – GADERL' },
    { code: '10267', desc: 'Gratificação de Atividade de Ensino Especial – GAEE (CAE)' },
    { code: '10268', desc: 'Gratificação de Atividade Zona Rural - GAZR (CAE)' },
    { code: '10528', desc: 'Gratificação de Atividade de Suporte Educacional – GASE' },
  ];

  const codesTableRight = [
    { code: '118', desc: 'Exame Preventivo, LC 840/2011, art. 62' },
    { code: '219', desc: 'Abono de ponto anual' },
    { code: '256', desc: 'TRE' },
    { code: '18077', desc: 'Adicional Noturno' },
    { code: '40010', desc: 'Falta' },
    { code: '40034', desc: 'Falta paralisação' },
    { code: '40046', desc: 'Horas não trabalhadas' },
  ];

  return (
    <div className="print-page-2 bg-white p-4 sm:p-8 shadow-lg max-w-[210mm] min-h-[297mm] mx-auto text-[9px] font-sans leading-tight border border-stone-300 mt-4 print:mt-0 flex flex-col">
      {/* Identificação blocks */}
      <div className="border border-black border-b-0 flex divide-x divide-black text-[8px]">
        <div className="p-1.5 w-32">
          <p className="text-black mb-0.5">M<span className="text-[7px] uppercase">ATRÍCULA</span></p>
          <p className="text-[10px] font-bold">{data.employee.registration}</p>
        </div>
        <div className="p-1.5 w-24">
          <p className="text-black mb-0.5 uppercase">UA</p>
          <p className="text-[10px] font-bold">{data.employee.ua}</p>
        </div>
        <div className="p-1.5 w-16">
          <p className="text-black mb-0.5 uppercase">CH</p>
          <p className="text-[10px] font-bold">{data.employee.ch}</p>
        </div>
        <div className="p-1.5 flex-1">
          <p className="text-black mb-0.5">L<span className="text-[7px]">ocal de </span>E<span className="text-[7px]">xercício</span></p>
          <p className="text-[10px] uppercase font-bold whitespace-nowrap overflow-hidden">{data.employee.unidade}</p>
        </div>
      </div>


      {/* Summary Table */}
      <div className="border border-black border-b-0 pb-3">
        <div className="px-2 pt-1 pb-2 text-[11px]">
          R<span className="text-[9px] uppercase">ESUMO DA</span> F<span className="text-[9px] uppercase">REQUÊNCIA</span>
        </div>
        
        <div className="w-full flex flex-col items-center">
          <div className="grid grid-cols-[auto_auto_auto_auto_auto_auto_auto] gap-x-8 gap-y-1.5 text-[9px]">
            <div className="text-left font-normal pb-1">Oper.</div>
            <div className="text-left font-normal pb-1">Código</div>
            <div className="text-left font-normal pb-1">Carga</div>
            <div className="text-left font-normal pb-1 pl-1">Nº meses</div>
            <div className="text-left font-normal pb-1 pl-1">Nº de horas/dias</div>
            <div className="text-left font-normal pb-1 pl-1">Dia início</div>
            <div className="text-left font-normal pb-1 pl-1">Dia fim</div>

            {data.summaryEntries.map((entry, idx) => (
              <React.Fragment key={idx}>
                <div className="flex justify-start">
                  {renderOperation(entry.operation || ' ')}
                </div>
                <div className="flex justify-start">
                  {renderDigits(entry.code, 5)}
                </div>
                <div className="flex justify-start pl-1">
                  {renderDigits(entry.carga, 1)}
                </div>
                <div className="flex justify-start pl-1">
                  {renderDigits(entry.months, 2)}
                </div>
                <div className="flex justify-start pl-1">
                  {renderDigits(entry.hoursDays, 5)}
                </div>
                <div className="flex justify-start pl-1">
                  {renderDigits(entry.startDay, 2)}
                </div>
                <div className="flex justify-start pl-1">
                  {renderDigits(entry.endDay, 2)}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Legend & Codes Box */}
      <div className="border border-black p-2 mb-2">
        <p className="mb-1">LEGENDA:</p>
        
        <div className="flex gap-16 mb-2 mt-1">
          <p>Oper. (operação)</p>
          <p>I - Inclusão</p>
          <p>A - Alteração</p>
          <p>E - Exclusão</p>
        </div>

        <p className="mb-1">Tabela de Códigos</p>
        
        {/* Codes Table Grid */}
        <div className="border border-black mb-2">
          <div className="grid grid-cols-2">
            <div className="border-r border-black">
              <div className="grid grid-cols-[40px_1fr] border-b border-black">
                <div className="p-1 px-2">Código</div>
                <div className="p-1 px-2">Descrição</div>
              </div>
              {codesTable.map((item, i) => (
                <div key={i} className="grid grid-cols-[40px_1fr] h-[26px]">
                  <div className="p-1 px-2 flex items-center">{item.code}</div>
                  <div className="p-1 px-2 text-[8px] flex items-center leading-tight">{item.desc}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="grid grid-cols-[40px_1fr] border-b border-black">
                <div className="p-1 px-2">Código</div>
                <div className="p-1 px-2">Descrição</div>
              </div>
              {codesTableRight.map((item, i) => (
                <div key={i} className="grid grid-cols-[40px_1fr] h-[26px]">
                  <div className="p-1 px-2 flex items-center">{item.code}</div>
                  <div className="p-1 px-2 text-[8px] flex items-center leading-tight">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Info Box */}
        <div className="flex gap-16 mb-2 mt-4 ml-1">
          <p>Carga:</p>
          <p>1 - Carga I</p>
          <p>2 - Carga II</p>
          <p>3 - Ambas as cargas</p>
        </div>
        <div className="ml-1 mb-1">
          <p className="flex gap-8"><span>Nº de meses:</span> <span>Previsão do período a ser incluído.</span></p>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-3 border border-black h-32 mt-4">
        <div className="border-r border-black p-2 relative">
          <p className="font-bold text-[8px]">Responsável pelas informações</p>
          <div className="absolute bottom-2 left-0 right-0 text-center border-t border-black pt-1 mx-4">
            <p className="text-[8px]">Assinatura / matrícula</p>
          </div>
        </div>
        <div className="border-r border-black p-2 relative">
          <p className="font-bold text-[8px]">Assinatura da Chefia</p>
          <div className="absolute bottom-2 left-0 right-0 text-center border-t border-black pt-1 mx-4">
            <p className="text-[8px]">Assinatura / carimbo</p>
          </div>
        </div>
        <div className="p-2 relative">
          <p className="font-bold text-[8px]">Assinatura do Superior</p>
          <div className="absolute bottom-2 left-0 right-0 text-center border-t border-black pt-1 mx-4">
            <p className="text-[8px]">Assinatura / carimbo</p>
          </div>
        </div>
      </div>

      {/* Message Box */}
      <div className="print-message-box border border-black border-t-0 p-2 h-20">
        <p className="font-bold text-[8px]">MENSAGEM</p>
      </div>
    </div>
  );
};
