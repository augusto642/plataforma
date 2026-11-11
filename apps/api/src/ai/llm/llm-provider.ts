/**
 * Sprint 22 (B8 ampliada) — camada de provedor de LLM da tutora.
 *
 * A tutora NÃO fala mais com um provedor só: ela consome a interface
 * `LlmProvider` e cada provedor é um adaptador que traduz o MESMO
 * pedido (mensagens de chat) para o formato do seu serviço:
 *
 * - `GeminiProvider` — API nativa do Google Gemini (generateContent);
 * - `OpenAiCompatibleProvider` — qualquer endpoint que fale a API de
 *   chat da OpenAI por URL configurável: a própria OpenAI, provedores
 *   compatíveis e MODELOS LOCAIS servidos por Ollama / LM Studio
 *   (que expõem endpoints OpenAI-compatíveis, sem chave).
 *
 * Trocar de provedor/modelo é configuração (env), nunca código nos
 * consumidores (AiService, LineFeedbackService, SocraticCatService).
 */

export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  /**
   * Tokens de "raciocínio" (thought tokens) — modelos Gemini 3.x os
   * gastam por padrão mesmo em prompts curtos; entram na conta e por
   * isso são medidos à parte (ver thinking budget no adaptador Gemini).
   */
  thoughtsTokens?: number;
}

export interface LlmCompletionRequest {
  messages: LlmChatMessage[];
  /** response_format json_object (ou equivalente do provedor). */
  jsonMode?: boolean;
  /** Sobrescreve o timeout (ms). */
  timeoutMs?: number;
}

export interface LlmCompletionResult {
  content: string;
  model: string;
  usage?: LlmUsage;
}

export interface LlmProvider {
  /** Identificador estável do provedor: 'gemini' | 'openai-compatible'. */
  readonly id: string;
  /** Modelo efetivo que o adaptador vai chamar. */
  readonly model: string;
  complete(req: LlmCompletionRequest): Promise<LlmCompletionResult>;
  stream(req: LlmCompletionRequest): AsyncGenerator<string, void, unknown>;
}

export type LlmErrorKind =
  | 'unavailable'
  | 'timeout'
  | 'network'
  | 'upstream'
  | 'invalid-response'
  /**
   * O MODELO não existe mais para esta conta (404 "no longer
   * available" / model not found): é sinal de modelo aposentado — a
   * correção é TROCAR O MODELO por configuração, não mexer na
   * credencial. Distinguir isto de erro de autenticação (401/403) é o
   * que evita depurar a chave quando o problema é o catálogo do
   * provedor (validação viva de 2026-10-22: a família 2.5 aparece na
   * listagem da conta mas a geração retorna 404).
   */
  | 'model-unavailable';

/**
 * Classifica um erro HTTP do provedor a partir do status e do corpo
 * (o corpo é lido SÓ para classificar — nunca é ecoado em mensagens de
 * erro nem em logs, pois pode conter detalhes do upstream).
 */
export function classifyHttpErrorKind(
  status: number,
  bodyText: string | null | undefined,
): LlmErrorKind {
  if (status === 404) {
    const body = (bodyText || '').toLowerCase();
    if (
      body.includes('no longer available') ||
      body.includes('not found') ||
      body.includes('not_found') ||
      body.includes('does not exist')
    ) {
      return 'model-unavailable';
    }
  }
  return 'upstream';
}

/**
 * Erro tipado da camada de provedor. Nunca carrega a chave de API nem o
 * corpo bruto do upstream na mensagem (regra herdada do antigo
 * LlmClient, finding de AppSec).
 */
export class LlmRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
    readonly kind: LlmErrorKind = status ? 'upstream' : 'network',
  ) {
    super(message);
    this.name = 'LlmRequestError';
  }
}

/**
 * A cota diária do aluno estourou: o gateway lança este erro ANTES de
 * chamar o provedor. Os consumidores o tratam como os demais erros do
 * LLM (caem para a heurística), mas o `reason` permite rotular a
 * resposta com o motivo verdadeiro ('quota-exceeded').
 */
export class LlmQuotaExceededError extends LlmRequestError {
  readonly reason = 'quota-exceeded' as const;

  constructor(
    readonly used: number,
    readonly limit: number,
  ) {
    super(
      `Daily LLM quota exceeded (${used}/${limit})`,
      undefined,
      false,
      'unavailable',
    );
    this.name = 'LlmQuotaExceededError';
  }
}

/**
 * M17 (Lote 4) — o BACKEND da cota (Redis) está indisponível: o
 * gateway NÃO pode saber se o aluno ainda tem cota, então a reserva
 * FALHA FECHADA — nenhuma chamada ao provedor acontece. Erro
 * distinto de `LlmQuotaExceededError` de propósito: a cota NÃO
 * estourou, o aluno não deve ler "cota esgotada" nem a analítica
 * deve contar um estouro que não houve. Os consumidores caem na
 * heurística rotulada com o motivo verdadeiro ('quota-unavailable'),
 * como nos demais erros do LLM.
 */
export class LlmQuotaUnavailableError extends LlmRequestError {
  readonly reason = 'quota-unavailable' as const;

  constructor() {
    super(
      'AI quota backend unavailable; failing closed (no LLM call made)',
      undefined,
      false,
      'unavailable',
    );
    this.name = 'LlmQuotaUnavailableError';
  }
}

export type LlmUnavailableReason =
  | 'disabled'
  | 'no-provider'
  | 'quota-exceeded'
  | 'quota-unavailable'
  | 'provider-error';

/** De onde veio a resposta que o aluno recebeu. */
export type TutorResponseSource = 'llm' | 'heuristic';

export const RETRYABLE_STATUS = (status: number) =>
  status === 429 || status >= 500;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
