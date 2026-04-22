import React from 'react';
import { EmployeeData } from '../types';

interface Props {
  data: EmployeeData;
  onChange: (data: EmployeeData) => void;
}

export const EmployeeForm: React.FC<Props> = ({ data, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
      <h2 className="text-lg font-semibold mb-4 text-stone-800 border-b pb-2">Dados do Servidor</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Nome Completo</label>
          <input
            type="text"
            name="name"
            value={data.name}
            onChange={handleChange}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
            placeholder="Ex: Alexandre Vinhadelli..."
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Matrícula (opcional)</label>
          <input
            type="text"
            name="registration"
            value={data.registration}
            onChange={handleChange}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
            placeholder="Ex: 0000000-0 (deixe vazio se não tiver)"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Cargo/Especialidade</label>
          <input
            type="text"
            name="cargo"
            value={data.cargo}
            onChange={handleChange}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">UA</label>
          <input
            type="text"
            name="ua"
            value={data.ua}
            onChange={handleChange}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Exercício</label>
          <input
            type="text"
            name="exercicio"
            value={data.exercicio}
            onChange={handleChange}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">C.H.</label>
          <input
            type="text"
            name="ch"
            value={data.ch}
            onChange={handleChange}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
          />
        </div>
        <div className="flex flex-col gap-1 lg:col-span-2">
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Unidade de Lotação</label>
          <input
            type="text"
            name="unidade"
            value={data.unidade}
            onChange={handleChange}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Função</label>
          <input
            type="text"
            name="funcao"
            value={data.funcao}
            onChange={handleChange}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Turno 1</label>
          <select
            name="shift1"
            value={data.shift1}
            onChange={(e) => onChange({ ...data, shift1: e.target.value })}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
          >
            <option value="">VAZIO</option>
            <option value="Matutino">Matutino</option>
            <option value="Vespertino">Vespertino</option>
            <option value="Noturno">Noturno</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Turno 2</label>
          <select
            name="shift2"
            value={data.shift2}
            onChange={(e) => onChange({ ...data, shift2: e.target.value })}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
          >
            <option value="">VAZIO</option>
            <option value="Matutino">Matutino</option>
            <option value="Vespertino">Vespertino</option>
            <option value="Noturno">Noturno</option>
          </select>
        </div>
      </div>
    </div>
  );
};
