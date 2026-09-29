import React from 'react';
import { EmployeeData } from '../types';
import { ComplementaryDataWidget } from './ComplementaryDataWidget';
import { CarenciasGhWidget } from './CarenciasGhWidget';

interface Props {
  data: EmployeeData;
  onChange: (data: EmployeeData) => void;
  profissionalId?: number;
}

const inputCls =
  'w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-800 placeholder:text-stone-400 transition-colors hover:border-stone-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15';
const labelCls = 'text-xs font-medium text-stone-500';
const SHIFTS = ['Matutino', 'Vespertino', 'Noturno'];

const initials = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase() || '—';

const Field: React.FC<{ label: string; span: string; children: React.ReactNode }> = ({ label, span, children }) => (
  <label className={`flex flex-col gap-1.5 col-span-12 ${span}`}>
    <span className={labelCls}>{label}</span>
    {children}
  </label>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">{title}</h3>
      <div className="h-px flex-1 bg-stone-200" />
    </div>
    <div className="grid grid-cols-12 gap-x-4 gap-y-3">{children}</div>
  </section>
);

export const EmployeeForm: React.FC<Props> = ({ data, onChange, profissionalId }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  const isActive = data.status !== 'INATIVO';

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        {/* Faixa de identidade */}
        <div className="flex items-center gap-4 px-5 md:px-6 py-4 border-b border-stone-200 bg-stone-50/60">
          <div className="w-11 h-11 flex-shrink-0 rounded-lg bg-stone-800 text-white flex items-center justify-center text-sm font-semibold tracking-wide">
            {initials(data.name || '')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Dados do servidor</p>
            <h2 className="text-lg font-semibold text-stone-900 truncate">{data.name || 'Novo servidor'}</h2>
          </div>
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            {data.registration && (
              <span className="font-mono tabular-nums text-xs text-stone-600 bg-white border border-stone-200 rounded-md px-2 py-1">
                {data.registration}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 ${
                isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-200 text-stone-600'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-stone-400'}`} />
              {isActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-6 p-5 md:p-6">
          <Section title="Identificação">
            <Field label="Nome completo" span="md:col-span-8">
              <input type="text" name="name" value={data.name} onChange={handleChange} className={inputCls} placeholder="Ex: Alexandre Vinhadelli..." />
            </Field>
            <Field label="Matrícula (opcional)" span="md:col-span-2">
              <input type="text" name="registration" value={data.registration} onChange={handleChange} className={`${inputCls} font-mono tabular-nums`} placeholder="0000000-0" />
            </Field>
            <Field label="Status" span="md:col-span-2">
              <select name="status" value={data.status} onChange={handleChange} className={inputCls}>
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
              </select>
            </Field>
          </Section>

          <Section title="Atuação e lotação">
            <Field label="Cargo / especialidade" span="md:col-span-4">
              <input type="text" name="cargo" value={data.cargo} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Disciplina" span="md:col-span-4">
              <input type="text" name="disciplina" maxLength={255} value={data.disciplina || ''} onChange={handleChange} placeholder="Ex: INFORMÁTICA, MATEMÁTICA..." className={inputCls} />
            </Field>
            <Field label="Função" span="md:col-span-4">
              <input type="text" name="funcao" value={data.funcao} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Unidade de lotação" span="md:col-span-8">
              <input type="text" name="unidade" value={data.unidade} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="UA" span="md:col-span-4">
              <input type="text" name="ua" value={data.ua} onChange={handleChange} className={inputCls} />
            </Field>
          </Section>

          <Section title="Jornada e turnos">
            <Field label="Exercício" span="sm:col-span-6 md:col-span-3">
              <input type="text" name="exercicio" value={data.exercicio} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="C.H." span="sm:col-span-6 md:col-span-3">
              <input type="text" name="ch" value={data.ch} onChange={handleChange} className={`${inputCls} tabular-nums`} />
            </Field>
            {(['shift1', 'shift2'] as const).map((name, i) => (
              <Field key={name} label={`Turno ${i + 1}`} span="sm:col-span-6 md:col-span-3">
                <select name={name} value={data[name]} onChange={handleChange} className={inputCls}>
                  <option value="">Vazio</option>
                  {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            ))}
          </Section>
        </div>
      </div>

      <ComplementaryDataWidget profissionalId={profissionalId} matricula={data.registration} nome={data.name} />
      <CarenciasGhWidget profissionalId={profissionalId} />
    </div>
  );
};
