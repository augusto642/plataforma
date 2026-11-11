import { describe, expect, it } from 'vitest';
import {
  hasMarketEvidence,
  trackRouteFor,
  type DynamicTrackView,
} from '../dynamic-track';

function investigation(
  overrides: Partial<DynamicTrackView>,
): DynamicTrackView {
  return {
    id: 'inv-1',
    status: 'investigating',
    suggestedTrack: null,
    trackName: null,
    reasons: [],
    rationaleText: null,
    basis: null,
    marketEvidence: [],
    slaDueAt: '2026-11-12T18:00:00.000Z',
    overdue: false,
    completedAt: null,
    notifiedAt: null,
    failureReason: null,
    startCourse: null,
    ...overrides,
  };
}

// Central 216 (F1/A6) — roteamento das telas de trilha e a guarda do
// rodapé "mercado real": uma única regra, testada aqui, usada pelas
// rotas /trilha/aguardando, /trilha/sugerida e pelo DynamicTrackCard.
describe('dynamic-track — rotas e guarda de evidência', () => {
  it('investigating → /trilha/aguardando; ready → /trilha/sugerida', () => {
    expect(trackRouteFor(investigation({ status: 'investigating' }))).toBe(
      '/trilha/aguardando',
    );
    expect(trackRouteFor(investigation({ status: 'ready' }))).toBe('/trilha/sugerida');
  });

  it('failed ou sem investigação → nenhuma rota de trilha', () => {
    expect(trackRouteFor(investigation({ status: 'failed' }))).toBeNull();
    expect(trackRouteFor(null)).toBeNull();
    expect(trackRouteFor(undefined)).toBeNull();
  });

  it('rodapé "mercado real" só com evidência real', () => {
    expect(hasMarketEvidence(investigation({}))).toBe(false);
    expect(
      hasMarketEvidence(
        investigation({
          marketEvidence: [
            {
              titulo: 'Vagas frontend em alta',
              tecnologia: 'javascript',
              tipo: 'vaga',
              publishedAt: '2026-11-01T00:00:00.000Z',
              sourceName: 'Fonte',
              sourceUrl: 'https://exemplo.dev/vagas',
              score: 80,
            },
          ],
        }),
      ),
    ).toBe(true);
  });
});
