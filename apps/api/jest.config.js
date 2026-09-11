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
  clearMocks: true,
  verbose: false,
};
