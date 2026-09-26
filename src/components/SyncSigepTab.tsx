import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  RefreshCw,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle,
  Search,
  BookOpen,
  Briefcase,
  GraduationCap,
  Award,
  Layers,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { apiService, normMat } from '../services/api';

const FILTERS = [
  { id: 'ready', label: 'Prontos para Sincronizar', active: 'border-emerald-400 text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-400' },
  { id: 'missing', label: 'Não Cadastrados na Base', active: 'border-amber-400 text-amber-300', badge: 'bg-amber-500/20 text-amber-400' },
  { id: 'all', label: 'Todos da Ficha', active: 'border-indigo-400 text-indigo-300', badge: 'bg-stone-800 text-stone-400' },
] as const;

interface Props {
  dbProfissionais: any[];
  onSynced: () => void;
}

export const SyncSigepTab: React.FC<Props> = ({ dbProfissionais, onSynced }) => {
  const [loading, setLoading] = useState(false);
  const [sigepData, setSigepData] = useState<any>(null);
  const [currentFilter, setCurrentFilter] = useState<'all' | 'ready' | 'missing'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMatriculas, setSelectedMatriculas] = useState<Set<string>>(new Set());
  const [expandedMatricula, setExpandedMatricula] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);


  const loadSigep = async () => {
    try {
      setLoading(true);
      setResultMessage(null);
      const res = await apiService.getSigepFichasCadastrais();
      setSigepData(res);
      setSelectedMatriculas(new Set());
    } catch (err: any) {
      console.error('Erro ao carregar dados do SIGEP:', err);
      setResultMessage('Erro ao carregar arquivo de ficha cadastral.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSigep();
  }, []);

  // Comparação e mapeamento de dados
  const comparedItems = useMemo(() => {
    if (!sigepData?.tabelas?.servidores) return [];

    const dbByMat = new Map<string, any>();
    dbProfissionais.forEach((p) => {
      const mat = normMat(p.matricula);
      if (mat) dbByMat.set(mat, p);
    });

    const groupByMat = (rows: any[] = []) => {
      const m = new Map<string, any[]>();
      rows.forEach((r) => {
        const k = normMat(r.matricula);
        if (k) m.set(k, [...(m.get(k) || []), r]);
      });
      return m;
    };
    const t = sigepData.tabelas;
    const cargasPorMat = groupByMat(t.cargas_horarias);
    const cursosPorMat = groupByMat(t.cursos_progressoes);
    const habsPorMat = groupByMat(t.habilitacoes);
    const compsPorMat = groupByMat(t.componentes_curriculares);

    return (sigepData.tabelas.servidores as any[]).map((s) => {
      const mNorm = normMat(s.matricula);
      const dbMatch = mNorm ? dbByMat.get(mNorm) : null;
      return {
        servidor: s,
        dbMatch,
        isLinked: !!dbMatch,
        cargas: mNorm ? cargasPorMat.get(mNorm) || [] : [],
        cursos: mNorm ? cursosPorMat.get(mNorm) || [] : [],
        habilitacoes: mNorm ? habsPorMat.get(mNorm) || [] : [],
        componentes: mNorm ? compsPorMat.get(mNorm) || [] : [],
      };
    });
  }, [sigepData, dbProfissionais]);

  // Filtragem
  const filteredItems = useMemo(() => {
    return comparedItems.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (item.servidor.nome && item.servidor.nome.toLowerCase().includes(q)) ||
        (item.servidor.matricula && item.servidor.matricula.toLowerCase().includes(q)) ||
        (item.servidor.cpf && item.servidor.cpf.includes(q));

      if (!matchSearch) return false;

      if (currentFilter === 'ready') return item.isLinked;
      if (currentFilter === 'missing') return !item.isLinked;
      return true;
    });
  }, [comparedItems, searchQuery, currentFilter]);

  const readyCount = useMemo(() => comparedItems.filter((i) => i.isLinked).length, [comparedItems]);
  const missingCount = comparedItems.length - readyCount;

  // Seleção
  const toggleSelect = (mat: string) => {
    const next = new Set(selectedMatriculas);
    if (next.has(mat)) next.delete(mat);
    else next.add(mat);
    setSelectedMatriculas(next);
  };

  const eligible = filteredItems.filter((i) => i.isLinked).map((i) => i.servidor.matricula);
  const selectAllEligible = () => {
    const allSelected = eligible.every((m) => selectedMatriculas.has(m));
    const next = new Set(selectedMatriculas);
    eligible.forEach((m) => (allSelected ? next.delete(m) : next.add(m)));
    setSelectedMatriculas(next);
  };

  // Executar sincronização
  const handleSyncSelected = async () => {
    if (selectedMatriculas.size === 0) return;
    try {
      setIsProcessing(true);
      setResultMessage(null);
      const res = await apiService.sincronizarSigep(Array.from(selectedMatriculas));
      setResultMessage(
        `✓ ${res.sincronizados} servidores sincronizados com sucesso!` +
          (res.nao_encontrados.length > 0 ? ` (${res.nao_encontrados.length} não encontrados na base local)` : '')
      );
      setSelectedMatriculas(new Set());
      onSynced();
    } catch (err: any) {
      console.error('Erro na sincronização SIGEP:', err);
      setResultMessage('Erro ao sincronizar servidores: ' + (err.message || 'Falha na requisição'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Resumo do Arquivo e Metadados */}
      <div className="p-4 bg-stone-950/80 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                {sigepData?.origem || 'Carregando arquivo...'}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                Ficha Cadastral SIGEP
              </span>
            </div>
            {sigepData?.metadados && (
              <div className="flex items-center gap-3 text-[11px] text-stone-400 mt-0.5">
                <span>Total: <strong className="text-stone-200">{sigepData.metadados.total_servidores}</strong></span>
                <span>•</span>
                <span>Cargas: <strong className="text-stone-200">{sigepData.metadados.total_cargas}</strong></span>
                <span>•</span>
                <span>Cursos: <strong className="text-stone-200">{sigepData.metadados.total_cursos}</strong></span>
                <span>•</span>
                <span>Habilitações: <strong className="text-stone-200">{sigepData.metadados.total_habilitacoes}</strong></span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadSigep}
            disabled={loading}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
            title="Recarregar JSON do disco"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="px-5 pt-3 pb-2 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 bg-stone-900/60">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setCurrentFilter(f.id)}
              className={`pb-2 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                currentFilter === f.id ? f.active : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              {f.label}
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${f.badge}`}>
                {{ ready: readyCount, missing: missingCount, all: comparedItems.length }[f.id]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, matrícula ou CPF..."
            className="pl-9 pr-3 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-xs text-white placeholder-stone-500 focus:outline-none focus:border-indigo-500 w-64"
          />
        </div>
      </div>

      {/* Mensagem de Feedback */}
      {resultMessage && (
        <div className="mx-5 my-2 p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-700/50 text-indigo-200 text-xs flex items-center justify-between">
          <span>{resultMessage}</span>
          <button onClick={() => setResultMessage(null)} className="text-stone-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Lista de Registros */}
      <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="text-xs">Lendo fichas cadastrais do SIGEP...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-stone-500 text-xs">
            Nenhum servidor encontrado com os filtros atuais.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSelected = selectedMatriculas.has(item.servidor.matricula);
            const isExpanded = expandedMatricula === item.servidor.matricula;

            return (
              <div
                key={item.servidor.matricula}
                className={`border rounded-xl transition-all ${
                  isSelected
                    ? 'border-indigo-500/60 bg-indigo-950/15'
                    : 'border-stone-800 bg-stone-900/60 hover:border-stone-700'
                }`}
              >
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => item.isLinked && toggleSelect(item.servidor.matricula)}
                      disabled={!item.isLinked}
                      className={`text-stone-400 hover:text-white transition-colors ${
                        !item.isLinked ? 'opacity-30 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {item.servidor.nome}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300">
                          Mat: {item.servidor.matricula}
                        </span>
                        {item.servidor.cpf && (
                          <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-stone-800/60 text-stone-400">
                            CPF: {item.servidor.cpf}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-stone-400">
                        {item.isLinked ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Vinculado no BD ({item.dbMatch.nome})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Não cadastrado em Profissionais
                          </span>
                        )}

                        <span>•</span>
                        <span className="text-stone-300">
                          Cargo: {item.servidor.cargo || '-'}
                        </span>
                        {item.servidor.ref_sal && (
                          <span className="text-stone-400">
                            (Ref: {item.servidor.ref_sal})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Badges de Coleções */}
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {item.cargas.length > 0 && (
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20" title="Cargas Horárias">
                          {item.cargas.length} Carga(s)
                        </span>
                      )}
                      {item.cursos.length > 0 && (
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20" title="Cursos e Progressões">
                          {item.cursos.length} Curso(s)
                        </span>
                      )}
                      {item.habilitacoes.length > 0 && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Habilitações">
                          {item.habilitacoes.length} Hab.
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setExpandedMatricula(isExpanded ? null : item.servidor.matricula)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
                      title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Detalhes Expandidos */}
                {isExpanded && (
                  <div className="p-4 bg-stone-950/70 border-t border-stone-800/80 space-y-3 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-stone-300">
                      <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                        <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1">
                          Documentação & Pessoal
                        </span>
                        <p><strong>Nasc:</strong> {item.servidor.nascimento || '-'} ({item.servidor.sexo || '-'})</p>
                        <p><strong>CI / RG:</strong> {item.servidor.ci_numero || '-'} {item.servidor.ci_orgao || ''} {item.servidor.ci_uf || ''}</p>
                        <p><strong>PIS/PASEP:</strong> {item.servidor.pis_pasep || '-'}</p>
                        <p><strong>Título:</strong> {item.servidor.titulo_eleitoral || '-'} (Zona {item.servidor.titulo_zona || '-'}, Seção {item.servidor.titulo_secao || '-'})</p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                        <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1">
                          Contato & Endereço
                        </span>
                        <p><strong>Endereço:</strong> {item.servidor.endereco || '-'}</p>
                        <p><strong>Bairro/Cidade:</strong> {item.servidor.bairro || '-'}, {item.servidor.cidade || '-'} - {item.servidor.uf_endereco || '-'}</p>
                        <p><strong>Telefone:</strong> {item.servidor.telefones?.join(' / ') || '-'}</p>
                        <p><strong>Email:</strong> {item.servidor.email || '-'}</p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                        <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1">
                          Funcional SIGEP
                        </span>
                        <p><strong>Admissão:</strong> {item.servidor.admissao || '-'}</p>
                        <p><strong>Concurso:</strong> {item.servidor.especialidade_concurso || '-'}</p>
                        <p><strong>PCD / Redução:</strong> {item.servidor.pcd || 'NÃO'} / {item.servidor.reducao_ch || 'NÃO'}</p>
                        <p><strong>Readaptado:</strong> {item.servidor.readaptado || 'NÃO'}</p>
                      </div>
                    </div>

                    {/* Cargas Horárias */}
                    {item.cargas.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[10px] uppercase font-bold text-indigo-400 block mb-1">
                          Cargas Horárias ({item.cargas.length})
                        </span>
                        <div className="space-y-1">
                          {item.cargas.map((cg: any, idx: number) => (
                            <div key={idx} className="p-2 bg-stone-900/90 rounded border border-stone-800 flex items-center justify-between text-stone-300">
                              <div>
                                <span className="font-semibold text-white">{cg.tipo_carga}</span> — {cg.unidade}
                                {cg.lotacao && <span className="text-stone-400"> ({cg.lotacao})</span>}
                              </div>
                              <div className="flex gap-2 text-stone-400 text-[11px]">
                                {cg.turno && <span className="px-1.5 py-0.2 rounded bg-stone-800 text-stone-300">{cg.turno}</span>}
                                {cg.atuacao && <span className="px-1.5 py-0.2 rounded bg-indigo-900/40 text-indigo-300">{cg.atuacao}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Barra de Ações Inferior da Aba SIGEP */}
      <div className="p-4 border-t border-stone-800 bg-stone-900/95 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={selectAllEligible}
            className="text-xs font-medium text-stone-300 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
            Selecionar Todos Prontos ({eligible.length})
          </button>
          <span className="text-xs text-stone-400">
            {selectedMatriculas.size} selecionado(s) para importação
          </span>
        </div>

        <button
          onClick={handleSyncSelected}
          disabled={isProcessing || selectedMatriculas.size === 0}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center gap-2 shadow-lg shadow-indigo-900/20 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
          Sincronizar Complementares ({selectedMatriculas.size})
        </button>
      </div>
    </div>
  );
};
