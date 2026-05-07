export type EntryType =
  | 'TRABALHO'
  | 'FERIAS'
  | 'ATESTADO MEDICO DE ATE 03'
  | 'LICENCA MEDICA OU'
  | 'FALTA'
  | 'Abono TRE'
  | 'ABONO DE PONTO ART 151 LEI'
  | 'CPIP'
  | 'CURSO'
  | 'ABONO_NIVER'
  | 'FERIADO'
  | 'FALTA PARALISAÇÃO'
  | 'ATESTADO DE COMPARECIMENTO'
  | 'LIC. ACOMP. PESSOA DOENTE'
  | 'AFAST DOACAO SANGUE ART 62'
  | 'ABONO DE PONTO BIMESTRAL LEI'
  | 'RECESSO'
  | 'PONTO FACULTATIVO'
  | 'ATESTADO COMPARECIMENTO A'
  | 'ATESTADO COMPARECIMENTO P.'
  | 'EXAME MEDICO PREV/PERIOD ART'
  | 'TRACEJADO';

export interface DailyEntry {
  day: number;
  type: EntryType; // tipo_turno1
  type_turno2: EntryType; // tipo_turno2 sempre definido
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

export const ENTRY_TYPES: { value: EntryType; label: string; code: string | null }[] = [
  { value: 'TRABALHO',                    label: 'TRABALHO NORMAL',                              code: null    },
  { value: 'FERIAS',                      label: 'FÉRIAS',                                       code: '99902' },
  { value: 'ATESTADO MEDICO DE ATE 03',   label: 'ATESTADO MEDICO DE ATE 03 DIAS',               code: '00294' },
  { value: 'LICENCA MEDICA OU',           label: 'LICENCA MEDICA OU ODONTOLOGICA',               code: '00306' },
  { value: 'FALTA',                       label: 'FALTA',                                        code: '40010' },
  { value: 'Abono TRE',                   label: 'Abono TRE',                                    code: '00256' },
  { value: 'ABONO DE PONTO ART 151 LEI',  label: 'ABONO DE PONTO ART 151 LEI COMP 840/2011',    code: '00219' },
  { value: 'CPIP',                        label: 'CPIP',                                         code: null    },
  { value: 'CURSO',                       label: 'CURSO FORMAÇÃO CONTINUADA',                    code: null    },
  { value: 'ABONO_NIVER',                 label: 'ABONO ANIVERSÁRIO',                            code: null    },
  { value: 'FERIADO',                     label: 'FERIADO',                                      code: null    },
  { value: 'FALTA PARALISAÇÃO',           label: 'FALTA PARALISAÇÃO',                            code: '40034' },
  { value: 'ATESTADO DE COMPARECIMENTO',  label: 'ATESTADO COMPARECIMENTO SERVIDOR',             code: '00340' },
  { value: 'LIC. ACOMP. PESSOA DOENTE',   label: 'LIC. ACOMP. PESSOA DOENTE FAMILIA',           code: '99906' },
  { value: 'AFAST DOACAO SANGUE ART 62',  label: 'AFAST DOACAO SANGUE ART 62 LEI COMP 840/2011',code: '00310' },
  { value: 'ABONO DE PONTO BIMESTRAL LEI',label: 'ABONO DE PONTO BIMESTRAL LEI 449/1993',        code: '00284' },
  { value: 'RECESSO',                     label: 'RECESSO',                                      code: '00258' },
  { value: 'PONTO FACULTATIVO',           label: 'PONTO FACULTATIVO',                            code: '00000' },
  { value: 'ATESTADO COMPARECIMENTO A',   label: 'ATESTADO COMPARECIMENTO A SUBSAUDE',           code: '00343' },
  { value: 'ATESTADO COMPARECIMENTO P.',  label: 'ATESTADO COMPARECIMENTO PESSOA DA FAMILIA',    code: '00341' },
  { value: 'EXAME MEDICO PREV/PERIOD ART',label: 'EXAME MEDICO PREV/PERIOD ART 62 LEI COMP',     code: '00118' },
  { value: 'TRACEJADO',                   label: '--- (Tracejado)',                               code: null    },
];
