import assert from 'node:assert/strict';
import {
  buildRunnerConfig,
  PISTON_DEFAULT_URL,
} from './runner.config';

describe('buildRunnerConfig remote authentication', () => {
  it('keeps the local Piston default unauthenticated', () => {
    const config = buildRunnerConfig({});

    assert.equal(config.enabled, false);
    assert.equal(config.url, PISTON_DEFAULT_URL);
    assert.equal(config.authToken, undefined);
  });

  it('only enables execution with an explicit true value', () => {
    assert.equal(buildRunnerConfig({ PISTON_ENABLED: 'true' }).enabled, true);
    assert.equal(buildRunnerConfig({ PISTON_ENABLED: 'false' }).enabled, false);
    assert.throws(
      () => buildRunnerConfig({ PISTON_ENABLED: 'yes' }),
      /Invalid PISTON_ENABLED/,
    );
  });

  it('requires a 256-bit hex token for remote Piston URLs', () => {
    const token = 'b'.repeat(64);
    const config = buildRunnerConfig({
      PISTON_URL: 'https://runner.example.test',
      PISTON_AUTH_TOKEN: token,
    });

    assert.equal(config.authToken, token);
    assert.throws(
      () =>
        buildRunnerConfig({
          PISTON_URL: 'https://runner.example.test',
          PISTON_AUTH_TOKEN: 'short',
        }),
      /expected 32 random bytes/,
    );
  });
});
