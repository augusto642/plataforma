import { API_BASE } from './apiClient';

/**
 * OAuth 2.0 (Google/GitHub) — helpers do front.
 *
 * - `oauthLoginUrl(provider)`: URL da API que inicia o fluxo (o botão é
 *   um link comum: o navegador vai à API, o guard redireciona ao provedor
 *   e o callback volta com os cookies httpOnly já gravados).
 * - `oauthErrorMessage(code)`: mensagem em pt-BR para o `?oauth_error=`
 *   que o callback devolve no redirect de falha (ver
 *   `apps/api/src/auth/oauth-callback.filter.ts`).
 */

export type OAuthProviderId = 'google' | 'github';

export function oauthLoginUrl(provider: OAuthProviderId): string {
  return `${API_BASE}/auth/${provider}`;
}

export const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_unavailable:
    'O login com essa conta ainda não está configurado. Entre com e-mail e senha.',
  email_required:
    'O provedor não informou um e-mail para esta conta. Use uma conta com e-mail ou entre com e-mail e senha.',
  email_unverified:
    'O e-mail desta conta ainda não foi verificado no provedor. Confirme o e-mail e tente novamente.',
  github_emails_unavailable:
    'Não foi possível ler seu e-mail do GitHub agora. Tente novamente em instantes.',
  oauth_failed:
    'Não foi possível entrar com essa conta. Tente novamente ou entre com e-mail e senha.',
};

export function oauthErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return OAUTH_ERROR_MESSAGES[code] ?? OAUTH_ERROR_MESSAGES.oauth_failed;
}
