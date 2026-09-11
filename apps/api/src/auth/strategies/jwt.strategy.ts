import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigError } from '../../config/secrets.validation';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

function parseCookies(header: string | undefined): Record<string, string> {
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
        (request) => {
          const cookies = parseCookies(request?.headers?.cookie);
          if (cookies['access_token']) return cookies['access_token'];
          const authHeader = request?.headers?.authorization;
          if (authHeader?.startsWith('Bearer ')) {
            return authHeader.slice(7);
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: accessSecret,
    });
  }

  async validate(payload: JwtPayload) {
    return { id: payload.sub, sub: payload.sub, email: payload.email, role: payload.role };
  }
}