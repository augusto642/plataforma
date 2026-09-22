import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigError } from '../../config/secrets.validation';
import { ACCESS_TOKEN_COOKIE, parseCookies } from '../cookies.util';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

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
          if (cookies[ACCESS_TOKEN_COOKIE]) return cookies[ACCESS_TOKEN_COOKIE];
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