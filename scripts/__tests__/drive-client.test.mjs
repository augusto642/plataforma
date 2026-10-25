import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import {
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
