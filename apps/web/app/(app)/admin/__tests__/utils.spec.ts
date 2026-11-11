import { describe, expect, it } from 'vitest';
import { formatDate, formatNumber, formatUptime, initialsOf } from '../utils';

// B40/A4 (Sprint 13) — utilitários de formatação do painel admin.
describe('admin utils', () => {
  it('initialsOf deriva até 2 iniciais do nome real', () => {
    expect(initialsOf('Maria Silva')).toBe('MS');
    expect(initialsOf('Augusto')).toBe('A');
    expect(initialsOf('Ana Maria Souza')).toBe('AM');
    expect(initialsOf('  João   Pedro ')).toBe('JP');
  });

  it('formatUptime resume segundos em d/h/min', () => {
    expect(formatUptime(0)).toBe('0min');
    expect(formatUptime(59)).toBe('0min');
    expect(formatUptime(3600)).toBe('1h 0min');
    expect(formatUptime(90061)).toBe('1d 1h');
  });

  it('formatDate trata nulo e datas válidas', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('não-é-data')).toBe('—');
    expect(formatDate('2026-01-15T12:00:00.000Z')).toBe('15/01/2026');
  });

  it('formatNumber usa separador pt-BR', () => {
    expect(formatNumber(1234)).toBe('1.234');
    expect(formatNumber(0)).toBe('0');
  });
});
