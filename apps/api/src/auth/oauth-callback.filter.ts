import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorCodes } from '../common/errors/error-codes';

/**
 * Filtro dos callbacks OAuth: o callback acontece no NAVEGADOR (o usuário
 * volta do Google/GitHub para a API). Uma falha aqui — e-mail não
 * verificado, OAuth não configurado, erro do provedor — como JSON 401/503
 * deixaria o usuário olhando para um corpo de erro cru, sem caminho de
 * volta. O filtro converte a exceção num redirect 302 para o login do web
 * app com `?oauth_error=<código>`, e a tela de login exibe a mensagem
 * correspondente em pt-BR (ver `apps/web/app/lib/oauth-errors.ts`).
 *
 * Só vale para as rotas OAuth (`@UseFilters` no controller). Fora delas,
 * o filtro global (M9) continua devolvendo JSON normalmente.
 */
export const OAUTH_ERROR_CODES = {
  oauth_unavailable: ErrorCodes.AUTH_OAUTH_UNAVAILABLE,
  email_required: ErrorCodes.AUTH_OAUTH_EMAIL_REQUIRED,
  email_unverified: ErrorCodes.AUTH_OAUTH_EMAIL_UNVERIFIED,
  github_emails_unavailable: ErrorCodes.AUTH_OAUTH_GITHUB_EMAILS_UNAVAILABLE,
} as const;

export type OAuthErrorQueryCode =
  | keyof typeof OAUTH_ERROR_CODES
  | 'oauth_failed';

/** Mapeia o `errorCode` da exceção para o código da query string. */
export function oauthErrorCodeFromErrorCode(
  errorCode: unknown,
): OAuthErrorQueryCode {
  for (const [queryCode, code] of Object.entries(OAUTH_ERROR_CODES)) {
    if (code === errorCode) return queryCode as OAuthErrorQueryCode;
  }
  return 'oauth_failed';
}

export function webAppBaseUrlFromEnv(): string {
  return (
    process.env.WEB_PUBLIC_URL ||
    process.env.WEB_URL ||
    'http://localhost:3001'
  );
}

export function oauthErrorRedirectUrl(code: OAuthErrorQueryCode): string {
  return `${webAppBaseUrlFromEnv()}/login?oauth_error=${code}`;
}

@Catch(HttpException)
export class OAuthCallbackExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const body = exception.getResponse();
    const errorCode =
      typeof body === 'object' && body !== null
        ? (body as { errorCode?: unknown }).errorCode
        : undefined;
    const code = oauthErrorCodeFromErrorCode(errorCode);
    res.redirect(oauthErrorRedirectUrl(code));
  }
}
