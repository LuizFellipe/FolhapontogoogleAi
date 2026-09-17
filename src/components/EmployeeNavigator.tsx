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

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Linha 1: navegação + seleção de profissional */}
      <div className="flex items-center gap-2">
        {/* Grupo de navegação prev/next com borda visual */}
        <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5 flex-shrink-0 border border-stone-200">
          <button
            onClick={handlePrevious}
            disabled={!canGoPrevious || isNewProfissional}
            className={`p-1.5 rounded-md transition-all ${
              canGoPrevious && !isNewProfissional
                ? 'bg-white text-stone-700 hover:bg-stone-50 shadow-sm'
                : 'text-stone-300 cursor-not-allowed'
            }`}
            title="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            disabled={!canGoNext || isNewProfissional}
            className={`p-1.5 rounded-md transition-all ${
              canGoNext && !isNewProfissional
                ? 'bg-white text-stone-700 hover:bg-stone-50 shadow-sm'
                : 'text-stone-300 cursor-not-allowed'
            }`}
            title="Próximo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Indicador de posição */}
        <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide flex-shrink-0 ${
          isNewProfissional
            ? 'bg-green-600 text-white ring-2 ring-green-200'
            : 'bg-stone-800 text-white'
        }`}>
          {isNewProfissional ? '✦ NOVO' : `${currentIndex + 1} / ${profissionais.length}`}
        </div>

        {/* Select de profissionais */}
        <select
          value={isNewProfissional ? '' : currentProfissional?.id || ''}
          onChange={handleSelectChange}
          className="flex-1 min-w-[280px] px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-300 text-sm text-stone-800 shadow-sm transition-shadow hover:shadow"
        >
          <option value="" disabled>Selecione um profissional...</option>
          {profissionais.map((profissional) => (
            <option key={profissional.id} value={profissional.id}>
              {profissional.nome} ({profissional.matricula || 'Sem matrícula'})
              {profissional.status === 'INATIVO' ? ' — Inativo' : ''}
            </option>
          ))}
        </select>

        {/* Separador visual */}
        <div className="w-px h-7 bg-stone-200 flex-shrink-0" />

        {/* Ações do profissional: Novo + Excluir */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {onNew && (
            <button
              onClick={onNew}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
              title="Novo profissional"
            >
              <User className="w-3.5 h-3.5" />
              Novo
            </button>
          )}
          {onDelete && currentProfissional && (
            <button
              onClick={() => onDelete(currentProfissional.id, currentProfissional.nome)}
              className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              title="Excluir profissional"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Linha 2: ações agrupadas por escopo (Folha Atual | Documentos) */}
      {(onPreFill || onClear || onBatchGenerate || onOpenReportsModal || onOpenDeliveryModal || onOpenReturnMemoModal) && (
        <div className="flex items-end gap-2 flex-wrap">

          {/* Grupo: FOLHA ATUAL (edita a folha do profissional atual) */}
          {(onPreFill || onClear || onOpenHolidayModal) && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-medium pl-1">Folha Atual</span>
              <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl p-1.5">
                {onPreFill && (
                  <button
                    onClick={onPreFill}
                    disabled={isPreFilling || isNewProfissional}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    title="Pré preenchimento com CPIP e CURSO de folha anterior do mesmo ano"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    {isPreFilling ? 'Buscando...' : 'Pré Preenchimento'}
                  </button>
                )}
                {onClear && (
                  <button
                    onClick={onClear}
                    disabled={isNewProfissional}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                    title="Limpar todos os lançamentos para TRABALHO NORMAL"
                  >
                    <X className="w-3.5 h-3.5" />
                    Limpar
                  </button>
                )}
                {onOpenHolidayModal && (
                  <button
                    onClick={onOpenHolidayModal}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-200 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                    title="Lançar Feriados"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Feriados
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Grupo: DOCUMENTOS (gera/imprime, escopo global) */}
          {(onOpenReportsModal || onOpenDeliveryModal || onBatchGenerate || onOpenReturnMemoModal) && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-medium pl-1">Documentos</span>
              <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl p-1.5">
                {onOpenReportsModal && (
                  <button
                    onClick={onOpenReportsModal}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-stone-400 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                    title="Relatórios do profissional"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Relatórios
                  </button>
                )}
                {onOpenDeliveryModal && (
                  <button
                    onClick={onOpenDeliveryModal}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-stone-400 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                    title="Gerar memorando de entrega de folhas de ponto"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Entrega de Folhas
                  </button>
                )}
                {onOpenReturnMemoModal && (
                  <button
                    onClick={onOpenReturnMemoModal}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-stone-400 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                    title="Gerar memorando de devolução"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                    Memo Devolução
                  </button>
                )}
                {onBatchGenerate && (
                  <button
                    onClick={onBatchGenerate}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-stone-400 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                    title="Gerar folhas de ponto em lote para vários profissionais"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Gerar em Lote
                  </button>
                )}
                {onOpenSyncModal && (
                  <button
                    onClick={onOpenSyncModal}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-50 border border-cyan-300 text-cyan-800 hover:bg-cyan-100 hover:border-cyan-400 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                    title="Sincronizar com dados extraídos do EducaSync (JSON)"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-600" />
                    Sincronizar Educa
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
