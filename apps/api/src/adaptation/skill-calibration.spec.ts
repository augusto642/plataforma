import { calibrateSkill } from './skill-calibration';

describe('calibrateSkill (Fase 5 — diagnóstico calibrado por nível)', () => {
  it('pouca evidência puxa para o meio (Laplace): 1 acerto não vira 1,0', () => {
    const result = calibrateSkill({ passed: 1, failed: 0, rubricMean: null });
    expect(result.score).toBeCloseTo(2 / 3, 5);
    expect(result.level).toBe('developing');
  });

  it('sem evidência, o score fica no prior 0,5 (nunca 0)', () => {
    const result = calibrateSkill({ passed: 0, failed: 0, rubricMean: null });
    expect(result.score).toBe(0.5);
    expect(result.level).toBe('developing');
  });

  it('rubrica mistura com peso 0,4: acertos + revisão alta sobem o score', () => {
    const without = calibrateSkill({ passed: 4, failed: 1, rubricMean: null });
    const withRubric = calibrateSkill({ passed: 4, failed: 1, rubricMean: 5 });
    expect(withRubric.score).toBeGreaterThan(without.score);
    expect(withRubric.level).toBe('proficient');
  });

  it('rubrica fora da escala é clampada (não estoura 1,0)', () => {
    const result = calibrateSkill({ passed: 10, failed: 0, rubricMean: 99 });
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('missing abaixo de 0,40: só falhas com volume', () => {
    const result = calibrateSkill({ passed: 0, failed: 8, rubricMean: null });
    expect(result.level).toBe('missing');
    expect(result.weakSpot).toBe(true);
  });

  it('weakSpot exige >= 3 tentativas e >= 60% de falha', () => {
    expect(
      calibrateSkill({ passed: 1, failed: 1, rubricMean: null }).weakSpot,
    ).toBe(false);
    expect(
      calibrateSkill({ passed: 1, failed: 3, rubricMean: null }).weakSpot,
    ).toBe(true);
    expect(
      calibrateSkill({ passed: 2, failed: 2, rubricMean: null }).weakSpot,
    ).toBe(false);
  });
});
