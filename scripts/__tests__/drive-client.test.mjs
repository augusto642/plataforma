import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createDriveClient,
  createJwt,
  DriveApiError,
  parseServiceAccountCredentials,
} from '../drive-client.mjs';

function testKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return {
    publicKey,
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  };
}

describe('drive-client', () => {
  it('parseServiceAccountCredentials aceita forma válida e rejeita formas inválidas', () => {
    const { privateKey } = testKeyPair();
    const good = {
      type: 'service_account',
      client_email: 'teste@projeto.iam.gserviceaccount.com',
      private_key: privateKey,
      token_uri: 'https://oauth2.googleapis.com/token',
    };
    assert.equal(parseServiceAccountCredentials(JSON.stringify(good)).client_email, good.client_email);
    assert.throws(() => parseServiceAccountCredentials('{json inválido'), /JSON ilegível/);
    assert.throws(() => parseServiceAccountCredentials(JSON.stringify({ ...good, type: 'authorized_user' })), /falta/);
    assert.throws(() => parseServiceAccountCredentials(JSON.stringify({ ...good, private_key: undefined })), /falta/);
  });

  it('createJwt gera JWT RS256 verificável (header.payload.signature)', () => {
    const { publicKey, privateKey } = testKeyPair();
    const jwt = createJwt({
      client_email: 'teste@projeto.iam.gserviceaccount.com',
      private_key: privateKey,
      token_uri: 'https://oauth2.googleapis.com/token',
    });
    const [header, payload, signature] = jwt.split('.');
    assert.equal(JSON.parse(Buffer.from(header, 'base64url').toString()).alg, 'RS256');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    assert.equal(claims.iss, 'teste@projeto.iam.gserviceaccount.com');
    assert.equal(claims.scope, 'https://www.googleapis.com/auth/drive.readonly');
    assert.ok(claims.exp > claims.iat);
    assert.ok(verify('RSA-SHA256', Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, 'base64url')));
  });

  it('DriveApiError carrega operação e status, sem vazar credencial', () => {
    const err = new DriveApiError('files.get', 404, 'not found');
    assert.equal(err.status, 404);
    assert.equal(err.operation, 'files.get');
    assert.match(err.message, /404/);
    assert.doesNotMatch(err.message, /private_key|Bearer/);
  });
});

describe('downloadFile (web ReadableStream do fetch Node 24)', () => {
  function stubFetch(bodyStream) {
    const orig = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).includes('oauth2.googleapis.com/token')) {
        return { ok: true, json: async () => ({ access_token: 'tok-teste', expires_in: 3600 }) };
      }
      return { ok: true, body: bodyStream };
    };
    return () => { globalThis.fetch = orig; };
  }
  function testClient() {
    const { privateKey } = testKeyPair();
    return createDriveClient(parseServiceAccountCredentials(JSON.stringify({
      type: 'service_account',
      client_email: 'teste@projeto.iam.gserviceaccount.com',
      private_key: privateKey,
      token_uri: 'https://oauth2.googleapis.com/token',
    })));
  }
  function tmpDest() {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-dl-'));
    return { dir, dest: join(dir, 'video.mp4') };
  }

  it('baixa corpo web stream e valida o tamanho', async () => {
    const restore = stubFetch(new Response('0123456789').body);
    const { dir, dest } = tmpDest();
    try {
      assert.equal(await testClient().downloadFile('file-1', dest, 10), dest);
      assert.equal(readFileSync(dest, 'utf8'), '0123456789');
    } finally { restore(); rmSync(dir, { recursive: true, force: true }); }
  });

  it('tamanho divergente rejeita (não derruba o processo)', async () => {
    const restore = stubFetch(new Response('0123456789').body);
    const { dir, dest } = tmpDest();
    try {
      await assert.rejects(testClient().downloadFile('file-1', dest, 999), /download incompleto/);
    } finally { restore(); rmSync(dir, { recursive: true, force: true }); }
  });

  it('erro no meio do stream rejeita (não vira unhandled error)', async () => {
    const errStream = new ReadableStream({
      start(c) { c.enqueue(new TextEncoder().encode('abc')); c.error(new Error('rede caiu')); },
    });
    const restore = stubFetch(errStream);
    const { dir, dest } = tmpDest();
    try {
      await assert.rejects(testClient().downloadFile('file-1', dest, null), /rede caiu/);
    } finally { restore(); rmSync(dir, { recursive: true, force: true }); }
  });
});
