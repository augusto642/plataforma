import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkAlphaConfiguration,
  checkAlphaEvidence,
  parseArguments,
  parseEnvFile,
} from '../alpha-preflight.mjs';

const strong = 'a'.repeat(64);
const readyEnv = {
  ALPHA_FREE_MODE: 'true',
  BILLING_MODE: 'test',
  BILLING_PROVIDER: 'simulated',
  NEXT_PUBLIC_ALPHA_FREE_MODE: 'true',
  NEXT_PUBLIC_API_URL: 'https://api.example.com',
  WEB_PUBLIC_URL: 'https://app.example.com',
  WEB_DOMAIN: 'app.example.com',
  API_DOMAIN: 'api.example.com',
  ACME_EMAIL: 'ops@example.com',
  CORS_ORIGIN: 'https://app.example.com',
  GITEA_ENABLED: 'true',
  GITEA_PUBLIC_URL: 'https://git.example.com/',
  GITEA_DOMAIN: 'git.example.com',
  GITEA_SSH_DOMAIN: 'git.example.com',
  ALERTMANAGER_WEBHOOK_URL: 'https://alerts.example.com/incoming?token=private',
  GITEA_TOKEN: 'service-account-token',
  PISTON_ENABLED: 'true',
  PISTON_URL: 'http://piston.internal:2000',
  PISTON_AUTH_TOKEN: strong,
  METRICS_TOKEN: strong,
  JWT_ACCESS_SECRET: strong,
  JWT_REFRESH_SECRET: strong,
  CERTIFICATE_HMAC_SECRET: strong,
  BILLING_WEBHOOK_SECRET: strong,
  POSTGRES_PASSWORD: strong,
  REDIS_PASSWORD: strong,
  GITEA_WEBHOOK_SECRET: strong,
};

test('parses env assignments without expanding or exposing their values', () => {
  assert.deepEqual(parseEnvFile([
    '# ignored',
    'export ALPHA_FREE_MODE=true',
    'SECRET="private value"',
    'PORT=3000 # comment',
  ].join('\n')), {
    ALPHA_FREE_MODE: 'true',
    SECRET: 'private value',
    PORT: '3000',
  });
});

test('parses preflight options without colliding with Node or pnpm env-file flags', () => {
  assert.deepEqual(
    parseArguments(['--env-path', '.env.local', '--evidence-file', 'evidence.json', '--probe']),
    {
      envFile: '.env.local',
      evidenceFile: 'evidence.json',
      probe: true,
    },
  );
});

test('accepts a complete free-alpha configuration', () => {
  const checks = checkAlphaConfiguration(readyEnv);
  assert.deepEqual(checks.filter((check) => check.status !== 'ready'), []);
});

test('blocks live billing, insecure public URLs, CORS mismatch, and weak runner tokens', () => {
  const checks = checkAlphaConfiguration({
    ...readyEnv,
    BILLING_PROVIDER: 'mercadopago',
    PISTON_ENABLED: 'false',
    NEXT_PUBLIC_API_URL: 'http://localhost:3000',
    CORS_ORIGIN: 'https://other.example.com',
    PISTON_AUTH_TOKEN: 'not-a-token',
    ALERTMANAGER_WEBHOOK_URL: 'http://alerts.example.com/incoming',
    WEB_DOMAIN: 'wrong.example.com',
  });
  const blockedIds = checks.filter((check) => check.status === 'blocked').map((check) => check.id);
  assert.ok(blockedIds.includes('billing-mode'));
  assert.ok(blockedIds.includes('piston-enabled'));
  assert.ok(blockedIds.includes('public-url-next_public_api_url'));
  assert.ok(blockedIds.includes('cors-origin'));
  assert.ok(blockedIds.includes('piston-token'));
  assert.ok(blockedIds.includes('alertmanager-webhook-url'));
  assert.ok(blockedIds.includes('public-edge-domains'));
});

test('does not include secret values in check output', () => {
  const secret = 'never-print-this-secret';
  const checks = checkAlphaConfiguration({ ...readyEnv, JWT_ACCESS_SECRET: secret });
  assert.equal(JSON.stringify(checks).includes(secret), false);
});

test('requires explicit evidence for every manual launch gate', () => {
  const blocked = checkAlphaEvidence(undefined);
  assert.ok(blocked.length > 0);
  const evidence = {
    version: 1,
    gates: Object.fromEntries(
      blocked.map((check) => [
        check.id.replace('evidence-', ''),
        { status: 'passed', evidence: 'reviewed evidence reference' },
      ]),
    ),
  };
  assert.deepEqual(
    checkAlphaEvidence(evidence).filter((check) => check.status !== 'ready'),
    [],
  );
});
