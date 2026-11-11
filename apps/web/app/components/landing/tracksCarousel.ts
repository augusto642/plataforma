/* B47 (Sprint 15) — lógica pura dos dots do carrossel de trilhas
   (TracksCarousel). Fora do componente para ser testável sem DOM. */

/**
 * Índice do alvo de snap mais próximo da posição de scroll atual.
 * `targets` são as posições de scroll (scrollLeft) em que cada card
 * encaixa no snap, na ordem dos cards. Sem alvos → 0.
 */
export function nearestSnapIndex(scrollLeft: number, targets: number[]): number {
  if (targets.length === 0) return 0;
  let best = 0;
  let bestDistance = Infinity;
  targets.forEach((target, index) => {
    const distance = Math.abs(target - scrollLeft);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}
