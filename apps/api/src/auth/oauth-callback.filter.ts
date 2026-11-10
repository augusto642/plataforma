import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
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
 * correspondente em pt-BR (ver `apps/web/app/lib/oauth-errors.ts`;
 * códigos novos sem entrada lá caem na mensagem genérica `oauth_failed`).
 *
 * Só vale para as rotas OAuth (`@UseFilters` no controller). Fora delas,
 * o filtro global (M9) continua devolvendo JSON normalmente.
 *
 * D2 (QA — BAIXO): o filtro captura QUALQUER erro (`@Catch()` sem tipo),
 * não só `HttpException` — um erro não-HTTP no callback (ex.: `P2002` do
 * Prisma que escape do service, falha de rede) virava 500 cru no
 * navegador. Agora vira redirect para `/login?oauth_error=oauth_failed`
 * (e o erro vai para o log, para não virar invisível). O service continua
 * sendo o ponto primário: `loginWithOAuth` converte o `P2002` da corrida
 * em `ConflictException` com `AUTH_OAUTH_ACCOUNT_CONFLICT` (redirect
 * específico `account_conflict`); o filtro é a rede de segurança para o
 * que escapar dele.
 */
export const OAUTH_ERROR_CODES = {
  oauth_unavailable: ErrorCodes.AUTH_OAUTH_UNAVAILABLE,
  email_required: ErrorCodes.AUTH_OAUTH_EMAIL_REQUIRED,
  email_unverified: ErrorCodes.AUTH_OAUTH_EMAIL_UNVERIFIED,
  github_emails_unavailable: ErrorCodes.AUTH_OAUTH_GITHUB_EMAILS_UNAVAILABLE,
  invalid_state: ErrorCodes.AUTH_OAUTH_INVALID_STATE,
  account_conflict: ErrorCodes.AUTH_OAUTH_ACCOUNT_CONFLICT,
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

@Catch()
export class OAuthCallbackExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(OAuthCallbackExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const errorCode =
        typeof body === 'object' && body !== null
          ? (body as { errorCode?: unknown }).errorCode
          : undefined;
      const code = oauthErrorCodeFromErrorCode(errorCode);
      res.redirect(oauthErrorRedirectUrl(code));
      return;
    }
    // Erro não-HTTP no callback (D2): nunca 500 cru no navegador —
    // volta ao login com erro genérico e registra o erro para investigação.
    this.logger.error(
      `Non-HTTP error in OAuth callback: ${
        exception instanceof Error
          ? `${exception.name}: ${exception.message}`
          : String(exception)
      }`,
      exception instanceof Error ? exception.stack : undefined,
    );
    res.redirect(oauthErrorRedirectUrl('oauth_failed'));
  }
}
