import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ed25519 from '@digitalbazaar/ed25519-multikey';
import { DataIntegrityProof } from '@digitalbazaar/data-integrity';
import { cryptosuite } from '@digitalbazaar/eddsa-rdfc-2022-cryptosuite';
import jsigs from 'jsonld-signatures';
import jsonld from 'jsonld';
import { gunzipSync } from 'node:zlib';
import * as vcContext from '@digitalbazaar/credentials-context';
import obContext from '@digitalcredentials/open-badges-context';
import * as integrityContext from '@digitalbazaar/data-integrity-context';
import * as multikeyContext from '@digitalbazaar/multikey-context';
import * as didContext from 'did-context';
import { issueCredential, issueStatusList, makeIssuer } from './open-badges.mjs';

const issuerId = 'https://issuer.example/credentials/issuer';
const userId = 'b73040b6-b09f-405b-ad96-d4313f29f6f1';
const status = { id: '18a485b6-398c-493e-a0cc-c364d74e8c62', listUrl: 'https://issuer.example/credentials/status-lists/0', index: 42 };
const evidence = {
  activityId: 'c888a8dd-589e-4e51-8a4b-f614d425da49',
  activity: 'Funções', language: 'python', concepts: ['funcoes'],
  criterion: 'Passar nos casos de teste automatizados da atividade.',
  testsPassed: 2, submittedAt: '2026-01-01T00:00:00Z',
};

async function fixture() {
  const pair = await ed25519.generate({ seed: new Uint8Array(32).fill(42) });
  const exported = await pair.export({ publicKey: true, secretKey: true });
  return makeIssuer({ issuerId, issuerName: 'Emissor de teste', ...exported });
}

test('issues a safely expanded OB3 credential independently verifiable with the public key', async () => {
  const issuer = await fixture();
  const credential = await issueCredential(issuer, userId, evidence, status);
  // This verifier receives only public documents, not the signer or secret key.
  const documents = new Map([
    ...vcContext.contexts, ...obContext.contexts, ...integrityContext.contexts,
    ...multikeyContext.contexts, ...didContext.contexts,
    [issuer.publicKey.id, structuredClone(issuer.publicKey)],
    [issuer.profile.id, structuredClone(issuer.profile)],
  ]);
  const loader = async (url) => {
    const document = documents.get(url);
    if (!document) throw new Error('Unrecognized public document');
    return { document, documentUrl: url, contextUrl: null };
  };
  await jsonld.expand(credential, { documentLoader: loader, safe: true });
  const result = await jsigs.verify(credential, {
    suite: new DataIntegrityProof({ cryptosuite }),
    purpose: new jsigs.purposes.AssertionProofPurpose(),
    documentLoader: loader,
  });
  assert.equal(result.verified, true, JSON.stringify(result.error));
  assert.equal(credential.proof.cryptosuite, 'eddsa-rdfc-2022');
  assert.equal(credential.issuer.id, issuerId);
  assert.equal(issuer.publicKey.controller, issuerId);
  assert.equal(credential.proof.verificationMethod, issuer.publicKey.id);
  assert.equal(credential.credentialSubject.id, `urn:uuid:${userId}`);
  assert.equal(credential.credentialStatus.statusListCredential, status.listUrl);
  assert.equal(credential.credentialStatus.statusListIndex, '42');
  assert.equal(credential.credentialSubject.achievement.criteria.narrative, evidence.criterion);
  assert.match(credential.evidence[0].narrative, /2 casos de teste/);
  assert.ok(!JSON.stringify(credential).includes('secretKeyMultibase'));
  for (const change of [
    (c) => { c.credentialSubject.achievement.name = 'Alterado'; },
    (c) => { c.evidence[0].narrative = 'Alterado'; },
    (c) => { c.issuer.name = 'Outro emissor'; },
    (c) => { c.credentialSubject.id = 'urn:uuid:00000000-0000-4000-8000-000000000000'; },
  ]) {
    const tampered = structuredClone(credential);
    change(tampered);
    const bad = await jsigs.verify(tampered, {
      suite: new DataIntegrityProof({ cryptosuite }),
      purpose: new jsigs.purposes.AssertionProofPurpose(),
      documentLoader: loader,
    });
    assert.equal(bad.verified, false);
  }
});

test('signs a standard revocation list with the correct bit and minimum size', async () => {
  const issuer = await fixture();
  const list = await issueStatusList(issuer, status.listUrl, [status.index]);
  const loader = (await import('./open-badges.mjs')).makeDocumentLoader(issuer.publicKey, issuer.profile);
  const result = await jsigs.verify(list, {
    suite: new DataIntegrityProof({ cryptosuite }),
    purpose: new jsigs.purposes.AssertionProofPurpose(),
    documentLoader: loader,
  });
  assert.equal(result.verified, true);
  const encoded = list.credentialSubject.encodedList;
  assert.equal(encoded[0], 'u');
  const bits = gunzipSync(Buffer.from(encoded.slice(1), 'base64url'));
  assert.equal(bits.length, 16384);
  assert.equal(bits[5], 0x20);
  assert.equal(bits[0], 0);
});

test('rejects invalid issuer and mismatched keys', async () => {
  const issuer = await fixture();
  const other = await ed25519.generate({ seed: new Uint8Array(32).fill(43) });
  const otherKey = await other.export({ publicKey: true, secretKey: true });
  const ownKey = await issuer.key.export({ publicKey: true, secretKey: true });
  await assert.rejects(makeIssuer({ issuerId: 'http://issuer.example/credentials/issuer', issuerName: 'Teste', ...ownKey }));
  await assert.rejects(makeIssuer({ issuerId, issuerName: 'Teste', ...ownKey, secretKeyMultibase: otherKey.secretKeyMultibase }));
});
