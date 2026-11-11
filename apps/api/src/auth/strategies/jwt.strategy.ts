import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigError } from '../../config/secrets.validation';
import { ACCESS_TOKEN_COOKIE, parseCookies } from '../cookies.util';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * M15 (Lote 4) — autenticação cookie-only: o JWT de acesso é lido SÓ do
 * cookie httpOnly `access_token`. O `Authorization: Bearer` era aceito aqui
 * (fallback no extrator), o que anulava a proteção CSRF baseada em cookie:
 * um token vazado em log/URL podia ser reutilizado como Bearer de qualquer
 * origem, sem passar pelo cookie. Nenhum cliente legítimo usa Bearer:
 * o front (`apps/web/app/lib/apiClient.ts`) apaga o header Authorization e
 * usa `credentials: 'include'`; não há CLI/script que chame a API com
 * Bearer (varredura em 07/11 — só o LLM client usa Bearer, para o provedor
 * de IA externo, e o Gitea usa `token`, nenhum dos dois contra esta API).
 */
export function extractAccessTokenFromRequest(
  request: { headers?: { cookie?: string } } | undefined | null,
): string | null {
  const cookies = parseCookies(request?.headers?.cookie);
  return cookies[ACCESS_TOKEN_COOKIE] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const accessSecret = config.get<string>('JWT_ACCESS_SECRET');
    if (!accessSecret) {
      throw new ConfigError(
        'Missing required environment variable: JWT_ACCESS_SECRET',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractAccessTokenFromRequest,
      ]),
      ignoreExpiration: false,
      secretOrKey: accessSecret,
    });
  }

  async validate(payload: JwtPayload) {
    return { id: payload.sub, sub: payload.sub, email: payload.email, role: payload.role };
  }
}