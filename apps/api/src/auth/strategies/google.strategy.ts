import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { ErrorCodes, withErrorCode } from '../../common/errors/error-codes';
import {
  OAuthProfile,
  assertOAuthEnvComplete,
  oauthCallbackUrl,
  oauthClientId,
  oauthClientSecret,
} from '../oauth.config';

/**
 * Strategy Passport do Google (OAuth 2.0, Authorization Code Flow).
 *
 * - Escopos: `email` + `profile` (mínimo para identificar o usuário e ler
 *   o e-mail + `email_verified`).
 * - E-mail: o Google afirma `email_verified` no perfil. Sem e-mail, ou
 *   com e-mail NÃO verificado, o login é recusado com erro claro em pt-BR
 *   — nunca se cria conta com e-mail não verificado, e nunca se inventa
 *   e-mail (ex.: `id@google.invalid`).
 * - A strategy só é instanciada quando o OAuth Google está configurado
 *   (ver AuthModule: factory fail-closed; sem vars, o provider é `null`
 *   e o guard responde 503 antes de chegar aqui).
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    assertOAuthEnvComplete('google', config);
    super({
      clientID: oauthClientId('google', config) as string,
      clientSecret: oauthClientSecret('google', config) as string,
      callbackURL: oauthCallbackUrl('google', config),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<OAuthProfile> {
    return normalizeGoogleProfile(profile);
  }
}

/**
 * Normalização pura (testável sem Passport): extrai e-mail + flag de
 * verificação do perfil do Google. `profile._json.email_verified` é a
 * fonte canônica; `profile.emails[0].verified` é o fallback.
 */
export function normalizeGoogleProfile(profile: Profile): OAuthProfile {
  const email =
    profile.emails?.[0]?.value ?? profile._json?.email ?? null;
  const verified =
    profile._json?.email_verified === true ||
    profile.emails?.[0]?.verified === true;
  if (!email) {
    throw new UnauthorizedException(
      withErrorCode(
        'O Google não informou um e-mail para esta conta. Use uma conta Google com e-mail ou entre com e-mail e senha.',
        ErrorCodes.AUTH_OAUTH_EMAIL_REQUIRED,
      ),
    );
  }
  if (!verified) {
    throw new UnauthorizedException(
      withErrorCode(
        'O e-mail desta conta Google ainda não foi verificado. Confirme o e-mail na sua conta Google e tente novamente.',
        ErrorCodes.AUTH_OAUTH_EMAIL_UNVERIFIED,
      ),
    );
  }
  return {
    provider: 'google',
    providerId: profile.id,
    email,
    emailVerified: true,
    name: profile.displayName || email.split('@')[0],
    avatarUrl: profile.photos?.[0]?.value ?? null,
  };
}
