import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { apiService, GhArquivo, GhSyncResumo, GhPendencia } from '../services/api';

interface Props {
  onSynced: () => void;
}

const PendenciaList: React.FC<{ titulo: string; itens: GhPendencia[]; cor: string }> = ({ titulo, itens, cor }) => {
  if (itens.length === 0) return null;
  return (
    <div className={`rounded-lg border p-3 ${cor}`}>
      <h4 className="text-xs font-bold mb-2">
        {titulo} <span className="tabular-nums">({itens.length})</span>
      </h4>
      <ul className="space-y-1 text-[11px] max-h-48 overflow-y-auto">
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

export const SyncGhTab: React.FC<Props> = ({ onSynced }) => {
  const [arquivos, setArquivos] = useState<GhArquivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resumo, setResumo] = useState<GhSyncResumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const loadArquivos = async () => {
    try {
      setLoading(true);
      setErro(null);
      const res = await apiService.getGhArquivos();
      setArquivos(res.arquivos);
    } catch (err) {
      console.error('Erro ao listar arquivos da GH:', err);
      setErro('Não foi possível listar os arquivos da pasta gh/.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArquivos();
  }, []);

  const handleSync = async () => {
    try {
      setIsProcessing(true);
      setErro(null);
      setResumo(await apiService.sincronizarGh());
      onSynced();
    } catch (err) {
      console.error('Erro ao sincronizar GH:', err);
      setErro('Falha ao sincronizar as carências. Verifique o servidor e tente de novo.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4 text-stone-200">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-stone-400">
          Lê <span className="font-mono">gh/GH.N.sem.AAAA.json</span> e o respectivo <span className="font-mono">.historico.json</span>.
          Nunca apaga: carência que sai do arquivo permanece no banco.
        </p>
        <button
          onClick={handleSync}
          disabled={isProcessing || loading || arquivos.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
          {isProcessing ? 'Sincronizando…' : 'Sincronizar GH'}
        </button>
      </div>

      {erro && (
        <div role="alert" className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {erro}
        </div>
      )}

      <div className="border border-stone-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-900 text-stone-400 text-[11px]">
            <tr>
              <th className="p-2.5 font-medium">Semestre</th>
              <th className="p-2.5 font-medium">Arquivo</th>
              <th className="p-2.5 font-medium">Histórico</th>
              <th className="p-2.5 font-medium text-right">Carências</th>
              <th className="p-2.5 font-medium">Modificado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800">
            {loading ? (
              <tr><td colSpan={5} className="p-6 text-center text-stone-500">Carregando…</td></tr>
            ) : arquivos.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-stone-500">Nenhum arquivo GH.N.sem.AAAA.json encontrado em gh/.</td></tr>
            ) : (
              arquivos.map((a) => (
                <tr key={a.arquivo}>
                  <td className="p-2.5 font-semibold tabular-nums">{a.ano}.{a.semestre}</td>
                  <td className="p-2.5 font-mono flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-stone-500" />{a.arquivo}</td>
                  <td className="p-2.5">
                    {a.historico ? <span className="text-emerald-400">{a.historico}</span> : <span className="text-amber-400">ausente</span>}
                  </td>
                  <td className="p-2.5 text-right tabular-nums">{a.total_carencias}</td>
                  <td className="p-2.5 tabular-nums text-stone-400">{a.modificado_em}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {resumo && (
        <div className="space-y-3">
          <div role="status" className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              {resumo.carencias.novas} carência(s) nova(s), {resumo.carencias.atualizadas} atualizada(s),{' '}
              {resumo.eventos_novos} evento(s) de histórico novo(s).
            </span>
          </div>
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
    </div>
  );
};
