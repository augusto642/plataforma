import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as ed25519 from '@digitalbazaar/ed25519-multikey';
import { DataIntegrityProof } from '@digitalbazaar/data-integrity';
import { cryptosuite } from '@digitalbazaar/eddsa-rdfc-2022-cryptosuite';
import jsigs from 'jsonld-signatures';
import { makeDocumentLoader } from './open-badges.mjs';
import { roleFixtures } from './market-role-fixtures.mjs';

const require = createRequire(import.meta.url);
const { CredentialsService } = require('../../dist/credentials/credentials.service.js');
const { SkillEvidenceService } = require('../../dist/dynamic-track/skill-evidence.service.js');
const { JobsMarketProvider } = require('../../dist/knowledge/research/jobs-market.provider.js');
const { PistonRunnerService } = require('../../dist/submissions/runner/runner.service.js');
const { EvaluatorService } = require('../../dist/submissions/evaluator/evaluator.service.js');
const { TransferService } = require('../../dist/dynamic-track/transfer.service.js');
const owner = 'b73040b6-b09f-405b-ad96-d4313f29f6f1';
const evidence = {
  submissionId: '44fca76a-d27e-48f4-9875-2d2294d0dbe4',
  activityId: 'c888a8dd-589e-4e51-8a4b-f614d425da49',
  activity: 'Funções', language: 'python', concepts: ['funcoes'],
  criterion: 'Passar nos casos de teste automatizados da atividade.',
  testsPassed: 2, submittedAt: '2026-01-01T00:00:00Z',
};
function badgeStore() {
  const rows = new Map();
  return {
    badgeCredential: {
      upsert: async ({ where }) => {
        const key = `${where.userId_submissionId.userId}:${where.userId_submissionId.submissionId}`;
        if (!rows.has(key)) rows.set(key, { id: '18a485b6-398c-493e-a0cc-c364d74e8c62', listIndex: rows.size + 1, revokedAt: null });
        return rows.get(key);
      },
    },
  };
}

test('built service issues only owned evidence and exposes public verification documents', async () => {
  const pair = await ed25519.generate({ seed: new Uint8Array(32).fill(42) });
  const keys = await pair.export({ publicKey: true, secretKey: true });
  const values = {
    OB_ISSUER_ID: 'https://issuer.example/credentials/issuer',
    OB_ISSUER_NAME: 'Emissor de teste',
    OB_ED25519_PUBLIC_KEY_MULTIBASE: keys.publicKeyMultibase,
    OB_ED25519_SECRET_KEY_MULTIBASE: keys.secretKeyMultibase,
  };
  const service = new CredentialsService(
    { get: (name) => values[name] },
    { portfolio: async (user) => user === owner ? [evidence] : [] },
    badgeStore(),
  );
  const signed = await service.issue(owner, evidence.submissionId);
  const profile = await service.issuerProfile();
  const publicKey = await service.issuerKey(keys.publicKeyMultibase);
  const result = await jsigs.verify(signed, {
    suite: new DataIntegrityProof({ cryptosuite }),
    purpose: new jsigs.purposes.AssertionProofPurpose(),
    documentLoader: makeDocumentLoader(publicKey, profile),
  });
  assert.equal(result.verified, true);
  assert.equal(signed.credentialSubject.id, `urn:uuid:${owner}`);
  assert.ok(!JSON.stringify(profile).includes(keys.secretKeyMultibase));
  assert.ok(!JSON.stringify(publicKey).includes(keys.secretKeyMultibase));
  await assert.rejects(service.issue('other-user', evidence.submissionId), { status: 404 });
  values.OB_ED25519_SECRET_KEY_MULTIBASE = '';
  await assert.rejects(service.issue(owner, evidence.submissionId), { status: 503 });
});

for (const fixture of roleFixtures) test(`${fixture.role}: synthetic signal reaches practice, transfer and a private signed credential`, async () => {
  const provider = new JobsMarketProvider(
    { id: 'TEST_FIXTURE_NOT_MARKET', isConfigured: () => true, searchDocuments: async () => [
      { id: 'synthetic-1', title: fixture.role, text: fixture.text, url: 'https://fixture.invalid/1' },
    ] },
    { id: 'unused', isConfigured: () => false },
  );
  const signals = await provider.searchJobs({ goal: 'backend', region: 'BR' });
  const activity = {
    id: evidence.activityId, courseId: 'c', title: evidence.activity, language: fixture.language,
    conceptTags: ['funcoes'],
    testCode: fixture.language === 'python' ? 'assert f(1) == 1' : 'console.assert(f(1) === 1)',
    hiddenTests: null,
    timeLimitMs: 5000, memoryLimitMb: 256,
  };
  const submission = {
    id: evidence.submissionId, userId: owner, activityId: activity.id, activity,
    codeSnapshot: fixture.language === 'python' ? 'def f(x): return x' : 'function f(x) { return x; }', xpAwarded: false,
    createdAt: new Date('2026-01-01'), testResults: [], status: 'queued',
  };
  const tx = {
    submission: {
      updateMany: async ({ data }) => { Object.assign(submission, data); return { count: 1 }; },
      update: async ({ data }) => Object.assign(submission, data),
    },
    testCaseResult: {
      deleteMany: async () => { submission.testResults = []; },
      createMany: async ({ data }) => { submission.testResults = data; },
    },
  };
  const prisma = {
    activity: { findMany: async () => [activity] },
    transferAttempt: { create: async ({ data }) => {
      if (submission.transferAttempt) throw Object.assign(new Error('duplicate'), { code: 'P2002' });
      submission.transferAttempt = { ...data, assessedAt: new Date('2026-01-02') };
      return submission.transferAttempt;
    } },
    submission: {
      findUnique: async () => submission,
      update: async ({ data }) => Object.assign(submission, data),
      findMany: async ({ where }) => where.userId === owner && submission.status === 'passed' ? [submission] : [],
    },
    $transaction: async (callback) => callback(tx),
  };
  const tracks = { getMyInvestigation: async () => ({
    status: 'ready', startCourse: { slug: fixture.language }, marketSkillEvidence: signals,
  }) };
  const evidenceService = new SkillEvidenceService(prisma, tracks);
  const goals = await evidenceService.goals(owner);
  const goal = goals.find((item) => item.signal.skill === fixture.skill);
  assert.equal(goal.practice.id, activity.id);
  assert.ok(goal.practice.objective);
  assert.ok(goal.practice.criterion);
  assert.ok(goals.filter((item) => !item.practice).every((item) => item.excludedReason));
  const runner = new PistonRunnerService({ get: () => undefined });
  runner.execute = async () => ({ kind: 'passed', status: 'passed', durationMs: 1, stdout: '', stderr: '' });
  const evaluator = new EvaluatorService(prisma, runner, { awardSubmissionXp: async () => null }, { delPattern: async () => {} });
  await evaluator.processSubmission(submission.id);
  assert.equal((await evidenceService.portfolio(owner))[0].testsPassed, 1);
  assert.deepEqual(await evidenceService.portfolio('other-user'), []);
  const transferRunner = {
    execute: async (_language, program) => {
      const match = program.match(/(?:const __nexus_inputs = |for __nexus_input in )(\[[^\]]+\])/);
      assert.ok(match);
      const inputs = JSON.parse(match[1]);
      return {
        kind: 'passed',
        status: 'passed',
        durationMs: 1,
        stdout: inputs.map((value) => value <= 0 ? 0 : value < 5 ? value * 2 : value + 5).join('\n'),
        stderr: '',
      };
    },
  };
  const transferCode = fixture.language === 'python'
    ? 'def calcular_pontos(quantidade): return 0'
    : 'function calcular_pontos(quantidade) { return 0; }';
  const transfer = new TransferService(prisma, evidenceService, transferRunner);
  await assert.rejects(transfer.challenge('other-user', submission.id), { status: 404 });
  await assert.rejects(transfer.submit('other-user', submission.id, transferCode), { status: 404 });
  const challenge = await transfer.challenge(owner, submission.id);
  assert.equal(challenge.challenge.language, fixture.language);
  assert.equal(challenge.challenge.functionName, 'calcular_pontos');
  const transferResult = await transfer.submit(owner, submission.id, transferCode);
  assert.equal(transferResult.passed, true);
  await assert.rejects(transfer.submit(owner, submission.id, transferCode), { status: 409 });
  assert.equal((await evidenceService.portfolio(owner))[0].transfer.score, 5);
  const pair = await ed25519.generate({ seed: new Uint8Array(32).fill(42) });
  const keys = await pair.export({ publicKey: true, secretKey: true });
  const config = {
    OB_ISSUER_ID: 'https://issuer.example/credentials/issuer', OB_ISSUER_NAME: 'Emissor de teste',
    OB_ED25519_PUBLIC_KEY_MULTIBASE: keys.publicKeyMultibase, OB_ED25519_SECRET_KEY_MULTIBASE: keys.secretKeyMultibase,
  };
  const service = new CredentialsService({ get: (name) => config[name] }, evidenceService, badgeStore());
  const credential = await service.issue(owner, submission.id);
  await assert.rejects(service.issue('other-user', submission.id), { status: 404 });
  assert.equal(credential.credentialSubject.achievement.id, `urn:uuid:${activity.id}`);
  assert.match(credential.evidence[0].narrative, /1 casos de teste/);
  assert.match(credential.evidence[1].narrative, /5 de 5.*ajuda externa não verificada/);
  const verify = async (value) => jsigs.verify(value, {
    suite: new DataIntegrityProof({ cryptosuite }),
    purpose: new jsigs.purposes.AssertionProofPurpose(),
    documentLoader: makeDocumentLoader(await service.issuerKey(keys.publicKeyMultibase), await service.issuerProfile()),
  });
  assert.equal((await verify(credential)).verified, true);
  const tampered = structuredClone(credential);
  tampered.evidence[1].narrative = 'Alterada';
  assert.equal((await verify(tampered)).verified, false);
});
