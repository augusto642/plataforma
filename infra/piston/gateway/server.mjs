import { timingSafeEqual } from 'node:crypto';
import http from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXECUTE_PATH = '/api/v2/execute';

export function isAuthorized(header, token) {
  if (typeof header !== 'string') return false;
  const expected = Buffer.from(`Bearer ${token}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createGatewayServer({
  token,
  upstreamHost = 'piston',
  upstreamPort = 2000,
  maxConcurrent = 4,
}) {
  if (!/^[a-f0-9]{64}$/i.test(token ?? '')) {
    throw new Error('PISTON_AUTH_TOKEN must contain 32 random bytes encoded as hex');
  }
  if (!Number.isSafeInteger(maxConcurrent) || maxConcurrent < 1) {
    throw new Error('PISTON_GATEWAY_MAX_CONCURRENT must be a positive integer');
  }
  let active = 0;

  return http.createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'content-type': 'text/plain' });
      response.end('ok');
      return;
    }

    if (!isAuthorized(request.headers.authorization, token)) {
      response.writeHead(401, { 'content-type': 'text/plain' });
      response.end('unauthorized');
      return;
    }

    if (request.method !== 'POST' || request.url !== EXECUTE_PATH) {
      response.writeHead(404, { 'content-type': 'text/plain' });
      response.end('not found');
      return;
    }
    if (active >= maxConcurrent) {
      response.writeHead(503, {
        'content-type': 'text/plain',
        'retry-after': '5',
        'x-piston-gateway-overloaded': '1',
      });
      response.end('runner busy');
      request.resume();
      return;
    }

    active++;
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        active--;
      }
    };

    const headers = {
      'content-type': request.headers['content-type'] ?? 'application/json',
    };
    if (request.headers['content-length']) {
      headers['content-length'] = request.headers['content-length'];
    }

    const upstream = http.request(
      {
        hostname: upstreamHost,
        port: upstreamPort,
        path: EXECUTE_PATH,
        method: 'POST',
        headers,
      },
      (upstreamResponse) => {
        upstreamResponse.once('end', release);
        upstreamResponse.once('close', release);
        if (response.destroyed) {
          upstreamResponse.resume();
          return;
        }
        const responseHeaders = {};
        for (const name of ['content-type', 'content-length']) {
          const value = upstreamResponse.headers[name];
          if (typeof value === 'string') responseHeaders[name] = value;
        }
        response.writeHead(upstreamResponse.statusCode ?? 502, responseHeaders);
        upstreamResponse.pipe(response);
        response.once('close', () => upstreamResponse.resume());
      },
    );

    upstream.on('error', () => {
      release();
      if (!response.headersSent) {
        response.writeHead(502, { 'content-type': 'text/plain' });
      }
      response.end('runner unavailable');
    });
    upstream.setTimeout(120_000, () => upstream.destroy(new Error('runner timed out')));
    request.on('aborted', () => {
      if (!request.complete) upstream.destroy();
    });
    request.pipe(upstream);
  });
}

const entrypoint = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (entrypoint) {
  const server = createGatewayServer({
    token: process.env.PISTON_AUTH_TOKEN,
    maxConcurrent: Number(process.env.PISTON_GATEWAY_MAX_CONCURRENT ?? 4),
  });
  const port = Number(process.env.GATEWAY_PORT ?? 2000);
  server.listen(port, '0.0.0.0');
}
