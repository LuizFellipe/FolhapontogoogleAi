import React from 'react';
import { ChevronLeft, ChevronRight, User, Trash2, ClipboardList, X, Printer, Calendar, FileText, Send, CornerUpLeft, RefreshCw } from 'lucide-react';

interface Profissional {
  id: number;
  nome: string;
  matricula: string;
  status?: string;
}

interface Props {
  profissionais: Profissional[];
  currentIndex: number;
  isLoading: boolean;
  onNavigate: (index: number) => void;
  onDelete?: (id: number, nome: string) => void;
  onNew?: () => void;
  onPreFill?: () => void;
  onClear?: () => void;
  onBatchGenerate?: () => void;
  onOpenHolidayModal?: () => void;
  onOpenReportsModal?: () => void;
  onOpenDeliveryModal?: () => void;
  onOpenReturnMemoModal?: () => void;
  onOpenSyncModal?: () => void;
  isPreFilling?: boolean;
}

const Group: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div role="group" aria-label={label} className="flex flex-wrap items-center gap-0.5 bg-stone-100 rounded-xl p-1 max-w-full">
    <span className="px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400 select-none whitespace-nowrap">{label}</span>
    {children}
  </div>
);

export const EmployeeNavigator: React.FC<Props> = ({
  profissionais,
  currentIndex,
  isLoading,
  onNavigate,
  onDelete,
  onNew,
  onPreFill,
  onClear,
  onBatchGenerate,
  onOpenHolidayModal,
  onOpenReportsModal,
  onOpenDeliveryModal,
  onOpenReturnMemoModal,
  onOpenSyncModal,
  isPreFilling = false,
}) => {
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < profissionais.length - 1;
  const currentProfissional = currentIndex >= 0 ? profissionais[currentIndex] : null;
  const isNewProfissional = currentIndex === -1;

  const handlePrevious = () => {
    if (canGoPrevious) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onNavigate(currentIndex + 1);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = Number(e.target.value);
    const selectedIndex = profissionais.findIndex(p => p.id === selectedId);
    if (selectedIndex !== -1) {
      onNavigate(selectedIndex);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg">
        <div className="animate-spin w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full"></div>
        <span className="text-sm text-stone-600">
          {profissionais.length === 0 ? 'Carregando...' : 'Navegando...'}
        </span>
      </div>
    );
  }

  if (profissionais.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg">
        <User className="w-4 h-4 text-stone-400" />
        <span className="text-sm text-stone-500">Nenhum profissional encontrado</span>
        {onNew && (
          <button
            onClick={onNew}
            className="ml-2 px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-all"
            title="Novo profissional"
          >
            + Novo
          </button>
        )}
      </div>
    );
  }

  const btn = 'whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-700 hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600';
  const navBtn = 'h-full px-2.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900 disabled:text-stone-300 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600';

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Linha 1: seletor segmentado + ações do servidor */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-auto sm:flex-1 min-w-0 h-10 flex items-stretch bg-white border border-stone-300 rounded-xl overflow-hidden shadow-sm focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/15 transition-shadow">
          <button onClick={handlePrevious} disabled={!canGoPrevious || isNewProfissional} className={navBtn} title="Servidor anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span
            className={`flex items-center px-2.5 border-x border-stone-200 text-xs font-semibold tabular-nums whitespace-nowrap ${
              isNewProfissional ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-50 text-stone-600'
            }`}
          >
            {isNewProfissional ? 'Novo' : `${currentIndex + 1} de ${profissionais.length}`}
          </span>
          <button onClick={handleNext} disabled={!canGoNext || isNewProfissional} className={`${navBtn} border-r border-stone-200`} title="Próximo servidor">
            <ChevronRight className="w-4 h-4" />
          </button>
          <select
            value={isNewProfissional ? '' : currentProfissional?.id || ''}
            onChange={handleSelectChange}
            aria-label="Selecionar servidor"
            className="flex-1 min-w-0 px-3 bg-transparent text-sm text-stone-800 focus:outline-none cursor-pointer"
          >
            <option value="" disabled>Selecione um servidor…</option>
            {profissionais.map((profissional) => (
              <option key={profissional.id} value={profissional.id}>
                {profissional.nome} ({profissional.matricula || 'Sem matrícula'})
                {profissional.status === 'INATIVO' ? ' — Inativo' : ''}
              </option>
            ))}
          </select>
        </div>

        {onNew && (
          <button
            onClick={onNew}
            className="h-10 flex items-center gap-1.5 px-3.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            title="Cadastrar novo servidor"
          >
            <User className="w-3.5 h-3.5" />
            Novo
          </button>
        )}
        {onDelete && currentProfissional && (
          <button
            onClick={() => onDelete(currentProfissional.id, currentProfissional.nome)}
            className="h-10 w-10 flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 border border-stone-200 hover:border-red-200 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            title="Excluir servidor"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Linha 2: ações agrupadas por escopo */}
      <div className="flex items-center gap-2 flex-wrap">
        {(onPreFill || onClear || onOpenHolidayModal) && (
          <Group label="Folha atual">
            {onPreFill && (
              <button
                onClick={onPreFill}
                disabled={isPreFilling || isNewProfissional}
                className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1"
                title="Pré-preencher CPIP e CURSO a partir de folha anterior do mesmo ano"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                {isPreFilling ? 'Buscando…' : 'Pré-preencher'}
              </button>
            )}
            {onClear && (
              <button onClick={onClear} disabled={isNewProfissional} className={btn} title="Voltar todos os lançamentos para TRABALHO NORMAL">
                <X className="w-3.5 h-3.5" />
                Limpar
              </button>
            )}
            {onOpenHolidayModal && (
              <button onClick={onOpenHolidayModal} className={btn} title="Lançar feriados">
                <Calendar className="w-3.5 h-3.5" />
                Feriados
              </button>
            )}
          </Group>
        )}

        {(onOpenReportsModal || onOpenDeliveryModal || onOpenReturnMemoModal || onBatchGenerate) && (
          <Group label="Documentos">
            {onOpenReportsModal && (
              <button onClick={onOpenReportsModal} className={btn} title="Relatórios do servidor">
                <FileText className="w-3.5 h-3.5" />
                Relatórios
              </button>
            )}
            {onOpenDeliveryModal && (
              <button onClick={onOpenDeliveryModal} className={btn} title="Gerar memorando de entrega de folhas de ponto">
                <Send className="w-3.5 h-3.5" />
                Entrega de folhas
              </button>
            )}
            {onOpenReturnMemoModal && (
              <button onClick={onOpenReturnMemoModal} className={btn} title="Gerar memorando de devolução">
                <CornerUpLeft className="w-3.5 h-3.5" />
                Memo devolução
              </button>
            )}
            {onBatchGenerate && (
              <button onClick={onBatchGenerate} className={btn} title="Gerar folhas de ponto em lote">
                <Printer className="w-3.5 h-3.5" />
                Gerar em lote
              </button>
            )}
          </Group>
        )}

        {onOpenSyncModal && (
          <Group label="Cadastro">
            <button onClick={onOpenSyncModal} className={btn} title="Importar fichas extraídas do EducaSync (JSON)">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
              Sincronizar Educa
            </button>
          </Group>
        )}
      </div>
    </div>
  );
};
