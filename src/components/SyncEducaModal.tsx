import React, { useState, useEffect, useMemo } from 'react';
import { X, RefreshCw, CheckSquare, Square, UserPlus, AlertTriangle, CheckCircle, Database, Search, ArrowRight, FileText, Layers } from 'lucide-react';
import { apiService, normMat } from '../services/api';
import { SyncSigepTab } from './SyncSigepTab';
import { SyncGhTab } from './SyncGhTab';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSynced: () => void; // callback para recarregar a lista no componente pai
}

interface JsonRecord {
  matricula: string;
  nome: string;
  cargo_especialidade: string | null;
  disciplina: string | null;
  carga_horaria: number | string | null;
  funcao: string | null;
  vinculo?: string;
  arquivo?: string;
}

interface ComparedItem {
  uniqueId: string;
  json: JsonRecord;
  db: any | null;
  isNew: boolean;
  hasDifferences: boolean;
  diffs: {
    disciplina: { old: string; new: string; changed: boolean };
    funcao: { old: string; new: string; changed: boolean };
    cargo: { old: string; new: string; changed: boolean };
    ch: { old: string; new: string; changed: boolean };
  };
}

export const SyncEducaModal: React.FC<Props> = ({ isOpen, onClose, onSynced }) => {
  const [sourceMode, setSourceMode] = useState<'educasync' | 'sigep' | 'gh'>('educasync');
  const [loading, setLoading] = useState(false);
  const [jsonRecords, setJsonRecords] = useState<JsonRecord[]>([]);
  const [dbProfissionais, setDbProfissionais] = useState<any[]>([]);
  const [currentTab, setCurrentTab] = useState<'divergent' | 'new' | 'synced' | 'all'>('divergent');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Checkbox granular de campos
  const [syncFields, setSyncFields] = useState({
    disciplina: true,
    funcao: true,
    cargo: true,
    ch: true,
  });

  // Normalização de nome (matrícula: normMat de services/api)
  const normName = (n: any) => {
    if (!n) return '';
    return String(n).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  };

  // Carregar dados quando o modal abre
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profs, educaData] = await Promise.all([
        apiService.getProfissionais(),
        apiService.getEducaSyncDados().catch(() => ({ dados: [] }))
      ]);

      setDbProfissionais(profs || []);
      setJsonRecords(educaData.dados || []);
      setSelectedIds(new Set());
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    setExtracting(true);
    setExtractMsg(null);
    try {
      const res = await apiService.extrairEducaSync();
      await loadData();
      setExtractMsg({ ok: true, text: `${res.total} registros extraídos dos PDFs` });
    } catch (err: any) {
      setExtractMsg({ ok: false, text: err.message || 'Falha na extração' });
    } finally {
      setExtracting(false);
    }
  };

  // Processar comparação
  const comparedItems: ComparedItem[] = useMemo(() => {
    const dbByMat = new Map<string, any>();
    const dbByName = new Map<string, any>();

    dbProfissionais.forEach(p => {
      const mat = normMat(p.matricula);
      const name = normName(p.nome);
      if (mat) dbByMat.set(mat, p);
      if (name) dbByName.set(name, p);
    });

    return jsonRecords.map((jItem, index) => {
      const jMatNorm = normMat(jItem.matricula);
      const jNameNorm = normName(jItem.nome);

      let match = null;
      if (jMatNorm && dbByMat.has(jMatNorm)) {
        match = dbByMat.get(jMatNorm);
      } else if (jNameNorm && dbByName.has(jNameNorm)) {
        match = dbByName.get(jNameNorm);
      }

      const item: ComparedItem = {
        uniqueId: jItem.matricula || `temp_${index}`,
        json: jItem,
        db: match,
        isNew: !match,
        hasDifferences: false,
        diffs: {
          disciplina: { old: '', new: '', changed: false },
          funcao: { old: '', new: '', changed: false },
          cargo: { old: '', new: '', changed: false },
          ch: { old: '', new: '', changed: false },
        }
      };

      if (match) {
        // Disciplina
        const jDisc = (jItem.disciplina || '').trim();
        const dbDisc = (match.disciplina || '').trim();
        const discChanged = jDisc.toUpperCase() !== dbDisc.toUpperCase();
        item.diffs.disciplina = { old: match.disciplina || '(vazio)', new: jItem.disciplina || '(vazio)', changed: discChanged };

        // Função
        const jFunc = (jItem.funcao || '').trim();
        const dbFunc = (match.funcao || '').trim();
        const funcChanged = jFunc.toUpperCase() !== dbFunc.toUpperCase();
        item.diffs.funcao = { old: match.funcao || '(vazio)', new: jItem.funcao || '(vazio)', changed: funcChanged };

        // Cargo
        const jCargo = (jItem.cargo_especialidade || '').trim();
        const dbCargo = (match.cargo || '').trim();
        const cargoChanged = !!(jCargo && jCargo.toUpperCase() !== dbCargo.toUpperCase());
        item.diffs.cargo = { old: match.cargo || '(vazio)', new: jItem.cargo_especialidade || '(vazio)', changed: cargoChanged };

        // CH
        const jCh = String(jItem.carga_horaria || '').trim();
        const dbCh = String(match.carga_horaria || '').trim();
        const chChanged = !!(jCh && jCh !== dbCh);
        item.diffs.ch = { old: match.carga_horaria ? `${match.carga_horaria}h` : '(vazio)', new: jItem.carga_horaria ? `${jItem.carga_horaria}h` : '(vazio)', changed: chChanged };

        // Diferença total respeitando os checkboxes ativos
        item.hasDifferences = (
          (syncFields.disciplina && discChanged) ||
          (syncFields.funcao && funcChanged) ||
          (syncFields.cargo && cargoChanged) ||
          (syncFields.ch && chChanged)
        );
      }

      return item;
    });
  }, [jsonRecords, dbProfissionais, syncFields]);

  // Contadores
  const totalDivergent = useMemo(() => comparedItems.filter(i => !i.isNew && i.hasDifferences).length, [comparedItems]);
  const totalNew = useMemo(() => comparedItems.filter(i => i.isNew).length, [comparedItems]);
  const totalSynced = useMemo(() => comparedItems.filter(i => !i.isNew && !i.hasDifferences).length, [comparedItems]);

  // Itens filtrados
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return comparedItems.filter(item => {
      if (currentTab === 'divergent' && (item.isNew || !item.hasDifferences)) return false;
      if (currentTab === 'new' && !item.isNew) return false;
      if (currentTab === 'synced' && (item.isNew || item.hasDifferences)) return false;

      if (q) {
        const nome = (item.json.nome || '').toLowerCase();
        const mat = (item.json.matricula || '').toLowerCase();
        const disc = (item.json.disciplina || '').toLowerCase();
        return nome.includes(q) || mat.includes(q) || disc.includes(q);
      }
      return true;
    });
  }, [comparedItems, currentTab, searchQuery]);

  // Selecionar/Deselecionar
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.uniqueId)));
    }
  };

  // Sincronizar em Lote
  const handleSyncSelected = async () => {
    const targets = Array.from(selectedIds)
      .map(id => comparedItems.find(i => i.uniqueId === id))
      .filter((i): i is ComparedItem => !!i && !i.isNew && i.hasDifferences);

    if (targets.length === 0) return;

    setIsProcessing(true);
    let success = 0;

    for (let idx = 0; idx < targets.length; idx++) {
      const item = targets[idx];
      setProgress({ current: idx + 1, total: targets.length, label: item.json.nome });

      const payload = { ...item.db };
      if (syncFields.disciplina && item.json.disciplina !== undefined) payload.disciplina = item.json.disciplina;
      if (syncFields.funcao && item.json.funcao !== undefined) payload.funcao = item.json.funcao || '';
      if (syncFields.cargo && item.json.cargo_especialidade) payload.cargo = item.json.cargo_especialidade;
      if (syncFields.ch && item.json.carga_horaria) payload.carga_horaria = String(item.json.carga_horaria);

      try {
        await apiService.updateProfissional(item.db.id, payload);
        success++;
      } catch (e) {
        console.error('Erro ao atualizar:', item.json.nome, e);
      }
    }

    setIsProcessing(false);
    setProgress(null);
    setSelectedIds(new Set());
    await loadData();
    onSynced();
  };

  // Criar Novos em Lote
  const handleCreateSelected = async () => {
    const targets = Array.from(selectedIds)
      .map(id => comparedItems.find(i => i.uniqueId === id))
      .filter((i): i is ComparedItem => !!i && i.isNew);

    if (targets.length === 0) return;

    setIsProcessing(true);
    let success = 0;

    for (let idx = 0; idx < targets.length; idx++) {
      const item = targets[idx];
      setProgress({ current: idx + 1, total: targets.length, label: item.json.nome });

      const payload = {
        nome: item.json.nome,
        matricula: item.json.matricula || null,
        cargo: item.json.cargo_especialidade || 'PROFESSOR DE EDUC. BASICA',
        disciplina: item.json.disciplina || null,
        funcao: item.json.funcao || '',
        carga_horaria: String(item.json.carga_horaria || '40'),
        ua: '005',
        exercicio: '990210000029',
        unidade_lotacao: 'CENTRO DE EDUC PROF ESCOLA TEC DO GUARA PROF TERESA ONDINA M',
        status: 'ATIVO',
        turno1: 'Noturno',
        turno2: ''
      };

      try {
        await apiService.createProfissional(payload);
        success++;
      } catch (e) {
        console.error('Erro ao criar:', item.json.nome, e);
      }
    }

    setIsProcessing(false);
    setProgress(null);
    setSelectedIds(new Set());
    await loadData();
    onSynced();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-stone-900 text-stone-100 border border-stone-800 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-stone-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Sincronizar com EducaSync
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  JSON ↔ MySQL
                </span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Atualize disciplinas, funções e cargos ou cadastre novos profissionais extraídos do PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/sync"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
            >
              Abrir Standalone ↗
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Seletor de Módulos (Abas Principais) */}
        <div className="bg-stone-950 px-5 pt-2 border-b border-stone-800 flex items-center gap-4">
          <button
            onClick={() => setSourceMode('educasync')}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              sourceMode === 'educasync'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Database className="w-4 h-4" />
            EducaSync (Dados Básicos da Folha)
          </button>

          <button
            onClick={() => setSourceMode('gh')}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              sourceMode === 'gh'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            EducaSync (Carências/Histórico)
          </button>

          <button
            onClick={() => setSourceMode('sigep')}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              sourceMode === 'sigep'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            SIGEP (Fichas Cadastrais Complementares)
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Novo
            </span>
          </button>
        </div>

        {sourceMode === 'gh' ? (
          <SyncGhTab onSynced={onSynced} />
        ) : sourceMode === 'sigep' ? (
          <SyncSigepTab
            dbProfissionais={dbProfissionais}
            onSynced={() => {
              loadData();
              onSynced();
            }}
          />
        ) : (
          <>
            {/* Barra de Configuração e Checkboxes */}
            <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Campos para Sincronizar:
            </span>
            
            <label className="flex items-center gap-1.5 text-xs font-medium text-stone-300 cursor-pointer select-none bg-stone-800/60 px-2.5 py-1 rounded-lg border border-stone-700 hover:border-cyan-500">
              <input
                type="checkbox"
                checked={syncFields.disciplina}
                onChange={(e) => setSyncFields({ ...syncFields, disciplina: e.target.checked })}
                className="rounded accent-cyan-500"
              />
              Disciplina
            </label>

            <label className="flex items-center gap-1.5 text-xs font-medium text-stone-300 cursor-pointer select-none bg-stone-800/60 px-2.5 py-1 rounded-lg border border-stone-700 hover:border-cyan-500">
              <input
                type="checkbox"
                checked={syncFields.funcao}
                onChange={(e) => setSyncFields({ ...syncFields, funcao: e.target.checked })}
                className="rounded accent-cyan-500"
              />
              Função
            </label>

            <label className="flex items-center gap-1.5 text-xs font-medium text-stone-300 cursor-pointer select-none bg-stone-800/60 px-2.5 py-1 rounded-lg border border-stone-700 hover:border-cyan-500">
              <input
                type="checkbox"
                checked={syncFields.cargo}
                onChange={(e) => setSyncFields({ ...syncFields, cargo: e.target.checked })}
                className="rounded accent-cyan-500"
              />
              Cargo / Esp.
            </label>

            <label className="flex items-center gap-1.5 text-xs font-medium text-stone-300 cursor-pointer select-none bg-stone-800/60 px-2.5 py-1 rounded-lg border border-stone-700 hover:border-cyan-500">
              <input
                type="checkbox"
                checked={syncFields.ch}
                onChange={(e) => setSyncFields({ ...syncFields, ch: e.target.checked })}
                className="rounded accent-cyan-500"
              />
              Carga Horária
            </label>
          </div>

          <div className="flex items-center gap-3">
            {extractMsg && (
              <span className={`text-xs ${extractMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{extractMsg.text}</span>
            )}
            <button
              onClick={handleExtract}
              disabled={extracting || isProcessing}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 border border-stone-700 flex items-center gap-2"
            >
              <FileText className={`w-4 h-4 ${extracting ? 'animate-pulse' : ''}`} />
              {extracting ? 'Extraindo...' : 'Extrair PDFs'}
            </button>
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou matrícula..."
                className="pl-9 pr-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-xs text-white placeholder-stone-500 focus:outline-none focus:border-cyan-500 w-64"
              />
            </div>
          </div>
        </div>

        {/* Abas e Métricas */}
        <div className="px-5 pt-3 border-b border-stone-800 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentTab('divergent')}
              className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                currentTab === 'divergent'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              Divergências
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-400">
                {totalDivergent}
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('new')}
              className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                currentTab === 'new'
                  ? 'border-emerald-400 text-emerald-300'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              Novos Cadastros
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400">
                {totalNew}
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('synced')}
              className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                currentTab === 'synced'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              Já Sincronizados
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-800 text-stone-400">
                {totalSynced}
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('all')}
              className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                currentTab === 'all'
                  ? 'border-white text-white'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              Todos
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-800 text-stone-400">
                {comparedItems.length}
              </span>
            </button>
          </div>

          <div className="pb-2 text-xs text-stone-400 flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="text-xs text-stone-300 hover:text-white underline cursor-pointer"
            >
              {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? 'Deselecionar todos' : 'Selecionar visíveis'}
            </button>
            <span>•</span>
            <span><strong>{selectedIds.size}</strong> selecionados</span>
          </div>
        </div>

        {/* Lista / Tabela */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-20 text-center text-stone-400 text-sm">Carregando dados...</div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center text-stone-400 text-sm">Nenhum registro encontrado nesta exibição.</div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map(item => {
                const isSelected = selectedIds.has(item.uniqueId);
                return (
                  <div
                    key={item.uniqueId}
                    onClick={() => toggleSelect(item.uniqueId)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-cyan-950/30 border-cyan-500/50'
                        : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="pt-0.5">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Square className="w-4 h-4 text-stone-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-white">{item.json.nome}</span>
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-cyan-400 border border-stone-700">
                            {item.json.matricula || 'S/ MATRÍCULA'}
                          </span>
                          {item.isNew ? (
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Novo
                            </span>
                          ) : item.hasDifferences ? (
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              Divergente
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
                              Idêntico
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-400 mt-0.5">
                          {item.json.cargo_especialidade || 'Cargo não informado'}
                        </div>
                      </div>
                    </div>

                    {/* Diffs */}
                    <div className="text-xs flex flex-wrap items-center gap-3 pl-7 md:pl-0">
                      {item.isNew ? (
                        <div className="text-stone-400 text-xs flex items-center gap-2">
                          <span>Vínculo: <strong className="text-emerald-400">{item.json.vinculo || 'efetivo'}</strong></span>
                          <span>•</span>
                          <span>Disciplina: <strong className="text-white">{item.json.disciplina || '—'}</strong></span>
                        </div>
                      ) : (
                        <>
                          {syncFields.disciplina && item.diffs.disciplina.changed && (
                            <div className="flex items-center gap-1.5 bg-stone-950 px-2 py-1 rounded border border-stone-800">
                              <span className="text-[10px] uppercase text-stone-500 font-bold">Disc:</span>
                              <span className="text-red-400 line-through">{item.diffs.disciplina.old}</span>
                              <ArrowRight className="w-3 h-3 text-stone-500" />
                              <span className="text-emerald-400 font-medium">{item.diffs.disciplina.new}</span>
                            </div>
                          )}

                          {syncFields.funcao && item.diffs.funcao.changed && (
                            <div className="flex items-center gap-1.5 bg-stone-950 px-2 py-1 rounded border border-stone-800">
                              <span className="text-[10px] uppercase text-stone-500 font-bold">Func:</span>
                              <span className="text-red-400 line-through">{item.diffs.funcao.old}</span>
                              <ArrowRight className="w-3 h-3 text-stone-500" />
                              <span className="text-emerald-400 font-medium">{item.diffs.funcao.new}</span>
                            </div>
                          )}

                          {syncFields.cargo && item.diffs.cargo.changed && (
                            <div className="flex items-center gap-1.5 bg-stone-950 px-2 py-1 rounded border border-stone-800">
                              <span className="text-[10px] uppercase text-stone-500 font-bold">Cargo:</span>
                              <span className="text-emerald-400 font-medium">{item.diffs.cargo.new}</span>
                            </div>
                          )}

                          {syncFields.ch && item.diffs.ch.changed && (
                            <div className="flex items-center gap-1.5 bg-stone-950 px-2 py-1 rounded border border-stone-800">
                              <span className="text-[10px] uppercase text-stone-500 font-bold">CH:</span>
                              <span className="text-red-400 line-through">{item.diffs.ch.old}</span>
                              <ArrowRight className="w-3 h-3 text-stone-500" />
                              <span className="text-emerald-400 font-medium">{item.diffs.ch.new}</span>
                            </div>
                          )}

                          {!item.hasDifferences && (
                            <div className="text-stone-500 text-xs flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5 text-stone-400" />
                              Campos conferidos
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

            {/* Rodapé com Ações */}
            <div className="p-4 border-t border-stone-800 bg-stone-900/90 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-stone-400">
                {isProcessing && progress ? (
                  <span className="text-cyan-400 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Processando ({progress.current}/{progress.total}): {progress.label}
                  </span>
                ) : (
                  <span>Selecione os registros para sincronizar dados ou criar cadastros locais.</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-stone-400 hover:text-white transition-colors"
                >
                  Fechar
                </button>

                {currentTab === 'new' ? (
                  <button
                    onClick={handleCreateSelected}
                    disabled={isProcessing || selectedIds.size === 0}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                  >
                    <UserPlus className="w-4 h-4" />
                    Criar {selectedIds.size} Servidores na Base
                  </button>
                ) : (
                  <button
                    onClick={handleSyncSelected}
                    disabled={isProcessing || selectedIds.size === 0}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white flex items-center gap-2 shadow-lg shadow-cyan-900/20"
                  >
                    <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                    Sincronizar {selectedIds.size} Selecionados
                  </button>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
