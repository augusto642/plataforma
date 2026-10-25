import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../cache/cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { LlmUsage } from './llm-provider';

/**
 * Sprint 22 — cota diária da tutora + registro de uso do LLM, SEM
 * migration: a cota vive num contador Redis com TTL (janela = dia UTC)
 * e o registro de uso é persistido como evento em `analytics_events`
 * (props JSON), consultável por SQL — o mesmo padrão de agregação por
 * props que o funil já usa para campanhas.
 *
 * COTA (defaults propostos pelo PM no plano B1/B6/B8, pergunta Q5 —
 * CONFIRMADOS pelo Augusto em 2026-10-23; seguem constantes de
 * configuração, ajustáveis por env, não verdade gravada em pedra):
 * - plano free: 20 chamadas LLM/dia por aluno (AI_DAILY_QUOTA_FREE)
 * - plano pro: 200 chamadas LLM/dia por aluno (AI_DAILY_QUOTA_PRO)
 * Acima da cota, a tutora degrada para a heurística ROTULADA — nunca
 * erro para o aluno.
 *
 * Semântica da reserva: INCR atômico antes da chamada; se estourar,
 * DECR e bloqueia; se o provedor falhar, DECR (a falha não consome a
 * cota do aluno). Se o Redis estiver fora, a cota falha ABERTA (a
 * chamada passa, com warn) — a alternativa seria desligar o LLM para
 * todos por uma falha transitória de cache; o kill switch continua
 * sendo a ferramenta de emergência de custo.
 */

export const AI_USAGE_EVENT = 'ai_llm_usage';

/**
 * Consolidação 22+23 — evento de BLOQUEIO da tutora (dívida de
 * observabilidade apontada pelo QA da Sprint 22): chamada que NÃO
 * chegou ao provedor porque a cota estourou ou o kill switch está
 * desligado. É um evento PRÓPRIO, separado do `ai_llm_usage` (que
 * mede gasto real de LLM — chamada bloqueada não gasta token), para
 * os estouros de cota e os períodos de kill switch deixarem de ser
 * invisíveis na analítica. Não altera a semântica da cota nem do
 * estorno: é só registro, no mesmo padrão props JSON dos demais.
 */
export const AI_BLOCKED_EVENT = 'ai_llm_blocked';

export const DEFAULT_DAILY_QUOTA_FREE = 20;
export const DEFAULT_DAILY_QUOTA_PRO = 200;
/**
 * Fase 1 premium — cota do tier Carreira.
 * PROPOSTA do desenho (§1.1), NÃO fato Q5: Q5 confirmou só free=20 e
 * pro=200. O valor 200 (igual ao Pro) vale até decisão contrária do
 * Augusto; ajustável por env (AI_DAILY_QUOTA_CAREER) sem mudar código.
 */
export const DEFAULT_DAILY_QUOTA_CAREER = 200;

export interface QuotaReservation {
  ok: boolean;
  /** Chamadas já feitas hoje (inclui esta, quando ok). */
  used: number;
  limit: number;
  /** true quando o backend de cota falhou e a chamada passou aberta. */
  degraded?: boolean;
}

export interface LlmBlockedRecord {
  userId?: string;
  /** Motivo do bloqueio: 'quota-exceeded' | 'disabled' | 'no-provider'. */
  reason: string;
  /** Plano do aluno, quando houver contexto de usuário. */
  plan?: string;
  /** Superfície que tentou chamar ('hint', 'chat', ...). */
  purpose?: string;
  /** Uso/limite no momento do bloqueio por cota. */
  used?: number;
  limit?: number;
}

export interface LlmUsageRecord {
  userId?: string;
  provider: string;
  model: string;
  /** Superfície que chamou: 'hint' | 'chat' | 'chat-stream' | 'line-feedback' | 'socratic-cat' | ... */
  purpose: string;
  usage?: LlmUsage;
  latencyMs: number;
  outcome: 'success' | 'error';
  errorKind?: string;
}

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly cache?: CacheService,
  ) {}

  quotaLimitForPlan(plan: string | null | undefined): number {
    const envKey =
      plan === 'pro'
        ? 'AI_DAILY_QUOTA_PRO'
        : plan === 'career'
          ? 'AI_DAILY_QUOTA_CAREER'
          : 'AI_DAILY_QUOTA_FREE';
    const fallback =
      plan === 'pro'
        ? DEFAULT_DAILY_QUOTA_PRO
        : plan === 'career'
          ? DEFAULT_DAILY_QUOTA_CAREER
          : DEFAULT_DAILY_QUOTA_FREE;
    const raw = this.config.get<string>(envKey);
    const value = raw !== undefined && raw !== '' ? Number(raw) : NaN;
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
  }

  private dayKey(userId: string, now = new Date()): { key: string; ttlSeconds: number } {
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const endOfDay = Date.UTC(yyyy, now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);
    const ttlSeconds = Math.max(60, Math.ceil((endOfDay - now.getTime()) / 1000) + 3600);
    return { key: `ai:quota:${userId}:${yyyy}${mm}${dd}`, ttlSeconds };
  }

  /** Reserva 1 chamada da cota do aluno para hoje. */
  async reserve(userId: string, plan: string | null | undefined): Promise<QuotaReservation> {
    const limit = this.quotaLimitForPlan(plan);
    if (!this.cache) {
      return { ok: true, used: 0, limit, degraded: true };
    }
    const { key, ttlSeconds } = this.dayKey(userId);
    try {
      const used = await this.cache.increment(key, ttlSeconds);
      if (used > limit) {
        await this.cache.decrement(key).catch(() => undefined);
        return { ok: false, used: used - 1, limit };
      }
      return { ok: true, used, limit };
    } catch (err) {
      this.logger.warn(
        `AI quota backend unavailable; failing open (user=${userId}): ${(err as Error)?.message || err}`,
      );
      return { ok: true, used: 0, limit, degraded: true };
    }
  }

  /** Estorna uma reserva (o provedor falhou: a falha não é cobrada). */
  async refund(userId: string): Promise<void> {
    if (!this.cache) return;
    const { key } = this.dayKey(userId);
    try {
      await this.cache.decrement(key);
    } catch (err) {
      this.logger.warn(
        `AI quota refund failed (user=${userId}): ${(err as Error)?.message || err}`,
      );
    }
  }

  /**
   * Persiste o uso de uma chamada (tokens, modelo, latência) como
   * evento consultável + log estruturado. NUNCA lança: telemetria não
   * pode derrubar a resposta da tutora.
   */
  async recordUsage(record: LlmUsageRecord): Promise<void> {
    this.logger.log(
      `ai_llm_usage ${JSON.stringify({
        provider: record.provider,
        model: record.model,
        purpose: record.purpose,
        userId: record.userId ?? null,
        promptTokens: record.usage?.promptTokens ?? null,
        completionTokens: record.usage?.completionTokens ?? null,
        totalTokens: record.usage?.totalTokens ?? null,
        thoughtsTokens: record.usage?.thoughtsTokens ?? null,
        latencyMs: record.latencyMs,
        outcome: record.outcome,
        errorKind: record.errorKind ?? null,
      })}`,
    );

    if (!this.prisma) return;
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          event: AI_USAGE_EVENT,
          props: {
            schemaVersion: 1,
            userId: record.userId ?? null,
            provider: record.provider,
            model: record.model,
            purpose: record.purpose,
            promptTokens: record.usage?.promptTokens ?? null,
            completionTokens: record.usage?.completionTokens ?? null,
            totalTokens: record.usage?.totalTokens ?? null,
            thoughtsTokens: record.usage?.thoughtsTokens ?? null,
            latencyMs: record.latencyMs,
            outcome: record.outcome,
            errorKind: record.errorKind ?? null,
          },
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to persist ai_llm_usage event: ${(err as Error)?.message || err}`,
      );
    }
  }

  /**
   * Persiste um BLOQUEIO (cota estourada / kill switch / sem
   * provedor) como evento `ai_llm_blocked` + log estruturado.
   * NUNCA lança: telemetria não pode derrubar a resposta da tutora.
   */
  async recordBlocked(record: LlmBlockedRecord): Promise<void> {
    this.logger.warn(
      `ai_llm_blocked ${JSON.stringify({
        reason: record.reason,
        userId: record.userId ?? null,
        plan: record.plan ?? null,
        purpose: record.purpose ?? null,
        used: record.used ?? null,
        limit: record.limit ?? null,
      })}`,
    );

    if (!this.prisma) return;
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          event: AI_BLOCKED_EVENT,
          props: {
            schemaVersion: 1,
            userId: record.userId ?? null,
            reason: record.reason,
            plan: record.plan ?? null,
            purpose: record.purpose ?? null,
            used: record.used ?? null,
            limit: record.limit ?? null,
          },
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to persist ai_llm_blocked event: ${(err as Error)?.message || err}`,
      );
    }
  }

  /**
   * Consulta administrativa do gasto de um dia UTC (yyyy-mm-dd):
   * soma dos tokens e contagem de chamadas gravadas em
   * analytics_events. É a "consulta de gasto diário" do plano — sem
   * painel novo.
   */
  async getDailyUsageTotals(dayUtc: string): Promise<{
    calls: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    thoughtsTokens: number;
  }> {
    if (!this.prisma) {
      return { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, thoughtsTokens: 0 };
    }
    const rows = await this.prisma.$queryRaw<
      Array<{
        calls: number;
        prompt_tokens: number | null;
        completion_tokens: number | null;
        total_tokens: number | null;
        thoughts_tokens: number | null;
      }>
    >`
      SELECT COUNT(*)::int AS calls,
             COALESCE(SUM((props ->> 'promptTokens')::int), 0)::int AS prompt_tokens,
             COALESCE(SUM((props ->> 'completionTokens')::int), 0)::int AS completion_tokens,
             COALESCE(SUM((props ->> 'totalTokens')::int), 0)::int AS total_tokens,
             COALESCE(SUM((props ->> 'thoughtsTokens')::int), 0)::int AS thoughts_tokens
      FROM analytics_events
      WHERE event = ${AI_USAGE_EVENT}
        AND created_at >= (${dayUtc}::date)
        AND created_at < (${dayUtc}::date + INTERVAL '1 day')
    `;
    const row = rows[0];
    return {
      calls: row?.calls ?? 0,
      promptTokens: row?.prompt_tokens ?? 0,
      completionTokens: row?.completion_tokens ?? 0,
      totalTokens: row?.total_tokens ?? 0,
      thoughtsTokens: row?.thoughts_tokens ?? 0,
    };
  }
}
