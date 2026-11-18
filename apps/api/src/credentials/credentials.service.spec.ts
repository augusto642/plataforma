import { ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CredentialsController } from './credentials.controller';
import { CredentialsService } from './credentials.service';

jest.mock('./open-badges-loader.cjs', () => jest.fn(async () => ({
  makeIssuer: jest.fn(async () => ({
    profile: { id: 'https://issuer.example/credentials/issuer' },
    publicKey: { id: 'https://issuer.example/credentials/issuer/keys/zKey' },
    issuerId: 'https://issuer.example/credentials/issuer',
  })),
  issueCredential: jest.fn(async (_issuer, userId, evidence) => ({ userId, evidence })),
  issueStatusList: jest.fn(async (_issuer, url, revoked) => ({ url, revoked })),
})));

describe('credentials authorization and configuration', () => {
  const entry = { submissionId: 's1', activityId: 'a1' };
  const portfolio = jest.fn();
  const prisma = {
    badgeCredential: { upsert: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn() },
    adminAuditEvent: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const config = new Map([
    ['OB_ISSUER_ID', 'https://issuer.example/credentials/issuer'],
    ['OB_ISSUER_NAME', 'Teste'],
    ['OB_ED25519_PUBLIC_KEY_MULTIBASE', 'zKey'],
    ['OB_ED25519_SECRET_KEY_MULTIBASE', 'secret-test-only'],
  ]);
  const build = (values = config) => new CredentialsService(
    { get: (name: string) => values.get(name) } as never,
    { portfolio } as never,
    prisma as never,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    portfolio.mockResolvedValue([entry]);
    prisma.badgeCredential.upsert.mockResolvedValue({ id: 'credential-1', listIndex: 1, revokedAt: null });
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
  });

  it('only emits a selected evidence record belonging to the authenticated user', async () => {
    const service = build();
    await expect(service.issue('owner', 's1')).resolves.toEqual({ userId: 'owner', evidence: entry });
    expect(portfolio).toHaveBeenCalledWith('owner');
    portfolio.mockResolvedValue([]);
    await expect(service.issue('other', 's1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('fails closed without explicit key and issuer configuration', async () => {
    for (const name of config.keys()) {
      const partial = new Map(config);
      partial.delete(name);
      await expect(build(partial).issue('owner', 's1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    }
  });

  it('rejects the published test fixture key in production', async () => {
    const production = new Map(config);
    production.set('NODE_ENV', 'production');
    production.set('OB_ED25519_PUBLIC_KEY_MULTIBASE', 'z6MkgAnvkP45uNxwCKeNdt6wrYkEjpYX4f7Nrd8MQqFL8Fbn');
    await expect(build(production).issue('owner', 's1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('exposes only the matching public key; credential issuance is not public', async () => {
    const service = build();
    await expect(service.issuerKey('zKey')).resolves.toEqual({ id: 'https://issuer.example/credentials/issuer/keys/zKey' });
    await expect(service.issuerKey('zOther')).rejects.toBeInstanceOf(NotFoundException);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, CredentialsController.prototype.issue)).not.toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, CredentialsController.prototype.issuerProfile)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, CredentialsController.prototype.issuerKey)).toBe(true);
  });

  it('uses the authenticated subject rather than any client-supplied identity', () => {
    const issue = jest.fn();
    const controller = new CredentialsController({ issue } as never);
    controller.issue({ sub: 'owner' } as never, 'submission');
    expect(issue).toHaveBeenCalledWith('owner', 'submission');
  });

  it('refuses to reissue revoked evidence and signs the public status list', async () => {
    prisma.badgeCredential.upsert.mockResolvedValueOnce({ id: 'credential-1', listIndex: 1, revokedAt: new Date() });
    await expect(build().issue('owner', 's1')).rejects.toBeInstanceOf(ConflictException);
    prisma.badgeCredential.findFirst.mockResolvedValue({ id: 'credential-1' });
    prisma.badgeCredential.findMany.mockResolvedValue([{ listIndex: 1 }]);
    await expect(build().statusList('0')).resolves.toEqual({
      url: 'https://issuer.example/credentials/status-lists/0', revoked: [0],
    });
    await expect(build().statusList('../0')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('records one audited revocation', async () => {
    prisma.badgeCredential.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    prisma.badgeCredential.findUnique.mockResolvedValue({ id: 'credential-1', revokedAt: new Date() });
    await build().revoke('credential-1', 'admin');
    await build().revoke('credential-1', 'admin');
    expect(prisma.adminAuditEvent.create).toHaveBeenCalledTimes(1);
  });

  it('restricts revocation to authenticated administrators', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, CredentialsController.prototype.revoke)).not.toBe(true);
    expect(Reflect.getMetadata(ROLES_KEY, CredentialsController.prototype.revoke)).toEqual([Role.admin]);
  });

  it('uses the correct index at the beginning of the next status-list shard', async () => {
    prisma.badgeCredential.findFirst.mockResolvedValue({ id: 'credential-2' });
    prisma.badgeCredential.findMany.mockResolvedValue([{ listIndex: 131073 }]);
    await expect(build().statusList('1')).resolves.toEqual({
      url: 'https://issuer.example/credentials/status-lists/1', revoked: [0],
    });
    expect(prisma.badgeCredential.findMany).toHaveBeenCalledWith({
      where: { listIndex: { gte: 131073, lte: 262144 }, revokedAt: { not: null } },
      select: { listIndex: true },
    });
  });
});
