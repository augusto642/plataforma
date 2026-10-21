import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackEventsDto } from './dto/track-events.dto';

// B08 (mínimo) — persistência dos eventos do funil da landing em tabela
// própria (analytics_events). Sem provedor externo: a análise é feita por
// consulta direta na tabela. O envelope guarda schemaVersion para o
// catálogo poder evoluir sem quebrar consultas antigas.
export const ANALYTICS_SCHEMA_VERSION = 1;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async trackBatch(dto: TrackEventsDto): Promise<{ accepted: number }> {
    const data = dto.events.map((e) => ({
      event: e.event,
      ctaId: e.ctaId ?? null,
      sessionId: e.sessionId ?? null,
      path: e.path ?? null,
      props: {
        schemaVersion: ANALYTICS_SCHEMA_VERSION,
        ...(e.props ?? {}),
        ...(e.ts ? { clientTs: e.ts } : {}),
      },
    }));

    await this.prisma.analyticsEvent.createMany({ data });
    return { accepted: data.length };
  }
}
