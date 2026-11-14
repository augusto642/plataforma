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
 *
 * B76 (Sprint 18 · Volta 3) — `oxc.jsx` habilita os specs de
 * RENDERIZAÇÃO (landing-render.spec.ts): o tsconfig do Next usa
 * `jsx: preserve` (quem transforma é o compilador do Next), então
 * sem esta linha o Vite 8 (transform oxc) não compila os .tsx
 * importados pelos testes.
 */
export default defineConfig({
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'app/**/__tests__/**/*.spec.ts',
      'app/**/*.spec.ts',
      'app/**/__tests__/**/*.test.ts',
      'app/**/*.test.ts',
    ],
    exclude: ['node_modules', '.next', 'e2e'],
  },
});
