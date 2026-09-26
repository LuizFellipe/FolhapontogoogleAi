import React, { useState, useEffect } from 'react';
import {
  FileText,
  Maximize2,
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
      setFeedback({ type: 'success', message: 'Dados complementares atualizados com sucesso!' });
      await loadData();
    } catch (err: any) {
      console.error('Erro ao salvar dados complementares:', err);
      setFeedback({ type: 'error', message: 'Erro ao salvar alterações no banco.' });
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

  return (
    <>
      {/* 1. Modo Minimizado (Dock Flutuante Padrão) */}
      {!isExpanded && (
        <div className="fixed bottom-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-stone-900/95 backdrop-blur-md border border-stone-700/80 shadow-2xl rounded-2xl p-2.5 pl-4 flex items-center gap-3 text-stone-100 hover:border-indigo-500/60 transition-all">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-wide">
                    Ficha Cadastral SIGEP
                  </span>
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      hasData ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-amber-400'
                    }`}
                    title={hasData ? 'Dados carregados' : 'Pendente de sincronização'}
                  />
                </div>
                <span className="text-[11px] text-stone-400">
                  {hasData ? (
                    <>Matrícula: <strong className="text-stone-300 font-mono">{matricula || compData?.matricula}</strong> • {cargas.length} Carga(s)</>
                  ) : (
                    <>Pendente de importação no BD</>
                  )}
                </span>
              </div>
            </div>

            <div className="h-6 w-px bg-stone-800 mx-1" />

            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-900/20 transition-all cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Expandir
            </button>
          </div>
        </div>
      )}

      {/* 2. Modo Expandido (Modal Completo) */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-stone-900 text-stone-100 border border-stone-800 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Header do Modal */}
            <div className="p-4 md:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      Dados Complementares SIGEP
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Ficha Funcional
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Servidor: <strong className="text-stone-200">{nome || '-'}</strong> • Matrícula: <strong className="text-stone-200 font-mono">{matricula || '-'}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
                  title="Minimizar para dock inferior"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Aviso quando não há dados no BD */}
            {!hasData && !loading && (
              <div className="bg-amber-950/40 border-b border-amber-800/50 p-3 px-5 flex items-center gap-3 text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>
                  Este servidor ainda não possui dados complementares importados do SIGEP no banco de dados. Você pode preenchê-los abaixo e salvar, ou importá-los em lote pelo botão <strong>Sincronizar Educa</strong> (aba SIGEP).
                </span>
              </div>
            )}

            {/* Abas Internas de Navegação */}
            <div className="bg-stone-950 px-5 pt-2 border-b border-stone-800 flex items-center gap-2 overflow-x-auto">
              {TABS.map(({ id, label, icon: Icon, count }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                    activeTab === id
                      ? 'border-indigo-400 text-indigo-300'
                      : 'border-transparent text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}{count && ` (${rel[count].length})`}
                </button>
              ))}
            </div>

            {/* Conteúdo das Abas */}
            <div className="flex-1 overflow-y-auto p-5 text-xs space-y-4">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                  <span>Carregando dados complementares...</span>
                </div>
              ) : (
                <>
                  {/* Abas 1-3: formulários (Documentação, Endereço, Funcional) */}
                  {activeTab in FIELDS && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {FIELDS[activeTab as keyof typeof FIELDS].map(({ label, inputs, span, copy }) => (
                        <div key={label} className={`flex flex-col gap-1 ${span || ''}`}>
                          <label className="text-stone-400 font-semibold uppercase text-[10px]">{label}</label>
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
                                className={`w-full min-w-0 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-indigo-500 ${
                                  i.mono ? 'font-mono' : ''
                                } ${i.uf ? 'uppercase' : ''}`}
                              />
                            ))}
                            {copy && formData[inputs[0].name] && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(formData[inputs[0].name], inputs[0].name)}
                                className="absolute right-2 top-2 text-stone-500 hover:text-white"
                                title={`Copiar ${label}`}
                              >
                                {copiedField === inputs[0].name ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Aba 4: Cargas Horárias */}
                  {activeTab === 'cargas' && (
                    <div className="space-y-3">
                      {cargas.length === 0 ? (
                        <div className="py-8 text-center text-stone-500">
                          Nenhum registro de carga horária vinculado no momento.
                        </div>
                      ) : (
                        cargas.map((cg, idx) => (
                          <div key={idx} className="p-3.5 bg-stone-950 border border-stone-800 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-xs flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                                {cg.tipo_carga}
                              </span>
                              <div className="flex items-center gap-2">
                                {cg.turno && (
                                  <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 text-[10px]">
                                    Turno: {cg.turno}
                                  </span>
                                )}
                                {cg.atuacao && (
                                  <span className="px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 text-[10px] font-medium border border-indigo-700/30">
                                    {cg.atuacao}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-stone-300 text-[11px] pt-1 border-t border-stone-800/60">
                              <p><strong>Unidade:</strong> {cg.unidade || '-'}</p>
                              <p><strong>CRE:</strong> {cg.cre || '-'}</p>
                              <p><strong>Lotação:</strong> {cg.lotacao || '-'}</p>
                              <p><strong>Coord. Externa:</strong> {cg.coord_externa || '-'}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Aba 5: Cursos & Progressões */}
                  {activeTab === 'cursos' && (
                    <div className="space-y-2">
                      {cursos.length === 0 ? (
                        <div className="py-8 text-center text-stone-500">
                          Nenhum curso ou progressão registrado para este servidor.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border border-stone-800 rounded-lg overflow-hidden">
                            <thead className="bg-stone-950 text-stone-400 text-[10px] uppercase">
                              <tr>
                                <th className="p-2.5">Curso</th>
                                <th className="p-2.5">Instituição</th>
                                <th className="p-2.5">Emissão</th>
                                <th className="p-2.5">Utilização / Lei</th>
                                <th className="p-2.5 text-right">CH (h)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-800/80 text-stone-200">
                              {cursos.map((cr, idx) => (
                                <tr key={idx} className="hover:bg-stone-950/60">
                                  <td className="p-2.5 font-medium text-white">{cr.curso}</td>
                                  <td className="p-2.5 text-stone-400">{cr.instituicao || '-'}</td>
                                  <td className="p-2.5 text-stone-400">{cr.emissao || '-'}</td>
                                  <td className="p-2.5 text-stone-300">
                                    <div>{cr.utilizacao || '-'}</div>
                                    {cr.data_utilizacao && (
                                      <span className="text-[10px] text-stone-500">
                                        Data: {cr.data_utilizacao}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-right font-mono text-indigo-300">
                                    {cr.carga_horaria ? `${cr.carga_horaria}h` : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Aba 6: Habilitações & Componentes */}
                  {activeTab === 'habs' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[11px] font-bold uppercase text-indigo-400 mb-2 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5" />
                          Habilitações Funcionais ({habilitacoes.length})
                        </h4>
                        {habilitacoes.length === 0 ? (
                          <p className="text-stone-500">Nenhuma habilitação registrada.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {habilitacoes.map((h, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-stone-200 font-medium"
                              >
                                {h.habilitacao}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-stone-800">
                        <h4 className="text-[11px] font-bold uppercase text-indigo-400 mb-2 flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5" />
                          Componentes Curriculares ({componentes.length})
                        </h4>
                        {componentes.length === 0 ? (
                          <p className="text-stone-500">Nenhum componente curricular registrado.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {componentes.map((cp, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-indigo-200 font-medium"
                              >
                                {cp.componente}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Feedback alert */}
            {feedback && (
              <div
                className={`mx-5 mb-2 p-2.5 rounded-lg text-xs flex items-center justify-between ${
                  feedback.type === 'success'
                    ? 'bg-emerald-950/70 border border-emerald-700/50 text-emerald-200'
                    : 'bg-red-950/70 border border-red-700/50 text-red-200'
                }`}
              >
                <span>{feedback.message}</span>
                <button onClick={() => setFeedback(null)} className="text-stone-400 hover:text-white">✕</button>
              </div>
            )}

            {/* Footer do Modal */}
            <div className="p-4 border-t border-stone-800 bg-stone-950/90 flex items-center justify-between">
              <div className="text-[11px] text-stone-500">
                {compData?.arquivo_origem && (
                  <span>Origem: <strong className="text-stone-400">{compData.arquivo_origem}</strong></span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !profissionalId}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-900/30 transition-all cursor-pointer"
                >
                  <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
                  Salvar Alterações
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
