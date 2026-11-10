import { describe, expect, it } from 'vitest';
import { nearestSnapIndex } from '../tracksCarousel';

// B47 (Sprint 15) — os dots do carrossel de trilhas deixaram de ser
// decorativos: o ativo é o alvo de snap mais próximo do scroll real.
// Estes testes travam essa leitura de posição.
describe('nearestSnapIndex', () => {
  const targets = [0, 362, 724, 1086];

  it('retorna o índice do alvo mais próximo do scroll', () => {
    expect(nearestSnapIndex(0, targets)).toBe(0);
    expect(nearestSnapIndex(350, targets)).toBe(1);
    expect(nearestSnapIndex(700, targets)).toBe(2);
    expect(nearestSnapIndex(2000, targets)).toBe(3);
  });

  it('no meio do caminho, escolhe o alvo mais perto', () => {
    expect(nearestSnapIndex(180, targets)).toBe(0);
    expect(nearestSnapIndex(182, targets)).toBe(1);
  });

  it('sem alvos, retorna 0', () => {
    expect(nearestSnapIndex(500, [])).toBe(0);
  });
});
