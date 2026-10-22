import { describe, expect, it } from 'vitest';
import { moveCommandSelection } from '../commandPalette';

// B46 (Sprint 15) — a palette passou a cumprir o que o rodapé dela
// anuncia ("Navegue com ↑ ↓ e pressione Enter"): estes testes travam
// a aritmética da seleção, incluindo o wrap-around das pontas.
describe('moveCommandSelection', () => {
  it('move para baixo e para cima dentro da lista', () => {
    expect(moveCommandSelection(0, 1, 9)).toBe(1);
    expect(moveCommandSelection(4, 1, 9)).toBe(5);
    expect(moveCommandSelection(4, -1, 9)).toBe(3);
  });

  it('faz wrap-around nas duas pontas', () => {
    expect(moveCommandSelection(8, 1, 9)).toBe(0);
    expect(moveCommandSelection(0, -1, 9)).toBe(8);
  });

  it('lista vazia ou de um item nunca sai do lugar', () => {
    expect(moveCommandSelection(0, 1, 0)).toBe(0);
    expect(moveCommandSelection(0, -1, 0)).toBe(0);
    expect(moveCommandSelection(0, 1, 1)).toBe(0);
    expect(moveCommandSelection(0, -1, 1)).toBe(0);
  });

  it('normaliza uma seleção órfã quando a lista encolhe', () => {
    // Ex.: havia 9 itens, o filtro deixou 2 e a seleção estava no 7.
    expect(moveCommandSelection(7, 1, 2)).toBe(0);
    expect(moveCommandSelection(7, -1, 2)).toBe(0);
  });
});
