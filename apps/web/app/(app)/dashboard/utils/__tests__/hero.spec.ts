import { describe, expect, it } from 'vitest';
import { deriveHeroEyebrow } from '../hero';

// Central 219 (D2) — eyebrow do hero no formato do protótipo
// ("FASE ATUAL: ..."), sem inventar mundo/capítulo (sem fonte real).
describe('deriveHeroEyebrow (D2)', () => {
  it('sem missão → estado vazio honesto, sem repetir o DynamicTrackCard', () => {
    expect(
      deriveHeroEyebrow({ trackTitle: null, activePhaseNumber: null }),
    ).toBe('Comece aqui');
  });

  it('com missão e fase ativa → FASE ATUAL com o número real da fase', () => {
    expect(
      deriveHeroEyebrow({ trackTitle: 'TRILHA ATIVA: X', activePhaseNumber: 3 }),
    ).toBe('FASE ATUAL: FASE 03');
  });

  it('com missão mas sem fase determinável → título da trilha, sem número inventado', () => {
    expect(
      deriveHeroEyebrow({ trackTitle: 'TRILHA ATIVA: X', activePhaseNumber: null }),
    ).toBe('TRILHA ATIVA: X');
  });
});
