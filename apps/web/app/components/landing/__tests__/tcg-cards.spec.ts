import { describe, expect, it } from 'vitest';
import { TCG_CARDS } from '../TcgCardsShowcase';
import { resolveStarterIdParam } from '../../../lib/deepLinks';

// B63 (Sprint 18 · Volta 3 · QA A1 — o ALTO da Volta 2): os cards
// TCG de Rust/Go prometiam companion escolhível como starter, mas o
// onboarding só tem os starters canônicos (pythox/scripty/javagon) —
// o clique caía em fallback silencioso. Estes testes travam os
// DADOS: card 'available' precisa resolver para um starter que
// EXISTE no catálogo canônico; card do radar declara a trilha e
// nunca finge disponibilidade.
const CANONICAL_STARTERS = ['pythox', 'scripty', 'javagon'];

describe('TCG_CARDS — disponibilidade de starter com lastro (B63)', () => {
  it('todo card disponível resolve para um starter canônico existente', () => {
    const available = TCG_CARDS.filter((card) => card.starterStatus === 'available');
    expect(available.length).toBeGreaterThan(0);
    for (const card of available) {
      const resolved = resolveStarterIdParam(card.id);
      expect(resolved, `card ${card.id}`).not.toBeNull();
      expect(CANONICAL_STARTERS).toContain(resolved);
    }
  });

  it('os companions de Rust e Go são radar declarado, com a trilha nomeada', () => {
    const radar = TCG_CARDS.filter((card) => card.starterStatus === 'radar');
    expect(radar.map((card) => card.id).sort()).toEqual(['go-swarm', 'rust-paladin']);
    for (const card of radar) {
      expect(card.radarTrackName).toBeTruthy();
    }
  });

  it('nenhum card disponível aponta para starter fora do catálogo', () => {
    for (const card of TCG_CARDS) {
      if (card.starterStatus !== 'available') continue;
      expect(['rustor', 'gopherus']).not.toContain(resolveStarterIdParam(card.id));
    }
  });
});
