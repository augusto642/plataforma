import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

/**
 * Guard do endpoint de scrape Prometheus (finding MÉDIA — AppSec).
 *
 * Decisão: token de scrape via env (METRICS_TOKEN, header `x-metrics-token`)
 * em vez de auth admin JWT — é o padrão de mercado para Prometheus/Grafana
 * (o scraper é uma máquina, não um usuário) e evita expor métricas internas
 * quando METRICS_TOKEN não está configurado: o guard falha FECHADO (401).
 *
 * Uso: defina METRICS_TOKEN no ambiente da API e envie o header
 * `x-metrics-token: <token>` no scrape. A comparação é timing-safe.
 */
@Injectable()
export class MetricsTokenGuard implements CanActivate {
  private readonly logger = new Logger(MetricsTokenGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('METRICS_TOKEN');
    if (!expected) {
      this.logger.warn(
        'METRICS_TOKEN não configurado: /metrics/prometheus está desabilitado (fail-closed). Defina METRICS_TOKEN para habilitar o scrape.',
      );
      throw new UnauthorizedException('Metrics endpoint disabled');
    }

    const req = context.switchToHttp().getRequest<Request>();
    const provided = req.headers['x-metrics-token'];
    const token = Array.isArray(provided) ? provided[0] : provided;

    if (!token || !safeEqual(token, expected)) {
      throw new UnauthorizedException('Invalid metrics token');
    }
    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
