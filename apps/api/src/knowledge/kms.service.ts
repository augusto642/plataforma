/**
 * KMS — gestão visível (DESIGN §13.4): rotas admin sobre o ARQUIVO
 * canônico (mesmo padrão do adaptador file da tutora). O espelho no banco
 * é mantido pelo importador (§5.4); sem checkout, as rotas falham
 * explicitamente (fail-closed) em vez de fingir estado.
 *
 * Semântica de sincronização (G4/G6, §13.4 — V1 da auditoria de reuso):
 * - POST approve: REGISTRA a decisão NO BANCO (espelho: versão draft →
 *   active + changelog com actor admin:<id>) e devolve `sync:
 *   'pending-sync'`. A API NUNCA escreve o arquivo de entrada: em produção
 *   ela roda sem checkout, e escrever só no arquivo nunca atualizaria o
 *   espelho. O operador aplica a decisão aos arquivos com
 *   `kms-apply.mjs --sync-db` (que lê as decisões do banco e ativa as
 *   versões nos arquivos), e então re-importa. Sem banco ou sem tabelas
 *   KMS, a aprovação falha explicitamente (fail-closed).
 * - POST review-queue/:id/resolve: REGISTRA a decisão no item da fila, sem
 *   tocar em entradas. Até o kms-apply materializá-la (e registrar o
 *   changelog review-resolved com decisionId), o relatório a lista como
 *   pending-sync — nunca como aplicada.
 * - Leituras (lista, detalhe, changelog, relatório) usam o arquivo canônico
 *   quando há checkout; sem ele, falham explicitamente (mesma limitação do
 *   adaptador file da tutora).
 */
import { Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { resolveKnowledgeContentDir } from './knowledge.service';

export const KMS_STALE_DAYS = 180;

function readJsonFile(path: string): any | null {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

function writeJsonAtomic(path: string, obj: unknown): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`);
  renameSync(tmp, path);
}

@Injectable()
export class KmsService {
  private readonly logger = new Logger(KmsService.name);
  private readonly contentDir: string;

  /**
   * contentDir é @Optional() com token explícito: sem provider registrado, o
   * Nest injeta undefined (sem ele, o boot falha com "can't resolve
   * dependencies of the KmsService (String)" — o mesmo defeito C1, agora no
   * KMS). Testes constroem com o diretório posicionalmente.
   */
  constructor(
    @Optional() @Inject('KMS_CONTENT_DIR') contentDir?: string,
    @Optional() private readonly prisma?: PrismaService,
  ) {
    this.contentDir = contentDir ?? resolveKnowledgeContentDir();
  }

  private get kdir(): string { return join(this.contentDir, 'knowledge'); }
  private get entriesDir(): string { return join(this.kdir, 'entries'); }
  private get reviewDir(): string { return join(this.kdir, 'review-queue'); }
  private get changelogPath(): string { return join(this.kdir, 'changelog.json'); }
  private get registryPath(): string { return join(this.kdir, 'extraction-registry.json'); }

  private requireContentDir(): void {
    if (!existsSync(this.kdir)) {
      throw new Error(`diretório de conhecimento ausente (${this.kdir}): rotas KMS exigem o checkout com content/knowledge (stack local) — sem ele, fail-closed`);
    }
  }

  private readEntries(): any[] {
    if (!existsSync(this.entriesDir)) return [];
    const out: any[] = [];
    for (const f of readdirSync(this.entriesDir).filter((x) => x.endsWith('.json'))) {
      const e = readJsonFile(join(this.entriesDir, f));
      if (e) out.push(e);
    }
    return out;
  }

  private readChangelog(): any[] {
    const doc = existsSync(this.changelogPath) ? readJsonFile(this.changelogPath) : null;
    return doc?.entries || [];
  }

  private readReviewItems(): any[] {
    if (!existsSync(this.reviewDir)) return [];
    const out: any[] = [];
    for (const f of readdirSync(this.reviewDir).filter((x) => x.endsWith('.json'))) {
      const it = readJsonFile(join(this.reviewDir, f));
      if (it) out.push(it);
    }
    return out;
  }

  private appendChangelog(item: any): void {
    const doc = existsSync(this.changelogPath) ? (readJsonFile(this.changelogPath) || { version: 1, entries: [] }) : { version: 1, entries: [] };
    if (!Array.isArray(doc.entries)) doc.entries = [];
    const seq = doc.entries.reduce((m: number, e: any) => Math.max(m, e.seq || 0), 0) + 1;
    doc.entries.push({ occurredAt: new Date().toISOString(), ...item, seq });
    mkdirSync(this.kdir, { recursive: true });
    writeJsonAtomic(this.changelogPath, doc);
  }

  // Acesso via `as any`: o cliente Prisma só ganha os modelos KMS depois de
  // `prisma generate` com a migration; sem tabelas, as rotas de decisão
  // falham explicitamente (fail-closed), nunca fingem aplicar.
  private get db(): any { return this.prisma as any; }

  private async kmsTablesPresent(): Promise<boolean> {
    if (!this.prisma) return false;
    try {
      const rows = await this.db.$queryRawUnsafe(
        `SELECT to_regclass('public.knowledge_entries')::text AS entries, to_regclass('public.knowledge_entry_versions')::text AS versions, to_regclass('public.knowledge_changelog')::text AS changelog`,
      );
      const row = rows[0] || {};
      return Boolean(row.entries && row.versions && row.changelog);
    } catch {
      return false;
    }
  }

  listEntries() {
    this.requireContentDir();
    const changelog = this.readChangelog();
    return this.readEntries().map((e) => ({
      slug: e.slug, title: e.title, status: e.status, currentVersion: e.currentVersion,
      versionsCount: (e.versions || []).length,
      draftVersions: (e.versions || []).filter((v: any) => v.status === 'draft').length,
      lastChange: changelog.filter((c: any) => c.entrySlug === e.slug).map((c: any) => c.occurredAt).sort().at(-1) ?? null,
    }));
  }

  getEntry(slug: string) {
    this.requireContentDir();
    const entry = this.readEntries().find((e) => e.slug === slug);
    if (!entry) throw new NotFoundException(`entrada KMS não encontrada: ${slug}`);
    return { ...entry, changelog: this.readChangelog().filter((c: any) => c.entrySlug === slug) };
  }

  /**
   * Aprovação (V1, §13.4): decisão NO BANCO, nunca no arquivo. O arquivo
   * continua draft até `kms-apply --sync-db` — por isso a resposta carrega
   * `sync: 'pending-sync'` e nunca afirma aplicação. Sem banco/tabelas,
   * falha explicitamente (o operador usa `kms-apply --approve` no checkout).
   */
  async approveVersion(slug: string, versionNum: number, adminId: string) {
    if (!this.prisma) {
      throw new Error('aprovação KMS exige o espelho no banco (Prisma não configurado): a decisão não pode ser registrada — use kms-apply --approve no checkout, ou aplique a migration KMS com ordem do Augusto');
    }
    if (!(await this.kmsTablesPresent())) {
      throw new Error('tabelas KMS ausentes no banco (migration só-arquivo, §5.4) — aprovação recusada; caminho do operador: kms-apply --approve no checkout');
    }
    const db = this.db;
    const entry = await db.knowledgeEntry.findUnique({ where: { slug }, include: { versions: true } });
    if (!entry) throw new NotFoundException(`entrada KMS não encontrada: ${slug}`);
    const version = (entry.versions || []).find((v: any) => v.version === versionNum);
    if (!version) throw new NotFoundException(`versão ${versionNum} inexistente na entrada ${slug}`);
    if (version.status !== 'draft') throw new Error(`só draft pode ser aprovada (versão ${versionNum} está ${version.status})`);
    const now = new Date();
    const prevActive = (entry.versions || []).find((v: any) => v.status === 'active');
    const actor = `admin:${adminId}`;
    await db.$transaction(async (tx: any) => {
      // seq não tem default no schema delta (é @unique, não autoincrement):
      // sem seq explícito o create falha com ValidationError. Convenção
      // igual à do arquivo: max(seq)+1 dentro da transação. Ressalva
      // documentada no DESIGN: o upsert de changelog por seq não compara
      // payload, então seqs criados aqui podem colidir com seqs futuros do
      // arquivo no re-import — o re-QA deve cobrir esse caso.
      const maxSeq = await tx.knowledgeChangelog.aggregate({ _max: { seq: true } });
      let nextSeq = (maxSeq._max?.seq ?? 0) + 1;
      if (prevActive) {
        await tx.knowledgeEntryVersion.update({
          where: { entryId_version: { entryId: entry.id, version: prevActive.version } },
          data: { status: 'superseded', supersededBy: versionNum, supersededAt: now, supersedeReason: version.supersedeReason || 'enriched' },
        });
        await tx.knowledgeChangelog.create({
          data: {
            seq: nextSeq++,
            entrySlug: slug, changeType: 'superseded', version: prevActive.version,
            source: { type: 'admin-decision', decisionId: `approve:${slug}:${versionNum}` },
            actor, occurredAt: now, detail: `Versão ${prevActive.version} superada pela aprovação da v${versionNum}.`,
          },
        });
      }
      await tx.knowledgeEntryVersion.update({
        where: { entryId_version: { entryId: entry.id, version: versionNum } },
        data: { status: 'active' },
      });
      await tx.knowledgeEntry.update({
        where: { slug }, data: { status: 'active', currentVersion: versionNum },
      });
      await tx.knowledgeChangelog.create({
        data: {
          seq: nextSeq,
          entrySlug: slug, changeType: 'enriched', version: versionNum,
          source: { type: 'admin-decision', decisionId: `approve:${slug}:${versionNum}` },
          actor, occurredAt: now, detail: `Versão ${versionNum} aprovada (decisão; aplicação no arquivo via kms-apply --sync-db).`,
        },
      });
    });
    return { slug, version: versionNum, approvedBy: adminId, approvedAt: now.toISOString(), previousActive: prevActive?.version ?? null, sync: 'pending-sync' };
  }

  listChangelog(filters: { entrySlug?: string; changeType?: string; from?: string; to?: string; page?: number; limit?: number }) {
    this.requireContentDir();
    let items = this.readChangelog();
    const { entrySlug, changeType, from, to } = filters;
    if (entrySlug) items = items.filter((c: any) => c.entrySlug === entrySlug);
    if (changeType) items = items.filter((c: any) => c.changeType === changeType);
    if (from) items = items.filter((c: any) => c.occurredAt >= from);
    if (to) items = items.filter((c: any) => c.occurredAt <= to);
    items = [...items].sort((a: any, b: any) => b.seq - a.seq);
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 200) : 50;
    const total = items.length;
    return {
      data: items.slice((page - 1) * limit, page * limit),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  listReviewQueue() {
    this.requireContentDir();
    const items = this.readReviewItems();
    const open = items.filter((i) => i.status === 'open').sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    const resolved = items.filter((i) => i.status === 'resolved').sort((a, b) => (b.resolvedAt || '').localeCompare(a.resolvedAt || ''));
    return { open, resolved, counts: { open: open.length, resolved: resolved.length } };
  }

  getReviewItem(id: string) {
    this.requireContentDir();
    const path = join(this.reviewDir, `${id}.json`);
    const item = existsSync(path) ? readJsonFile(path) : null;
    if (!item) throw new NotFoundException(`item da fila não encontrado: ${id}`);
    return item;
  }

  resolveReviewItem(id: string, decision: { action: string; targetEntrySlug?: string; reason: string }, adminId: string) {
    this.requireContentDir();
    const path = join(this.reviewDir, `${id}.json`);
    const item = existsSync(path) ? readJsonFile(path) : null;
    if (!item) throw new NotFoundException(`item da fila não encontrado: ${id}`);
    if (item.status === 'resolved') throw new Error(`item ${id} já resolvido — re-resolver exige reabertura manual`);
    if (!['enrich', 'create', 'supersede', 'dismiss'].includes(decision.action)) throw new Error(`ação inválida: ${decision.action}`);
    if (!decision.reason) throw new Error('decisão exige reason');
    const now = new Date().toISOString();
    const saved = { ...item, status: 'resolved', decision, resolvedBy: adminId, resolvedAt: now };
    writeJsonAtomic(path, saved);
    // Decisão registrada, NÃO aplicada: o relatório a mostra como pending-sync
    // até o kms-apply materializá-la (changelog review-resolved com decisionId).
    return { ...saved, sync: 'pending-sync' };
  }

  async evolutionReport() {
    this.requireContentDir();
    const entries = this.readEntries();
    const changelog = this.readChangelog();
    const queue = this.readReviewItems();
    const entriesByStatus: Record<string, number> = {};
    const versionsByStatus: Record<string, number> = {};
    for (const e of entries) {
      entriesByStatus[e.status] = (entriesByStatus[e.status] || 0) + 1;
      for (const v of e.versions || []) versionsByStatus[v.status] = (versionsByStatus[v.status] || 0) + 1;
    }
    const nowMs = Date.now();
    const staleCutoff = nowMs - KMS_STALE_DAYS * 24 * 3600 * 1000;
    const supersedeOpen = new Set<string>();
    for (const it of queue) {
      if (it.status === 'open' && it.kind === 'supersede-candidate') {
        for (const c of it.candidates || []) supersedeOpen.add(c.entrySlug);
        if (it.decision?.targetEntrySlug) supersedeOpen.add(it.decision.targetEntrySlug);
      }
    }
    const staleEntries = entries.filter((e) => {
      if (e.status !== 'active') return false;
      if (supersedeOpen.has(e.slug)) return true;
      const active = (e.versions || []).find((v: any) => v.version === e.currentVersion && v.status === 'active');
      if (!active) return false;
      const last = (active.contributions || []).map((c: any) => Date.parse(c.contributedAt || '')).filter((n: number) => !Number.isNaN(n)).sort((a: number, b: number) => b - a)[0];
      return last !== undefined && last < staleCutoff;
    }).map((e) => ({ slug: e.slug, title: e.title, reason: supersedeOpen.has(e.slug) ? 'supersede-candidate-open' : `sem-contribuicao-ha-mais-de-${KMS_STALE_DAYS}-dias` }));
    // pending-sync: decisão resolved sem changelog review-resolved com o decisionId.
    const appliedDecisions = new Set(
      changelog.filter((c: any) => c.changeType === 'review-resolved').map((c: any) => c.source?.decisionId),
    );
    const pendingSync = queue
      .filter((i) => i.status === 'resolved' && !appliedDecisions.has(i.id))
      .map((i) => ({ id: i.id, kind: i.kind, decision: i.decision, resolvedBy: i.resolvedBy, resolvedAt: i.resolvedAt }));
    // pending-sync (V1): aprovações decididas no banco cuja versão no arquivo
    // segue draft — o kms-apply --sync-db as aplica. Best-effort: sem banco,
    // só a lista da fila acima.
    const pendingSyncVersions: Array<{ slug: string; version: number; sync: string }> = [];
    if (this.prisma && (await this.kmsTablesPresent())) {
      try {
        const dbEntries = await this.db.knowledgeEntry.findMany({ include: { versions: true } });
        const fileBySlug = new Map(entries.map((e: any) => [e.slug, e]));
        for (const de of dbEntries) {
          for (const dv of de.versions || []) {
            if (dv.status !== 'active') continue;
            const fe = fileBySlug.get(de.slug);
            const fv = fe?.versions?.find((v: any) => v.version === dv.version);
            if (!fv || fv.status !== 'active') {
              pendingSyncVersions.push({ slug: de.slug, version: dv.version, sync: 'pending-sync' });
            }
          }
        }
      } catch {
        // Espelho indisponível no momento: o relatório segue com a lista da fila.
        this.logger.warn('evolution-report: espelho DB indisponível — pendingSyncVersions omitido');
      }
    }
    const queueByKind: Record<string, number> = {};
    for (const it of queue.filter((i) => i.status === 'open')) queueByKind[it.kind] = (queueByKind[it.kind] || 0) + 1;
    const resolvedItems = queue.filter((i) => i.status === 'resolved' && i.resolvedAt && i.createdAt);
    const avgResolutionMs = resolvedItems.length
      ? Math.round(resolvedItems.reduce((sum, i) => sum + (Date.parse(i.resolvedAt) - Date.parse(i.createdAt)), 0) / resolvedItems.length)
      : null;
    const oldestOpen = queue.filter((i) => i.status === 'open')
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')).slice(0, 5)
      .map((i) => ({ id: i.id, kind: i.kind, createdAt: i.createdAt }));
    let registry: any = null;
    if (existsSync(this.registryPath)) registry = readJsonFile(this.registryPath);
    const records = registry?.records || [];
    const coverage = {
      totalFiles: records.length,
      fed: records.filter((r: any) => (r.entrySlugs || []).length > 0).length,
      unfed: records.filter((r: any) => !(r.entrySlugs || []).length).length,
    };
    const growthByMonth: Record<string, number> = {};
    for (const c of changelog) {
      const month = (c.occurredAt || '').slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(month)) growthByMonth[month] = (growthByMonth[month] || 0) + 1;
    }
    return {
      entriesByStatus, versionsByStatus,
      staleEntries, staleDays: KMS_STALE_DAYS,
      queue: { openByKind: queueByKind, avgResolutionMs, oldestOpen, pendingSync, pendingSyncVersions },
      coverage, growthByMonth, changelogTotal: changelog.length,
    };
  }
}
