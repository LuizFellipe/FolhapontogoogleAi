export type EntryType = 'TRABALHO' | 'FERIAS' | 'RECESSO' | 'ATESTADO' | 'LICENCA' | 'FALTA' | 'TRE' | 'ABONO' | 'CPIP' | 'CURSO' | 'ABONO_NIVER' | 'FERIADO';

export interface DailyEntry {
  day: number;
  type: EntryType; // tipo_turno1
  type_turno2: EntryType; // tipo_turno2sempre definido
  entry1: string;
  exit1: string;
  entry2: string;
  exit2: string;
  observation: string;
  observation_turno2: string; // observações específicas do turno 2
}

export interface EmployeeData {
  name: string;
  registration: string;
  cargo: string;
  ua: string;
  exercicio: string;
  ch: string;
  funcao: string;
  unidade: string;
  shift1: string;
  shift2: string;
}

export interface SummaryEntry {
  operation: 'I' | 'A' | 'E' | '';
  code: string;
  carga: string;
  months: string;
  hoursDays: string;
  startDay: string;
  endDay: string;
}

export interface TimesheetData {
  month: number;
  year: number;
  employee: EmployeeData;
  entries: DailyEntry[];
  summaryEntries: SummaryEntry[];
  observations: string;
}

export const MONTHS = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

export const ENTRY_TYPES: { value: EntryType; label: string }[] = [
  { value: 'TRABALHO', label: 'TRABALHO NORMAL' },
  { value: 'FERIAS', label: 'FÉRIAS' },
  { value: 'RECESSO', label: 'RECESSO' },
  { value: 'ATESTADO', label: 'ATESTADO' },
  { value: 'LICENCA', label: 'LICENÇA MÉDICA' },
  { value: 'FALTA', label: 'FALTA' },
  { value: 'TRE', label: 'TRE' },
  { value: 'ABONO', label: 'ABONO' },
  { value: 'CPIP', label: 'CPIP' },
  { value: 'CURSO', label: 'CURSO FORMAÇÃO CONTINUADA' },
  { value: 'ABONO_NIVER', label: 'ABONO ANIVERSÁRIO' },
  { value: 'FERIADO', label: 'FERIADO' }
];
