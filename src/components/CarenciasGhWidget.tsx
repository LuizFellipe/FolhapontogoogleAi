import React, { useState, useEffect, useId, useMemo } from 'react';
import { ClipboardList, ChevronDown, RefreshCw, History } from 'lucide-react';
import { apiService, GhCarencia } from '../services/api';

interface Props {
  profissionalId?: number;
}

const chip = 'inline-flex items-center gap-1 text-[11px] text-stone-600 bg-white border border-stone-200 rounded-md px-2 py-0.5';

const situacaoCls = (s: string | null) => {
  if (!s) return 'bg-stone-100 text-stone-600';
  if (/exerc[ií]cio/i.test(s)) return 'bg-emerald-50 text-emerald-700';
  if (/rejeitad/i.test(s)) return 'bg-red-50 text-red-700';
  if (/finalizada/i.test(s)) return 'bg-stone-100 text-stone-600';
  return 'bg-indigo-50 text-indigo-700'; // Aprovada, Aceita e demais em andamento
};

// 'YYYY-MM-DD HH:MM:SS' -> 'DD/MM/AAAA HH:MM'
const fmtDataHora = (s: string | null) => {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}` : '—';
};

export const CarenciasGhWidget: React.FC<Props> = ({ profissionalId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [carencias, setCarencias] = useState<GhCarencia[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const bodyId = useId();

  useEffect(() => {
    setCarencias([]);
    setOpenId(null);
    if (!profissionalId) return;
    let cancelado = false;
    setLoading(true);
    apiService
      .getProfissionalCarencias(profissionalId)
      .then((res) => !cancelado && setCarencias(res.carencias))
      .catch((err) => console.error('Erro ao carregar carências GH:', err))
      .finally(() => !cancelado && setLoading(false));
    return () => {
      cancelado = true;
    };
  }, [profissionalId]);

  // Já vêm ordenadas (ano/semestre DESC); agrupa preservando a ordem
  const grupos = useMemo(() => {
    const m = new Map<string, GhCarencia[]>();
    carencias.forEach((c) => {
      const k = `${c.ano}.${c.semestre}`;
      m.set(k, [...(m.get(k) || []), c]);
    });
    return Array.from(m.entries());
  }, [carencias]);

  if (!profissionalId || (!loading && carencias.length === 0)) return null;

  const emExercicio = carencias.filter((c) => /exerc[ií]cio/i.test(c.situacao || '')).length;
  const idsPai = new Map(carencias.map((c) => [c.cod_carencia, c.nome_carga_horaria]));

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        aria-controls={bodyId}
        className="w-full flex items-center gap-4 px-5 md:px-6 py-3.5 text-left bg-stone-50/60 hover:bg-stone-100/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600"
      >
        <div className="w-11 h-11 flex-shrink-0 rounded-lg border-2 border-dashed border-stone-300 bg-white text-stone-500 flex items-center justify-center">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-stone-900">Carências GH</h2>
            {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
          </div>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span className={chip}>{carencias.length} carência(s)</span>
            {emExercicio > 0 && <span className={chip}>{emExercicio} em exercício</span>}
            <span className={chip}>{grupos.length} semestre(s)</span>
          </div>
        </div>
        <span className="hidden sm:inline text-xs font-medium text-stone-500">{isExpanded ? 'Recolher' : 'Expandir'}</span>
        <ChevronDown
          className={`w-5 h-5 text-stone-400 flex-shrink-0 transition-transform motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        id={bodyId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden" inert={!isExpanded}>
          <div className="border-t border-stone-200 p-5 md:p-6 space-y-5 text-xs">
            {grupos.map(([semestre, itens]) => (
              <div key={semestre}>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400 mb-2">
                  {semestre.replace('.', 'º/')}º sem <span className="tabular-nums">({itens.length})</span>
                </h4>
                <div className="space-y-2">
                  {itens.map((c) => {
                    const aberto = openId === c.id;
                    const contraparte = c.papel === 'titular' ? c.substituto_nome : c.titular_nome;
                    return (
                      <div key={c.id} className="bg-stone-50 border border-stone-200 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenId(aberto ? null : c.id)}
                          aria-expanded={aberto}
                          className="w-full text-left p-3.5 hover:bg-stone-100/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono tabular-nums text-stone-500">#{c.cod_carencia}</span>
                                <span className="font-semibold text-stone-900 text-sm">{c.nome_carga_horaria || '—'}</span>
                              </div>
                              <div className="text-stone-700 mt-0.5">{c.componente || '—'}</div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${situacaoCls(c.situacao)}`}>
                                {c.situacao || '—'}
                              </span>
                              <span className={chip}>{c.papel === 'titular' ? 'Titular' : 'Substituto'}</span>
                              <ChevronDown
                                className={`w-4 h-4 text-stone-400 transition-transform motion-reduce:transition-none ${aberto ? 'rotate-180' : ''}`}
                              />
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[11px] text-stone-500">
                            <span className="tabular-nums">{c.periodo || '—'}</span>
                            {c.tipo && <span className={chip}>{c.tipo}</span>}
                            {contraparte && (
                              <span>
                                {c.papel === 'titular' ? 'Substituto' : 'Titular'}: <span className="text-stone-700">{contraparte}</span>
                              </span>
                            )}
                            {c.cod_carencia_pai && (
                              <span className={chip} title={idsPai.get(c.cod_carencia_pai) || undefined}>
                                Origem #{c.cod_carencia_pai}
                              </span>
                            )}
                          </div>
                        </button>

                        {aberto && (
                          <div className="border-t border-stone-200 bg-white px-3.5 py-3">
                            <h5 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400 mb-2">
                              <History className="w-3.5 h-3.5" />
                              Histórico <span className="tabular-nums">({c.historico.length})</span>
                            </h5>
                            {c.historico.length === 0 ? (
                              <p className="text-stone-500">Nenhum evento registrado.</p>
                            ) : (
                              <ol className="space-y-2 border-l-2 border-stone-200 pl-3">
                                {c.historico.map((e) => (
                                  <li key={e.id}>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="tabular-nums text-stone-500">{fmtDataHora(e.data)}</span>
                                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${situacaoCls(e.situacao)}`}>
                                        {e.situacao || '—'}
                                      </span>
                                      {(e.nome || e.matricula) && (
                                        <span className="text-[11px] text-stone-500">
                                          {e.nome}
                                          {e.matricula && <span className="font-mono tabular-nums"> ({e.matricula})</span>}
                                        </span>
                                      )}
                                    </div>
                                    {e.observacao && <p className="mt-0.5 text-stone-700">{e.observacao}</p>}
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
