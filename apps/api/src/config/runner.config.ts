export interface RunnerConfig {
  url: string;
  /**
   * M7 (Lote 4) — TIMEOUT CANÔNICO DO PISTON. `timeoutMs`
   * (`PISTON_TIMEOUT_MS`, default 30 s) é o ÚNICO valor de timeout de
   * execução: `run_timeout`, `run_cpu_time`, `compile_timeout` e
   * `compile_cpu_time` derivam dele (`runner.service.ts`). Antes, os
   * valores divergiam sem motivo documentado: run <= 15 s, compile 10 s,
   * HTTP 30 s.
   *
   * DECISÃO ABERTA DO AUGUSTO (não adivinhada): o limite real do Piston
   * (5 s/256 MB vs 15 s/512 MB). O default de 30 s é o valor já
   * configurado aqui antes do Lote 4, mantido como canônico até ele
   * decidir. Quando decidir, basta trocar `PISTON_TIMEOUT_MS` — o
   * teto por execução (`run_timeout`) e o de compilação passam a
   * respeitá-lo juntos, sem tocar no código.
   */
  timeoutMs: number;
  maxOutputChars: number;
  /** M7 — falhas consecutivas de transporte/5xx que abrem o circuito. */
  breakerFailureThreshold: number;
  /** M7 — tempo com o circuito aberto antes do trial half-open. */
  breakerOpenMs: number;
  /**
   * M7 — folga de transporte somada ao timeout HTTP (não é timeout de
   * execução): sem ela, o AbortController poderia cortar a resposta do
   * Piston no instante exato em que ele mata a execução e responde,
   * transformando um `timeout` limpo em `sandbox_unavailable`.
   */
  httpGraceMs: number;
}

export const PISTON_DEFAULT_URL = 'http://piston:2000';
export const PISTON_DEFAULT_TIMEOUT_MS = 30_000;
export const PISTON_DEFAULT_MAX_OUTPUT_CHARS = 4096;
export const PISTON_DEFAULT_BREAKER_FAILURE_THRESHOLD = 5;
export const PISTON_DEFAULT_BREAKER_OPEN_MS = 30_000;
export const PISTON_DEFAULT_HTTP_GRACE_MS = 2_000;

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  varName: string,
): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `Invalid ${varName}: expected a positive integer, got "${value}"`,
    );
  }
  return Math.floor(parsed);
}

export function buildRunnerConfig(
  env: Record<string, string | undefined>,
): RunnerConfig {
  const rawUrl = (env.PISTON_URL || PISTON_DEFAULT_URL).trim();
  if (!rawUrl) {
    throw new Error('Invalid PISTON_URL: must not be empty');
  }
  return {
    url: rawUrl.replace(/\/+$/, ''),
    timeoutMs: parsePositiveInt(
      env.PISTON_TIMEOUT_MS,
      PISTON_DEFAULT_TIMEOUT_MS,
      'PISTON_TIMEOUT_MS',
    ),
    maxOutputChars: parsePositiveInt(
      env.PISTON_MAX_OUTPUT_CHARS,
      PISTON_DEFAULT_MAX_OUTPUT_CHARS,
      'PISTON_MAX_OUTPUT_CHARS',
    ),
    breakerFailureThreshold: parsePositiveInt(
      env.PISTON_BREAKER_FAILURE_THRESHOLD,
      PISTON_DEFAULT_BREAKER_FAILURE_THRESHOLD,
      'PISTON_BREAKER_FAILURE_THRESHOLD',
    ),
    breakerOpenMs: parsePositiveInt(
      env.PISTON_BREAKER_OPEN_MS,
      PISTON_DEFAULT_BREAKER_OPEN_MS,
      'PISTON_BREAKER_OPEN_MS',
    ),
    httpGraceMs: parsePositiveInt(
      env.PISTON_HTTP_GRACE_MS,
      PISTON_DEFAULT_HTTP_GRACE_MS,
      'PISTON_HTTP_GRACE_MS',
    ),
  };
}
