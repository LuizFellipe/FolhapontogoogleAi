import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, CheckSquare, Square, Search, ArrowRight, ChevronDown, RotateCw } from 'lucide-react';
import { apiService, GhArquivo, GhComparacao, GhSyncResumo, GhPendencia, GhGrupo, GhMotivo } from '../services/api';

interface Props {
  onSynced: () => void;
}

type Aba = 'divergent' | 'new' | 'synced' | 'all';

const GRUPOS_UI: { id: GhGrupo; label: string }[] = [
  { id: 'situacao', label: 'Situação' },
  { id: 'pessoas', label: 'Titular / Substituto' },
  { id: 'dados', label: 'Período / Tipo / Componente' },
  { id: 'historico', label: 'Histórico (eventos)' },
];

const MOTIVO_LABEL: Record<GhMotivo, string> = {
  situacao_mudou: 'Situação mudou',
  pessoas_mudaram: 'Titular/substituto mudou',
  dados_mudaram: 'Dados da carência mudaram',
  servidor_vinculado: 'Servidor agora vinculado',
  servidor_desvinculado: 'Servidor desvinculado',
  eventos_novos: 'Eventos novos no histórico',
};

const fmtData = (s: string | null) => s || '—';

const CAMPO_LABEL: Record<string, string> = {
  situacao: 'Situação',
  titular_nome: 'Titular',
  substituto_nome: 'Substituto',
  substituto_doc: 'Doc. subst.',
  periodo: 'Período',
  tipo: 'Tipo',
  componente: 'Componente',
  nome_carga_horaria: 'Carga horária',
  cod_carencia_pai: 'Origem',
  titular_profissional_id: 'Vínculo titular',
  substituto_profissional_id: 'Vínculo subst.',
};

const PendenciaList: React.FC<{ titulo: string; itens: GhPendencia[]; cor: string }> = ({ titulo, itens, cor }) => {
  if (itens.length === 0) return null;
  return (
    <div className={`rounded-lg border p-3 ${cor}`}>
      <h4 className="text-xs font-bold mb-2">
        {titulo} <span className="tabular-nums">({itens.length})</span>
      </h4>
      <ul className="space-y-1 text-[11px] max-h-40 overflow-y-auto">
        {itens.map((p, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="font-mono tabular-nums text-stone-400">
              {p.ano}.{p.semestre} #{p.cod_carencia}
            </span>
            <span className="uppercase text-[10px] text-stone-400">{p.papel}</span>
            <span className="font-medium">{p.nome}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const tabCls = (ativa: boolean, cor: string) =>
  `pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
    ativa ? cor : 'border-transparent text-stone-400 hover:text-stone-200'
  }`;

export const SyncGhTab: React.FC<Props> = ({ onSynced }) => {
  const [arquivos, setArquivos] = useState<GhArquivo[]>([]);
  const [itens, setItens] = useState<GhComparacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resumo, setResumo] = useState<GhSyncResumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<Aba>('divergent');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [grupos, setGrupos] = useState<Set<GhGrupo>>(new Set(GRUPOS_UI.map((g) => g.id)));
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const load = async () => {
    try {
      setLoading(true);
      setErro(null);
      const [arqs, comp] = await Promise.all([apiService.getGhArquivos(), apiService.compararGh(Array.from(grupos))]);
      setArquivos(arqs.arquivos);
      setItens(comp.carencias);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Erro ao carregar dados da GH:', err);
      setErro('Não foi possível ler a pasta gh/ ou comparar com o banco. Verifique o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [grupos]);

  const totalDivergent = useMemo(() => itens.filter((i) => i.status === 'divergente').length, [itens]);
  const totalNew = useMemo(() => itens.filter((i) => i.status === 'novo').length, [itens]);
  const totalSynced = useMemo(() => itens.filter((i) => i.status === 'sincronizado').length, [itens]);

  const filtrados = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return itens.filter((i) => {
      if (currentTab === 'divergent' && i.status !== 'divergente') return false;
      if (currentTab === 'new' && i.status !== 'novo') return false;
      if (currentTab === 'synced' && i.status !== 'sincronizado') return false;
      if (!q) return true;
      return [i.cod_carencia, i.nome_carga_horaria, i.componente, i.titular_nome, i.substituto_nome]
        .some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [itens, currentTab, searchQuery]);

  const toggleSelect = (chave: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(chave)) next.delete(chave);
      else next.add(chave);
      return next;
    });

  const todosMarcados = filtrados.length > 0 && filtrados.every((i) => selectedIds.has(i.chave));
  const toggleSelectAll = () => setSelectedIds(todosMarcados ? new Set() : new Set(filtrados.map((i) => i.chave)));

  const toggleGrupo = (id: GhGrupo) =>
    setGrupos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleExpandido = (chave: string) =>
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(chave)) next.delete(chave);
      else next.add(chave);
      return next;
    });

  const handleSync = async (chaves: string[] = Array.from(selectedIds)) => {
    if (chaves.length === 0) return;
    try {
      setIsProcessing(true);
      setErro(null);
      setResumo(await apiService.sincronizarGh(chaves, Array.from(grupos)));
      await load();
      onSynced();
    } catch (err) {
      console.error('Erro ao sincronizar GH:', err);
      setErro('Falha ao sincronizar as carências. Verifique o servidor e tente de novo.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Campos para Sincronizar:</span>
          {GRUPOS_UI.map((g) => (
            <label
              key={g.id}
              className="flex items-center gap-1.5 text-xs font-medium text-stone-300 cursor-pointer select-none bg-stone-800/60 px-2.5 py-1 rounded-lg border border-stone-700 hover:border-cyan-500"
            >
              <input
                type="checkbox"
                checked={grupos.has(g.id)}
                onChange={() => toggleGrupo(g.id)}
                className="rounded accent-cyan-500"
              />
              {g.label}
            </label>
          ))}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por código, componente ou nome..."
            className="pl-9 pr-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-xs text-white placeholder-stone-500 focus:outline-none focus:border-cyan-500 w-72"
          />
        </div>
      </div>

      <div className="px-5 py-2 bg-stone-950/40 border-b border-stone-800">
        <p className="text-xs text-stone-400">
          {arquivos.length === 0
            ? 'Nenhum arquivo GH.N.sem.AAAA.json em gh/.'
            : arquivos.map((a) => `${a.ano}.${a.semestre} (${a.total_carencias}${a.historico ? '' : ', sem histórico'})`).join(' • ')}
          {' — '}nunca apaga: carência que sai do arquivo permanece no banco.
        </p>
      </div>

      <div className="px-5 pt-3 border-b border-stone-800 flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setCurrentTab('divergent')} className={tabCls(currentTab === 'divergent', 'border-amber-400 text-amber-300')}>
            Divergências
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-400">{totalDivergent}</span>
          </button>
          <button onClick={() => setCurrentTab('new')} className={tabCls(currentTab === 'new', 'border-emerald-400 text-emerald-300')}>
            Novos Cadastros
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400">{totalNew}</span>
          </button>
          <button onClick={() => setCurrentTab('synced')} className={tabCls(currentTab === 'synced', 'border-cyan-400 text-cyan-300')}>
            Já Sincronizados
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-800 text-stone-400">{totalSynced}</span>
          </button>
          <button onClick={() => setCurrentTab('all')} className={tabCls(currentTab === 'all', 'border-white text-white')}>
            Todos
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-800 text-stone-400">{itens.length}</span>
          </button>
        </div>

        <div className="pb-2 text-xs text-stone-400 flex items-center gap-2">
          <button onClick={toggleSelectAll} className="text-xs text-stone-300 hover:text-white underline cursor-pointer">
            {todosMarcados ? 'Deselecionar todos' : 'Selecionar visíveis'}
          </button>
          <span>•</span>
          <span><strong>{selectedIds.size}</strong> selecionados</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {erro && (
          <div role="alert" className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {erro}
          </div>
        )}

        {resumo && (
          <div className="space-y-3 mb-3">
            <div role="status" className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                {resumo.resultados.filter((r) => r.ok).length} de {resumo.resultados.length} sincronizada(s):{' '}
                {resumo.carencias.novas} nova(s), {resumo.carencias.atualizadas} atualizada(s),{' '}
                {resumo.eventos_novos} evento(s) de histórico novo(s).
              </span>
            </div>
            {resumo.falhas.length > 0 && (
              <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 p-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h4 className="text-xs font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Não sincronizadas <span className="tabular-nums">({resumo.falhas.length})</span>
                  </h4>
                  <button
                    onClick={() => handleSync(resumo.falhas.map((f) => f.chave))}
                    disabled={isProcessing}
                    className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white flex items-center gap-1.5"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                    Tentar novamente ({resumo.falhas.length})
                  </button>
                </div>
                <ul className="space-y-1 text-[11px] max-h-40 overflow-y-auto">
                  {resumo.falhas.map((f) => (
                    <li key={f.chave} className="flex items-start gap-2">
                      <span className="font-mono tabular-nums text-red-300 flex-shrink-0">{f.chave}</span>
                      <span>{f.motivo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <PendenciaList
              titulo="Ambíguos (mais de um servidor com o mesmo nome/doc, não vinculados)"
              itens={resumo.ambiguos}
              cor="bg-amber-500/10 border-amber-500/30 text-amber-200"
            />
            <PendenciaList
              titulo="Não casados (servidor não encontrado na base)"
              itens={resumo.nao_casados}
              cor="bg-stone-900 border-stone-700 text-stone-200"
            />
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-stone-400 text-sm">Carregando dados...</div>
        ) : filtrados.length === 0 ? (
          <div className="py-16 text-center text-stone-400 text-sm">Nenhum registro encontrado nesta exibição.</div>
        ) : (
          filtrados.map((item) => {
            const marcado = selectedIds.has(item.chave);
            const semVinculo =
              (item.titular_nome && !item.titular_casado) || (item.substituto_nome && !item.substituto_casado);
            return (
              <div
                key={item.chave}
                onClick={() => toggleSelect(item.chave)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:flex-wrap md:items-center justify-between gap-3 ${
                  marcado ? 'bg-cyan-950/30 border-cyan-500/50' : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="pt-0.5">
                    {marcado ? <CheckSquare className="w-4 h-4 text-cyan-400" /> : <Square className="w-4 h-4 text-stone-500" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-white">{item.nome_carga_horaria || '—'}</span>
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-cyan-400 border border-stone-700">
                        {item.ano}.{item.semestre} #{item.cod_carencia}
                      </span>
                      {item.status === 'novo' ? (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Novo</span>
                      ) : item.status === 'divergente' ? (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">Divergente</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">Idêntico</span>
                      )}
                    </div>
                    {item.motivos.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {item.motivos.map((m) => (
                          <span key={m} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            {MOTIVO_LABEL[m] || m}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-stone-400 mt-0.5 truncate">
                      {item.componente || 'Componente não informado'} • {item.situacao || '—'}
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5 flex flex-wrap items-center gap-x-3">
                      {item.titular_nome && <span>Titular: <span className="text-stone-300">{item.titular_nome}</span></span>}
                      {item.substituto_nome && <span>Substituto: <span className="text-stone-300">{item.substituto_nome}</span></span>}
                      {semVinculo && (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> servidor sem vínculo na base
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-xs flex flex-wrap items-center gap-3 pl-7 md:pl-0">
                  {item.status === 'novo' ? (
                    <span className="text-stone-400">{item.total_eventos} evento(s) de histórico</span>
                  ) : item.status === 'sincronizado' ? (
                    <div className="text-stone-500 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-stone-400" />
                      Campos conferidos
                    </div>
                  ) : (
                    <>
                      {item.diffs.map((d) => (
                        <div key={d.campo} className="flex items-center gap-1.5 bg-stone-950 px-2 py-1 rounded border border-stone-800">
                          <span className="text-[10px] uppercase text-stone-500 font-bold">{CAMPO_LABEL[d.campo] || d.campo}:</span>
                          <span className="text-red-400 line-through">{d.antes ?? '(vazio)'}</span>
                          <ArrowRight className="w-3 h-3 text-stone-500" />
                          <span className="text-emerald-400 font-medium">{d.depois ?? '(vazio)'}</span>
                        </div>
                      ))}
                      {item.eventos_novos > 0 && (
                        <span className="px-2 py-1 rounded border border-stone-800 bg-stone-950 text-emerald-400">
                          +{item.eventos_novos} evento(s)
                        </span>
                      )}
                    </>
                  )}
                  {item.eventos.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleExpandido(item.chave); }}
                      aria-expanded={expandidos.has(item.chave)}
                      className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-white"
                    >
                      Eventos
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandidos.has(item.chave) ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                {expandidos.has(item.chave) && item.eventos.length > 0 && (
                  <div className="basis-full pl-7 md:pl-7" onClick={(e) => e.stopPropagation()}>
                    <ol className="space-y-1.5 border-l-2 border-stone-700 pl-3 text-[11px]">
                      {item.eventos.map((e, i) => (
                        <li key={i}>
                          <span className="tabular-nums text-stone-500">{fmtData(e.data)}</span>{' '}
                          <span className="text-stone-200 font-medium">{e.situacao || '—'}</span>
                          {e.nome && <span className="text-stone-500"> • {e.nome}</span>}
                          {e.observacao && <p className="text-stone-400">{e.observacao}</p>}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-stone-800 bg-stone-900/90 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-stone-400">
          {isProcessing ? (
            <span className="text-cyan-400 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Sincronizando {selectedIds.size} carência(s)…
            </span>
          ) : (
            <span>Selecione as carências para gravar no banco. Só os campos marcados acima são atualizados; carência nova entra completa.</span>
          )}
        </div>
        <button
          onClick={() => handleSync()}
          disabled={isProcessing || loading || selectedIds.size === 0}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white flex items-center gap-2 shadow-lg shadow-cyan-900/20"
        >
          <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
          Sincronizar {selectedIds.size} Selecionadas
        </button>
      </div>
    </>
  );
};
