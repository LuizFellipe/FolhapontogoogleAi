import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasComplementaryChanges, hasPrincipalChanges, normalizePhones } from './fichaCadastral';
import type { EmployeeData } from '../types';

const employee = { name: 'SERVIDOR', registration: '0012345X', cargo: 'PROFESSOR', funcao: '', ch: '40' } as EmployeeData;

test('principal fields block emission until saved or reverted', () => {
  assert.equal(hasPrincipalChanges(employee, { ...employee }), false);
  for (const field of ['name', 'registration', 'cargo', 'funcao', 'ch']) {
    assert.equal(hasPrincipalChanges({ ...employee, [field]: 'EDITADO' }, employee), true);
  }
  assert.equal(hasPrincipalChanges({ ...employee, disciplina: 'EDITADA' }, employee), false);
  assert.equal(hasPrincipalChanges(employee), true);
  assert.equal(hasPrincipalChanges(employee, { ...employee, funcao: null }), false);
});

test('phone normalization matches saving without treating punctuation as a change', () => {
  assert.deepEqual(normalizePhones('(61) 123; (61) 456 / (61) 789'), ['(61) 123', '(61) 456', '(61) 789']);
  const saved = { cpf: '00123456789', telefones: ['(61) 123', '(61) 456'], conjuge: null };
  const current = { ...saved, telefones: ' (61) 123; (61) 456 ', conjuge: '' };
  const fields = ['cpf', 'telefones', 'conjuge'];
  assert.equal(hasComplementaryChanges(current, saved, fields), false);
  assert.equal(hasComplementaryChanges({ ...current, cpf: '98765432100' }, saved, fields), true);
  assert.equal(hasComplementaryChanges({ ...current, telefones: '(61) 123' }, saved, fields), true);
  assert.equal(hasComplementaryChanges({ ...current, cpf: saved.cpf }, saved, fields), false);
  assert.equal(hasComplementaryChanges(current, null, fields), true);
});
