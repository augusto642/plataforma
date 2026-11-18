import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const configPath = require.resolve('../../apps/web/next.config.js');

async function policiesFor(apiUrl) {
  const previousEnvironment = process.env.NODE_ENV;
  const previousApiUrl = process.env.NEXT_PUBLIC_API_URL;
  try {
    process.env.NODE_ENV = 'production';
    if (apiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = apiUrl;
    delete require.cache[configPath];
    const config = require(configPath);
    return (await config.headers())
      .flatMap((route) => route.headers)
      .filter((header) => header.key === 'Content-Security-Policy')
      .map((header) => header.value);
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
    if (previousApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = previousApiUrl;
    delete require.cache[configPath];
  }
}

test('production CSP permits only the configured API origin', async () => {
  const policies = await policiesFor('https://api.example.org:8443/path');
  assert.ok(policies.length > 0);
  for (const policy of policies) {
    assert.ok(policy.includes("connect-src 'self' https://api.example.org:8443;"));
    assert.ok(!policy.includes('https://api.example.org:8443/path'));
  }
});

test('invalid or unsafe API origins are not added to CSP', async () => {
  for (const value of ['https://user:secret@example.org', 'https://example.org;unsafe', 'javascript:alert(1)', undefined]) {
    for (const policy of await policiesFor(value)) {
      assert.ok(policy.includes("connect-src 'self';"));
    }
  }
});
