import { describe, expect, it } from 'vitest';
import { waitlistCountLabel } from '../waitlist';

// B49/P2 (Sprint 16) — o contador da waitlist é a contagem real da
// API: estes testes travam o rótulo, em especial o ZERO honesto
// (nada de esconder lista vazia atrás de texto genérico).
describe('waitlistCountLabel', () => {
  it('zero é zero — convida a ser a primeira pessoa, sem esconder o número', () => {
    expect(waitlistCountLabel(0)).toBe('0 pessoas nesta lista — seja a primeira');
  });

  it('singular para 1 pessoa', () => {
    expect(waitlistCountLabel(1)).toBe('1 pessoa nesta lista');
  });

  it('plural direto para 2+', () => {
    expect(waitlistCountLabel(2)).toBe('2 pessoas nesta lista');
    expect(waitlistCountLabel(137)).toBe('137 pessoas nesta lista');
  });
});
