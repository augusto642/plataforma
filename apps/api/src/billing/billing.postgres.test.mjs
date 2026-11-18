import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const enabled = process.env.RUN_DOCKER_BILLING_TEST === 'true';
const require = createRequire(import.meta.url);
const run = (program, args, options = {}) => execFileSync(program, args, { encoding: 'utf8', ...options }).trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('checkout reservation and terminal webhooks serialize against real PostgreSQL', { skip: !enabled, timeout: 180_000 }, async () => {
  const password = randomUUID().replaceAll('-', '');
  let container = '';
  let prisma;
  const previousUrl = process.env.DATABASE_URL;
  try {
    container = run('docker', [
      'run', '-d', '--label', 'nexus.billing-test=true', '-p', '127.0.0.1::5432',
      '-e', 'POSTGRES_USER=validation', '-e', `POSTGRES_PASSWORD=${password}`,
      '-e', 'POSTGRES_DB=validation', 'postgres:16-alpine',
    ]);
    assert.match(container, /^[a-f0-9]{64}$/);
    let ready = false;
    for (let i = 0; i < 60; i++) {
      if (spawnSync('docker', ['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'validation', '-d', 'validation'], { stdio: 'ignore' }).status === 0) {
        ready = true;
        break;
      }
      await sleep(1000);
    }
    assert.ok(ready, 'PostgreSQL did not start');
    const port = run('docker', ['port', container, '5432/tcp']).split(':').pop();
    assert.match(port, /^\d+$/);
    process.env.DATABASE_URL = `postgresql://validation:${password}@127.0.0.1:${port}/validation?schema=public`;
    run(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], { cwd: process.cwd(), env: process.env });

    const { PrismaService } = require('../../dist/prisma/prisma.service.js');
    const { BillingService } = require('../../dist/billing/billing.service.js');
    const { SimulatedTestProvider } = require('../../dist/billing/providers/simulated-test.provider.js');
    prisma = new PrismaService();
    const config = { get: (_name, fallback) => fallback };
    const provider = new SimulatedTestProvider(config);
    const service = new BillingService(prisma, config, provider, {});
    const user = await prisma.user.create({ data: { email: `${randomUUID()}@example.test`, name: 'Validation' } });

    let releaseProvider;
    let enteredProvider;
    const entered = new Promise((resolve) => { enteredProvider = resolve; });
    const resume = new Promise((resolve) => { releaseProvider = resolve; });
    const create = provider.createCheckoutSession.bind(provider);
    let providerCalls = 0;
    provider.createCheckoutSession = async (...args) => {
      providerCalls++;
      enteredProvider();
      await resume;
      return create(...args);
    };
    const first = service.createCheckout(user.id, 'pro', 'monthly');
    await entered;
    try {
      await assert.rejects(service.createCheckout(user.id, 'pro', 'monthly'), /resultado desconhecido/);
    } finally {
      releaseProvider();
    }
    const checkout = await first;
    assert.equal(providerCalls, 1);
    assert.equal((await service.createCheckout(user.id, 'pro', 'monthly')).sessionId, checkout.sessionId);
    await assert.rejects(service.createCheckout(user.id, 'pro', 'annual'), /Cancele o checkout/);

    let releaseLock;
    let announceLock;
    const locked = new Promise((resolve) => { announceLock = resolve; });
    const release = new Promise((resolve) => { releaseLock = resolve; });
    const blocker = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`billing.checkout:${user.id}`}, 0))::text AS locked`;
      announceLock();
      await release;
      await tx.checkoutSession.update({ where: { sessionId: checkout.sessionId }, data: { canceledAt: new Date() } });
    });
    await locked;
    const waitingApproval = service.applyPaymentEvent({
      providerEventId: 'concurrent-approval', type: 'payment_approved',
      providerSubscriptionId: checkout.sessionId, userId: user.id,
    }).then(() => 'accepted', () => 'rejected');
    const early = await Promise.race([waitingApproval, sleep(300).then(() => 'waiting')]);
    releaseLock();
    await blocker;
    assert.equal(early, 'waiting');
    assert.equal(await waitingApproval, 'rejected');

    await service.applyPaymentEvent({
      providerEventId: 'cancel-before-approval',
      type: 'subscription_canceled',
      providerSubscriptionId: checkout.sessionId,
    });
    await assert.rejects(service.applyPaymentEvent({
      providerEventId: 'late-approval',
      type: 'payment_approved',
      providerSubscriptionId: checkout.sessionId,
      userId: user.id,
    }));
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).plan, 'free');
    assert.equal((await prisma.checkoutReservation.findUniqueOrThrow({ where: { userId: user.id } })).status, 'closed');
    const next = await service.createCheckout(user.id, 'pro', 'annual');
    assert.notEqual(next.sessionId, checkout.sessionId);
    await service.applyPaymentEvent({
      providerEventId: 'approved', type: 'payment_approved',
      providerSubscriptionId: next.sessionId, userId: user.id,
    });
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).plan, 'pro');
    await service.applyPaymentEvent({
      providerEventId: 'refunded', type: 'payment_refunded',
      providerSubscriptionId: next.sessionId,
    });
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).plan, 'free');
  } finally {
    if (prisma) await prisma.$disconnect();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
    if (/^[a-f0-9]{64}$/.test(container)) run('docker', ['rm', '-f', '-v', container]);
  }
});
