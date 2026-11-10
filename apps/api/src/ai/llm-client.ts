import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AiUsageService } from './llm/ai-usage.service';
import { GeminiProvider } from './llm/gemini.provider';
import {
  LlmChatMessage,
  LlmProvider,
  LlmQuotaExceededError,
  LlmRequestError,
  LlmUnavailableReason,
} from './llm/llm-provider';
import { OpenAiCompatibleProvider } from './llm/openai-compatible.provider';

export type { LlmChatMessage } from './llm/llm-provider';
export {
  LlmQuotaExceededError,
  LlmRequestError,
} from './llm/llm-provider';
export type {
  LlmUnavailableReason,
  TutorResponseSource,
} from './llm/llm-provider';

/**
 * Sprint 22 (B8 ampliada) — o antigo `LlmClient` virou o GATEWAY da
 * tutora sobre a camada de provedores (`ai/llm/`):
 *
 * - Resolve o provedor ativo SÓ por configuração (nenhum consumidor
 *   muda quando o provedor troca):
 *     AI_PROVIDER=gemini | openai-compatible | none
 *     (sem AI_PROVIDER: AI_API_URL definida ⇒ openai-compatible —
 *      compatibilidade com o .env antigo; senão, gemini)
 * - Kill switch: AI_TUTOR_ENABLED=false desliga o LLM por completo
 *   (a tutora cai na heurística ROTULADA, nunca em erro).
 * - Cota diária por plano (AiUsageService) aplicada quando a chamada
 *   carrega userId; estourar a cota lança LlmQuotaExceededError ANTES
 *   de chamar o provedor — os consumidores caem na heurística com o
 *   motivo verdadeiro ('quota-exceeded').
 * - Registra o uso de cada chamada (tokens/latência/resultado).
 *
 * A interface pública consumida pelos serviços da tutora continua a
 * mesma de antes (complete/stream devolvendo string/deltas): quem muda
 * é o que acontece por baixo.
 */

export interface LlmRequestOptions {
  messages: LlmChatMessage[];
  jsonMode?: boolean;
  timeoutMs?: number;
  /** Aluno dono da chamada — habilita cota e registro de uso. */
  userId?: string;
  /** Superfície chamadora, para o registro de uso ('hint', 'chat'...). */
  purpose?: string;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
/**
 * Default do Gemini: `gemini-3.5-flash-lite` — o modelo PROVADO
 * gerando na conta do Augusto na validação viva de 2026-10-22. As
 * famílias 2.0 (desligada) e 2.5 (404 "no longer available to new
 * users" na geração, apesar de listadas) NÃO servem de default.
 * Tier de qualidade, também provado: `gemini-3.5-flash`
 * (AI_GEMINI_MODEL=gemini-3.5-flash). Como tudo aqui, é configuração —
 * nunca hardcoded nos consumidores.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
/**
 * Thinking budget enxuto para as dicas curtas da tutora: modelos
 * Gemini 3.x gastam thought tokens por padrão; sem teto, cada dica
 * paga raciocínio desnecessário. Configurável via
 * AI_GEMINI_THINKING_BUDGET ('dynamic' = o modelo decide).
 */
export const DEFAULT_GEMINI_THINKING_BUDGET = 128;

@Injectable()
export class LlmClient {
  private readonly logger = new Logger(LlmClient.name);
  private readonly provider: LlmProvider | null;
  private readonly enabled: boolean;
  private readonly planCache = new Map<string, { plan: string; at: number }>();

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly usage?: AiUsageService,
    @Optional() private readonly prisma?: PrismaService,
  ) {
    this.enabled = this.resolveEnabled();
    this.provider = this.enabled ? this.resolveProvider() : null;
    if (!this.enabled) {
      this.logger.warn('AI_TUTOR_ENABLED is off: tutor LLM disabled by kill switch.');
    } else if (!this.provider) {
      this.logger.warn(
        'No LLM provider configured: tutor will use the labeled heuristic fallback.',
      );
    } else {
      this.logger.log(
        `Tutor LLM provider active: ${this.provider.id} (model ${this.provider.model})`,
      );
    }
  }

  // ---------- configuração ----------

  private resolveEnabled(): boolean {
    const raw = (this.config.get<string>('AI_TUTOR_ENABLED') || '').toLowerCase();
    return raw !== 'false' && raw !== '0' && raw !== 'off';
  }

  private get timeoutMs(): number {
    const value = Number(this.config.get('AI_TIMEOUT_MS', DEFAULT_TIMEOUT_MS));
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
  }

  private resolveProviderKind(): 'gemini' | 'openai' | 'none' {
    const explicit = (this.config.get<string>('AI_PROVIDER') || '')
      .trim()
      .toLowerCase();
    if (explicit === 'gemini') return 'gemini';
    if (explicit === 'openai' || explicit === 'openai-compatible') return 'openai';
    if (explicit === 'none') return 'none';
    // Compat: o .env antigo configurava AI_API_URL (OpenAI) sem provider.
    if (this.config.get<string>('AI_API_URL')) return 'openai';
    return 'gemini';
  }

  private resolveGeminiThinkingBudget(): number | undefined {
    const raw = this.config.get<string>('AI_GEMINI_THINKING_BUDGET');
    if (raw === undefined || raw === '') return DEFAULT_GEMINI_THINKING_BUDGET;
    if (raw.toLowerCase() === 'dynamic') return undefined;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0
      ? Math.floor(value)
      : DEFAULT_GEMINI_THINKING_BUDGET;
  }

  private resolveProvider(): LlmProvider | null {
    const kind = this.resolveProviderKind();
    if (kind === 'none') return null;

    if (kind === 'gemini') {
      const apiKey =
        this.config.get<string>('AI_GEMINI_API_KEY') ||
        this.config.get<string>('AI_API_KEY') ||
        '';
      if (!apiKey) return null; // Gemini exige chave: sem ela, sem provedor.
      return new GeminiProvider({
        baseUrl:
          this.config.get<string>('AI_GEMINI_BASE_URL') || DEFAULT_GEMINI_BASE_URL,
        apiKey,
        model:
          this.config.get<string>('AI_GEMINI_MODEL') ||
          this.config.get<string>('AI_MODEL') ||
          DEFAULT_GEMINI_MODEL,
        timeoutMs: this.timeoutMs,
        thinkingBudget: this.resolveGeminiThinkingBudget(),
      });
    }

    // OpenAI-compatível: a própria OpenAI, compatíveis e modelos locais
    // (Ollama/LM Studio) — chave vazia é válida no caso local.
    const baseUrl = this.config.get<string>('AI_OPENAI_BASE_URL');
    const endpoint = baseUrl
      ? `${baseUrl.replace(/\/+$/, '')}/chat/completions`
      : this.config.get<string>('AI_API_URL') ||
        'https://api.openai.com/v1/chat/completions';
    return new OpenAiCompatibleProvider({
      endpoint,
      apiKey:
        this.config.get<string>('AI_OPENAI_API_KEY') ||
        this.config.get<string>('AI_API_KEY') ||
        '',
      model:
        this.config.get<string>('AI_OPENAI_MODEL') ||
        this.config.get<string>('AI_MODEL') ||
        'gpt-4o-mini',
      timeoutMs: this.timeoutMs,
    });
  }

  // ---------- superfície pública ----------

  /** O LLM está utilizável agora? (kill switch ligado + provedor configurado) */
  get isAvailable(): boolean {
    return this.enabled && this.provider !== null;
  }

  /** Por que o LLM não está utilizável (para o rótulo honesto do fallback). */
  get unavailableReason(): LlmUnavailableReason | null {
    if (!this.enabled) return 'disabled';
    if (!this.provider) return 'no-provider';
    return null;
  }

  get providerId(): string | null {
    return this.provider?.id ?? null;
  }

  get model(): string | null {
    return this.provider?.model ?? null;
  }

  /**
   * @deprecated Alias histórico (pré-Sprint 22 a pergunta era "tem
   * chave?"). A pergunta certa hoje é `isAvailable` — um modelo local
   * (Ollama/LM Studio) não tem chave e mesmo assim está disponível.
   */
  get hasApiKey(): boolean {
    return this.isAvailable;
  }

  // A chave de API NÃO é mais exposta pelo gateway (pré-Sprint 22 o
  // antigo cliente a expunha num getter público): ela vive só dentro
  // do adaptador do provedor ativo.

  // ---------- cota ----------

  private async resolvePlan(userId: string): Promise<string> {
    const cached = this.planCache.get(userId);
    if (cached && Date.now() - cached.at < 60_000) return cached.plan;
    let plan = 'free';
    if (this.prisma) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { plan: true },
        });
        if (user?.plan) plan = user.plan;
      } catch {
        // Sem plano legível, vale o MENOR limite (free): default seguro.
      }
    }
    this.planCache.set(userId, { plan, at: Date.now() });
    return plan;
  }

  /** Reserva cota (quando há userId); lança LlmQuotaExceededError se estourou. */
  private async reserveQuota(opts: LlmRequestOptions): Promise<boolean> {
    if (!opts.userId || !this.usage) return false;
    const plan = await this.resolvePlan(opts.userId);
    const reservation = await this.usage.reserve(opts.userId, plan);
    if (!reservation.ok) {
      this.logger.warn(
        `AI daily quota exceeded for user ${opts.userId} (${reservation.used}/${reservation.limit}); tutor degrades to labeled heuristic.`,
      );
      // Observabilidade (consolidação 22+23): o bloqueio por cota
      // ganha evento próprio — sem tocar na semântica da reserva.
      void this.usage.recordBlocked({
        userId: opts.userId,
        reason: 'quota-exceeded',
        plan,
        purpose: opts.purpose,
        used: reservation.used,
        limit: reservation.limit,
      });
      throw new LlmQuotaExceededError(reservation.used, reservation.limit);
    }
    return true;
  }

  /**
   * Registra um bloqueio por indisponibilidade (kill switch
   * desligado ou nenhum provedor configurado) no evento
   * `ai_llm_blocked`. O plano só é resolvido quando há usuário E
   * Prisma — sem os dois, o campo vai nulo em vez de um default
   * fabricado. Nunca lança (o serviço de uso já garante isso).
   */
  private async recordUnavailableBlocked(opts: LlmRequestOptions): Promise<void> {
    if (!this.usage) return;
    const plan =
      opts.userId && this.prisma ? await this.resolvePlan(opts.userId) : undefined;
    void this.usage.recordBlocked({
      userId: opts.userId,
      reason: this.unavailableReason ?? 'no-provider',
      plan,
      purpose: opts.purpose,
    });
  }

  private recordUsage(
    opts: LlmRequestOptions,
    startedAt: number,
    outcome: 'success' | 'error',
    usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number; thoughtsTokens?: number },
    errorKind?: string,
  ): void {
    if (!this.usage || !this.provider) return;
    void this.usage.recordUsage({
      userId: opts.userId,
      provider: this.provider.id,
      model: this.provider.model,
      purpose: opts.purpose || 'unknown',
      usage,
      latencyMs: Date.now() - startedAt,
      outcome,
      errorKind,
    });
  }

  // ---------- chamadas ----------

  async complete(opts: LlmRequestOptions): Promise<string> {
    if (!this.provider) {
      await this.recordUnavailableBlocked(opts);
      throw new LlmRequestError(
        'LLM provider unavailable (disabled or not configured)',
        undefined,
        false,
        'unavailable',
      );
    }
    const startedAt = Date.now();
    const reserved = await this.reserveQuota(opts);
    try {
      const result = await this.provider.complete({
        messages: opts.messages,
        jsonMode: opts.jsonMode,
        timeoutMs: opts.timeoutMs,
      });
      this.recordUsage(opts, startedAt, 'success', result.usage);
      return result.content;
    } catch (err) {
      if (reserved && this.usage && opts.userId) {
        await this.usage.refund(opts.userId);
      }
      const kind = err instanceof LlmRequestError ? err.kind : 'unknown';
      if (kind === 'model-unavailable') {
        this.logger.error(
          `Configured LLM model '${this.provider.model}' is unavailable at provider '${this.provider.id}' (retired?). Change the model configuration — this is not a credential problem.`,
        );
      }
      this.recordUsage(opts, startedAt, 'error', undefined, kind);
      throw err;
    }
  }

  async *stream(opts: LlmRequestOptions): AsyncGenerator<string, void, unknown> {
    if (!this.provider) {
      await this.recordUnavailableBlocked(opts);
      throw new LlmRequestError(
        'LLM provider unavailable (disabled or not configured)',
        undefined,
        false,
        'unavailable',
      );
    }
    const startedAt = Date.now();
    const reserved = await this.reserveQuota(opts);
    let yielded = 0;
    try {
      for await (const delta of this.provider.stream({
        messages: opts.messages,
        jsonMode: opts.jsonMode,
        timeoutMs: opts.timeoutMs,
      })) {
        yielded++;
        yield delta;
      }
      // Streaming não traz usage dos provedores nesta camada: a chamada
      // conta para a cota, mas os tokens ficam sem registro (declarado).
      this.recordUsage(opts, startedAt, 'success', undefined);
    } catch (err) {
      // Falha antes do primeiro delta: a chamada não consumiu nada do
      // aluno — estorna a reserva. Depois do primeiro delta, houve
      // consumo parcial e a reserva fica.
      if (reserved && yielded === 0 && this.usage && opts.userId) {
        await this.usage.refund(opts.userId);
      }
      const kind = err instanceof LlmRequestError ? err.kind : 'unknown';
      if (kind === 'model-unavailable') {
        this.logger.error(
          `Configured LLM model '${this.provider.model}' is unavailable at provider '${this.provider.id}' (retired?). Change the model configuration — this is not a credential problem.`,
        );
      }
      this.recordUsage(opts, startedAt, 'error', undefined, kind);
      throw err;
    }
  }
}
