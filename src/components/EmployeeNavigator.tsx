import React from 'react';
import { ChevronLeft, ChevronRight, User, Trash2 } from 'lucide-react';

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
}

export const EmployeeNavigator: React.FC<Props> = ({ 
  profissionais, 
  currentIndex, 
  isLoading, 
  onNavigate,
  onDelete,
  onNew
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
    <div className="flex items-center gap-3">
      {/* Botões Anterior/Próximo */}
      <div className="flex items-center gap-1">
        <button
          onClick={handlePrevious}
          disabled={!canGoPrevious || isNewProfissional}
          className={`p-2 rounded-lg transition-all ${
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
          className={`p-2 rounded-lg transition-all ${
            canGoNext && !isNewProfissional
              ? 'bg-stone-100 text-stone-700 hover:bg-stone-200' 
              : 'bg-stone-50 text-stone-300 cursor-not-allowed'
          }`}
          title="Próximo"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Indicador de posição */}
      <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
        isNewProfissional 
          ? 'bg-green-600 text-white' 
          : 'bg-stone-900 text-white'
      }`}>
        {isNewProfissional ? 'NOVO' : `${currentIndex + 1} de ${profissionais.length}`}
      </div>

      {/* Select de profissionais */}
      <div className="flex-1 min-w-[300px]">
        <select
          value={isNewProfissional ? '' : currentProfissional?.id || ''}
          onChange={handleSelectChange}
          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200 text-sm"
        >
          <option value="" disabled>Selecione um profissional...</option>
          {profissionais.map((profissional) => (
            <option key={profissional.id} value={profissional.id}>
              {profissional.nome} ({profissional.matricula || 'Sem matrícula'})
            </option>
          ))}
        </select>
      </div>

      {/* Nome atual */}
      {currentProfissional && (
        <div className="flex items-center gap-2 px-3 py-2 bg-stone-100 rounded-lg text-sm text-stone-700 font-medium min-w-0">
          <div className="truncate">{currentProfissional.nome}</div>
          <div className="flex items-center gap-1 ml-auto">
            {onNew && (
              <button
                onClick={onNew}
                className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-all"
                title="Novo profissional"
              >
                <User className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(currentProfissional.id, currentProfissional.nome)}
                className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                title="Excluir profissional"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
