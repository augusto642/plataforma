import { describe, expect, it } from 'vitest';
import { nextActivity, passedTestSummary } from '../game-layout';

// Central 219 lote 4 (D4) — barra de ações da tela de jogo em 3
// colunas: só dados reais (próxima atividade da lista do curso e
// resumo da submissão atual); sem fase inventada.
describe('nextActivity', () => {
  const activities = [
    { id: 'a1', title: 'FizzBuzz' },
    { id: 'a2', title: 'Filter e Reduce' },
    { id: 'a3', title: 'Debounce' },
  ];

  it('devolve a atividade seguinte na ordem da lista', () => {
    expect(nextActivity(activities, 'a1')).toEqual({ id: 'a2', title: 'Filter e Reduce' });
    expect(nextActivity(activities, 'a2')).toEqual({ id: 'a3', title: 'Debounce' });
  });

  it('null na última atividade (fim da lista)', () => {
    expect(nextActivity(activities, 'a3')).toBeNull();
  });

  it('null sem atividade atual ou com id fora da lista', () => {
    expect(nextActivity(activities, null)).toBeNull();
    expect(nextActivity(activities, undefined)).toBeNull();
    expect(nextActivity(activities, 'inexistente')).toBeNull();
    expect(nextActivity([], 'a1')).toBeNull();
  });
});

describe('passedTestSummary', () => {
  it('"passados/total" dos resultados reais', () => {
    expect(
      passedTestSummary([
        { passed: true },
        { passed: false },
        { passed: true },
      ]),
    ).toBe('2/3 testes aprovados');
    expect(passedTestSummary([{ passed: true }])).toBe('1/1 testes aprovados');
  });

  it('null sem resultados', () => {
    expect(passedTestSummary([])).toBeNull();
    expect(passedTestSummary(null)).toBeNull();
    expect(passedTestSummary(undefined)).toBeNull();
  });
});
