/**
 * Gerador incremental — serviço da API (DESIGN §4.5 / delta §I9.1 — H8).
 * Redação por LLM vive AQUI, via LlmClient da Sprint 22 (que envolve o
 * LlmProvider: Gemini nativo, endpoint OpenAI-compatível, Ollama/LM Studio
 * sem chave). O CLI mantém SÓ o caminho determinístico (fixtures) — nenhum
 * cliente de LLM novo em scripts/, nenhuma chamada LLM fora do LlmProvider.
 *
 * Contas separadas (§I9.2): a geração consome o ORÇAMENTO DO PIPELINE
 * (pipeline-budget.ts, teto diário proposto 200/dia, pendente Q7), NUNCA a
 * cota Q5 de aluno (a chamada vai sem userId, como o resumo do pipeline).
 * Sem LLM configurado, o serviço gera o draft determinístico (templates) e
 * NÃO fabrica redação: a redação por LLM é melhoria, não requisito do draft.
 *
 * Fila: BullMQ `track-generation`, concorrência 1 (processor), jobId
 * idempotente `track:<goalSlug>:seg:<n>` — gatilho duplicado (T1+T2) é
 * no-op. A coleta de pesquisa fresca REUSA a fila `research`: o processor
 * enfileira a coleta lá e aguarda o documento (polling com timeout); sem
 * fila research injetada, coleta direta pelo mesmo ResearchService (o
 * worker da fila research executa o mesmo método — mesma semântica).
 * Vagas: coleta nova SEMPRE por segmento (nunca reutilizada); roadmap web
 * reutilizável até 90 dias e vídeos/repos até 30 dias, sempre REGISTRADO.
 * Segmento nasce draft; só ativa com ato do admin (approveSegment) — nenhuma
 * auto-aprovação como default (Q12 aberta). Progresso: derivado de
 * Submission passed, nunca gravado como estado próprio (§I1.3).
 */
import { Inject, Injectable, Logger, NotFoundException, Optional, forwardRef } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LlmClient } from '../../ai/llm-client';
import { PrismaService } from '../../prisma/prisma.service';
import { ResearchService } from '../research/research.service';
import { resolveKnowledgeContentDir } from '../knowledge.service';
import { loadBudget, recordUsage, reserveCall } from './pipeline-budget';

export const TRACK_WINDOW_DAYS = 730;
export const ROADMAP_REUSE_DAYS = 90;
export const VIDEO_REPO_REUSE_DAYS = 30;
export const EXERCISE_MIN_RATIO = 0.5;
export const EXERCISES_PER_TOPIC = 3;
export const SEGMENT_LLM_CALL_CAP = 3;

export type SegmentStatus = 'planned' | 'draft' | 'active' | 'superseded';

export function slugify(s: string): string {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function daysBetween(earlierIso: string, laterIso: string): number | null {
  const a = Date.parse(earlierIso);
  const b = Date.parse(laterIso);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.floor((b - a) / 86400000);
}

/** Filtro de vagas §I4.1 (gate 10) — espelho TS de track-incremental.mjs. */
export function filterJobSamples(samples: Array<{ postedAt?: string | null }>, generatedAt: string): { valid: typeof samples; stale: number; undated: number } {
  const valid: typeof samples = [];
  let stale = 0;
  let undated = 0;
  for (const s of samples || []) {
    if (!s || !s.postedAt) { undated++; continue; }
    const diff = daysBetween(s.postedAt, generatedAt);
    if (diff !== null && diff >= 0 && diff <= TRACK_WINDOW_DAYS) valid.push(s);
    else stale++;
  }
  return { valid, stale, undated };
}

/** Piso duplo §I6.2 (gate 11) — espelho TS de track-incremental.mjs. */
export function exerciseFloor(activities: Array<{ conceptTags?: string[]; lessonPayload?: { activityKind?: string } }>): {
  exercises: number; total: number; ratio: number; perTopic: Record<string, number>; perTopicMin: number; ok: boolean;
} {
  const total = activities.length;
  const ex = activities.filter((a) => a.lessonPayload?.activityKind === 'exercise' || a.lessonPayload?.activityKind === 'project');
  const perTopic: Record<string, number> = {};
  for (const a of ex) for (const t of a.conceptTags || []) perTopic[t] = (perTopic[t] || 0) + 1;
  const topics = [...new Set(activities.flatMap((a) => a.conceptTags || []))];
  const perTopicMin = topics.length ? Math.min(...topics.map((t) => perTopic[t] || 0)) : 0;
  const ratio = total ? ex.length / total : 0;
  return { exercises: ex.length, total, ratio, perTopic, perTopicMin, ok: total > 0 && ratio >= EXERCISE_MIN_RATIO && (topics.length === 0 || perTopicMin >= EXERCISES_PER_TOPIC) };
}

/** Expressões reais de teste (espelho de realTestExpressions, sem comentários). */
export function realTestExpressionsTs(testCode?: string | null, hiddenTests?: string | null): string[] {
  const parse = (script: string | null | undefined, field: string): string[] => {
    if (script == null) return [];
    if (typeof script !== 'string') throw new TypeError(`realTestExpressions: ${field} deve ser string (recebido ${Array.isArray(script) ? 'array' : typeof script})`);
    if (!script.trim()) return [];
    if (script.includes('---TEST---') || script.includes('\n---\n')) {
      const delimiter = script.includes('---TEST---') ? /---TEST---/g : /\n---\n/g;
      return script.split(delimiter).map((b) => b.trim()).filter((b) => b.length > 0);
    }
    return script.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('#'));
  };
  return [...parse(testCode, 'testCode'), ...parse(hiddenTests, 'hiddenTests')];
}

/** Gate de ativação §I6.3: exercise/project sem teste autorado não ativa. */
export function assertSegmentActivatable(segment: { activities?: Array<Record<string, unknown>> }): string[] {
  const problems: string[] = [];
  for (const a of segment.activities || []) {
    const lp = (a.lessonPayload || {}) as { activityKind?: string };
    if (lp.activityKind !== 'exercise' && lp.activityKind !== 'project') continue;
    const testCode = a.testCode as string | undefined;
    if ((testCode || '').includes('PENDENTE-AUTORIA-ADMIN')) {
      problems.push(`atividade ${a.slug}: testCode com PENDENTE-AUTORIA-ADMIN — autoria do admin exigida antes de ativar`);
      continue;
    }
    try {
      if (realTestExpressionsTs(testCode, a.hiddenTests as string | undefined).length === 0) problems.push(`atividade ${a.slug}: sem expressão real de teste`);
    } catch (err) {
      problems.push(`atividade ${a.slug}: ${(err as Error).message}`);
    }
    if (typeof a.referenceSolution !== 'string' || !(a.referenceSolution as string).trim()) {
      problems.push(`atividade ${a.slug}: referenceSolution vazio — sem ela não há como provar que os testes passam`);
    }
  }
  return [...new Set(problems)];
}

/** Plano de frescor por fonte (§I2.3) — espelho TS de track-incremental.mjs. */
export function planFreshResearch(previous: { collectedAt?: string; id?: string } | null, nowIso?: string): {
  jobs: { mode: string; reason: string };
  web: { mode: string; reusedFrom?: string | null; ageDays?: number; reason?: string };
  videosRepos: { mode: string; reusedFrom?: string | null; ageDays?: number; reason?: string };
} {
  const now = nowIso || new Date().toISOString();
  const ageDays = previous?.collectedAt ? daysBetween(previous.collectedAt, now) : null;
  return {
    jobs: { mode: 'fresh', reason: 'vagas nunca reutilizadas entre segmentos (§I2.3)' },
    web: ageDays !== null && ageDays <= ROADMAP_REUSE_DAYS
      ? { mode: 'reused', reusedFrom: previous?.id || null, ageDays }
      : { mode: 'fresh', reason: ageDays === null ? 'sem pesquisa anterior' : `roadmap com ${ageDays} dias (> ${ROADMAP_REUSE_DAYS})` },
    videosRepos: ageDays !== null && ageDays <= VIDEO_REPO_REUSE_DAYS
      ? { mode: 'reused', reusedFrom: previous?.id || null, ageDays }
      : { mode: 'fresh', reason: ageDays === null ? 'sem pesquisa anterior' : `documento com ${ageDays} dias (> ${VIDEO_REPO_REUSE_DAYS})` },
  };
}

export interface SegmentJobData {
  goal: string;
  goalSlug: string;
  stageSlug: string;
  stageTitle: string;
  topics: string[];
  stageOrder: number;
  language?: string;
  kmsEntries?: Array<Record<string, unknown>>;
  segmentVersion?: number;
  trigger: 'T1' | 'T2' | 'T3' | 'T4';
}

function writeJsonAtomic(path: string, obj: unknown): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`);
  renameSync(tmp, path);
}

@Injectable()
export class TrackGenerationService {
  private readonly logger = new Logger(TrackGenerationService.name);
  private readonly contentDir: string | null;

  constructor(
    @Optional() @InjectQueue('track-generation') private readonly queue?: Queue,
    @Optional() @InjectQueue('research') private readonly researchQueue?: Queue,
    @Optional() private readonly research?: ResearchService,
    // forwardRef: AiModule importa KnowledgeModule; o forwardRef quebra o
    // ciclo sem criar módulo paralelo (diretriz: nada ao lado da Nexus).
    @Optional() @Inject(forwardRef(() => LlmClient)) private readonly llm?: LlmClient,
    @Optional() @Inject('TRACK_CONTENT_DIR') contentDir?: string,
    @Optional() private readonly prisma?: PrismaService,
  ) {
    // Fail-closed (V2): diretório resolvido só vale se o checkout existir
    // de fato (content/knowledge presente). Diretório explícito (operador)
    // vale por si; sem nenhum dos dois, escrever segmento falha em vez de
    // criar arquivos perdidos dentro do container da API.
    if (contentDir) this.contentDir = contentDir;
    else {
      const resolved = resolveKnowledgeContentDir();
      this.contentDir = existsSync(join(resolved, 'knowledge')) ? resolved : null;
    }
  }

  getContentDir(): string | null {
    return this.contentDir;
  }

  hasLlm(): boolean {
    return Boolean(this.llm);
  }

  /**
   * Coleta fresca do segmento REUSANDO a fila `research` (§I2.2): enfileira
   * a coleta lá e aguarda o documento (polling com timeout). Sem fila
   * research injetada, coleta direta pelo mesmo ResearchService (o código
   * que o worker da fila research executa). Sem ResearchService, retorna
   * null — o segmento gera sem selo de mercado (fail-closed por fonte,
   * §I7.2), nunca com pesquisa fingida.
   */
  async collectFreshResearch(goal: string, opts?: { timeoutMs?: number; pollMs?: number }): Promise<{ id: string; collectedAt: string; market?: { skills?: Array<Record<string, unknown>> } } | null> {
    if (!this.research) return null;
    const timeoutMs = opts?.timeoutMs ?? 60000;
    const pollMs = opts?.pollMs ?? 250;
    if (this.researchQueue) {
      // Mesmo id que o ResearchService gera (slug truncado em 60 chars).
      const docId = `research-${slugify(goal).slice(0, 60)}`;
      const before = (() => { try { return this.research.get(docId).collectedAt; } catch { return null; } })();
      await this.researchQueue.add('collect', { researchId: docId, goal }, { jobId: `research-collect:${slugify(goal)}:${Date.now()}` });
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        try {
          const doc = this.research.get(docId);
          if (doc.collectedAt !== before) return doc as unknown as { id: string; collectedAt: string; market?: { skills?: Array<Record<string, unknown>> } };
        } catch { /* ainda sem documento */ }
        await new Promise((r) => setTimeout(r, pollMs));
      }
      throw new Error(`coleta fresca de pesquisa para "${goal}" não completou em ${timeoutMs}ms (fila research) — job de geração falha, segmento fica planned`);
    }
    const doc = await this.research.collect(goal);
    return doc as unknown as { id: string; collectedAt: string; market?: { skills?: Array<Record<string, unknown>> } };
  }

  jobIdFor(goalSlug: string, segmentIndex: number): string {
    return `track:${goalSlug}:seg:${segmentIndex}`;
  }

  /** Enfileira geração de segmento (T1–T4). Job existente ⇒ no-op (dedupe). */
  async enqueueSegment(data: SegmentJobData): Promise<{ jobId: string; queued: boolean; deduped: boolean }> {
    if (!this.queue) {
      throw new Error('fila track-generation indisponível nesta instância: a geração incremental exige o worker BullMQ (stack local) — o caminho do operador é o CLI determinístico track-generate-segment.mjs');
    }
    const jobId = this.jobIdFor(data.goalSlug, data.stageOrder);
    const existing = await this.queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState().catch(() => 'unknown');
      if (state === 'waiting' || state === 'active' || state === 'delayed') {
        return { jobId, queued: false, deduped: true };
      }
    }
    await this.queue.add('generate-segment', data, { jobId });
    return { jobId, queued: true, deduped: false };
  }

  /** T4 — criação da trilha: esqueleto + segmento 1 enfileirado. */
  async createTrack(goal: string, stages: Array<{ stageSlug: string; title: string; topics: string[]; language?: string }>): Promise<{ goalSlug: string; jobId: string }> {
    if (!goal || !goal.trim()) throw new Error('trilha incremental exige objetivo explícito');
    if (!stages.length) throw new Error('esqueleto exige pelo menos uma etapa do roadmap');
    const goalSlug = slugify(goal);
    this.writeSkeleton(goalSlug, goal, stages);
    const first = stages[0];
    const { jobId } = await this.enqueueSegment({
      goal, goalSlug, stageSlug: first.stageSlug, stageTitle: first.title, topics: first.topics,
      stageOrder: 1, language: first.language || 'python', trigger: 'T4',
    });
    return { goalSlug, jobId };
  }

  /** T2 — "próximos passos": draft/active ⇒ no-op + estado; planned ⇒ enfileira. */
  async requestNextSteps(goalSlug: string, next: { stageSlug: string; title: string; topics: string[]; stageOrder: number; status: SegmentStatus; language?: string }): Promise<{ action: 'noop' | 'queued'; state: string; jobId?: string }> {
    if (next.status === 'draft' || next.status === 'active') {
      return { action: 'noop', state: next.status === 'draft' ? 'próximos passos em revisão pelo professor' : 'próximo segmento já disponível' };
    }
    const { jobId } = await this.enqueueSegment({
      goal: goalSlug, goalSlug, stageSlug: next.stageSlug, stageTitle: next.title, topics: next.topics,
      stageOrder: next.stageOrder, language: next.language || 'python', trigger: 'T2',
    });
    return { action: 'queued', state: 'geração do próximo segmento enfileirada', jobId };
  }

  /** Geração determinística do segmento (mesma regra do CLI, sem LLM). */
  buildSegmentDraft(data: SegmentJobData, research: { id?: string; collectedAt?: string; sourcesUnavailable?: string[]; market?: { skills?: Array<Record<string, unknown>> } } | null, generatedAt?: string): { segment: Record<string, unknown>; report: Record<string, unknown> } {
    const genAt = generatedAt || new Date().toISOString();
    const kmsEntries = (data.kmsEntries || []) as Array<{ status?: string; currentVersion?: number; topicIds?: string[]; slug?: string; versions?: Array<{ version?: number; status?: string }> }>;
    const activeKms = kmsEntries.filter((e) => e.status === 'active' && (e.versions || []).some((v) => v.version === e.currentVersion && v.status === 'active'));
    // Fail-closed por fonte (§I7.2): jobs listado em sourcesUnavailable ⇒
    // sem selo de mercado, mesmo que o documento carregue skills antigas.
    const jobsUnavailable = (research?.sourcesUnavailable || []).includes('jobs');
    const skills = (jobsUnavailable ? [] : (research?.market?.skills || [])) as Array<{ skill?: string; samples?: Array<{ postedAt?: string | null; sourceUrl?: string }> }>;
    const validSkills: Array<{ skill: string; sampleSize: number }> = [];
    let samplesSeen = 0;
    let staleDiscarded = 0;
    let undatedExcluded = 0;
    const staleSkillsRemoved: Array<Record<string, unknown>> = [];
    for (const s of skills) {
      if (!s.samples) { staleSkillsRemoved.push({ skill: s.skill, stale: null, undated: null, reason: 'no-disaggregated-samples' }); continue; }
      const { valid, stale, undated } = filterJobSamples(s.samples, genAt);
      samplesSeen += s.samples.length;
      staleDiscarded += stale;
      undatedExcluded += undated;
      if (valid.length === 0) staleSkillsRemoved.push({ skill: s.skill, stale, undated });
      else validSkills.push({ skill: String(s.skill), sampleSize: valid.length });
    }
    const marketAligned = validSkills.length > 0;
    const activities: Array<Record<string, unknown>> = [];
    let order = 1;
    for (const topic of data.topics) {
      const topicKms = activeKms.filter((e) => (e.topicIds || []).includes(topic));
      const topicSkills = validSkills.filter((s) => slugify(s.skill) === slugify(topic));
      const basePayload = {
        reviewStatus: 'draft',
        generatedTrack: true,
        segment: { trackSlug: data.goalSlug, stageSlug: data.stageSlug, segmentVersion: data.segmentVersion || 1 },
        techVersions: {},
        kmsEntries: topicKms.map((e) => ({ slug: e.slug, version: e.currentVersion })),
        knowledgeSources: [],
        marketSkills: topicSkills,
      };
      activities.push({
        courseSlug: `trilha-${data.goalSlug}`, slug: `${data.stageSlug}-${slugify(topic)}-teoria`,
        title: `${data.stageTitle} — ${topic} (teoria)`, description: `Teoria de ${topic}.`,
        instructions: 'Estude o resumo e resolva os exercícios do tópico.',
        language: data.language || 'python', initialCode: '', testCode: '', hiddenTests: '', referenceSolution: '',
        conceptTags: [topic], lessonPayload: { ...basePayload, activityKind: 'theory' }, order: order++,
      });
      for (let n = 1; n <= EXERCISES_PER_TOPIC; n++) {
        activities.push({
          courseSlug: `trilha-${data.goalSlug}`, slug: `${data.stageSlug}-${slugify(topic)}-ex${n}`,
          title: `${data.stageTitle} — ${topic} (exercício ${n})`, description: `Exercício ${n} de ${topic}.`,
          instructions: 'Escreva a solução e submeta; a correção usa testes ocultos autorados pelo admin.',
          language: data.language || 'python', initialCode: '# Escreva sua solução aqui\n',
          testCode: '# PENDENTE-AUTORIA-ADMIN: testes de comportamento específicos desta atividade (o gerador não inventa testes)',
          hiddenTests: '', referenceSolution: '',
          conceptTags: [topic], lessonPayload: { ...basePayload, activityKind: 'exercise' }, order: order++,
        });
      }
    }
    const floor = exerciseFloor(activities as never);
    if (!floor.ok) throw new Error(`piso de exercícios violado no segmento ${data.stageSlug} (gate 11): ${floor.exercises}/${floor.total} (razão ${floor.ratio.toFixed(2)}), mínimo por tópico ${floor.perTopicMin}`);
    const segment = {
      trackSlug: data.goalSlug, stageSlug: data.stageSlug, title: data.stageTitle,
      order: data.stageOrder, segmentVersion: data.segmentVersion || 1, status: 'draft', generatedAt: genAt, activities,
    };
    const report = {
      trackSlug: data.goalSlug, segment: data.stageOrder, stageSlug: data.stageSlug, generatedAt: genAt, goal: data.goal,
      sources: {
        web: { status: 'available', roadmapTopics: data.topics, researchId: research?.id || null, collectedAt: research?.collectedAt || null },
        kms: { status: activeKms.length ? 'available' : 'empty', entriesUsed: activeKms.map((e) => ({ slug: e.slug, version: e.currentVersion })), entriesConsidered: activeKms.length },
        jobs: { status: research ? 'available' : 'unavailable', skills: validSkills, samplesSeen, staleDiscarded, undatedExcluded, researchId: research?.id || null, collectedAt: research?.collectedAt || null },
      },
      marketAligned,
      coverage: data.topics.map((topic) => ({
        topic,
        activitySlugs: activities.filter((a) => (a.conceptTags as string[]).includes(topic)).map((a) => a.slug as string),
        kmsEntries: activeKms.filter((e) => (e.topicIds || []).includes(topic)).map((e) => ({ slug: e.slug, version: e.currentVersion })),
        jobSkills: validSkills.filter((s) => slugify(s.skill) === slugify(topic)).map((s) => s.skill),
      })),
      gaps: [],
      staleSkillsRemoved,
      techVersions: {},
      exerciseFloor: floor,
      versionChanges: [],
    };
    return { segment: segment as unknown as Record<string, unknown>, report: report as unknown as Record<string, unknown> };
  }

  /**
   * Redação por LLM em batch por segmento (§I9.2): 1 chamada por segmento,
   * teto de 3 (1 redação + até 2 regenerações por falha de gate), backoff
   * exponencial em 429. A saída é VALIDADA estruturalmente antes de aplicar:
   * mesmos slugs, sem atividade nova, sem testCode (o LLM nunca escreve
   * teste), descrições ≤ 1200 chars. Falha de validação conta como tentativa;
   * esgotado o teto, o job falha e NADA é escrito (segmento fica planned).
   * Sem LLM configurado ⇒ erro explícito (fail-closed, sem redação fingida).
   * A chamada vai SEM userId (orçamento do pipeline, nunca cota de aluno).
   */
  async redactSegmentWithLlm(
    segment: { activities?: Array<Record<string, unknown>> },
    opts?: { budgetDir?: string; delayMs?: (attempt: number) => Promise<void> },
  ): Promise<{ applied: number; calls: number; model: string }> {
    if (!this.llm) throw new Error('LLM provider unavailable: redação por LLM exige provedor configurado (Sprint 22) — o draft determinístico segue válido sem ela');
    const activities = segment.activities || [];
    const allowedSlugs = new Set(activities.map((a) => a.slug as string));
    const prompt = `Redija enunciados (description + instructions) para as atividades abaixo, em português, sem inventar testes, skills ou fontes. Responda SOMENTE JSON: {"activities":[{"slug":"...","description":"...","instructions":"..."}]}. Atividades: ${activities.map((a) => `${a.slug}: ${a.title}`).join(' | ')}`;
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= SEGMENT_LLM_CALL_CAP; attempt++) {
      const budget = reserveCall(opts?.budgetDir); // pausa antes de gastar, nunca depois
      try {
        const text = await this.llm.complete({
          messages: [
            { role: 'system', content: 'Você redige enunciados de exercícios de programação. Nunca invente testes, soluções ou fontes.' },
            { role: 'user', content: prompt },
          ],
          purpose: 'knowledge-generation',
        });
        recordUsage(opts?.budgetDir, { purpose: 'knowledge-generation', model: 'llm-provider' });
        const parsed = JSON.parse(text) as { activities?: Array<{ slug?: string; description?: string; instructions?: string }> };
        const incoming = parsed.activities || [];
        if (!incoming.length) throw new Error('redação LLM vazia (sem atividades)');
        for (const item of incoming) {
          if (!item.slug || !allowedSlugs.has(item.slug)) throw new Error(`redação LLM com slug desconhecido/novo: ${item.slug} — rejeitada`);
          if (typeof item.description !== 'string' || item.description.length > 1200) throw new Error(`redação LLM inválida para ${item.slug} (description ausente ou > 1200 chars)`);
        }
        const bySlug = new Map(incoming.map((i) => [i.slug, i]));
        let applied = 0;
        for (const a of activities) {
          const item = bySlug.get(a.slug as string);
          if (item) {
            a.description = item.description;
            if (typeof item.instructions === 'string') a.instructions = item.instructions;
            applied++;
          }
        }
        void budget;
        return { applied, calls: attempt, model: 'llm-provider' };
      } catch (err) {
        lastError = err as Error;
        const isRateLimit = /429|rate limit|quota/i.test(lastError.message);
        if (attempt < SEGMENT_LLM_CALL_CAP) {
          // Backoff exponencial em 429 (e em falha de gate: regeneração, não retry cego do mesmo texto).
          const delay = opts?.delayMs ? opts.delayMs(attempt) : new Promise<void>((r) => setTimeout(r, (isRateLimit ? 500 : 100) * 2 ** (attempt - 1)));
          await delay;
          continue;
        }
        throw new Error(`redação LLM falhou após ${SEGMENT_LLM_CALL_CAP} tentativas (teto por segmento): ${lastError.message} — segmento NÃO escrito`);
      }
    }
    throw lastError || new Error('redação LLM falhou');
  }

  /** Orçamento do pipeline do dia (para o painel admin). */
  pipelineBudgetStatus(budgetDir?: string): { date: string; cap: number; used: number; remaining: number } {
    return loadBudget(budgetDir);
  }

  // ---------- persistência do template (arquivos versionados) ----------

  private tracksDir(): string {
    if (!this.contentDir) throw new Error('geração incremental exige checkout com content/knowledge (TRACK_CONTENT_DIR ou KNOWLEDGE_CONTENT_DIR) — sem ele, fail-closed (o worker da API em produção não escreve no repo)');
    return join(this.contentDir, 'knowledge', 'tracks');
  }

  private writeSkeleton(goalSlug: string, goal: string, stages: Array<{ stageSlug: string; title: string; topics: string[] }>): void {
    const dir = join(this.tracksDir(), goalSlug);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, 'track.json');
    if (existsSync(path)) return; // esqueleto existente nunca é sobrescrito pela criação
    writeJsonAtomic(path, {
      goalSlug, goal, createdAt: new Date().toISOString(),
      stages: stages.map((s, i) => ({ order: i + 1, stageSlug: s.stageSlug, title: s.title, topics: s.topics, status: 'planned' })),
    });
  }

  writeSegmentFiles(segment: Record<string, unknown>, report: Record<string, unknown>): { segPath: string; repPath: string } {
    const dir = join(this.tracksDir(), String(segment.trackSlug), 'segments');
    mkdirSync(dir, { recursive: true });
    const segPath = join(dir, `${segment.order}-${segment.stageSlug}.json`);
    const repPath = join(dir, `${segment.order}-${segment.stageSlug}.report.json`);
    writeJsonAtomic(segPath, segment);
    writeJsonAtomic(repPath, report);
    // O estágio sai de planned para draft no esqueleto (o conteúdo existe, em revisão).
    const trackPath = join(this.tracksDir(), String(segment.trackSlug), 'track.json');
    if (existsSync(trackPath)) {
      const track = JSON.parse(readFileSync(trackPath, 'utf8'));
      const stage = (track.stages || []).find((s: { stageSlug?: string }) => s.stageSlug === segment.stageSlug);
      if (stage && stage.status === 'planned') {
        stage.status = 'draft';
        writeJsonAtomic(trackPath, track);
      }
    }
    return { segPath, repPath };
  }

  listSegments(goalSlug: string): Array<{ stageSlug: string; title: string; order: number; status: SegmentStatus; activities: number; segmentVersion: number; generatedAt: string | null }> {
    const dir = join(this.tracksDir(), goalSlug);
    const trackPath = join(dir, 'track.json');
    if (!existsSync(trackPath)) throw new NotFoundException(`trilha incremental não encontrada: ${goalSlug}`);
    const track = JSON.parse(readFileSync(trackPath, 'utf8'));
    const segDir = join(dir, 'segments');
    const files = existsSync(segDir) ? readdirSync(segDir).filter((f) => f.endsWith('.json') && !f.endsWith('.report.json')) : [];
    const byStage = new Map<string, Record<string, unknown>>();
    for (const f of files) {
      try {
        const seg = JSON.parse(readFileSync(join(segDir, f), 'utf8'));
        byStage.set(seg.stageSlug, seg);
      } catch { /* arquivo inválido: o validador reprova depois */ }
    }
    return (track.stages || []).map((s: { stageSlug: string; title: string; order: number; status: SegmentStatus }) => {
      const seg = byStage.get(s.stageSlug);
      return {
        stageSlug: s.stageSlug, title: s.title, order: s.order,
        status: (seg?.status as SegmentStatus) || s.status,
        activities: Array.isArray(seg?.activities) ? (seg!.activities as unknown[]).length : 0,
        segmentVersion: (seg?.segmentVersion as number) || 0,
        generatedAt: (seg?.generatedAt as string) || null,
      };
    });
  }

  /**
   * Aprovação do segmento (§I3): ato do admin, por segmento. Exige o gate
   * de ativação (testes autorados); aprovar NÃO aprova o próximo segmento
   * nem pesquisa futura. Fatos (techVersions/marketContext) atualizam o
   * relatório sem nova aprovação — nunca o conteúdo.
   */
  approveSegment(goalSlug: string, stageSlug: string, adminId: string): { goalSlug: string; stageSlug: string; approvedBy: string; approvedAt: string } {
    const dir = join(this.tracksDir(), goalSlug);
    const trackPath = join(dir, 'track.json');
    if (!existsSync(trackPath)) throw new NotFoundException(`trilha incremental não encontrada: ${goalSlug}`);
    const segDir = join(dir, 'segments');
    const files = existsSync(segDir) ? readdirSync(segDir).filter((f) => f.endsWith('.json') && !f.endsWith('.report.json')) : [];
    let segPath: string | null = null;
    let seg: Record<string, unknown> | null = null;
    for (const f of files) {
      const candidate = JSON.parse(readFileSync(join(segDir, f), 'utf8'));
      if (candidate.stageSlug === stageSlug) { segPath = join(segDir, f); seg = candidate; break; }
    }
    if (!seg || !segPath) throw new NotFoundException(`segmento draft não encontrado: ${goalSlug}/${stageSlug}`);
    if (seg.status !== 'draft') throw new Error(`só draft pode ser aprovado (segmento ${stageSlug} está ${seg.status})`);
    const problems = assertSegmentActivatable(seg as { activities?: Array<Record<string, unknown>> });
    if (problems.length) {
      throw new Error(`segmento ${stageSlug} NÃO ATIVÁVEL (gate §I6.3):\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    }
    const approvedAt = new Date().toISOString();
    writeJsonAtomic(segPath, { ...seg, status: 'active', approvedBy: adminId, approvedAt });
    const track = JSON.parse(readFileSync(trackPath, 'utf8'));
    const stage = (track.stages || []).find((s: { stageSlug?: string }) => s.stageSlug === stageSlug);
    if (stage) {
      stage.status = 'active';
      writeJsonAtomic(trackPath, track);
    }
    return { goalSlug, stageSlug, approvedBy: adminId, approvedAt };
  }

  /**
   * Progresso derivado (§I1.3): lê as atividades do curso + Submissions
   * passed do aluno e deriva completed/atual por segmento. Nenhum campo
   * novo de progresso: o estado do aluno vive em Submission, o do template
   * vive no track.json.
   */
  async segmentProgress(userId: string, courseSlug: string): Promise<{
    courseSlug: string;
    segments: Array<{ stageSlug: string; activities: number; passed: number; completed: boolean }>;
    currentStageSlug: string | null;
  }> {
    if (!this.prisma) throw new Error('progresso de segmento exige Prisma (espelho do curso) — sem ele, fail-closed');
    const db = this.prisma as unknown as {
      course: { findUnique(args: unknown): Promise<{ id: string; activities: Array<{ slug: string; lessonPayload?: { segment?: { stageSlug?: string } } }> } | null> };
      submission: { findMany(args: unknown): Promise<Array<{ activityId: string; status: string }>> };
    };
    const course = await db.course.findUnique({ where: { slug: courseSlug }, include: { activities: true } });
    if (!course) throw new NotFoundException(`curso não encontrado: ${courseSlug}`);
    const activityIds = course.activities.map((a) => (a as unknown as { id: string }).id);
    const passedActivityIds = new Set<string>();
    if (activityIds.length) {
      const subs = await db.submission.findMany({ where: { userId, activityId: { in: activityIds }, status: 'passed' }, select: { activityId: true } });
      for (const s of subs) passedActivityIds.add(s.activityId);
    }
    const byStage = new Map<string, { activities: number; passed: number }>();
    for (const a of course.activities) {
      const stageSlug = (a.lessonPayload as { segment?: { stageSlug?: string } } | null)?.segment?.stageSlug;
      if (!stageSlug) continue;
      const entry = byStage.get(stageSlug) || { activities: 0, passed: 0 };
      entry.activities++;
      if (passedActivityIds.has((a as unknown as { id: string }).id)) entry.passed++;
      byStage.set(stageSlug, entry);
    }
    const segments = [...byStage.entries()].map(([stageSlug, v]) => ({
      stageSlug, activities: v.activities, passed: v.passed, completed: v.activities > 0 && v.passed === v.activities,
    }));
    // Atual = primeiro segmento não completed na ordem das atividades.
    const orderOf = new Map<string, number>();
    for (const a of course.activities) {
      const stageSlug = (a.lessonPayload as { segment?: { stageSlug?: string } } | null)?.segment?.stageSlug;
      if (stageSlug && !orderOf.has(stageSlug)) orderOf.set(stageSlug, Math.min(...course.activities.filter((x) => (x.lessonPayload as { segment?: { stageSlug?: string } } | null)?.segment?.stageSlug === stageSlug).map((x) => (x as unknown as { order: number }).order)));
    }
    segments.sort((x, y) => (orderOf.get(x.stageSlug) ?? 0) - (orderOf.get(y.stageSlug) ?? 0));
    const current = segments.find((s) => !s.completed) || null;
    return { courseSlug, segments, currentStageSlug: current?.stageSlug || null };
  }
}
