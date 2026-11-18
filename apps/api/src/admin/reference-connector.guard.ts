import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import { Request } from 'express';

@Injectable()
export class ReferenceConnectorGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('REFERENCE_CONNECTOR_KEY_SHA256');
    const authorization = context.switchToHttp().getRequest<Request>().headers.authorization;
    const token = typeof authorization === 'string'
      ? /^Bearer ([A-Za-z0-9_-]{43,128})$/.exec(authorization)?.[1]
      : undefined;
    if (!expected || !/^[a-f0-9]{64}$/.test(expected) || !token) {
      throw new UnauthorizedException('Conector indisponível ou credencial inválida.');
    }
    const digest = createHash('sha256').update(token).digest();
    if (!timingSafeEqual(digest, Buffer.from(expected, 'hex'))) {
      throw new UnauthorizedException('Conector indisponível ou credencial inválida.');
    }
    return true;
  }
}
