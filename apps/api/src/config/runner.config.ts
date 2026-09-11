export interface RunnerConfig {
  url: string;
  timeoutMs: number;
  maxOutputChars: number;
}

export const PISTON_DEFAULT_URL = 'http://piston:2000';
export const PISTON_DEFAULT_TIMEOUT_MS = 30_000;
export const PISTON_DEFAULT_MAX_OUTPUT_CHARS = 4096;

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
  };
}