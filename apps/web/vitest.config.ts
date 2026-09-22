import { defineConfig } from 'vitest/config';

/**
 * Vitest config — testes unitários do app web.
 *
 * Escopo atual: engine do jogo (app/game/engine/**) e stores Zustand.
 * `environment: 'node'` basta: o engine protege window/document com
 * `typeof` guards e os specs injetam mocks de CanvasRenderingContext2D.
 *
 * `globals: true` provê describe/it/expect globalmente (os specs usam a
 * API estilo Jest — engine.spec.ts tem harness adaptativo, mas
 * pedagogy-and-bosses.spec.ts depende de globais).
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['app/**/__tests__/**/*.spec.ts', 'app/**/*.spec.ts'],
    exclude: ['node_modules', '.next', 'e2e'],
  },
});
