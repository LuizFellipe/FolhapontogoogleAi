import React from 'react';
import { ChevronLeft, ChevronRight, User, Trash2, ClipboardList, X, Printer, Calendar, FileText } from 'lucide-react';

interface Profissional {
  id: number;
  nome: string;
  matricula: string;
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
    <div className="flex flex-col gap-2 w-full">
      {/* Linha 1: navegação + seleção de profissional */}
      <div className="flex items-center gap-2">
        {/* Botões Anterior/Próximo */}
        <button
          onClick={handlePrevious}
          disabled={!canGoPrevious || isNewProfissional}
          className={`p-2 rounded-lg transition-all flex-shrink-0 ${
            canGoPrevious && !isNewProfissional
              ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              : 'bg-stone-50 text-stone-300 cursor-not-allowed'
          }`}
          title="Anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={handleNext}
          disabled={!canGoNext || isNewProfissional}
          className={`p-2 rounded-lg transition-all flex-shrink-0 ${
            canGoNext && !isNewProfissional
              ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              : 'bg-stone-50 text-stone-300 cursor-not-allowed'
          }`}
          title="Próximo"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Indicador de posição */}
        <div className={`px-3 py-2 rounded-lg text-sm font-medium flex-shrink-0 ${
          isNewProfissional ? 'bg-green-600 text-white' : 'bg-stone-900 text-white'
        }`}>
          {isNewProfissional ? 'NOVO' : `${currentIndex + 1} de ${profissionais.length}`}
        </div>

        {/* Select de profissionais */}
        <select
          value={isNewProfissional ? '' : currentProfissional?.id || ''}
          onChange={handleSelectChange}
          className="flex-1 min-w-[280px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200 text-sm"
        >
          <option value="" disabled>Selecione um profissional...</option>
          {profissionais.map((profissional) => (
            <option key={profissional.id} value={profissional.id}>
              {profissional.nome} ({profissional.matricula || 'Sem matrícula'})
            </option>
          ))}
        </select>

        {/* Ações do profissional */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {onNew && (
            <button
              onClick={onNew}
              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all"
              title="Novo profissional"
            >
              <User className="w-4 h-4" />
            </button>
          )}
          {onDelete && currentProfissional && (
            <button
              onClick={() => onDelete(currentProfissional.id, currentProfissional.nome)}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
              title="Excluir profissional"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Linha 2: ações de lançamento */}
      {(onPreFill || onClear) && (
        <div className="flex items-center gap-2">
          {onPreFill && (
            <button
              onClick={onPreFill}
              disabled={isPreFilling || isNewProfissional}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="Pré preenchimento com CPIP e CURSO de folha anterior do mesmo ano"
            >
              <ClipboardList className="w-4 h-4" />
              {isPreFilling ? 'Buscando...' : 'Pré Preenchimento'}
            </button>
          )}
          {onClear && (
            <button
              onClick={onClear}
              disabled={isNewProfissional}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-stone-200 text-stone-700 hover:bg-stone-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="Limpar todos os lançamentos para TRABALHO NORMAL"
            >
              <X className="w-4 h-4" />
              Limpar Lançamentos
            </button>
          )}
          {onOpenHolidayModal && (
            <button
              onClick={onOpenHolidayModal}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
              title="Lançar Feriados"
            >
              <Calendar className="w-4 h-4" />
              Feriados
            </button>
          )}
          {onBatchGenerate && (
            <button
              onClick={onBatchGenerate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-stone-800 text-white hover:bg-stone-700 transition-all"
              title="Gerar folhas de ponto em lote para vários profissionais"
            >
              <Printer className="w-4 h-4" />
              Gerar em Lote
            </button>
          )}
          {onOpenReportsModal && (
            <button
              onClick={onOpenReportsModal}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-700 text-white hover:bg-teal-600 transition-all"
              title="Relatórios do profissional"
            >
              <FileText className="w-4 h-4" />
              Relatórios
            </button>
          )}
        </div>
      )}
    </div>
  );
};
