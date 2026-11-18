import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkillEvidenceService } from '../dynamic-track/skill-evidence.service';
import { PrismaService } from '../prisma/prisma.service';

type Issuer = {
  publicKey: { id: string };
  profile: unknown;
  issuerId: string;
};
type BadgeLibrary = {
  makeIssuer(config: {
    issuerId: string;
    issuerName: string;
    publicKeyMultibase: string;
    secretKeyMultibase: string;
  }): Promise<Issuer>;
  issueCredential(issuer: Issuer, userId: string, evidence: unknown, status: { id: string; listUrl: string; index: number }): Promise<unknown>;
  issueStatusList(issuer: Issuer, listUrl: string, revokedIndexes: number[]): Promise<unknown>;
};

// Keep native import() in a CJS loader: TypeScript's CommonJS transform would
// otherwise turn it into require(), which does not load ESM on Node 20.
const loadBadgeLibrary: () => Promise<BadgeLibrary> = require('./open-badges-loader.cjs');
const TEST_PUBLIC_KEYS = new Set([
  'z6MkgAnvkP45uNxwCKeNdt6wrYkEjpYX4f7Nrd8MQqFL8Fbn',
  'z6Mkj6joiZPz3kKe5PpGNLjCrTphanK4S5PXgpwVQPkyrvVk',
]);

@Injectable()
export class CredentialsService {
  constructor(
    private readonly config: ConfigService,
    private readonly evidence: SkillEvidenceService,
    private readonly prisma: PrismaService,
  ) {}

  private async issuer() {
    const issuerId = this.config.get<string>('OB_ISSUER_ID');
    const issuerName = this.config.get<string>('OB_ISSUER_NAME');
    const publicKeyMultibase = this.config.get<string>('OB_ED25519_PUBLIC_KEY_MULTIBASE');
    const secretKeyMultibase = this.config.get<string>('OB_ED25519_SECRET_KEY_MULTIBASE');
    if (!issuerId || !issuerName || !publicKeyMultibase || !secretKeyMultibase ||
        (this.config.get<string>('NODE_ENV') === 'production' && TEST_PUBLIC_KEYS.has(publicKeyMultibase))) {
      throw new ServiceUnavailableException('Emissão de credenciais indisponível.');
    }
    try {
      const library = await loadBadgeLibrary();
      const issuer = await library.makeIssuer({ issuerId, issuerName, publicKeyMultibase, secretKeyMultibase });
      return { issuer, library };
    } catch {
      throw new ServiceUnavailableException('Emissão de credenciais indisponível.');
    }
  }

  async issuerProfile() {
    const { issuer } = await this.issuer();
    return issuer.profile;
  }

  async issuerKey(keyId: string) {
    const { issuer } = await this.issuer();
    if (!issuer.publicKey.id.endsWith(`/keys/${keyId}`)) {
      throw new NotFoundException('Chave não encontrada.');
    }
    return issuer.publicKey;
  }

  async issue(userId: string, submissionId: string) {
    const entries = await this.evidence.portfolio(userId);
    const entry = entries.find((item) => item.submissionId === submissionId);
    if (!entry) throw new NotFoundException('Evidência não encontrada.');
    const { issuer, library } = await this.issuer();
    const record = await this.prisma.badgeCredential.upsert({
      where: { userId_submissionId: { userId, submissionId } },
      create: { userId, submissionId },
      update: {},
    });
    if (record.revokedAt) throw new ConflictException('Esta credencial foi revogada.');
    const index = record.listIndex - 1;
    const listUrl = `${issuer.issuerId.replace(/\/issuer$/, '')}/status-lists/${Math.floor(index / 131072)}`;
    try {
      return await library.issueCredential(issuer, userId, entry, { id: record.id, listUrl, index: index % 131072 });
    } catch {
      throw new ServiceUnavailableException('Emissão de credenciais indisponível.');
    }
  }

  async statusList(shard: string) {
    if (!/^(0|[1-9]\d{0,4})$/.test(shard) || Number(shard) > 16383) {
      throw new NotFoundException('Lista de status não encontrada.');
    }
    const start = Number(shard) * 131072 + 1;
    const end = Math.min(start + 131071, 2147483647);
    const present = await this.prisma.badgeCredential.findFirst({
      where: { listIndex: { gte: start, lte: end } }, select: { id: true },
    });
    if (!present) throw new NotFoundException('Lista de status não encontrada.');
    const revoked = await this.prisma.badgeCredential.findMany({
      where: { listIndex: { gte: start, lte: end }, revokedAt: { not: null } },
      select: { listIndex: true },
    });
    const { issuer, library } = await this.issuer();
    const listUrl = `${issuer.issuerId.replace(/\/issuer$/, '')}/status-lists/${shard}`;
    return library.issueStatusList(issuer, listUrl, revoked.map((record) => record.listIndex - start));
  }

  async revoke(id: string, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.badgeCredential.updateMany({
        where: { id, revokedAt: null }, data: { revokedAt: new Date() },
      });
      const record = await tx.badgeCredential.findUnique({ where: { id }, select: { id: true, revokedAt: true } });
      if (!record) throw new NotFoundException('Credencial não encontrada.');
      if (updated.count) {
        await tx.adminAuditEvent.create({
          data: { adminId, action: 'badge.revoked', targetType: 'badge-credential', targetId: id, previousValue: 'valid', newValue: 'revoked' },
        });
      }
      return record;
    });
  }
}
