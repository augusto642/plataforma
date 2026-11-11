import { Logger } from '@nestjs/common';
import {
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProvider,
  LlmRequestError,
  LlmUsage,
  RETRYABLE_STATUS,
  classifyHttpErrorKind,
  sleep,
} from './llm-provider';

/**
 * Adaptador OpenAI-compatível: fala com qualquer endpoint que aceite o
 * formato de chat completions da OpenAI (POST {endpoint}, Bearer,
 * `choices[0].message.content`).
 *
 * Cobre, SÓ por configuração de `endpoint`/`model` (sem código novo):
 * - a API da OpenAI (https://api.openai.com/v1/chat/completions);
 * - provedores compatíveis (endpoint próprio de cada um);
 * - MODELOS LOCAIS: Ollama (http://localhost:11434/v1/chat/completions)
 *   e LM Studio (http://localhost:1234/v1/chat/completions) — nesses,
 *   a chave é vazia/irrelevante e nenhum dado sai da máquina.
 *
 * Disciplina de transporte (herdada do antigo LlmClient, finding
 * CRÍTICO de AppSec): timeout por requisição, 1 retry com backoff só
 * para 429/5xx e erros de rede, streaming com idle-timeout, e a chave
 * NUNCA aparece em mensagens de erro.
 */
export interface OpenAiCompatibleConfig {
  /** URL completa do endpoint de chat completions. */
  endpoint: string;
  /** Pode ser '' para modelos locais sem autenticação. */
  apiKey: string;
  model: string;
  timeoutMs: number;
}

const MAX_ATTEMPTS = 2; // 1 tentativa + 1 retry

export class OpenAiCompatibleProvider implements LlmProvider {
  readonly id = 'openai-compatible';
  private readonly logger = new Logger(OpenAiCompatibleProvider.name);

  constructor(private readonly cfg: OpenAiCompatibleConfig) {}

  get model(): string {
    return this.cfg.model;
  }

  private buildBody(req: LlmCompletionRequest, stream: boolean): string {
    const payload: Record<string, unknown> = {
      model: this.cfg.model,
      messages: req.messages,
    };
    if (req.jsonMode) {
      payload.response_format = { type: 'json_object' };
    }
    if (stream) {
      payload.stream = true;
    }
    return JSON.stringify(payload);
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    // Modelos locais (Ollama/LM Studio) não exigem chave: sem header
    // quando a chave é vazia, em vez de um "Bearer " quebrado.
    if (this.cfg.apiKey) {
      headers.Authorization = `Bearer ${this.cfg.apiKey}`;
    }
    return headers;
  }

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const timeout = req.timeoutMs ?? this.cfg.timeoutMs;
    const body = this.buildBody(req, false);

    let lastError: LlmRequestError | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        await sleep(500 * 2 ** (attempt - 1));
      }
      try {
        const res = await fetch(this.cfg.endpoint, {
          method: 'POST',
          headers: this.headers(),
          body,
          signal: AbortSignal.timeout(timeout),
        });

        if (!res.ok) {
          const retryable = RETRYABLE_STATUS(res.status);
          const kind = classifyHttpErrorKind(
            res.status,
            await res.text().catch(() => null),
          );
          lastError = new LlmRequestError(
            kind === 'model-unavailable'
              ? `LLM model unavailable (404): '${this.cfg.model}' may not exist at this endpoint — change the configured model`
              : `LLM request failed with status ${res.status}`,
            res.status,
            retryable,
            kind,
          );
          if (retryable && attempt < MAX_ATTEMPTS - 1) {
            this.logger.warn(
              `LLM upstream ${res.status} (tentativa ${attempt + 1}/${MAX_ATTEMPTS}); retrying...`,
            );
            continue;
          }
          throw lastError;
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content !== 'string') {
          throw new LlmRequestError(
            'LLM response missing message content',
            undefined,
            false,
            'invalid-response',
          );
        }
        return { content, model: this.cfg.model, usage: parseUsage(data?.usage) };
      } catch (err) {
        if (err instanceof LlmRequestError) {
          if (err.retryable && attempt < MAX_ATTEMPTS - 1) {
            lastError = err;
            continue;
          }
          throw err;
        }
        lastError = new LlmRequestError(
          'LLM request timed out or network error',
          undefined,
          true,
          'timeout',
        );
        if (attempt < MAX_ATTEMPTS - 1) {
          this.logger.warn(
            `LLM request failed (${(err as Error)?.name || 'error'}) (tentativa ${attempt + 1}/${MAX_ATTEMPTS}); retrying...`,
          );
          continue;
        }
        throw lastError;
      }
    }
    throw lastError ?? new LlmRequestError('LLM request failed');
  }

  async *stream(
    req: LlmCompletionRequest,
  ): AsyncGenerator<string, void, unknown> {
    const timeout = req.timeoutMs ?? this.cfg.timeoutMs;
    const body = this.buildBody(req, true);

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
      for (let attempt = 0; attempt < MAX_ATTEMPTS && !res; attempt++) {
        if (attempt > 0) {
          await sleep(500 * 2 ** (attempt - 1));
        }
        controller = new AbortController();
        clearIdle();
        idleTimer = setTimeout(() => controller?.abort(), timeout);
        try {
          const candidate = await fetch(this.cfg.endpoint, {
            method: 'POST',
            headers: this.headers(),
            body,
            signal: controller.signal,
          });

          if (!candidate.ok) {
            const retryable = RETRYABLE_STATUS(candidate.status);
            const kind = classifyHttpErrorKind(
              candidate.status,
              await candidate.text().catch(() => null),
            );
            lastError = new LlmRequestError(
              kind === 'model-unavailable'
                ? `LLM model unavailable (404): '${this.cfg.model}' may not exist at this endpoint — change the configured model`
                : `LLM stream failed with status ${candidate.status}`,
              candidate.status,
              retryable,
              kind,
            );
            if (retryable && attempt < MAX_ATTEMPTS - 1) {
              this.logger.warn(
                `LLM stream upstream ${candidate.status} (tentativa ${attempt + 1}/${MAX_ATTEMPTS}); retrying...`,
              );
              continue;
            }
            throw lastError;
          }
          if (!candidate.body) {
            throw new LlmRequestError(
              'LLM stream response has no body',
              undefined,
              false,
              'invalid-response',
            );
          }
          res = candidate;
        } catch (err) {
          if (err instanceof LlmRequestError) {
            if (err.retryable && attempt < MAX_ATTEMPTS - 1) {
              lastError = err;
              continue;
            }
            throw err;
          }
          lastError = new LlmRequestError(
            'LLM stream timed out or network error',
            undefined,
            true,
            'timeout',
          );
          if (attempt < MAX_ATTEMPTS - 1) {
            this.logger.warn(
              `LLM stream failed (${(err as Error)?.name || 'error'}) (tentativa ${attempt + 1}/${MAX_ATTEMPTS}); retrying...`,
            );
            continue;
          }
          throw lastError;
        }
      }

      if (!res || !res.body) {
        throw new LlmRequestError('LLM stream unavailable', undefined, false, 'unavailable');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
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
      throw new LlmRequestError(
        'LLM stream timed out or connection failed',
        undefined,
        false,
        'timeout',
      );
    } finally {
      clearIdle();
      controller?.abort();
    }
  }
}

function parseUsage(raw: any): LlmUsage | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const usage: LlmUsage = {
    promptTokens: numOrUndefined(raw.prompt_tokens),
    completionTokens: numOrUndefined(raw.completion_tokens),
    totalTokens: numOrUndefined(raw.total_tokens),
  };
  return usage.promptTokens === undefined &&
    usage.completionTokens === undefined &&
    usage.totalTokens === undefined
    ? undefined
    : usage;
}

function numOrUndefined(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
