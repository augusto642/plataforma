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
  BILLING_MODE?: string;
  BILLING_PROVIDER?: string;
  BILLING_WEBHOOK_SECRET?: string;
  MP_TEST_ACCESS_TOKEN?: string;
  MP_ACCESS_TOKEN?: string;
  STRIPE_SECRET_KEY?: string;
}

/**
 * Fase 1 premium — travas de cobrança real, fail-closed no boot.
 * - `BILLING_MODE` diferente de `test` (quando explícito) impede o boot:
 *   ativar cobrança real exige decisão explícita do Augusto + revisão,
 *   nunca um "ligar" em runtime.
 * - Chave live de provedor (Mercado Pago `APP_USR-`, Stripe `sk_live_`)
 *   enquanto `BILLING_MODE=test` impede o boot.
 * - Provedor diferente de `simulated` impede o boot: Mercado Pago e
 *   Stripe existem como adapters, mas estão DESATIVADOS até o Augusto
 *   escolher o provedor v1 e as credenciais de teste.
 */
export const BILLING_TEST_MODE_PROVIDERS = ['simulated'] as const;

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
 * C1 (Lote 1 P0) — regras de qualidade do segredo do webhook de billing.
 * Placeholder e segredo fraco (< 32 chars) derrubam o boot — um HMAC
 * fraco é tão inseguro quanto ausente para um segredo que guarda a
 * liberação de plano pago. Centralizado aqui porque a checagem roda em
 * dois caminhos (test e não-test, ver validateRequiredSecrets).
 */
function assertWebhookSecretUsable(value: string): void {
  if (/change_me|changeme/i.test(value)) {
    throw new ConfigError(
      'Insecure placeholder value for environment variable(s): BILLING_WEBHOOK_SECRET. Gere segredos reais (openssl rand -hex).',
    );
  }
  if (value.length < MIN_STRONG_SECRET_LENGTH) {
    throw new ConfigError(
      `Weak secret value for environment variable(s): BILLING_WEBHOOK_SECRET (mínimo de ${MIN_STRONG_SECRET_LENGTH} caracteres). Gere segredos reais (openssl rand -hex 32).`,
    );
  }
}

/**
 * Fail-fast validation of required secrets. Pure and sync so it can be unit
 * tested and wired into ConfigModule.forRoot({ validate }).
 * NODE_ENV=test skips the checks entirely (so unit tests can run without env)
 * — EXCETO `BILLING_WEBHOOK_SECRET` (C1, Lote 1 P0): o segredo do webhook
 * é obrigatório em QUALQUER ambiente, inclusive test, e é verificado
 * ANTES do bypass. Sem ele, o webhook simulado aceitaria eventos sem
 * assinatura e qualquer um liberaria o plano Pro sem pagar.
 * Non-secret defaults in callers (URLs, org names) are NOT validated here.
 */
export function validateRequiredSecrets(
  env: RequiredSecretsEnv,
): RequiredSecretsEnv {
  // C1 (Lote 1 P0) — fail-closed em qualquer ambiente: sem o segredo o
  // boot falha com erro claro. A lista `missing` é agregada para o erro
  // nomear tudo o que falta de uma vez (não um segredo por boot).
  const missing: string[] = [];
  if (!env.BILLING_WEBHOOK_SECRET) {
    missing.push('BILLING_WEBHOOK_SECRET');
  }

  if (env.NODE_ENV === 'test') {
    if (missing.length > 0) {
      throw new ConfigError(
        `Missing required environment variable(s): ${missing.join(', ')}. ` +
          'O segredo do webhook de billing é obrigatório em qualquer ambiente ' +
          '(inclusive test): sem ele, o webhook simulado aceitaria eventos sem ' +
          'assinatura. Gere um com: openssl rand -hex 32.',
      );
    }
    assertWebhookSecretUsable(env.BILLING_WEBHOOK_SECRET as string);
    return env;
  }

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

  // C1 — placeholder/fraco do segredo do webhook no caminho não-test.
  assertWebhookSecretUsable(env.BILLING_WEBHOOK_SECRET as string);

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

  // Fase 1 premium — travas de billing (fail-closed, ver comentário acima).
  const billingMode = env.BILLING_MODE;
  if (billingMode !== undefined && billingMode !== 'test') {
    throw new ConfigError(
      `BILLING_MODE='${billingMode}' não é permitido: cobrança real não está ativada e exige decisão explícita do Augusto. Use BILLING_MODE=test.`,
    );
  }
  const billingProvider = env.BILLING_PROVIDER;
  if (
    billingProvider !== undefined &&
    !(BILLING_TEST_MODE_PROVIDERS as readonly string[]).includes(billingProvider)
  ) {
    throw new ConfigError(
      `BILLING_PROVIDER='${billingProvider}' está desativado: o único provedor ativo em modo teste é 'simulated'. A escolha do provedor v1 é decisão pendente do Augusto.`,
    );
  }
  const liveKeys: string[] = [];
  if (env.MP_ACCESS_TOKEN?.startsWith('APP_USR-')) liveKeys.push('MP_ACCESS_TOKEN');
  if (env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) liveKeys.push('STRIPE_SECRET_KEY');
  if (liveKeys.length > 0) {
    throw new ConfigError(
      `Chave live de provedor de pagamento em modo teste (${liveKeys.join(', ')}): remova-a. Em BILLING_MODE=test só valem chaves de sandbox/teste.`,
    );
  }

  return env;
}
