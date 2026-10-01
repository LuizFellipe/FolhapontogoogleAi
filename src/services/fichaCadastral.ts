import type { EmployeeData } from '../types';

const principalFields = ['name', 'registration', 'cargo', 'funcao', 'ch'] as const;
const value = (input: unknown) => input == null ? '' : String(input);

export function hasPrincipalChanges(current: EmployeeData, persisted?: EmployeeData): boolean {
  return !persisted || principalFields.some((field) => value(current[field]) !== value(persisted[field]));
}

export function normalizePhones(input: unknown): string[] {
  return (Array.isArray(input) ? input : value(input).split(/[,;\/]/))
    .map((phone) => String(phone).trim()).filter(Boolean);
}

export function hasComplementaryChanges(
  current: Record<string, unknown>, persisted: Record<string, unknown> | null, fields: string[],
): boolean {
  return !persisted || fields.some((field) => field === 'telefones'
    ? JSON.stringify(normalizePhones(current[field])) !== JSON.stringify(normalizePhones(persisted[field]))
    : value(current[field]) !== value(persisted[field]));
}
