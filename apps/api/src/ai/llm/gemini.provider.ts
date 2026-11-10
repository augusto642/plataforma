import { Logger } from '@nestjs/common';
import {
  LlmChatMessage,
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
 * Adaptador Gemini NATIVO: fala com a API generateContent do Google
 * (formato próprio do Gemini — contents/parts, systemInstruction,
 * usageMetadata), NÃO com o endpoint OpenAI-compatível. É a prova de
 * que a camada de provedor abstrai formatos de fio diferentes atrás da
 * mesma interface.
 *
 * Autenticação: header `x-goog-api-key` (a chave nunca vai em URL, log
 * ou mensagem de erro). Mesma disciplina de transporte do adaptador
 * OpenAI-compatível: timeout, 1 retry com backoff em 429/5xx e rede,
 * streaming SSE com idle-timeout.
 */
export interface GeminiConfig {
  /** Base da API, ex.: https://generativelanguage.googleapis.com/v1beta */
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  /**
   * Teto de tokens de raciocínio (thinking budget) por chamada.
   * Modelos Gemini 3.x gastam "thought tokens" POR PADRÃO — numa
   * validação viva, um prompt de 9 tokens gastou 57 só de raciocínio.
   * Para as dicas curtas da tutora isso é custo sem benefício: o
   * default do gateway é enxuto e o valor é configurável
   * (AI_GEMINI_THINKING_BUDGET). `undefined` = não enviar o campo
   * (o modelo decide sozinho).
   */
  thinkingBudget?: number;
}

const MAX_ATTEMPTS = 2;

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export class GeminiProvider implements LlmProvider {
  readonly id = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);

  constructor(private readonly cfg: GeminiConfig) {}

  get model(): string {
    return this.cfg.model;
  }

  private endpoint(action: 'generateContent' | 'streamGenerateContent'): string {
    const base = this.cfg.baseUrl.replace(/\/+$/, '');
    const streamSuffix = action === 'streamGenerateContent' ? '?alt=sse' : '';
    return `${base}/models/${this.cfg.model}:${action}${streamSuffix}`;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-goog-api-key': this.cfg.apiKey,
    };
  }

  /**
   * Mensagens de chat → formato Gemini: `system` vira systemInstruction;
   * `user`/`assistant` viram contents user/model (consecutivas do mesmo
   * papel são fundidas em um content com várias parts).
   */
  private buildBody(req: LlmCompletionRequest): string {
    const systemTexts: string[] = [];
    const contents: GeminiContent[] = [];

    for (const msg of req.messages as LlmChatMessage[]) {
      if (msg.role === 'system') {
        systemTexts.push(msg.content);
        continue;
      }
      const role = msg.role === 'assistant' ? 'model' : 'user';
      const last = contents[contents.length - 1];
      if (last && last.role === role) {
        last.parts.push({ text: msg.content });
      } else {
        contents.push({ role, parts: [{ text: msg.content }] });
      }
    }

    const payload: Record<string, unknown> = { contents };
    if (systemTexts.length > 0) {
      payload.systemInstruction = { parts: [{ text: systemTexts.join('\n\n') }] };
    }
    const generationConfig: Record<string, unknown> = {};
    if (req.jsonMode) {
      generationConfig.responseMimeType = 'application/json';
    }
    if (this.cfg.thinkingBudget !== undefined) {
      generationConfig.thinkingConfig = { thinkingBudget: this.cfg.thinkingBudget };
    }
    if (Object.keys(generationConfig).length > 0) {
      payload.generationConfig = generationConfig;
    }
    return JSON.stringify(payload);
  }

  private extractText(data: any): string | null {
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return null;
    const text = parts
      .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
      .join('');
    return text.length > 0 ? text : null;
  }

  private parseUsage(data: any): LlmUsage | undefined {
    const raw = data?.usageMetadata;
    if (!raw || typeof raw !== 'object') return undefined;
    const usage: LlmUsage = {
      promptTokens: numOrUndefined(raw.promptTokenCount),
      completionTokens: numOrUndefined(raw.candidatesTokenCount),
      totalTokens: numOrUndefined(raw.totalTokenCount),
      thoughtsTokens: numOrUndefined(raw.thoughtsTokenCount),
    };
    return usage.promptTokens === undefined &&
      usage.completionTokens === undefined &&
      usage.totalTokens === undefined &&
      usage.thoughtsTokens === undefined
      ? undefined
      : usage;
  }

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const timeout = req.timeoutMs ?? this.cfg.timeoutMs;
    const body = this.buildBody(req);
    const url = this.endpoint('generateContent');

    let lastError: LlmRequestError | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        await sleep(500 * 2 ** (attempt - 1));
      }
      try {
        const res = await fetch(url, {
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
              ? `Gemini model unavailable (404): '${this.cfg.model}' may be retired — change the configured model`
              : `Gemini request failed with status ${res.status}`,
            res.status,
            retryable,
            kind,
          );
          if (retryable && attempt < MAX_ATTEMPTS - 1) {
            this.logger.warn(
              `Gemini upstream ${res.status} (tentativa ${attempt + 1}/${MAX_ATTEMPTS}); retrying...`,
            );
            continue;
          }
          throw lastError;
        }

        const data = await res.json();
        const content = this.extractText(data);
        if (content === null) {
          throw new LlmRequestError(
            'Gemini response missing candidate text',
            undefined,
            false,
            'invalid-response',
          );
        }
        return { content, model: this.cfg.model, usage: this.parseUsage(data) };
      } catch (err) {
        if (err instanceof LlmRequestError) {
          if (err.retryable && attempt < MAX_ATTEMPTS - 1) {
            lastError = err;
            continue;
          }
          throw err;
        }
        lastError = new LlmRequestError(
          'Gemini request timed out or network error',
          undefined,
          true,
          'timeout',
        );
        if (attempt < MAX_ATTEMPTS - 1) {
          this.logger.warn(
            `Gemini request failed (${(err as Error)?.name || 'error'}) (tentativa ${attempt + 1}/${MAX_ATTEMPTS}); retrying...`,
          );
          continue;
        }
        throw lastError;
      }
    }
    throw lastError ?? new LlmRequestError('Gemini request failed');
  }

  async *stream(
    req: LlmCompletionRequest,
  ): AsyncGenerator<string, void, unknown> {
    const timeout = req.timeoutMs ?? this.cfg.timeoutMs;
    const body = this.buildBody(req);
    const url = this.endpoint('streamGenerateContent');

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
          const candidate = await fetch(url, {
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
                ? `Gemini model unavailable (404): '${this.cfg.model}' may be retired — change the configured model`
                : `Gemini stream failed with status ${candidate.status}`,
              candidate.status,
              retryable,
              kind,
            );
            if (retryable && attempt < MAX_ATTEMPTS - 1) {
              this.logger.warn(
                `Gemini stream upstream ${candidate.status} (tentativa ${attempt + 1}/${MAX_ATTEMPTS}); retrying...`,
              );
              continue;
            }
            throw lastError;
          }
          if (!candidate.body) {
            throw new LlmRequestError(
              'Gemini stream response has no body',
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
            'Gemini stream timed out or network error',
            undefined,
            true,
            'timeout',
          );
          if (attempt < MAX_ATTEMPTS - 1) {
            this.logger.warn(
              `Gemini stream failed (${(err as Error)?.name || 'error'}) (tentativa ${attempt + 1}/${MAX_ATTEMPTS}); retrying...`,
            );
            continue;
          }
          throw lastError;
        }
      }

      if (!res || !res.body) {
        throw new LlmRequestError('Gemini stream unavailable', undefined, false, 'unavailable');
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
            const delta = this.extractText(parsed);
            if (delta) {
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
        'Gemini stream timed out or connection failed',
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

function numOrUndefined(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
