import { describe, expect, it } from 'vitest';
import { PLAN_PRICES, annualSavings, annualTotal, formatBRL } from '../pricing-data';

// B52/P5 (Sprint 16) — os preços saíram dos literais em JSX para a
// fonte única pricing-data.ts. Estes testes travam os valores reais
// exibidos e a aritmética do anual (que a FAQ/pricing do P4 exibem
// como economia em reais absolutos).
describe('pricing-data — fonte única de preços', () => {
  it('preços mensais e anuais são os exibidos na página', () => {
    expect(PLAN_PRICES.pro.monthly).toBe(39.9);
    expect(PLAN_PRICES.pro.annualMonthly).toBe(29.9);
    expect(PLAN_PRICES.staff.monthly).toBe(79.9);
    expect(PLAN_PRICES.staff.annualMonthly).toBe(59.9);
    expect(PLAN_PRICES.explorer.monthly).toBe(0);
  });

  it('total anual bate com o exibido nos cards (R$ 358,80 e R$ 718,80)', () => {
    expect(annualTotal(PLAN_PRICES.pro)).toBeCloseTo(358.8, 2);
    expect(annualTotal(PLAN_PRICES.staff)).toBeCloseTo(718.8, 2);
  });

  it('economia do anual em reais absolutos: Pro R$ 120/ano, Staff R$ 240/ano', () => {
    expect(annualSavings(PLAN_PRICES.pro)).toBeCloseTo(120, 2);
    expect(annualSavings(PLAN_PRICES.staff)).toBeCloseTo(240, 2);
  });

  it('formatBRL formata no padrão da página', () => {
    expect(formatBRL(39.9)).toContain('39,90');
    expect(formatBRL(358.8)).toContain('358,80');
    expect(formatBRL(120)).toContain('120,00');
  });
});
