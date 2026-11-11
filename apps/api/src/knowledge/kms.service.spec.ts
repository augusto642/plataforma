/**
 * KmsService (DESIGN §13.4, G6 + V1 da auditoria de reuso).
 * Cobre: approve como DECISÃO NO BANCO com sync pending-sync (a API nunca
 * escreve o arquivo de entrada); approve sem banco falha explicitamente;
 * resolve como pending-sync sem tocar em entradas; evolution-report (status,
 * fila, pending-sync, cobertura, crescimento).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { KmsService } from './kms.service';

function fixtureDir() {
  const root = join(tmpdir(), `kms-svc-${Date.now()}`);
  const kdir = join(root, 'content', 'knowledge');
  mkdirSync(join(kdir, 'entries'), { recursive: true });
  mkdirSync(join(kdir, 'review-queue'), { recursive: true });
  const entry = {
    version: 1, slug: 'funcoes', title: 'Funções em Python', topicIds: ['funcoes'],
    status: 'active', currentVersion: 1, supersededByEntry: null, supersededAt: null, supersedeReason: null,
    versions: [
      { version: 1, status: 'active', summary: 'Base.', keyExamples: [], contributions: [{ kind: 'drive', driveFileId: 'f1', lessonId: 'x', contributedAt: '2026-10-24T00:00:00.000Z', changeKind: 'created' }], marketContext: [], createdAt: '2026-10-24T00:00:00.000Z', supersededBy: null, supersededAt: null, supersedeReason: null },
      { version: 2, status: 'draft', summary: 'Enriquecida.', keyExamples: [], contributions: [{ kind: 'drive', driveFileId: 'f1', lessonId: 'x', contributedAt: '2026-10-24T00:00:00.000Z', changeKind: 'created' }, { kind: 'drive', driveFileId: 'f2', lessonId: 'y', contributedAt: '2026-10-24T00:00:00.000Z', changeKind: 'enriched' }], marketContext: [], createdAt: '2026-10-24T00:00:00.000Z', supersededBy: null, supersededAt: null, supersedeReason: null },
    ],
  };
  writeFileSync(join(kdir, 'entries', 'funcoes.json'), JSON.stringify(entry));
  writeFileSync(join(kdir, 'review-queue', 'review-20261024-001.json'), JSON.stringify({
    id: 'review-20261024-001', kind: 'ambiguous-match',
    sourceRef: { kind: 'drive', driveFileId: 'f2', lessonId: 'y' },
    candidates: [{ entrySlug: 'funcoes', score: 65, matchReasons: ['topico-primario'] }],
    confidence: 65, status: 'open', decision: null, resolvedBy: null, resolvedAt: null, createdAt: '2026-10-24T00:00:00.000Z',
  }));
  writeFileSync(join(kdir, 'extraction-registry.json'), JSON.stringify({
    version: 1, scope: 'python', records: [
      { driveFileId: 'f1', status: 'extracted', lessonId: 'x', entrySlugs: ['funcoes'] },
      { driveFileId: 'f9', status: 'pending', entrySlugs: [] },
    ],
  }));
  return join(root, 'content');
}

/** Prisma falso em memória, com a superfície usada por approveVersion/evolutionReport. */
function fakePrisma() {
  const versions = [
    { entryId: 'e1', version: 1, status: 'active', supersededBy: null, supersededAt: null, supersedeReason: null },
    { entryId: 'e1', version: 2, status: 'draft', supersededBy: null, supersededAt: null, supersedeReason: null },
  ];
  const entry = { id: 'e1', slug: 'funcoes', status: 'active', currentVersion: 1, versions };
  const changelog: any[] = [];
  const tx = {
    knowledgeEntryVersion: {
      update: jest.fn(async ({ where, data }: any) => {
        const v = versions.find((x) => x.entryId === where.entryId_version.entryId && x.version === where.entryId_version.version);
        if (!v) throw new Error('versão inexistente no falso');
        Object.assign(v, data);
        return v;
      }),
    },
    knowledgeEntry: {
      update: jest.fn(async ({ data }: any) => { Object.assign(entry, data); return entry; }),
    },
    knowledgeChangelog: {
      create: jest.fn(async ({ data }: any) => { changelog.push(data); return data; }),
      aggregate: jest.fn(async () => ({ _max: { seq: changelog.reduce((m: number, c: any) => Math.max(m, c.seq || 0), 0) } })),
    },
  };
  return {
    state: { entry, versions, changelog },
    $queryRawUnsafe: jest.fn(async () => [{ entries: 'knowledge_entries', versions: 'knowledge_entry_versions', changelog: 'knowledge_changelog' }]),
    $transaction: jest.fn(async (cb: any) => cb(tx)),
    knowledgeEntry: {
      findUnique: jest.fn(async () => ({ ...entry, versions: versions.map((v) => ({ ...v })) })),
      findMany: jest.fn(async () => [{ ...entry, versions: versions.map((v) => ({ ...v })) }]),
    },
  };
}

describe('KmsService', () => {
  it('V1: approve registra a decisão no banco com pending-sync e NÃO toca no arquivo', async () => {
    const dir = fixtureDir();
    const prisma = fakePrisma();
    const svc = new KmsService(dir, prisma as any);
    const approved = await svc.approveVersion('funcoes', 2, 'admin-uuid-7');
    expect(approved.approvedBy).toBe('admin-uuid-7');
    expect(approved.previousActive).toBe(1);
    expect(approved.sync).toBe('pending-sync');
    expect(prisma.state.versions.find((v) => v.version === 2)?.status).toBe('active');
    expect(prisma.state.versions.find((v) => v.version === 1)?.status).toBe('superseded');
    expect(prisma.state.changelog.some((c: any) => c.actor === 'admin:admin-uuid-7')).toBe(true);
    // seq explícito (schema delta não tem default): superseded=1, enriched=2.
    expect(prisma.state.changelog.map((c: any) => c.seq)).toEqual([1, 2]);
    // Arquivo intacto: v2 segue draft até o kms-apply --sync-db.
    const fileEntry = svc.getEntry('funcoes');
    expect(fileEntry.currentVersion).toBe(1);
    expect(fileEntry.versions[1].status).toBe('draft');
    // O relatório vê a decisão pendente (banco active × arquivo draft).
    const report = await svc.evolutionReport();
    expect(report.queue.pendingSyncVersions).toEqual([{ slug: 'funcoes', version: 2, sync: 'pending-sync' }]);
  });

  it('V1: approve sem banco falha explicitamente (nunca finge aplicar)', async () => {
    const svc = new KmsService(fixtureDir());
    await expect(svc.approveVersion('funcoes', 2, 'admin-1')).rejects.toThrow(/espelho no banco/);
  });

  it('resolve fica pending-sync sem tocar na entrada; relatório cobre fila e cobertura', async () => {
    const svc = new KmsService(fixtureDir());
    const resolved = svc.resolveReviewItem('review-20261024-001', { action: 'dismiss', reason: 'duplicata descartada' }, 'admin-uuid-7');
    expect(resolved.status).toBe('resolved');
    expect(resolved.resolvedBy).toBe('admin-uuid-7');
    expect(resolved.sync).toBe('pending-sync');
    expect(svc.getEntry('funcoes').currentVersion).toBe(1);

    const report = await svc.evolutionReport();
    expect(report.entriesByStatus.active).toBe(1);
    expect(report.versionsByStatus.active).toBe(1);
    expect(report.queue.pendingSync.map((p: any) => p.id)).toEqual(['review-20261024-001']);
    expect(report.coverage).toEqual({ totalFiles: 2, fed: 1, unfed: 1 });
    expect(report.changelogTotal).toBe(0);
  });

  it('listEntries e changelog paginado (arquivo)', async () => {
    const svc = new KmsService(fixtureDir());
    expect(svc.listEntries()[0]).toMatchObject({ slug: 'funcoes', status: 'active', currentVersion: 1 });
    // Changelog do arquivo vazio aqui (aprovações vivem no banco até o sync).
    expect(svc.listChangelog({ entrySlug: 'funcoes', page: 1, limit: 10 }).pagination.total).toBe(0);
  });
});
