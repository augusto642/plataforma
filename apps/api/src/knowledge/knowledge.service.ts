/**
 * Sistema de conhecimento — repositório da tutora (DESIGN §6.1, decisão D8).
 * A tutora depende SÓ desta interface. Dois adaptadores:
 *  - FileKnowledgeRepository (default, KNOWLEDGE_STORE=file): lê o conteúdo
 *    versionado em content/knowledge/lessons — utilizável SEM nenhuma migration.
 *  - DbKnowledgeRepository (KNOWLEDGE_STORE=db): Prisma, só depois que a
 *    migration de conhecimento for autorizada e aplicada.
 * Regra: só lições reviewStatus='approved' chegam à tutora (draft nunca).
 */
import { Injectable, Logger, Optional } from '@nestjs/common';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

export interface KnowledgeLessonView {
  id: string;
  title: string;
  courseName: string;
  summary: string;
  topics: string[];
  prerequisites: string[];
  difficulty: string;
}

export interface KnowledgeEntryView {
  slug: string;
  title: string;
  version: number;
  summary: string;
  keyExamples: string[];
  topicIds: string[];
  /** Procedência da versão active (primeira contribuição drive, se houver). */
  courseName: string;
  lessonTitle: string;
  lessonId: string | null;
}

export interface KnowledgeRepository {
  findByTopics(topics: string[], opts?: { limit?: number }): Promise<KnowledgeLessonView[]>;
  findById(id: string): Promise<KnowledgeLessonView | null>;
  stats(): Promise<{ lessonsApproved: number; lessonsDraft: number; sources: number }>;
  /** KMS (§13.5): só a versão active de entradas active; ordem: nº de tópicos compartilhados desc, depois currentVersion desc. */
  findEntriesByTopics(topics: string[], opts?: { limit?: number }): Promise<KnowledgeEntryView[]>;
  findEntryBySlug(slug: string): Promise<KnowledgeEntryView | null>;
}

/**
 * Resolução do diretório de conteúdo: KNOWLEDGE_CONTENT_DIR, ou content/
 * na raiz do repo — a API roda com cwd apps/api, então content/ no cwd
 * (ausente) cai para ../../content (raiz do repo). Sem checkout, devolve
 * o cwd/content (adaptador file trata como base vazia, nunca erro).
 */
export function resolveKnowledgeContentDir(): string {
  if (process.env.KNOWLEDGE_CONTENT_DIR) return process.env.KNOWLEDGE_CONTENT_DIR;
  const fromCwd = join(process.cwd(), 'content');
  if (existsSync(join(fromCwd, 'knowledge'))) return fromCwd;
  const fromRepoRoot = join(process.cwd(), '..', '..', 'content');
  if (existsSync(join(fromRepoRoot, 'knowledge'))) return fromRepoRoot;
  return fromCwd;
}

function toView(raw: any): KnowledgeLessonView {
  return {
    id: raw.id,
    title: raw.lessonTitle,
    courseName: raw.courseName,
    summary: raw.summary,
    topics: raw.topics || [],
    prerequisites: raw.prerequisites || [],
    difficulty: raw.difficulty,
  };
}

export class FileKnowledgeRepository implements KnowledgeRepository {
  constructor(private readonly contentDir: string) {}

  private allEntries(): any[] {
    const dir = join(this.contentDir, 'knowledge', 'entries');
    const out: any[] = [];
    if (!existsSync(dir)) return out;
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      try { out.push(JSON.parse(readFileSync(join(dir, f), 'utf8'))); } catch { /* entrada inválida: o validador a reprova; o repositório a ignora */ }
    }
    return out;
  }

  private lessonIndex(): Map<string, any> {
    const idx = new Map<string, any>();
    for (const l of this.all()) idx.set(l.id, l);
    return idx;
  }

  private toEntryView(entry: any, lessons: Map<string, any>): KnowledgeEntryView | null {
    if (entry.status !== 'active' && entry.status !== 'draft') return null;
    const active = (entry.versions || []).find((v: any) => v.version === entry.currentVersion && v.status === 'active');
    if (!active) return null;
    const drive = (active.contributions || []).find((c: any) => c.kind === 'drive');
    const lesson = drive ? lessons.get(drive.lessonId) : undefined;
    return {
      slug: entry.slug,
      title: entry.title,
      version: active.version,
      summary: active.summary,
      keyExamples: active.keyExamples || [],
      topicIds: entry.topicIds || [],
      courseName: lesson?.courseName ?? '',
      lessonTitle: lesson?.lessonTitle ?? drive?.lessonId ?? '',
      lessonId: drive?.lessonId ?? null,
    };
  }

  async findEntriesByTopics(topics: string[], opts?: { limit?: number }): Promise<KnowledgeEntryView[]> {
    const wanted = new Set(topics);
    const lessons = this.lessonIndex();
    const scored = this.allEntries()
      .map((e) => ({ view: this.toEntryView(e, lessons), shared: (e.topicIds || []).filter((t: string) => wanted.has(t)).length, currentVersion: e.currentVersion ?? 0 }))
      .filter((s) => s.view && s.shared > 0)
      .sort((a, b) => b.shared - a.shared || b.currentVersion - a.currentVersion);
    return scored.slice(0, opts?.limit ?? 5).map((s) => s.view as KnowledgeEntryView);
  }

  async findEntryBySlug(slug: string): Promise<KnowledgeEntryView | null> {
    const entry = this.allEntries().find((e) => e.slug === slug);
    return entry ? this.toEntryView(entry, this.lessonIndex()) : null;
  }

  private all(): any[] {
    const dir = join(this.contentDir, 'knowledge', 'lessons');
    const out: any[] = [];
    if (!existsSync(dir)) return out;
    const walk = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.json')) {
          try { out.push(JSON.parse(readFileSync(p, 'utf8'))); } catch { /* lição inválida: o validador a reprova; o repositório a ignora */ }
        }
      }
    };
    walk(dir);
    return out;
  }

  async findByTopics(topics: string[], opts?: { limit?: number }): Promise<KnowledgeLessonView[]> {
    const wanted = new Set(topics);
    const scored = this.all()
      .filter((l) => l.reviewStatus === 'approved')
      .map((l) => ({ view: toView(l), score: (l.topics || []).filter((t: string) => wanted.has(t)).length }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, opts?.limit ?? 5).map((s) => s.view);
  }

  async findById(id: string): Promise<KnowledgeLessonView | null> {
    const found = this.all().find((l) => l.id === id && l.reviewStatus === 'approved');
    return found ? toView(found) : null;
  }

  async stats() {
    const all = this.all();
    return {
      lessonsApproved: all.filter((l) => l.reviewStatus === 'approved').length,
      lessonsDraft: all.filter((l) => l.reviewStatus === 'draft').length,
      sources: new Set(all.map((l) => l.courseSlug)).size,
    };
  }
}

export class DbKnowledgeRepository implements KnowledgeRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Acesso via `as any`: o cliente Prisma só ganha os modelos de conhecimento
  // depois de `prisma generate` com a migration; o adaptador file é o default
  // até lá, e este adaptador nunca é instanciado sem KNOWLEDGE_STORE=db.
  private get db(): any { return this.prisma as any; }

  async findByTopics(topics: string[], opts?: { limit?: number }): Promise<KnowledgeLessonView[]> {
    const rows = await this.db.knowledgeLesson.findMany({
      where: { reviewStatus: 'approved', topics: { hasSome: topics } },
      include: { source: true },
      take: opts?.limit ?? 5,
    });
    return rows.map((r: any) => ({ id: r.stableId, title: r.title, courseName: r.source?.name ?? '', summary: r.summary, topics: r.topics, prerequisites: r.prerequisites, difficulty: r.difficulty }));
  }

  async findById(id: string): Promise<KnowledgeLessonView | null> {
    const r = await this.db.knowledgeLesson.findUnique({ where: { stableId: id }, include: { source: true } });
    if (!r || r.reviewStatus !== 'approved') return null;
    return { id: r.stableId, title: r.title, courseName: r.source?.name ?? '', summary: r.summary, topics: r.topics, prerequisites: r.prerequisites, difficulty: r.difficulty };
  }

  async stats() {
    const [lessonsApproved, lessonsDraft, sources] = await Promise.all([
      this.db.knowledgeLesson.count({ where: { reviewStatus: 'approved' } }),
      this.db.knowledgeLesson.count({ where: { reviewStatus: 'draft' } }),
      this.db.knowledgeSource.count(),
    ]);
    return { lessonsApproved, lessonsDraft, sources };
  }

  async findEntriesByTopics(topics: string[], opts?: { limit?: number }): Promise<KnowledgeEntryView[]> {
    const rows = await this.db.knowledgeEntry.findMany({
      where: { status: 'active', topicIds: { hasSome: topics } },
      include: { versions: { where: { status: 'active' } } },
      take: opts?.limit ?? 5,
    });
    return rows
      .map((r: any) => {
        const active = (r.versions || [])[0];
        if (!active || active.version !== r.currentVersion) return null;
        const drive = (active.contributions || []).find((c: any) => c.kind === 'drive');
        return {
          slug: r.slug, title: r.title, version: active.version, summary: active.summary,
          keyExamples: active.keyExamples || [], topicIds: r.topicIds || [],
          courseName: '', lessonTitle: drive?.lessonId ?? '', lessonId: drive?.lessonId ?? null,
        } as KnowledgeEntryView;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (b.topicIds.filter((t: string) => topics.includes(t)).length - a.topicIds.filter((t: string) => topics.includes(t)).length) || b.version - a.version);
  }

  async findEntryBySlug(slug: string): Promise<KnowledgeEntryView | null> {
    const r = await this.db.knowledgeEntry.findUnique({
      where: { slug }, include: { versions: { where: { status: 'active' } } },
    });
    if (!r) return null;
    const active = (r.versions || [])[0];
    if (!active || active.version !== r.currentVersion || r.status !== 'active') return null;
    const drive = (active.contributions || []).find((c: any) => c.kind === 'drive');
    return {
      slug: r.slug, title: r.title, version: active.version, summary: active.summary,
      keyExamples: active.keyExamples || [], topicIds: r.topicIds || [],
      courseName: '', lessonTitle: drive?.lessonId ?? '', lessonId: drive?.lessonId ?? null,
    };
  }
}

@Injectable()
export class KnowledgeService implements KnowledgeRepository {
  private readonly logger = new Logger(KnowledgeService.name);
  private readonly repo: KnowledgeRepository;

  constructor(@Optional() prisma?: PrismaService) {
    // content/ fica na raiz do repo; em produção o checkout pode não existir —
    // nesse caso o adaptador file devolve base vazia (tutora inalterada), nunca erro.
    const contentDir = resolveKnowledgeContentDir();
    if (process.env.KNOWLEDGE_STORE === 'db' && prisma) {
      this.repo = new DbKnowledgeRepository(prisma);
    } else {
      this.repo = new FileKnowledgeRepository(contentDir);
    }
  }

  findByTopics(topics: string[], opts?: { limit?: number }) {
    return this.repo.findByTopics(topics, opts).catch((err) => {
      this.logger.warn(`knowledge: findByTopics falhou, base tratada como vazia: ${err.message}`);
      return [];
    });
  }

  findById(id: string) {
    return this.repo.findById(id).catch(() => null);
  }

  findEntriesByTopics(topics: string[], opts?: { limit?: number }) {
    return this.repo.findEntriesByTopics(topics, opts).catch((err) => {
      this.logger.warn(`knowledge: findEntriesByTopics falhou, base tratada como vazia: ${err.message}`);
      return [];
    });
  }

  findEntryBySlug(slug: string) {
    return this.repo.findEntryBySlug(slug).catch(() => null);
  }

  stats() {
    return this.repo.stats().catch(() => ({ lessonsApproved: 0, lessonsDraft: 0, sources: 0 }));
  }
}
