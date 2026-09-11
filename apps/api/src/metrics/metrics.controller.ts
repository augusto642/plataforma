import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from '@prisma/client';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  snapshot() {
    return this.metrics.snapshot();
  }

  @Get('prometheus')
  @Public()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  prometheusMetrics(): string {
    return this.metrics.toPrometheusFormat();
  }
}
