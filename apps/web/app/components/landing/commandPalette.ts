/* B46 (Sprint 15) — lógica pura da navegação por teclado da command
   palette (LandingChrome). Fica fora do componente para ser testável
   sem renderizar: as setas movem a seleção com wrap-around (do
   último item volta ao primeiro e vice-versa). */

/**
 * Próximo índice selecionado ao mover `delta` posições numa lista de
 * `count` itens. Lista vazia → 0 (nenhum item é renderizado de
 * qualquer forma). Índices fora da faixa são normalizados antes do
 * movimento, então uma seleção órfã (lista filtrada encolheu) nunca
 * trava a navegação.
 */
export function moveCommandSelection(
  current: number,
  delta: number,
  count: number,
): number {
  if (count <= 0) return 0;
  const safeCurrent = Math.min(Math.max(current, 0), count - 1);
  return (((safeCurrent + delta) % count) + count) % count;
}
