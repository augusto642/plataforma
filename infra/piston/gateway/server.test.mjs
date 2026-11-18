import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, test } from 'node:test';
import { createGatewayServer, isAuthorized } from './server.mjs';

const token = 'a'.repeat(64);
let upstream;
let gateway;
let gatewayUrl;
let forwardedBody;

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(server.address().port);
    });
  });
}

before(async () => {
  upstream = http.createServer((request, response) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      forwardedBody = Buffer.concat(chunks).toString('utf8');
      response.writeHead(201, { 'content-type': 'application/json' });
      response.end('{"accepted":true}');
    });
  });
  const upstreamPort = await listen(upstream);
  gateway = createGatewayServer({
    token,
    upstreamHost: '127.0.0.1',
    upstreamPort,
  });
  const gatewayPort = await listen(gateway);
  gatewayUrl = `http://127.0.0.1:${gatewayPort}`;
});

after(async () => {
  await Promise.all(
    [gateway, upstream].map(
      (server) =>
        new Promise((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        ),
    ),
  );
});

test('compares the bearer token in constant time and rejects absent credentials', () => {
  assert.equal(isAuthorized(`Bearer ${token}`, token), true);
  assert.equal(isAuthorized('Bearer wrong', token), false);
  assert.equal(isAuthorized(undefined, token), false);
});

test('accepts only authenticated execution requests and proxies their response', async () => {
  const response = await fetch(`${gatewayUrl}/api/v2/execute`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: '{"language":"python"}',
  });

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { accepted: true });
  assert.equal(forwardedBody, '{"language":"python"}');
});

test('does not expose the upstream package-management API', async () => {
  const response = await fetch(`${gatewayUrl}/api/v2/packages`, {
    method: 'GET',
    headers: { authorization: `Bearer ${token}` },
  });

  assert.equal(response.status, 404);
});

test('limits concurrent requests across clients and releases the slot', async () => {
  let finish;
  let started;
  const start = new Promise((resolve) => { started = resolve; });
  const slow = http.createServer((request, response) => {
    request.resume();
    request.on('end', () => {
      finish = () => response.end('done');
      started();
    });
  });
  const upstreamPort = await listen(slow);
  const limited = createGatewayServer({ token, upstreamHost: '127.0.0.1', upstreamPort, maxConcurrent: 1 });
  const port = await listen(limited);
  const url = `http://127.0.0.1:${port}/api/v2/execute`;
  const options = { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: '{}' };
  try {
    const first = fetch(url, options);
    await start;
    const busy = await fetch(url, options);
    assert.equal(busy.status, 503);
    assert.equal(busy.headers.get('x-piston-gateway-overloaded'), '1');
    finish();
    assert.equal((await first).status, 200);
  } finally {
    await Promise.all([limited, slow].map((server) => new Promise((resolve) => server.close(resolve))));
  }
});
