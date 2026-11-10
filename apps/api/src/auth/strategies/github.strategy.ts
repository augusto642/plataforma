import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-github2';
import { ErrorCodes, withErrorCode } from '../../common/errors/error-codes';
import {
  OAuthProfile,
  assertOAuthEnvComplete,
  oauthCallbackUrl,
  oauthClientId,
  oauthClientSecret,
} from '../oauth.config';

interface GitHubEmailEntry {
  email: string;
  primary: boolean;
  verified: boolean;
}

/**
 * Strategy Passport do GitHub (OAuth 2.0, Authorization Code Flow).
 *
 * - Escopos: `read:user` + `user:email` — o segundo é obrigatório: o
 *   e-mail público do perfil (`/user.email`) pode ser nulo (e-mail
 *   privado), e só `/user/emails` revela o e-mail primário verificado.
 * - E-mail: lido SEMPRE de `GET https://api.github.com/user/emails` com
 *   o access token do fluxo (não do perfil, que só traz o e-mail público).
 *   Exige e-mail PRIMÁRIO e VERIFICADO; sem ele, recusa com erro claro
 *   pedindo e-mail público verificado — nunca se inventa e-mail
 *   (ex.: `id@github.invalid`) nem se usa e-mail não verificado.
 * - A strategy só é instanciada quando o OAuth GitHub está configurado
 *   (ver AuthModule: factory fail-closed; sem vars, o provider é `null`
 *   e o guard responde 503 antes de chegar aqui).
 */
@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    assertOAuthEnvComplete('github', config);
    super({
      clientID: oauthClientId('github', config) as string,
      clientSecret: oauthClientSecret('github', config) as string,
      callbackURL: oauthCallbackUrl('github', config),
      scope: ['read:user', 'user:email'],
    });
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<OAuthProfile> {
    const email = await resolveGitHubPrimaryVerifiedEmail(accessToken);
    return {
      provider: 'github',
      providerId: profile.id,
      email,
      emailVerified: true,
      name:
        profile.displayName ||
        (profile as Profile & { username?: string }).username ||
        email.split('@')[0],
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
  }
}

/**
 * Busca o e-mail primário verificado do usuário no GitHub.
 * Função pura (só depende do `fetch` global) para ser testável sem Passport.
 *
 * - `GET /user/emails` com o access token do fluxo OAuth.
 * - Falha de rede / token inválido na leitura → 401 honesto (o login não
 *   pode prosseguir sem o e-mail; o usuário tenta de novo).
 * - Sem e-mail primário verificado → 401 com a instrução exata
 *   (o GitHub permite conta sem e-mail verificado; a Nexus não).
 */
export async function resolveGitHubPrimaryVerifiedEmail(
  accessToken: string,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'nexus-code',
      },
    });
  } catch {
    throw new UnauthorizedException(
      withErrorCode(
        'Não foi possível ler seu e-mail do GitHub agora. Tente novamente em instantes.',
        ErrorCodes.AUTH_OAUTH_GITHUB_EMAILS_UNAVAILABLE,
      ),
    );
  }
  if (!res.ok) {
    throw new UnauthorizedException(
      withErrorCode(
        'Não foi possível ler seu e-mail do GitHub agora. Tente novamente em instantes.',
        ErrorCodes.AUTH_OAUTH_GITHUB_EMAILS_UNAVAILABLE,
      ),
    );
  }
  const emails = (await res.json()) as GitHubEmailEntry[];
  const primary = emails.find((e) => e.primary && e.verified);
  if (!primary) {
    throw new UnauthorizedException(
      withErrorCode(
        'Sua conta GitHub não tem um e-mail primário verificado. Defina um e-mail primário e confirme-o no GitHub (ou torne um e-mail público) e tente novamente.',
        ErrorCodes.AUTH_OAUTH_EMAIL_UNVERIFIED,
      ),
    );
  }
  return primary.email;
}
