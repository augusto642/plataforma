import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Cliente HTTP interno único para chamadas ao LLM (finding CRÍTICO — AppSec):
 * antes cada serviço chamava `fetch` sem timeout nem retry — um provedor
 * lento/indisponível pendurava workers indefinidamente (inclusive o reader
 * do streaming SSE).
 *
 * Garantias:
 * - Timeout por requisição (default 30s, env AI_TIMEOUT_MS).
 * - 1 retry com backoff exponencial apenas para 429/5xx e erros de rede.
 * - Streaming com idle-timeout: o reader é abortado se nenhum chunk chegar
 *   dentro da janela (não pendura indefinidamente).
 * - Nunca vaza a API key nem o corpo bruto do upstream nas mensagens de erro.
 */

export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmRequestOptions {
  messages: LlmChatMessage[];
  /** Default: AI_MODEL ou 'gemini-2.0-flash'. */
  model?: string;
  /** Default: AI_API_URL ou endpoint OpenAI-compat do Gemini. */
  apiUrl?: string;
  /** response_format json_object. */
  jsonMode?: boolean;
  /** Sobrescreve o timeout (ms). */
  timeoutMs?: number;
  /** stream: true no payload. */
  stream?: boolean;
}

export class LlmRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'LlmRequestError';
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const RETRYABLE_STATUS = (status: number) => status === 429 || status >= 500;

@Injectable()
export class LlmClient {
  private readonly logger = new Logger(LlmClient.name);

  constructor(private readonly config: ConfigService) {}

  get apiKey(): string {
    return this.config.get<string>('AI_API_KEY') || '';
  }

  get hasApiKey(): boolean {
    return Boolean(this.apiKey);
  }

  private get timeoutMs(): number {
    const value = Number(this.config.get('AI_TIMEOUT_MS', DEFAULT_TIMEOUT_MS));
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
  }

  private buildBody(opts: LlmRequestOptions): string {
    const payload: Record<string, unknown> = {
      model:
        opts.model || this.config.get<string>('AI_MODEL', 'gemini-2.0-flash'),
      messages: opts.messages,
    };
    if (opts.jsonMode) {
      payload.response_format = { type: 'json_object' };
    }
    if (opts.stream) {
      payload.stream = true;
    }
    return JSON.stringify(payload);
  }

  private resolveUrl(opts: LlmRequestOptions): string {
    return opts.apiUrl || this.config.get<string>('AI_API_URL') || DEFAULT_API_URL;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Chat completion não-streaming. Retorna o conteúdo textual
   * (choices[0].message.content). Lança LlmRequestError em falha definitiva.
   */
  async complete(opts: LlmRequestOptions): Promise<string> {
    const url = this.resolveUrl(opts);
    const timeout = opts.timeoutMs ?? this.timeoutMs;
    const body = this.buildBody(opts);
    const maxAttempts = 2; // 1 tentativa + 1 retry

    let lastError: LlmRequestError | null = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await this.sleep(500 * 2 ** (attempt - 1)); // backoff: 500ms
      }
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body,
          signal: AbortSignal.timeout(timeout),
        });

        if (!res.ok) {
          const retryable = RETRYABLE_STATUS(res.status);
          lastError = new LlmRequestError(
            `LLM request failed with status ${res.status}`,
            res.status,
            retryable,
          );
          if (retryable && attempt < maxAttempts - 1) {
            this.logger.warn(
              `LLM upstream ${res.status} (tentativa ${attempt + 1}/${maxAttempts}); retrying...`,
            );
            continue;
          }
          throw lastError;
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content !== 'string') {
          throw new LlmRequestError('LLM response missing message content');
        }
        return content;
      } catch (err) {
        if (err instanceof LlmRequestError) {
          if (err.retryable && attempt < maxAttempts - 1) {
            lastError = err;
            continue;
          }
          throw err;
        }
        // Timeout (AbortError) ou erro de rede: retryable
        lastError = new LlmRequestError('LLM request timed out or network error', undefined, true);
        if (attempt < maxAttempts - 1) {
          this.logger.warn(
            `LLM request failed (${(err as Error)?.name || 'error'}) (tentativa ${attempt + 1}/${maxAttempts}); retrying...`,
          );
          continue;
        }
        throw lastError;
      }
    }
    throw lastError ?? new LlmRequestError('LLM request failed');
  }

  /**
   * Chat completion com streaming SSE. Emite os deltas de conteúdo
   * (choices[0].delta.content). Usa idle-timeout: se nenhum byte chegar
   * dentro de `timeoutMs`, a conexão é abortada e LlmRequestError é lançado.
   */
  async *stream(opts: LlmRequestOptions): AsyncGenerator<string, void, unknown> {
    const url = this.resolveUrl(opts);
    const timeout = opts.timeoutMs ?? this.timeoutMs;
    const body = this.buildBody({ ...opts, stream: true });
    const maxAttempts = 2;

    let res: Response | null = null;
    let controller: AbortController | null = null;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const clearIdle = () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    };

    try {
      let lastError: LlmRequestError | null = null;
      for (let attempt = 0; attempt < maxAttempts && !res; attempt++) {
        if (attempt > 0) {
          await this.sleep(500 * 2 ** (attempt - 1));
        }
        controller = new AbortController();
        clearIdle();
        idleTimer = setTimeout(() => controller?.abort(), timeout);
        try {
          const candidate = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
            },
            body,
            signal: controller.signal,
          });

          if (!candidate.ok) {
            const retryable = RETRYABLE_STATUS(candidate.status);
            lastError = new LlmRequestError(
              `LLM stream failed with status ${candidate.status}`,
              candidate.status,
              retryable,
            );
            if (retryable && attempt < maxAttempts - 1) {
              this.logger.warn(
                `LLM stream upstream ${candidate.status} (tentativa ${attempt + 1}/${maxAttempts}); retrying...`,
              );
              continue;
            }
            throw lastError;
          }
          if (!candidate.body) {
            throw new LlmRequestError('LLM stream response has no body');
          }
          res = candidate;
        } catch (err) {
          if (err instanceof LlmRequestError) {
            if (err.retryable && attempt < maxAttempts - 1) {
              lastError = err;
              continue;
            }
            throw err;
          }
          lastError = new LlmRequestError('LLM stream timed out or network error', undefined, true);
          if (attempt < maxAttempts - 1) {
            this.logger.warn(
              `LLM stream failed (${(err as Error)?.name || 'error'}) (tentativa ${attempt + 1}/${maxAttempts}); retrying...`,
            );
            continue;
          }
          throw lastError;
        }
      }

      if (!res || !res.body) {
        throw new LlmRequestError('LLM stream unavailable');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        // Reagenda o idle-timeout a cada loop; o abort dispara se reader.read()
        // pendurar sem dados.
        clearIdle();
        idleTimer = setTimeout(() => controller?.abort(), timeout);

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (typeof delta === 'string' && delta) {
              yield delta;
            }
          } catch {
            // Linha SSE parcial/inválida: ignora e segue o stream
          }
        }
      }
    } catch (err) {
      if (err instanceof LlmRequestError) {
        throw err;
      }
      // AbortError do idle-timeout ou erro de rede no meio do stream
      throw new LlmRequestError('LLM stream timed out or connection failed');
    } finally {
      clearIdle();
      controller?.abort();
    }
  }
}
