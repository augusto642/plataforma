import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ErrorCodes, withErrorCode } from '../../common/errors/error-codes';
import {
  OAuthProvider,
  assertOAuthEnvComplete,
  isOAuthConfigured,
} from '../oauth.config';
import { issueOAuthState, validateOAuthState } from '../oauth.state';

/**
 * Guards OAuth: barram ANTES do Passport quando o provedor não está
 * configurado (503 honesto em pt-BR, sem redirect ao provedor e sem
 * quebrar o login por senha). Configuração parcial derruba aqui também
 * (o boot já teria recusado — o guard é a segunda camada).
 *
 * Sem esta checagem, `AuthGuard('google')` com a strategy ausente
 * responderia 500 "Unknown authentication strategy" — erro interno
 * opaco, indistinguível de bug.
 */
function assertOAuthAvailable(
  provider: OAuthProvider,
  label: string,
  config: ConfigService,
): void {
  assertOAuthEnvComplete(provider, config);
  if (!isOAuthConfigured(provider, config)) {
    throw new ServiceUnavailableException(
      withErrorCode(
        `O login com ${label} ainda não está configurado. Entre com e-mail e senha.`,
        ErrorCodes.AUTH_OAUTH_UNAVAILABLE,
      ),
    );
  }
}

/**
 * D1 (QA — ALTO) — `state` anti-CSRF, verificação server-side sem sessão.
 *
 * O guard é o único ponto que vê o fluxo ANTES do Passport nas duas
 * pontas, por isso o `state` vive aqui (a strategy não tem acesso ao
 * cookie; o controller só executa depois do Passport):
 *
 * - Início (`GET /auth/<provider>`, sem `code`/`error` na query):
 *   `getAuthenticateOptions` emite o `state` (cookie httpOnly
 *   `oauth_state`, 10 min) e o entrega ao Passport, que o inclui na
 *   URL de autorização — o provedor o devolve intacto no callback.
 * - Callback (`GET /auth/<provider>/callback`, com `code` ou `error`):
 *   `canActivate` valida o `state` da query contra o cookie ANTES de
 *   delegar ao Passport — um callback forjado nunca chega à troca do
 *   `code` nem ao `validate()` da strategy. Falha → 401 com
 *   `AUTH_OAUTH_INVALID_STATE` (o filtro do callback redireciona para
 *   `/login?oauth_error=invalid_state`, sem completar o login).
 *
 * O `state` nativo do Passport (`state: true`) NÃO é usado: ele exige
 * `express-session` (SessionStateStore) e a API é stateless/cookie-only
 * (ver `oauth.state.ts` — o mecanismo manual é equivalente e não pede
 * store de sessão).
 */
function isOAuthCallback(req: Request): boolean {
  const q = req.query as Record<string, unknown> | undefined;
  return typeof q?.code === 'string' || typeof q?.error === 'string';
}

function validateCallbackState(context: ExecutionContext): void {
  const http = context.switchToHttp();
  validateOAuthState(
    http.getRequest<Request>(),
    http.getResponse<Response>(),
  );
}

function oauthAuthenticateOptions(context: ExecutionContext): {
  state?: string;
} {
  const http = context.switchToHttp();
  const req = http.getRequest<Request>();
  if (isOAuthCallback(req)) return {};
  return { state: issueOAuthState(http.getResponse<Response>()) };
}

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    assertOAuthAvailable('google', 'Google', this.config);
    if (isOAuthCallback(context.switchToHttp().getRequest<Request>())) {
      validateCallbackState(context);
    }
    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    return oauthAuthenticateOptions(context);
  }
}

@Injectable()
export class GitHubAuthGuard extends AuthGuard('github') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    assertOAuthAvailable('github', 'GitHub', this.config);
    if (isOAuthCallback(context.switchToHttp().getRequest<Request>())) {
      validateCallbackState(context);
    }
    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    return oauthAuthenticateOptions(context);
  }
}
