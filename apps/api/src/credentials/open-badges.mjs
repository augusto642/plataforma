import { gzipSync } from 'node:zlib';
import * as ed25519 from '@digitalbazaar/ed25519-multikey';
import { DataIntegrityProof } from '@digitalbazaar/data-integrity';
import { cryptosuite } from '@digitalbazaar/eddsa-rdfc-2022-cryptosuite';
import jsigs from 'jsonld-signatures';
import * as credentialsContext from '@digitalbazaar/credentials-context';
import openBadgesContext from '@digitalcredentials/open-badges-context';
import * as dataIntegrityContext from '@digitalbazaar/data-integrity-context';
import * as multikeyContext from '@digitalbazaar/multikey-context';
import * as didContext from 'did-context';

const VC_CONTEXT = 'https://www.w3.org/ns/credentials/v2';
const OB_CONTEXT = 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json';

const contexts = new Map([
  ...credentialsContext.contexts,
  ...openBadgesContext.contexts,
  ...dataIntegrityContext.contexts,
  ...multikeyContext.contexts,
  ...didContext.contexts,
]);

export async function makeIssuer({ issuerId, issuerName, publicKeyMultibase, secretKeyMultibase }) {
  const parsed = new URL(issuerId);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password ||
      parsed.pathname !== '/credentials/issuer' || parsed.search || parsed.hash ||
      parsed.toString() !== issuerId || !issuerName?.trim() ||
      !/^z[1-9A-HJ-NP-Za-km-z]+$/.test(publicKeyMultibase ?? '')) {
    throw new Error('Invalid issuer configuration');
  }
  const keyId = `${issuerId}/keys/${publicKeyMultibase}`;
  const key = await ed25519.from({
    type: 'Multikey', id: keyId, controller: issuerId,
    publicKeyMultibase, secretKeyMultibase,
  });
  const publicKey = await key.export({ publicKey: true, includeContext: true });
  const verifier = await ed25519.from(publicKey);
  const challenge = new TextEncoder().encode('issuer-key-pair-check');
  const signature = await key.signer().sign({ data: challenge });
  if (!await verifier.verifier().verify({ data: challenge, signature })) {
    throw new Error('Issuer key pair does not match');
  }
  const profile = {
    '@context': [VC_CONTEXT, OB_CONTEXT, 'https://www.w3.org/ns/did/v1', 'https://w3id.org/security/multikey/v1'],
    id: issuerId,
    type: 'Profile',
    name: issuerName,
    assertionMethod: [publicKey],
  };
  return { key, publicKey, profile, issuerId, issuerName };
}

export function makeDocumentLoader(publicKey, profile) {
  return async (url) => {
    const document = contexts.get(url) ?? (url === publicKey.id ? publicKey : undefined) ??
      (url === profile.id ? profile : undefined);
    if (!document) throw new Error(`Unknown JSON-LD document: ${url}`);
    return { contextUrl: null, documentUrl: url, document };
  };
}

export async function issueCredential(issuer, userId, evidence, status) {
  const credential = {
    '@context': [VC_CONTEXT, OB_CONTEXT],
    id: `urn:uuid:${status.id}`,
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    issuer: { id: issuer.issuerId, type: 'Profile', name: issuer.issuerName },
    validFrom: new Date().toISOString(),
    credentialStatus: {
      id: `${status.listUrl}#${status.index}`,
      type: 'BitstringStatusListEntry',
      statusPurpose: 'revocation',
      statusListIndex: String(status.index),
      statusListCredential: status.listUrl,
    },
    name: `Atividade avaliada: ${evidence.activity}`,
    credentialSubject: {
      id: `urn:uuid:${userId}`,
      type: 'AchievementSubject',
      achievement: {
        id: `urn:uuid:${evidence.activityId}`,
        type: 'Achievement',
        name: evidence.activity,
        description: `Atividade de programação em ${evidence.language}. Título e conceitos são os atuais, não um registro histórico.`,
        criteria: { narrative: evidence.criterion },
        tag: evidence.concepts,
      },
    },
    evidence: [{
      type: 'Evidence',
      name: 'Resultado de testes automatizados',
      narrative: `${evidence.testsPassed} casos de teste registrados como aprovados na submissão em ${new Date(evidence.submittedAt).toISOString()}. Autonomia não verificada.`,
    }, ...(evidence.transfer ? [{
      type: 'Evidence',
      name: 'Avaliação de transferência',
      narrative: `Tarefa ${evidence.transfer.taskVersion}: ${evidence.transfer.score} de ${evidence.transfer.maxScore} respostas corretas em ${new Date(evidence.transfer.assessedAt).toISOString()}; ${evidence.transfer.passed ? 'critério atingido' : 'critério não atingido'}. Sem tutor integrado; ajuda externa não verificada.`,
    }] : [])],
  };
  return jsigs.sign(credential, {
    suite: new DataIntegrityProof({ signer: issuer.key.signer(), cryptosuite }),
    purpose: new jsigs.purposes.AssertionProofPurpose(),
    documentLoader: makeDocumentLoader(issuer.publicKey, issuer.profile),
  });
}

export async function issueStatusList(issuer, listUrl, revokedIndexes) {
  const bits = Buffer.alloc(16384);
  for (const index of revokedIndexes) {
    if (!Number.isInteger(index) || index < 0 || index >= 131072) throw new Error('Invalid status index');
    bits[Math.floor(index / 8)] |= 0x80 >> (index % 8);
  }
  const credential = {
    '@context': [VC_CONTEXT],
    id: listUrl,
    type: ['VerifiableCredential', 'BitstringStatusListCredential'],
    issuer: issuer.issuerId,
    validFrom: new Date().toISOString(),
    credentialSubject: {
      id: `${listUrl}#list`,
      type: 'BitstringStatusList',
      statusPurpose: 'revocation',
      encodedList: `u${gzipSync(bits).toString('base64url')}`,
    },
  };
  return jsigs.sign(credential, {
    suite: new DataIntegrityProof({ signer: issuer.key.signer(), cryptosuite }),
    purpose: new jsigs.purposes.AssertionProofPurpose(),
    documentLoader: makeDocumentLoader(issuer.publicKey, issuer.profile),
  });
}
