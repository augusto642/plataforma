import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { ErrorCodes, withErrorCode } from '../../common/errors/error-codes';
import {
  OAuthProvider,
  assertOAuthEnvComplete,
  isOAuthConfigured,
} from '../oauth.config';

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

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    assertOAuthAvailable('google', 'Google', this.config);
    return super.canActivate(context);
  }
}

@Injectable()
export class GitHubAuthGuard extends AuthGuard('github') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    assertOAuthAvailable('github', 'GitHub', this.config);
    return super.canActivate(context);
  }
}
