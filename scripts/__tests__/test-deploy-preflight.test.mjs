import assert from 'node:assert/strict';
import test from 'node:test';
import { checkTestDeploy, parseTestDeployArguments } from '../test-deploy-preflight.mjs';

const ready = {
  TEST_COMPOSE_PROJECT: 'nexus-test-isolado',
  TEST_DATABASE_URL: 'postgresql://test:secret@staging-db.example/nexus_test',
  TEST_DATABASE_CONFIRMED: 'true',
  PISTON_URL: 'http://runner.internal:2000',
  PISTON_NETWORK_CONFIRMED: 'true',
  PISTON_AUTH_TOKEN: 'a'.repeat(64),
  NEXT_PUBLIC_API_URL: 'https://api.example.test',
  WEB_PUBLIC_URL: 'https://web.example.test',
  CORS_ORIGIN: 'https://web.example.test',
  ALPHA_FREE_MODE: 'true',
  BILLING_MODE: 'test',
  BILLING_PROVIDER: 'simulated',
  GITEA_ENABLED: 'true',
  GITEA_TOKEN: 'private-token',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  CERTIFICATE_HMAC_SECRET: 'c'.repeat(32),
  BILLING_WEBHOOK_SECRET: 'd'.repeat(32),
  POSTGRES_PASSWORD: 'e'.repeat(32),
  REDIS_PASSWORD: 'f'.repeat(32),
  GITEA_WEBHOOK_SECRET: 'g'.repeat(32),
  METRICS_TOKEN: 'h'.repeat(32),
};

function blocked(env) {
  return checkTestDeploy(env).filter((check) => !check.passed).map((check) => check.id);
}

test('accepts a complete configuration without claiming remote validation', () => {
  assert.deepEqual(blocked(ready), []);
});

test('requires a distinct, explicitly confirmed test database', () => {
  for (const patch of [
    { TEST_DATABASE_URL: 'postgresql://different-user:secret@postgres/plataforma' },
    { DATABASE_URL: 'postgresql://another-user:password@staging-db.example:5432/nexus_test?sslmode=require' },
    { TEST_DATABASE_URL: 'invalid' },
  ]) {
    assert.ok(blocked({ ...ready, ...patch }).includes('test-database'));
  }
  assert.ok(blocked({ ...ready, TEST_DATABASE_CONFIRMED: 'false' }).includes('test-database-confirmed'));
});

test('requires a dedicated Compose project name', () => {
  assert.ok(blocked({ ...ready, TEST_COMPOSE_PROJECT: 'plataforma' }).includes('compose-project'));
});

test('requires an acknowledged remote runner and secure browser origins', () => {
  const ids = blocked({
    ...ready,
    PISTON_URL: 'http://127.0.0.1:2000',
    PISTON_NETWORK_CONFIRMED: '',
    PISTON_AUTH_TOKEN: 'weak',
    NEXT_PUBLIC_API_URL: 'http://api.example.test',
    CORS_ORIGIN: 'https://other.example.test',
  });
  for (const id of ['runner-url', 'runner-confirmed', 'runner-token', 'browser-origins']) assert.ok(ids.includes(id));
});

test('blocks weak, reused and missing secrets without reporting values', () => {
  const env = { ...ready, JWT_ACCESS_SECRET: 'private', JWT_REFRESH_SECRET: ready.CERTIFICATE_HMAC_SECRET, GITEA_TOKEN: '' };
  const checks = checkTestDeploy(env);
  const ids = blocked(env);
  assert.ok(ids.includes('secret-JWT_ACCESS_SECRET'));
  assert.ok(ids.includes('unique-secrets'));
  assert.ok(ids.includes('gitea-token'));
  assert.equal(JSON.stringify(checks).includes('private'), false);
  assert.equal(JSON.stringify(checks).includes(ready.TEST_DATABASE_URL), false);
});

test('accepts only documented CLI options', () => {
  assert.deepEqual(parseTestDeployArguments([]), { envFile: '.env' });
  assert.deepEqual(parseTestDeployArguments(['--env-path', '.env.test']), { envFile: '.env.test' });
  assert.throws(() => parseTestDeployArguments(['--probe']));
});
