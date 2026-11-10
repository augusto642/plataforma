import { ConfigService } from '@nestjs/config';
import { ConfigError } from '../config/secrets.validation';

/**
 * OAuth 2.0 real (Google + GitHub) — configuração centralizada.
 *
 * Regras de habilitação (fail-closed):
 * - NENHUMA var do provedor definida → OAuth daquele provedor está
 *   DESABILITADO: o boot segue normal (login por senha intacto) e as rotas
 *   `/auth/<provider>` respondem 503 com mensagem honesta (o guard barra
 *   antes de qualquer redirect ao provedor).
 * - SÓ UMA das duas vars (CLIENT_ID ou CLIENT_SECRET) definida → erro de
 *   configuração: o boot RECUSA subir (ConfigError) e o guard recusa em
 *   runtime. Configuração parcial é pior que ausente — o redirect ao
 *   provedor falharia no meio do fluxo, com o usuário no meio.
 * - Callback URL: `GOOGLE_CALLBACK_URL` / `GITHUB_CALLBACK_URL` quando
 *   definidas; senão o default de dev `http://localhost:3000/auth/<provider>/callback`.
 *   Em produção a URL precisa ser HTTPS e EXATAMENTE a registrada no
 *   provedor (ver docs/oauth-setup.md) — defina a var explícita.
 */

export type OAuthProvider = 'google' | 'github';

/**
 * Perfil normalizado que as strategies entregam ao controller — é o ÚNICO
 * formato que o `AuthService.loginWithOAuth` aceita. `emailVerified` aqui
 * é a afirmação DO PROVEDOR (Google `email_verified`, GitHub e-mail
 * primário + `verified` em /user/emails): conta criada por OAuth nasce
 * com o e-mail verificado (C5 não é furado — o provedor já verificou;
 * conta por senha continua exigindo o código de 6 dígitos).
 */
export interface OAuthProfile {
  provider: OAuthProvider;
  providerId: string;
  email: string | null;
  emailVerified: boolean;
  name: string;
  avatarUrl?: string | null;
}

const PROVIDER_ENV: Record<
  OAuthProvider,
  { clientId: string; clientSecret: string; callbackUrl: string }
> = {
  google: {
    clientId: 'GOOGLE_CLIENT_ID',
    clientSecret: 'GOOGLE_CLIENT_SECRET',
    callbackUrl: 'GOOGLE_CALLBACK_URL',
  },
  github: {
    clientId: 'GITHUB_CLIENT_ID',
    clientSecret: 'GITHUB_CLIENT_SECRET',
    callbackUrl: 'GITHUB_CALLBACK_URL',
  },
};

export function oauthClientId(
  provider: OAuthProvider,
  config: ConfigService,
): string | undefined {
  return config.get<string>(PROVIDER_ENV[provider].clientId);
}

export function oauthClientSecret(
  provider: OAuthProvider,
  config: ConfigService,
): string | undefined {
  return config.get<string>(PROVIDER_ENV[provider].clientSecret);
}

export function isOAuthConfigured(
  provider: OAuthProvider,
  config: ConfigService,
): boolean {
  return Boolean(
    oauthClientId(provider, config) && oauthClientSecret(provider, config),
  );
}

/**
 * Fail-closed no boot (e em runtime, no guard): ID sem secret — ou secret
 * sem ID — derruba a inicialização com o nome da var que falta. Ausência
 * total das duas NÃO é erro (provedor desabilitado, rotas respondem 503).
 */
export function assertOAuthEnvComplete(
  provider: OAuthProvider,
  config: ConfigService,
): void {
  const env = PROVIDER_ENV[provider];
  const id = oauthClientId(provider, config);
  const secret = oauthClientSecret(provider, config);
  if (id && !secret) {
    throw new ConfigError(
      `Missing required environment variable: ${env.clientSecret} (OAuth ${provider} parcialmente configurado: ${env.clientId} definido sem o secret). Defina as duas vars ou nenhuma.`,
    );
  }
  if (!id && secret) {
    throw new ConfigError(
      `Missing required environment variable: ${env.clientId} (OAuth ${provider} parcialmente configurado: ${env.clientSecret} definido sem o client ID). Defina as duas vars ou nenhuma.`,
    );
  }
}

export function oauthCallbackUrl(
  provider: OAuthProvider,
  config: ConfigService,
): string {
  const explicit = config.get<string>(PROVIDER_ENV[provider].callbackUrl);
  if (explicit) return explicit;
  return `http://localhost:3000/auth/${provider}/callback`;
}

/**
 * Base do web app para onde o callback redireciona após o login
 * (sucesso → /dashboard, falha → /login?oauth_error=...). Mesma
 * precedência do billing (`WEB_PUBLIC_URL` → `WEB_URL` → localhost).
 */
export function webAppBaseUrl(config: ConfigService): string {
  return (
    config.get<string>('WEB_PUBLIC_URL') ||
    config.get<string>('WEB_URL') ||
    'http://localhost:3001'
  );
}
