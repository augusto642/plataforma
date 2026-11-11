import { randomBytes, timingSafeEqual } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCodes, withErrorCode } from '../common/errors/error-codes';
import { cookieOptions, parseCookies } from './cookies.util';

/**
 * D1 (QA — ALTO) — `state` anti-CSRF do OAuth, com verificação
 * server-side, sem sessão.
 *
 * Por que NÃO o `state` nativo do Passport: `passport-oauth2` com
 * `state: true` guarda o valor esperado em `req.session`
 * (SessionStateStore) — e a API é stateless/cookie-only, sem
 * `express-session` nem store de sessão. Ligar sessão só para o `state`
 * seria trazer estado de servidor para um fluxo desenhado sem ele.
 *
 * O mecanismo aqui é o equivalente manual, no mesmo padrão dos cookies
 * de auth existentes (httpOnly, sem assinatura — ver nota abaixo):
 *
 * 1. Início do fluxo (`GET /auth/<provider>`): o guard gera um `state`
 *    aleatório (256 bits), grava-o num cookie httpOnly `oauth_state`
 *    (TTL 10 min, mesmas opções dos cookies de auth) e o entrega ao
 *    Passport, que o inclui na URL de autorização — o provedor o devolve
 *    intacto na query do callback.
 * 2. Callback (`GET /auth/<provider>/callback`): o guard compara o
 *    `state` da query com o do cookie ANTES de delegar ao Passport —
 *    um callback forjado nunca chega à troca do `code`. Comparação
 *    timing-safe; divergente, ausente ou sem cookie → 401 com
 *    `AUTH_OAUTH_INVALID_STATE` (o filtro do callback redireciona para
 *    `/login?oauth_error=invalid_state`, nunca completa o login).
 * 3. Uso único: o cookie é limpo na leitura (sucesso ou falha) — o
 *    mesmo `state` não pode ser reutilizado (replay recusado por falta
 *    do cookie).
 *
 * Nota sobre assinatura: o cookie NÃO é assinado, como os cookies de
 * auth existentes — não há `cookie-parser`/segredo de assinatura na API
 * e a assinatura não adicionaria proteção contra login CSRF: o ataque
 * depende de o `state` da URL do atacante casar com o cookie NO
 * NAVEGADOR DA VÍTIMA, e o atacante não consegue ler nem gravar o
 * cookie httpOnly da vítima na origem da API. A proteção vem da
 * imprevisibilidade (256 bits) + vínculo com o navegador (httpOnly) +
 * uso único. `SameSite: 'lax'` (default) basta: o callback é uma
 * navegação GET top-level vinda do provedor, e o Lax envia o cookie
 * nesse caso.
 */

export const OAUTH_STATE_COOKIE = 'oauth_state';

/** 10 minutos: cobre a ida ao provedor e a volta; expira sozinho depois. */
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

/** 256 bits de entropia, base64url (seguro para query string e cookie). */
export function generateOAuthState(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Início do fluxo: gera o `state`, grava-o no cookie httpOnly e devolve
 * o valor para o guard entregar ao Passport (`{ state }`).
 */
export function issueOAuthState(res: Response): string {
  const state = generateOAuthState();
  res.cookie(OAUTH_STATE_COOKIE, state, cookieOptions(OAUTH_STATE_TTL_MS));
  return state;
}

function statesEqual(expected: string, received: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Callback: valida o `state` da query contra o cookie, ANTES de
 * qualquer troca de `code`. Limpa o cookie em todos os caminhos
 * (uso único). Falha → `UnauthorizedException` com
 * `AUTH_OAUTH_INVALID_STATE` (o filtro do callback vira redirect para
 * `/login?oauth_error=invalid_state`).
 */
export function validateOAuthState(req: Request, res: Response): void {
  const expected = parseCookies(req.headers.cookie)[OAUTH_STATE_COOKIE];
  const received =
    typeof req.query?.state === 'string' ? req.query.state : undefined;
  // Uso único: limpa antes de qualquer retorno — replay do mesmo
  // callback chega sem cookie e é recusado.
  res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
  if (!expected || !received || !statesEqual(expected, received)) {
    throw new UnauthorizedException(
      withErrorCode(
        'A sessão de login expirou ou é inválida. Tente entrar novamente.',
        ErrorCodes.AUTH_OAUTH_INVALID_STATE,
      ),
    );
  }
}
