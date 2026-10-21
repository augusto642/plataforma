import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
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
}
