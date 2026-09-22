/**
 * Jest configuration for the API package.
 *
 * Runs the real regression/unit suite. Nothing here talks to
 * Postgres/Redis/Gitea/Piston: services under test receive injected mocks.
 * Keep `coverigeDirectory` ABOVE `rootDir/src` so coverage never lands
 * inside source folders.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
  testRegex: '.*\\.spec\\.ts$',
  collectCoverageFrom: [
    '**/*.service.ts',
    '**/*.controller.ts',
    '**/*.guard.ts',
  ],
  coveragePathIgnorePatterns: [
    '\\.spec\\.ts$',
    '.*\\/dto\\/.*',
    '.*\\.module\\.ts$',
  ],
  coverageDirectory: '<rootDir>/../coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  /**
   * Coverage ratchet (set 2026-09): thresholds calibrados na medição real
   * de hoje (global 41.4/38.4/32.2/41.6). O objetivo é impedir EROSÃO —
   * qualquer queda derruba o CI. Suba os números a cada ganho de cobertura.
   *
   * Núcleos de segurança usam path-aggregate (chave com barra final = tipo
   * PATH no Jest: agrega TODOS os arquivos do diretório numa checagem só;
   * globs `**` seriam checados arquivo-a-arquivo). Valores medidos hoje:
   *   src/submissions/ -> 77.5 stmts / 69.5 branch / 67.3 funcs / 76.9 lines
   *   src/webhooks/    -> 85.8 stmts / 66.0 branch / 83.3 funcs / 85.6 lines
   * (90% ainda não é atingível no agregado: submissions.controller.ts está
   * em 0% e puxa a média do diretório para baixo — ver docs/TEST-STRATEGY.md.)
   *
   * src/config/ (secrets.validation.ts) NÃO tem threshold: o arquivo não
   * casa com collectCoverageFrom (*.service/*.controller/*.guard), então não
   * entra no mapa de cobertura e qualquer grupo de threshold sem dados
   * falha com "Coverage data for ... was not found". Follow-up: incluir
   * '**\/config\/**\/!(*.spec).ts' no collectCoverageFrom e então threshold 90.
   */
  coverageThreshold: {
    // Âncora: no Jest 30, quando existem grupos path/glob, a chave 'global'
    // só agrega arquivos NÃO casados por outros grupos. './src/' casa todos
    // os arquivos cobertos (grupo PATH, agrega o diretório inteiro), deixando
    // o conjunto do 'global' vazio — e aí o Jest faz fallback para TODOS os
    // coveredFiles. Resultado: 'global' mede o projeto inteiro (41.4/38.2/
    // 32.2/41.6 hoje) e './src/' mede o mesmo agregado. Ambos em 40/35/30/40.
    './src/': {
      statements: 40,
      branches: 35,
      functions: 30,
      lines: 40,
    },
    global: {
      statements: 40,
      branches: 35,
      functions: 30,
      lines: 40,
    },
    './src/submissions/': {
      statements: 75,
      branches: 67,
      functions: 65,
      lines: 74,
    },
    './src/webhooks/': {
      statements: 84,
      branches: 64,
      functions: 80,
      lines: 84,
    },
  },
  clearMocks: true,
  verbose: false,
};
