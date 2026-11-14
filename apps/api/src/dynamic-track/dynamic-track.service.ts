/**
 * Trilha dinâmica v1 (Central 209 — DESIGN D3/D4/D5/D6).
 *
 * - 1 investigação por usuário (userId único): nasce `investigating` no
 *   cadastro (AuthService.register) ou via POST /dynamic-track/me/start
 *   para contas já existentes; o worker a conclui como `ready`/`failed`.
 * - A sugestão é determinística (dynamic-track.rules.ts); sinais de
 *   mercado só viram evidência com score >= 70, fonte, URL e data —
 *   sem fonte, `basis: 'profile-only'` (nunca pesquisa fingida).
 * - E-mail é gancho fail-closed (DESIGN D5): sem SMTP a investigação
 *   continua `ready` com `emailStatus: 'pending-smtp'`.
 * - "Começar minha trilha" resolve via TRACK_TO_COURSE_SLUG e só
 *   oferece o curso se o slug existir no banco (DESIGN D6).
 */
import { ConflictException, HttpException, HttpStatus, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { TRACK_TO_COURSE_SLUG } from '../adaptation/adaptation.rules';
import { ARCHETYPES, TRACK_NAMES, type TrackId } from '../diagnostic/data/quiz-v1';
import { ResearchService } from '../knowledge/research/research.service';
import { MailerService } from '../mail/mailer.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildRationaleText,
  isCareerGoal,
  isSlaOverdue,
  slaDueAtFrom,
  suggestTrack,
  type CareerGoal,
  type ExperienceLevel,
  type MarketEvidenceItem,
  type SuggestionBasis,
  type SuggestionReason,
  type TimeCommitment,
  type TrackSuggestionInput,
} from './dynamic-track.rules';

export const TRACK_INVESTIGATION_QUEUE = 'track-investigation';
export const TRACK_INVESTIGATION_JOB_NAME = 'investigate';
export const TRACK_INVESTIGATION_MAX_ATTEMPTS = 3;
export const TRACK_INVESTIGATION_RETRY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function trackInvestigationJobId(userId: string): string {
  // DIVERGÊNCIA do DESIGN.md (D3): o documento propõe
  // `track-investigation:<userId>`, mas o BullMQ REJEITA `:` em jobId
  // customizado ("Custom Id cannot contain :" — flagrado no e2e local,
  // 2026-11-10: o enqueue falhava e a investigação ficava investigating
  // para sempre). O mesmo formato com `:` existe em track-generation
  // (`track:<slug>:seg:<n>`) e em research-collect — bug latente lá,
  // fora deste escopo. Aqui o separador é `-`: idempotente do mesmo jeito.
  return `track-investigation-${userId}`;
}

export interface TrackProfileSnapshot {
  expLevel?: ExperienceLevel | null;
  timeCommitment?: TimeCommitment | null;
  careerGoal?: CareerGoal | null;
  careerGoals?: CareerGoal[];
  /** Hint da landing (?track=): interesse declarado, não escolha. */
  sourceTrack?: TrackId | null;
  diagnosticTrackId?: TrackId | null;
  primaryTechnology?: string | null;
  hasProgrammedBefore?: boolean | null;
  priorLanguage?: string | null;
  challengeId?: string | null;
  assessmentSource?: string | null;
}

export interface TrackInvestigationView {
  id: string;
  status: 'investigating' | 'ready' | 'failed';
  suggestedTrack: TrackId | null;
  trackName: string | null;
  reasons: SuggestionReason[];
  rationaleText: string | null;
  basis: SuggestionBasis | null;
  marketEvidence: MarketEvidenceItem[];
  slaDueAt: Date;
  overdue: boolean;
  completedAt: Date | null;
  notifiedAt: Date | null;
  emailStatus: string;
  failureReason: string | null;
  /** Curso real que abre a trilha (null quando o slug não existe). */
  startCourse: { slug: string; title: string } | null;
  /** Preferências usadas na investigação (para ajuste/recálculo no app). */
  profilePreferences?: {
    careerGoals: CareerGoal[];
    primaryTechnology: string | null;
  };
  createdAt: Date;
}

export interface InvestigationRow {
  id: string;
  userId: string;
  status: 'investigating' | 'ready' | 'failed';
  profileSnapshot: unknown;
  suggestedTrack: string | null;
  rationale: unknown;
  marketEvidence: unknown;
  slaDueAt: Date;
  completedAt: Date | null;
  notifiedAt: Date | null;
  emailStatus: string;
  failureReason: string | null;
  lastRetryAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** careerTier da conta → nível declarado no cadastro (beginner = sem nível). */
export function careerTierToExpLevel(
  careerTier: string | null | undefined,
): ExperienceLevel | null {
  if (careerTier === 'junior' || careerTier === 'mid' || careerTier === 'senior') {
    return careerTier;
  }
  return null;
}

function parseSnapshot(raw: unknown): TrackProfileSnapshot {
  if (!raw || typeof raw !== 'object') return {};
  const s = raw as Record<string, unknown>;
  const pick = (key: string): string | null =>
    typeof s[key] === 'string' ? (s[key] as string) : null;
  const rawCareerGoal = pick('careerGoal');
  const careerGoals = Array.isArray(s.careerGoals)
    ? s.careerGoals.filter(isCareerGoal)
    : undefined;
  return {
    expLevel: (pick('expLevel') as ExperienceLevel | null) ?? null,
    timeCommitment: (pick('timeCommitment') as TimeCommitment | null) ?? null,
    careerGoal: isCareerGoal(rawCareerGoal) ? rawCareerGoal : null,
    ...(careerGoals !== undefined ? { careerGoals } : {}),
    sourceTrack: (pick('sourceTrack') as TrackId | null) ?? null,
    diagnosticTrackId: (pick('diagnosticTrackId') as TrackId | null) ?? null,
    primaryTechnology: pick('primaryTechnology'),
    hasProgrammedBefore:
      typeof s.hasProgrammedBefore === 'boolean' ? s.hasProgrammedBefore : null,
    priorLanguage: pick('priorLanguage'),
    challengeId: pick('challengeId'),
    assessmentSource: pick('assessmentSource'),
  };
}

function parseRationale(raw: unknown): {
  reasons: SuggestionReason[];
  basis: SuggestionBasis | null;
  researchDocId?: string;
  researchSourcesAvailable?: string[];
  researchSourcesUnavailable?: string[];
} {
  if (!raw || typeof raw !== 'object') return { reasons: [], basis: null };
  const r = raw as Record<string, unknown>;
  return {
    reasons: Array.isArray(r.reasons)
      ? (r.reasons.filter((x) => typeof x === 'string') as SuggestionReason[])
      : [],
    basis:
      r.basis === 'profile-only' || r.basis === 'profile+market'
        ? (r.basis as SuggestionBasis)
        : null,
    researchDocId:
      typeof r.researchDocId === 'string' ? r.researchDocId : undefined,
    researchSourcesAvailable: Array.isArray(r.researchSourcesAvailable)
      ? (r.researchSourcesAvailable.filter((x) => typeof x === 'string') as string[])
      : undefined,
    researchSourcesUnavailable: Array.isArray(r.researchSourcesUnavailable)
      ? (r.researchSourcesUnavailable.filter((x) => typeof x === 'string') as string[])
      : undefined,
  };
}

function parseEvidence(raw: unknown): MarketEvidenceItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is MarketEvidenceItem =>
      !!e && typeof e === 'object' && typeof (e as MarketEvidenceItem).sourceUrl === 'string',
  );
}

@Injectable()
export class DynamicTrackService {
  private readonly logger = new Logger(DynamicTrackService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(TRACK_INVESTIGATION_QUEUE) private readonly queue?: Queue,
    @Optional() private readonly research?: ResearchService,
    @Optional() private readonly mailer?: MailerService,
  ) {}

  // ------------------------------------------------------------------
  // Criação / enfileiramento (idempotente)
  // ------------------------------------------------------------------

  /** Enfileira a investigação (jobId idempotente; existente ⇒ dedupe). */
  async enqueue(userId: string): Promise<{ jobId: string; queued: boolean; deduped: boolean }> {
    const jobId = trackInvestigationJobId(userId);
    if (!this.queue) {
      this.logger.warn(
        `fila ${TRACK_INVESTIGATION_QUEUE} indisponível nesta instância: investigação ${userId} fica investigating até re-enfileiramento manual (POST /dynamic-track/admin/investigations/:id/reenqueue)`,
      );
      return { jobId, queued: false, deduped: false };
    }
    const existing = await this.queue.getJob(jobId);
    if (existing) {
      // Dedupe SÓ enquanto o job está pendente/rodando (mesmo padrão do
      // enqueueSegment de track-generation). Um job TERMINAL (completed /
      // failed) NÃO é duplicata: sem removê-lo, o retry (re-tentativa do
      // aluno ou re-enfileiramento admin) seria engolido pelo dedupe e a
      // investigação ficaria `investigating` para sempre — flagrado no
      // e2e local 2026-11-10.
      const state = await existing.getState().catch(() => 'unknown');
      if (state === 'waiting' || state === 'active' || state === 'delayed') {
        return { jobId, queued: false, deduped: true };
      }
      await existing.remove().catch(() => undefined);
    }
    await this.queue.add(
      TRACK_INVESTIGATION_JOB_NAME,
      { userId },
      {
        jobId,
        attempts: TRACK_INVESTIGATION_MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
    return { jobId, queued: true, deduped: false };
  }

  /**
   * Cria a investigação do cadastro (1 por usuário). Se já existir,
   * devolve a existente sem duplicar nem re-enfileirar à força.
   * Falha de enqueue é logada e NÃO desfaz a criação: a linha fica
   * `investigating` e o endpoint admin de re-enfileiramento cobre o retry.
   */
  async createForUser(
    userId: string,
    snapshot: TrackProfileSnapshot,
  ): Promise<{ investigation: InvestigationRow; queued: boolean; deduped: boolean }> {
    const now = new Date();
    const existing = await this.prisma.trackInvestigation.findUnique({
      where: { userId },
    });
    if (existing) {
      return {
        investigation: existing as InvestigationRow,
        queued: false,
        deduped: true,
      };
    }
    const investigation = (await this.prisma.trackInvestigation.create({
      data: {
        userId,
        status: 'investigating',
        profileSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        slaDueAt: slaDueAtFrom(now),
      },
    })) as InvestigationRow;
    let queued = false;
    let deduped = false;
    try {
      ({ queued, deduped } = await this.enqueue(userId));
    } catch (err) {
      this.logger.error(
        `Falha ao enfileirar investigação de trilha para ${userId}: ${(err as Error).message}. A linha fica investigating; re-enfileirar via admin.`,
      );
    }
    return { investigation, queued, deduped };
  }

  // ------------------------------------------------------------------
  // Leitura (aluno)
  // ------------------------------------------------------------------

  async getMyInvestigation(userId: string): Promise<TrackInvestigationView | null> {
    const row = await this.prisma.trackInvestigation.findUnique({
      where: { userId },
    });
    if (!row) return null;
    return this.toView(row as InvestigationRow);
  }

  /** Entrada para a sugestão: snapshot + diagnóstico mais recente. */
  async resolveSuggestionInput(userId: string): Promise<TrackSuggestionInput> {
    const row = await this.prisma.trackInvestigation.findUnique({
      where: { userId },
    });
    const snapshot = parseSnapshot(row?.profileSnapshot);
    let diagnosticTrackId = snapshot.diagnosticTrackId ?? null;
    if (!diagnosticTrackId) {
      const latest = await this.prisma.diagnosticResult.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      const archetype = latest?.archetype as keyof typeof ARCHETYPES | undefined;
      diagnosticTrackId =
        (archetype && ARCHETYPES[archetype]?.recommendedTrack) ?? null;
    }
    return { ...snapshot, diagnosticTrackId };
  }

  // ------------------------------------------------------------------
  // Início manual (contas já existentes) + seen
  // ------------------------------------------------------------------

  /**
   * POST /dynamic-track/me/start: contas criadas antes da trilha dinâmica.
   * - sem investigação: cria a partir do careerTier + diagnóstico e enfileira;
   * - investigating: devolve a atual (sem duplicar);
   * - ready: devolve a atual (não re-investiga — re-sugestão é follow-up);
   * - failed: 1 re-tentativa a cada 24h (rate-limit honesto, DESIGN D3).
   */
  async startForUser(
    userId: string,
  ): Promise<{ investigation: InvestigationRow; view: TrackInvestigationView; created: boolean }> {
    const existing = (await this.prisma.trackInvestigation.findUnique({
      where: { userId },
    })) as InvestigationRow | null;
    if (existing && existing.status === 'investigating') {
      return {
        investigation: existing,
        view: await this.toView(existing),
        created: false,
      };
    }
    if (existing && existing.status === 'ready') {
      return {
        investigation: existing,
        view: await this.toView(existing),
        created: false,
      };
    }
    if (existing && existing.status === 'failed') {
      const lastRetry = existing.lastRetryAt ?? existing.updatedAt;
      if (
        lastRetry &&
        Date.now() - new Date(lastRetry).getTime() <
          TRACK_INVESTIGATION_RETRY_COOLDOWN_MS
      ) {
        throw new HttpException(
          'A última tentativa de investigação foi há menos de 24 horas. Aguarde para tentar novamente.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      const reset = (await this.prisma.trackInvestigation.update({
        where: { userId },
        data: {
          status: 'investigating',
          suggestedTrack: null,
          rationale: Prisma.JsonNull,
          marketEvidence: Prisma.JsonNull,
          completedAt: null,
          failureReason: null,
          lastRetryAt: new Date(),
          slaDueAt: slaDueAtFrom(new Date()),
        },
      })) as InvestigationRow;
      await this.enqueue(userId).catch((err: Error) => {
        this.logger.error(
          `Falha ao re-enfileirar investigação de trilha para ${userId}: ${err.message}`,
        );
      });
      return { investigation: reset, view: await this.toView(reset), created: false };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { careerTier: true },
    });
    const snapshot: TrackProfileSnapshot = {
      expLevel: careerTierToExpLevel(user?.careerTier ?? null),
      timeCommitment: null,
      careerGoal: null,
      sourceTrack: null,
      diagnosticTrackId: null,
    };
    const { investigation } = await this.createForUser(userId, snapshot);
    return {
      investigation,
      view: await this.toView(investigation),
      created: true,
    };
  }

  /**
   * POST /dynamic-track/me/refresh: recalcula a sugestão com base no perfil
   * atualizado (novos objetivos / tecnologia / resultado diagnóstico mais
   * recente) sem exigir 24h de espera nem duplicar a investigação.
   */
  async refreshForUser(
    userId: string,
    overrides?: {
      careerGoals?: string[];
      primaryTechnology?: string | null;
    },
  ): Promise<TrackInvestigationView> {
    let existing = (await this.prisma.trackInvestigation.findUnique({
      where: { userId },
    })) as InvestigationRow | null;

    if (!existing) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { careerTier: true },
      });
      existing = (await this.prisma.trackInvestigation.create({
        data: {
          userId,
          status: 'investigating',
          profileSnapshot: {
            expLevel: careerTierToExpLevel(user?.careerTier ?? null),
            timeCommitment: null,
            careerGoal: null,
            sourceTrack: null,
            diagnosticTrackId: null,
          } as unknown as Prisma.InputJsonValue,
          slaDueAt: slaDueAtFrom(new Date()),
        },
      })) as InvestigationRow;
    }

    const prevSnapshot = parseSnapshot(existing.profileSnapshot);
    const validOverrideGoals = Array.isArray(overrides?.careerGoals)
      ? Array.from(new Set(overrides.careerGoals.filter(isCareerGoal)))
      : undefined;

    const nextSnapshot: TrackProfileSnapshot = {
      ...prevSnapshot,
      ...(validOverrideGoals !== undefined
        ? {
            careerGoals: validOverrideGoals,
            careerGoal: validOverrideGoals[0] ?? null,
          }
        : {}),
      ...(overrides?.primaryTechnology !== undefined
        ? {
            primaryTechnology: overrides.primaryTechnology?.trim() || null,
          }
        : {}),
    };

    const latestDiagnostic = await this.prisma.diagnosticResult.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const archetype = latestDiagnostic?.archetype as
      | keyof typeof ARCHETYPES
      | undefined;
    const diagnosticTrackId =
      nextSnapshot.diagnosticTrackId ??
      (archetype && ARCHETYPES[archetype]?.recommendedTrack) ??
      null;

    const suggestion = suggestTrack({
      ...nextSnapshot,
      diagnosticTrackId,
    });

    const prevRationale = parseRationale(existing.rationale);
    const evidence = parseEvidence(existing.marketEvidence);
    const basis: SuggestionBasis =
      evidence.length > 0 ? 'profile+market' : 'profile-only';
    const rationale = {
      reasons: suggestion.reasons,
      basis,
      ...(prevRationale.researchDocId
        ? { researchDocId: prevRationale.researchDocId }
        : {}),
      ...(prevRationale.researchSourcesAvailable
        ? { researchSourcesAvailable: prevRationale.researchSourcesAvailable }
        : {}),
      ...(prevRationale.researchSourcesUnavailable
        ? {
            researchSourcesUnavailable:
              prevRationale.researchSourcesUnavailable,
          }
        : {}),
    };

    const updated = (await this.prisma.trackInvestigation.update({
      where: { userId },
      data: {
        status: 'ready',
        profileSnapshot: nextSnapshot as unknown as Prisma.InputJsonValue,
        suggestedTrack: suggestion.track,
        rationale: rationale as unknown as Prisma.InputJsonValue,
        completedAt: existing.completedAt ?? new Date(),
        failureReason: null,
      },
    })) as InvestigationRow;

    return this.toView(updated);
  }

  /** Sincroniza investigação existente quando o aluno conclui o quiz diagnóstico. */
  async syncFromDiagnostic(
    userId: string,
    diagnosticTrackId: TrackId,
  ): Promise<void> {
    const existing = (await this.prisma.trackInvestigation.findUnique({
      where: { userId },
    })) as InvestigationRow | null;
    if (!existing) return;

    const snapshot = {
      ...parseSnapshot(existing.profileSnapshot),
      diagnosticTrackId,
    };
    const suggestion = suggestTrack(snapshot);
    const prevRationale = parseRationale(existing.rationale);
    const evidence = parseEvidence(existing.marketEvidence);
    const basis: SuggestionBasis =
      evidence.length > 0 ? 'profile+market' : 'profile-only';
    const rationale = {
      reasons: suggestion.reasons,
      basis,
      ...(prevRationale.researchDocId
        ? { researchDocId: prevRationale.researchDocId }
        : {}),
    };

    await this.prisma.trackInvestigation.update({
      where: { userId },
      data: {
        status: 'ready',
        profileSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        suggestedTrack: suggestion.track,
        rationale: rationale as unknown as Prisma.InputJsonValue,
        completedAt: existing.completedAt ?? new Date(),
      },
    });
  }

  /** POST /dynamic-track/me/seen: marca notifiedAt (GET não tem efeito colateral). */
  async markSeen(userId: string): Promise<TrackInvestigationView | null> {
    const row = (await this.prisma.trackInvestigation.findUnique({
      where: { userId },
    })) as InvestigationRow | null;
    if (!row) return null;
    if (row.status === 'ready' && !row.notifiedAt) {
      const updated = (await this.prisma.trackInvestigation.update({
        where: { userId },
        data: { notifiedAt: new Date() },
      })) as InvestigationRow;
      return this.toView(updated);
    }
    return this.toView(row);
  }

  // ------------------------------------------------------------------
  // Execução (worker) — o processor só orquestra retry/falha
  // ------------------------------------------------------------------

  /**
   * Executa a investigação: sugere pela regra pura, tenta a coleta de
   * mercado e conclui como `ready`. Erros de pesquisa e de e-mail são
   * fail-closed DENTRO daqui (profile-only / pending-smtp) e nunca
   * derrubam a investigação; outros erros (ex.: banco) propagam para o
   * processor decidir retry × `failed`.
   */
  async runInvestigation(userId: string): Promise<{
    action: 'noop' | 'ready';
    track?: TrackId;
    basis?: SuggestionBasis;
    evidenceCount?: number;
  }> {
    const row = (await this.prisma.trackInvestigation.findUnique({
      where: { userId },
    })) as InvestigationRow | null;
    if (!row || row.status !== 'investigating') {
      return { action: 'noop' };
    }

    const input = await this.resolveSuggestionInput(userId);
    const suggestion = suggestTrack(input);

    // Coleta de mercado (DESIGN D2): reutiliza ResearchService.collect.
    // Sem fonte disponível (hoje: sem chave de busca web — jobs
    // indisponível), segue só com o perfil, com basis 'profile-only'.
    let basis: SuggestionBasis = 'profile-only';
    let evidence: MarketEvidenceItem[] = [];
    let researchDocId: string | undefined;
    let researchSourcesAvailable: string[] | undefined;
    let researchSourcesUnavailable: string[] | undefined;
    try {
      const winnerReason = suggestion.reasons.find((r) =>
        r.startsWith('career-goal:'),
      );
      const primaryGoal = winnerReason
        ? (winnerReason.slice('career-goal:'.length) as CareerGoal)
        : (input.careerGoal ?? input.careerGoals?.[0] ?? null);
      const goal = primaryGoal ?? suggestion.track ?? 'trilha';
      const doc = await this.research?.collect(goal);
      if (doc) {
        researchDocId = doc.id;
        researchSourcesAvailable = doc.sourcesAvailable ?? [];
        researchSourcesUnavailable = doc.sourcesUnavailable ?? [];
        evidence = this.signalsFromResearchDoc(doc, primaryGoal);
        if (evidence.length > 0) basis = 'profile+market';
      }
    } catch (err) {
      this.logger.warn(
        `dynamic-track: coleta de mercado indisponível para ${userId} (${(err as Error).message}) — investigação segue só com o perfil`,
      );
    }

    const rationale = {
      reasons: suggestion.reasons,
      basis,
      ...(researchDocId ? { researchDocId } : {}),
      ...(researchSourcesAvailable ? { researchSourcesAvailable } : {}),
      ...(researchSourcesUnavailable ? { researchSourcesUnavailable } : {}),
    };

    // Persiste os sinais de evidência (dedupe por URL na tabela).
    for (const item of evidence) {
      await this.prisma.marketSignal.upsert({
        where: {
          investigationId_sourceUrl: {
            investigationId: row.id,
            sourceUrl: item.sourceUrl,
          },
        },
        update: { score: item.score },
        create: {
          investigationId: row.id,
          titulo: item.titulo,
          tecnologia: item.tecnologia,
          tipo: item.tipo,
          publishedAt: new Date(item.publishedAt),
          retrievedAt: new Date(item.retrievedAt),
          sourceName: item.sourceName,
          sourceUrl: item.sourceUrl,
          evidencia: item.evidencia ?? null,
          objetivoAfetado: item.objetivoAfetado ?? null,
          passoAfetado: item.passoAfetado ?? null,
          score: item.score,
          isBetaOrRumor: item.isBetaOrRumor ?? false,
        },
      });
    }

    const updated = (await this.prisma.trackInvestigation.update({
      where: { userId },
      data: {
        status: 'ready',
        suggestedTrack: suggestion.track,
        rationale: rationale as unknown as Prisma.InputJsonValue,
        marketEvidence: evidence as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    })) as InvestigationRow;

    // E-mail (DESIGN D5): nunca bloqueia o aluno — qualquer falha vira
    // `pending-smtp` e a investigação continua `ready`.
    await this.notifyReady(userId, updated);

    return {
      action: 'ready',
      track: suggestion.track,
      basis,
      evidenceCount: evidence.length,
    };
  }

  /** Marca a investigação como `failed` (job esgotado — DESIGN D3). */
  async markFailed(userId: string, reason: string): Promise<void> {
    await this.prisma.trackInvestigation.updateMany({
      where: { userId, status: 'investigating' },
      data: { status: 'failed', failureReason: reason },
    });
  }

  // ------------------------------------------------------------------
  // Admin (leitura + re-enfileirar)
  // ------------------------------------------------------------------

  async listInvestigationsAdmin(): Promise<Array<{
    id: string;
    userId: string;
    userEmail: string | null;
    userName: string | null;
    status: string;
    suggestedTrack: string | null;
    rationale: unknown;
    marketEvidence: unknown;
    slaDueAt: Date;
    completedAt: Date | null;
    failureReason: string | null;
    emailStatus: string;
    createdAt: Date;
  }>> {
    const rows = await this.prisma.trackInvestigation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { email: true, name: true } } },
    });
    return rows.map((r: InvestigationRow & { user?: { email: string; name: string } }) => ({
      id: r.id,
      userId: r.userId,
      userEmail: r.user?.email ?? null,
      userName: r.user?.name ?? null,
      status: r.status,
      suggestedTrack: r.suggestedTrack,
      rationale: r.rationale,
      marketEvidence: r.marketEvidence,
      slaDueAt: r.slaDueAt,
      completedAt: r.completedAt,
      failureReason: r.failureReason,
      emailStatus: r.emailStatus,
      createdAt: r.createdAt,
    }));
  }

  async reenqueueAdmin(
    investigationId: string,
  ): Promise<{ investigation: InvestigationRow; queued: boolean; deduped: boolean }> {
    const row = (await this.prisma.trackInvestigation.findUnique({
      where: { id: investigationId },
    })) as InvestigationRow | null;
    if (!row) throw new ConflictException('Investigação não encontrada.');
    if (row.status === 'ready') {
      throw new ConflictException('Investigação já concluída — não há o que re-enfileirar.');
    }
    const reset = (await this.prisma.trackInvestigation.update({
      where: { id: investigationId },
      data: {
        status: 'investigating',
        suggestedTrack: null,
        rationale: Prisma.JsonNull,
        marketEvidence: Prisma.JsonNull,
        completedAt: null,
        failureReason: null,
        slaDueAt: slaDueAtFrom(new Date()),
      },
    })) as InvestigationRow;
    let queued = false;
    let deduped = false;
    try {
      ({ queued, deduped } = await this.enqueue(row.userId));
    } catch (err) {
      this.logger.error(
        `Falha ao re-enfileirar investigação ${investigationId}: ${(err as Error).message}`,
      );
    }
    return { investigation: reset, queued, deduped };
  }

  // ------------------------------------------------------------------
  // Internos
  // ------------------------------------------------------------------

  /**
   * Extrai sinais da pesquisa coletada. DIVERGÊNCIA REGISTRADA (ver
   * relatório): `ResearchService.collect` devolve `market.skills` sem
   * `publishedAt` por skill e sem URL de fonte primária por skill —
   * só `sources: string[]` agregadas e `collectedAt`. A spec last30days
   * §6 EXIGE publishedAt + fonte + URL por sinal e descarta o resto,
   * então nenhum skill vira sinal em v1: a investigação registra o
   * doc de pesquisa no rationale e segue `profile-only`. Quando um
   * provedor de mercado devolver sinais datados e com URL, este método
   * é o ponto de conversão (score via scoreMarketSignal + filtro
   * toMarketEvidence) — sem mudar o contrato do worker.
   */
  private signalsFromResearchDoc(
    doc: {
      market?: { skills?: Array<{ skill?: string; sources?: string[] }> };
    },
    _goal: string | null,
  ): MarketEvidenceItem[] {
    void doc;
    return [];
  }

  /** E-mail de "trilha pronta" — fail-closed, nunca derruba a investigação. */
  private async notifyReady(
    userId: string,
    row: InvestigationRow,
  ): Promise<void> {
    if (!this.mailer) {
      await this.prisma.trackInvestigation.update({
        where: { userId },
        data: { emailStatus: 'pending-smtp' },
      });
      return;
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user) return;
    try {
      await this.mailer.sendTrackReady(
        user.email,
        user.name,
        row.suggestedTrack ? TRACK_NAMES[row.suggestedTrack as TrackId] : 'sua trilha',
      );
      await this.prisma.trackInvestigation.update({
        where: { userId },
        data: { emailStatus: 'sent', emailNotifiedAt: new Date() },
      });
    } catch (err) {
      this.logger.warn(
        `dynamic-track: e-mail de trilha pronta indisponível para ${user.email} (${(err as Error).message}) — investigação continua ready com emailStatus pending-smtp`,
      );
      await this.prisma.trackInvestigation.update({
        where: { userId },
        data: { emailStatus: 'pending-smtp' },
      });
    }
  }

  /** Resolve o curso real que abre a trilha (DESIGN D6). */
  private async resolveStartCourse(
    track: TrackId | null,
  ): Promise<{ slug: string; title: string } | null> {
    if (!track) return null;
    const slug = TRACK_TO_COURSE_SLUG[track];
    if (!slug) return null;
    const course = await this.prisma.course.findUnique({
      where: { slug },
      select: { slug: true, title: true },
    });
    return course ?? null;
  }

  private async toView(row: InvestigationRow): Promise<TrackInvestigationView> {
    const rationale = parseRationale(row.rationale);
    const evidence = parseEvidence(row.marketEvidence);
    const snapshot = parseSnapshot(row.profileSnapshot);
    const track = (row.suggestedTrack as TrackId | null) ?? null;
    const snapshotGoals = Array.from(
      new Set<CareerGoal>([
        ...(snapshot.careerGoal ? [snapshot.careerGoal] : []),
        ...(snapshot.careerGoals ?? []),
      ]),
    );
    return {
      id: row.id,
      status: row.status,
      suggestedTrack: track,
      trackName: track ? TRACK_NAMES[track] : null,
      reasons: rationale.reasons,
      rationaleText:
        row.status === 'ready'
          ? buildRationaleText(rationale.reasons, rationale.basis ?? 'profile-only', {
              primaryTechnology: snapshot.primaryTechnology,
              careerGoals: snapshot.careerGoals,
            })
          : null,
      basis: rationale.basis,
      marketEvidence: evidence,
      slaDueAt: row.slaDueAt,
      overdue:
        row.status === 'investigating' &&
        isSlaOverdue(new Date(), new Date(row.slaDueAt)),
      completedAt: row.completedAt,
      notifiedAt: row.notifiedAt,
      emailStatus: row.emailStatus,
      failureReason: row.failureReason,
      startCourse:
        row.status === 'ready' ? await this.resolveStartCourse(track) : null,
      profilePreferences: {
        careerGoals: snapshotGoals,
        primaryTechnology: snapshot.primaryTechnology ?? null,
      },
      createdAt: row.createdAt,
    };
  }
}
