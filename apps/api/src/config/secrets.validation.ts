export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export interface RequiredSecretsEnv {
  NODE_ENV?: string;
  JWT_ACCESS_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
  GITEA_ENABLED?: string;
  GITEA_TOKEN?: string;
  GITEA_WEBHOOK_SECRET?: string;
}

const REQUIRED_AUTH_SECRETS = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const;

/**
 * Segredos que precisam de alta entropia (>= 32 chars). Finding BAIXA —
 * AppSec: antes apenas o literal 'change_me' era bloqueado; valores fracos
 * como '123456' passavam. Um segredo de 32+ chars (hex 32 = 128 bits de
 * entropia via `openssl rand -hex 32`) é o mínimo aceitável.
 */
const STRONG_SECRETS = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'GITEA_WEBHOOK_SECRET',
] as const;
const MIN_STRONG_SECRET_LENGTH = 32;

/**
 * Fail-fast validation of required secrets. Pure and sync so it can be unit
 * tested and wired into ConfigModule.forRoot({ validate }).
 * NODE_ENV=test skips the checks entirely (so unit tests can run without env).
 * Non-secret defaults in callers (URLs, org names) are NOT validated here.
 */
export function validateRequiredSecrets(
  env: RequiredSecretsEnv,
): RequiredSecretsEnv {
  if (env.NODE_ENV === 'test') {
    return env;
  }

  const missing: string[] = [];

  for (const key of REQUIRED_AUTH_SECRETS) {
    if (!env[key]) {
      missing.push(key);
    }
  }

  const giteaEnabled = env.GITEA_ENABLED !== 'false';
  if (giteaEnabled) {
    if (!env.GITEA_TOKEN) {
      missing.push('GITEA_TOKEN');
    }
    if (!env.GITEA_WEBHOOK_SECRET) {
      missing.push('GITEA_WEBHOOK_SECRET');
    }
  }

  if (missing.length > 0) {
    throw new ConfigError(
      `Missing required environment variable(s): ${missing.join(', ')}`,
    );
  }

  // Segredos com valor de placeholder conhecido são tão inseguros quanto
  // ausentes (o boot precisa falhar para proteger o operador desatento).
  const placeholder: string[] = [];
  for (const key of [...REQUIRED_AUTH_SECRETS, 'GITEA_WEBHOOK_SECRET'] as const) {
    const value = env[key];
    if (value && /change_me|changeme/i.test(value)) {
      placeholder.push(key);
    }
  }
  if (placeholder.length > 0) {
    throw new ConfigError(
      `Insecure placeholder value for environment variable(s): ${placeholder.join(', ')}. Gere segredos reais (openssl rand -hex).`,
    );
  }

  // Segredos fracos (curtos, ex.: '123456') também são rejeitados.
  const weak: string[] = [];
  for (const key of STRONG_SECRETS) {
    const value = env[key];
    if (value && value.length < MIN_STRONG_SECRET_LENGTH) {
      weak.push(key);
    }
  }
  if (weak.length > 0) {
    throw new ConfigError(
      `Weak secret value for environment variable(s): ${weak.join(', ')} (mínimo de ${MIN_STRONG_SECRET_LENGTH} caracteres). Gere segredos reais (openssl rand -hex 32).`,
    );
  }

  return env;
}
