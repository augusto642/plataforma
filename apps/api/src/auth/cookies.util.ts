/**
 * Utilitários de cookie compartilhados entre auth.controller e jwt.strategy.
 *
 * O fluxo de autenticação é 100% baseado em cookies httpOnly: os tokens
 * NUNCA são expostos no corpo das respostas nem consumidos via body.
 */

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutos
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 1) continue;
    const key = part.slice(0, idx).trim();
    try {
      out[key] = decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      out[key] = part.slice(idx + 1).trim();
    }
  }
  return out;
}

/**
 * Opções de cookie seguras. `sameSite: 'none'` (necessário quando web e API
 * estão em registrable domains diferentes em produção) exige `secure: true`;
 * para dev em localhost (mesmo site, portas distintas) 'lax' basta.
 */
export function cookieOptions(maxAgeMs: number) {
  const sameSiteNone = process.env.COOKIE_SAME_SITE === 'none';
  return {
    httpOnly: true,
    secure: sameSiteNone || process.env.NODE_ENV === 'production',
    sameSite: (sameSiteNone ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: maxAgeMs,
    path: '/',
  };
}
