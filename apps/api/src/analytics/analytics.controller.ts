import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnalyticsService } from './analytics.service';
import { TrackEventsDto } from './dto/track-events.dto';

// B08 (mínimo) — ingestão pública dos eventos do funil da landing.
// Público porque o funil começa anônimo (visita → clique → cadastro);
// a proteção é o catálogo fechado de eventos + limites do DTO.
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Public()
  @Post('events')
  @HttpCode(202)
  trackEvents(@Body() dto: TrackEventsDto) {
    return this.analytics.trackBatch(dto);
  }

  // Sprint 5 — leitura do funil (pageviews → cliques por CTA → cadastros
  // por campanha). Segue o padrão do AdminController: JWT + papel admin.
  @Get('funnel')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getFunnelSummary() {
    return this.analytics.getFunnelSummary();
  }
}
