import React, { useState, useEffect, useId } from 'react';
import {
  FileText,
  ChevronDown,
  X,
  Save,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  User,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Layers,
  Copy,
} from 'lucide-react';
import { apiService } from '../services/api';

type Input = { name: string; placeholder?: string; uf?: boolean; mono?: boolean; type?: string };
type FieldDef = { label: string; inputs: Input[]; span?: string; copy?: boolean };
const f = (label: string, name: string, extra: Omit<Input, 'name'> = {}, span?: string): FieldDef => ({
  label,
  inputs: [{ name, ...extra }],
  span,
});

const FIELDS: Record<'pessoal' | 'contato' | 'funcional', FieldDef[]> = {
  pessoal: [
    { ...f('CPF', 'cpf', { mono: true }), copy: true },
    f('CI / RG Número', 'ci_numero'),
    { label: 'Órgão / UF Emissor CI', inputs: [{ name: 'ci_orgao', placeholder: 'SSP' }, { name: 'ci_uf', placeholder: 'DF', uf: true }] },
    f('Data Nascimento', 'nascimento', { placeholder: 'DD/MM/AAAA' }),
    f('Sexo', 'sexo'),
    f('Cor / Raça', 'cor_raca'),
    f('PIS / PASEP', 'pis_pasep', { mono: true }),
    f('Título de Eleitor', 'titulo_eleitoral', { mono: true }),
    { label: 'Zona / Seção', inputs: [{ name: 'titulo_zona', placeholder: 'Zona' }, { name: 'titulo_secao', placeholder: 'Seção' }] },
    f('Estado Civil', 'estado_civil'),
    f('Cônjuge', 'conjuge', {}, 'md:col-span-2'),
    f('Nome do Pai', 'pai', {}, 'md:col-span-3'),
    f('Nome da Mãe', 'mae', {}, 'md:col-span-3'),
  ],
  contato: [
    f('Logradouro / Endereço', 'endereco', {}, 'md:col-span-2'),
    f('CEP', 'cep', { mono: true }),
    f('Bairro', 'bairro'),
    f('Cidade', 'cidade'),
    f('UF Endereço', 'uf_endereco', { uf: true }),
    f('Telefones (separados por vírgula)', 'telefones', { mono: true, placeholder: '(61) 99999-9999, (61) 3333-3333' }, 'md:col-span-2'),
    f('Email', 'email', { type: 'email' }),
  ],
  funcional: [
    f('Admissão', 'admissao', { placeholder: 'DD/MM/AAAA' }),
    f('Ref. Salarial', 'ref_sal'),
    f('Especialidade Concurso', 'especialidade_concurso'),
    f('PCD', 'pcd', { placeholder: 'NÃO' }),
    f('Redução de Carga Horária', 'reducao_ch', { placeholder: 'NÃO' }),
    f('Readaptado', 'readaptado', { placeholder: 'NÃO' }),
    f('Escolaridade / Referência Salarial', 'escolaridade_salario', {}, 'md:col-span-3'),
  ],
};

type TabId = keyof typeof FIELDS | 'cargas' | 'cursos' | 'habs';
const TABS: { id: TabId; label: string; icon: React.ElementType; count?: 'cargas' | 'cursos' }[] = [
  { id: 'pessoal', label: 'Documentação & Pessoal', icon: User },
  { id: 'contato', label: 'Endereço & Contatos', icon: MapPin },
  { id: 'funcional', label: 'Dados Funcionais', icon: Briefcase },
  { id: 'cargas', label: 'Cargas Horárias', icon: Layers, count: 'cargas' },
  { id: 'cursos', label: 'Cursos & Progressões', icon: GraduationCap, count: 'cursos' },
  { id: 'habs', label: 'Habilitações & Comp.', icon: Award },
];

const EMPTY_REL = { cargas: [] as any[], cursos: [] as any[], habilitacoes: [] as any[], componentes: [] as any[] };

interface Props {
  profissionalId?: number;
  matricula?: string;
  nome?: string;
}

export const ComplementaryDataWidget: React.FC<Props> = ({ profissionalId, matricula, nome }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('pessoal');
  const [compData, setCompData] = useState<any>(null);
  const [rel, setRel] = useState(EMPTY_REL);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const bodyId = useId();

  // Form editável
  const [formData, setFormData] = useState<any>({});

  const loadData = async () => {
    if (!profissionalId) {
      setCompData(null);
      setFormData({});
      return;
    }

    try {
      setLoading(true);
      const res = await apiService.getProfissionalComplementar(profissionalId);
      setCompData(res.complementar);
      setRel({ ...EMPTY_REL, ...res });

      if (res.complementar) {
        setFormData({
          ...res.complementar,
          telefones: Array.isArray(res.complementar.telefones)
            ? res.complementar.telefones.join(', ')
            : res.complementar.telefones || '',
        });
      } else {
        setFormData({ matricula: matricula || '' });
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados complementares:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profissionalId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!profissionalId) return;

    try {
      setSaving(true);
      setFeedback(null);

      // Tratamento dos telefones
      const telList = typeof formData.telefones === 'string'
        ? formData.telefones.split(/[,;\/]/).map((t: string) => t.trim()).filter(Boolean)
        : formData.telefones || [];

      const payload = {
        ...formData,
        matricula: formData.matricula || matricula,
        telefones: telList,
      };

      await apiService.updateProfissionalComplementar(profissionalId, payload);
      setFeedback({ type: 'success', message: 'Ficha salva.' });
      await loadData();
    } catch (err: any) {
      console.error('Erro ao salvar dados complementares:', err);
      setFeedback({ type: 'error', message: 'Não foi possível salvar a ficha. Verifique a conexão com o servidor e tente de novo.' });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Se não houver servidor selecionado ainda
  if (!profissionalId && !matricula) {
    return null;
  }

  const hasData = !!compData;
  const { cargas, cursos, habilitacoes, componentes } = rel;

  const inputCls =
    'w-full min-w-0 px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-800 placeholder:text-stone-400 transition-colors hover:border-stone-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15';
  const chip = 'inline-flex items-center gap-1 text-[11px] text-stone-600 bg-white border border-stone-200 rounded-md px-2 py-0.5';

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      {/* Cabeçalho (sempre visível) */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        aria-controls={bodyId}
        className="w-full flex items-center gap-4 px-5 md:px-6 py-3.5 text-left bg-stone-50/60 hover:bg-stone-100/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600"
      >
        <div className="w-11 h-11 flex-shrink-0 rounded-lg border-2 border-dashed border-stone-300 bg-white text-stone-500 flex items-center justify-center">
          <FileText className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-stone-900">Ficha cadastral SIGEP</h2>
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2 py-0.5 ${
                hasData ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${hasData ? 'bg-indigo-600' : 'bg-amber-500'}`} />
              {loading ? 'Carregando…' : hasData ? 'Importada' : 'Pendente'}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {hasData ? (
              <>
                {formData.cpf && <span className={`${chip} font-mono tabular-nums`}>CPF {formData.cpf}</span>}
                <span className={chip}>{cargas.length} carga(s)</span>
                <span className={chip}>{cursos.length} curso(s)</span>
              </>
            ) : (
              <span className="text-xs text-stone-500">Documentos, endereço, dados funcionais e cursos do servidor</span>
            )}
          </div>
        </div>
        <span className="hidden sm:inline text-xs font-medium text-stone-500">{isExpanded ? 'Recolher' : 'Expandir'}</span>
        <ChevronDown
          className={`w-5 h-5 text-stone-400 flex-shrink-0 transition-transform motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Corpo colapsável */}
      <div
        id={bodyId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden" inert={!isExpanded}>
          <div className="border-t border-stone-200">
            {!hasData && !loading && (
              <div className="mx-5 md:mx-6 mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500 mt-px" />
                <span>
                  Ficha ainda não importada. Preencha abaixo e salve, ou importe em lote pelo botão <strong>Sincronizar Educa</strong>.
                </span>
              </div>
            )}

            {/* Abas */}
            <div role="tablist" className="px-5 md:px-6 mt-3 border-b border-stone-200 flex items-center gap-1 overflow-x-auto overflow-y-hidden">
              {TABS.map(({ id, label, icon: Icon, count }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={activeTab === id}
                  onClick={() => setActiveTab(id)}
                  className={`pb-2.5 pt-1 px-3 text-xs font-medium flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors focus:outline-none focus-visible:text-indigo-700 ${
                    activeTab === id
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {count && (
                    <span className="tabular-nums text-[10px] px-1.5 rounded bg-stone-100 text-stone-600">{rel[count].length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Conteúdo */}
            <div className="p-5 md:p-6 text-xs">
              {loading ? (
                <div className="py-10 flex items-center justify-center gap-2 text-stone-500">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                  Carregando ficha…
                </div>
              ) : (
                <>
                  {activeTab in FIELDS && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
                      {FIELDS[activeTab as keyof typeof FIELDS].map(({ label, inputs, span, copy }) => (
                        <div key={label} className={`flex flex-col gap-1.5 ${span || ''}`}>
                          <label className="text-xs font-medium text-stone-500">{label}</label>
                          <div className="relative flex gap-2">
                            {inputs.map((i) => (
                              <input
                                key={i.name}
                                type={i.type || 'text'}
                                name={i.name}
                                placeholder={i.placeholder}
                                maxLength={i.uf ? 2 : undefined}
                                value={formData[i.name] || ''}
                                onChange={handleInputChange}
                                className={`${inputCls} ${i.mono ? 'font-mono tabular-nums' : ''} ${i.uf ? 'uppercase max-w-16' : ''} ${copy ? 'pr-8' : ''}`}
                              />
                            ))}
                            {copy && formData[inputs[0].name] && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(formData[inputs[0].name], inputs[0].name)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-800"
                                title={`Copiar ${label}`}
                              >
                                {copiedField === inputs[0].name ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'cargas' && (
                    cargas.length === 0 ? (
                      <p className="py-8 text-center text-stone-500">Nenhuma carga horária vinculada.</p>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {cargas.map((cg, idx) => (
                          <div key={idx} className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-stone-900 text-sm">{cg.tipo_carga}</span>
                              <div className="flex items-center gap-1.5">
                                {cg.turno && <span className={chip}>{cg.turno}</span>}
                                {cg.atuacao && (
                                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-medium">{cg.atuacao}</span>
                                )}
                              </div>
                            </div>
                            <dl className="mt-2.5 pt-2.5 border-t border-stone-200 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
                              {[['Unidade', cg.unidade], ['CRE', cg.cre], ['Lotação', cg.lotacao], ['Coord. externa', cg.coord_externa]].map(([k, v]) => (
                                <React.Fragment key={k}>
                                  <dt className="text-stone-500">{k}</dt>
                                  <dd className="text-stone-800">{v || '—'}</dd>
                                </React.Fragment>
                              ))}
                            </dl>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {activeTab === 'cursos' && (
                    cursos.length === 0 ? (
                      <p className="py-8 text-center text-stone-500">Nenhum curso ou progressão registrado.</p>
                    ) : (
                      <div className="overflow-x-auto border border-stone-200 rounded-xl">
                        <table className="w-full text-left">
                          <thead className="bg-stone-50 text-stone-500 text-[11px]">
                            <tr>
                              <th className="p-2.5 font-medium">Curso</th>
                              <th className="p-2.5 font-medium">Instituição</th>
                              <th className="p-2.5 font-medium">Emissão</th>
                              <th className="p-2.5 font-medium">Utilização / lei</th>
                              <th className="p-2.5 font-medium text-right">CH</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 text-stone-700">
                            {cursos.map((cr, idx) => (
                              <tr key={idx} className="hover:bg-stone-50">
                                <td className="p-2.5 font-medium text-stone-900">{cr.curso}</td>
                                <td className="p-2.5">{cr.instituicao || '—'}</td>
                                <td className="p-2.5 tabular-nums">{cr.emissao || '—'}</td>
                                <td className="p-2.5">
                                  <div>{cr.utilizacao || '—'}</div>
                                  {cr.data_utilizacao && <span className="text-[10px] text-stone-500">Data: {cr.data_utilizacao}</span>}
                                </td>
                                <td className="p-2.5 text-right font-mono tabular-nums text-stone-900">
                                  {cr.carga_horaria ? `${cr.carga_horaria}h` : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}

                  {activeTab === 'habs' && (
                    <div className="space-y-5">
                      {[
                        { title: 'Habilitações funcionais', items: habilitacoes.map((h) => h.habilitacao), empty: 'Nenhuma habilitação registrada.', cls: 'bg-stone-50 border-stone-200 text-stone-800' },
                        { title: 'Componentes curriculares', items: componentes.map((c) => c.componente), empty: 'Nenhum componente curricular registrado.', cls: 'bg-indigo-50 border-indigo-100 text-indigo-800' },
                      ].map(({ title, items, empty, cls }) => (
                        <div key={title}>
                          <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400 mb-2">
                            {title} <span className="tabular-nums">({items.length})</span>
                          </h4>
                          {items.length === 0 ? (
                            <p className="text-stone-500">{empty}</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {items.map((t, idx) => (
                                <span key={idx} className={`px-2.5 py-1 rounded-md border font-medium ${cls}`}>{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {feedback && (
              <div
                role="status"
                className={`mx-5 md:mx-6 mb-3 p-2.5 rounded-lg text-xs flex items-center justify-between border ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <span>{feedback.message}</span>
                <button onClick={() => setFeedback(null)} className="text-stone-400 hover:text-stone-800" title="Fechar aviso">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Rodapé */}
            <div className="px-5 md:px-6 py-3 border-t border-stone-200 bg-stone-50/60 flex items-center justify-between gap-3">
              <span className="text-[11px] text-stone-500 truncate">
                {compData?.arquivo_origem && <>Origem: <span className="font-mono">{compData.arquivo_origem}</span></>}
              </span>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !profissionalId}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-stone-900 hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Salvando…' : 'Salvar ficha'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
