import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from '@prisma/client';
import { MetricsService } from './metrics.service';
import { MetricsTokenGuard } from './metrics-token.guard';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  snapshot() {
    return this.metrics.snapshot();
  }

  /**
   * Prometheus scrape: protegido por METRICS_TOKEN (header x-metrics-token),
   * fail-closed se o token não estiver configurado. Ver MetricsTokenGuard.
   */
  @Get('prometheus')
  @Public()
  @UseGuards(MetricsTokenGuard)
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  prometheusMetrics(): string {
    return this.metrics.toPrometheusFormat();
  }
}
