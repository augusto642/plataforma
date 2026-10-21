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
      visitorId: e.visitorId ?? null,
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

  // Sprint 5 — leitura simples do funil: responde "quantos pageviews →
  // cliques por CTA → cadastros por campanha" sem provedor externo.
  // Agregações por coluna usam groupBy; a quebra por campanha lê o JSON
  // de props dos signup_success (a campanha viaja nas props do evento,
  // espelhando as UTMs gravadas na conta).
  // Sprint 8 — a leitura ganha o meio do funil: totais da Missão 1
  // (started/completed/failed/skipped), visualizações por etapa do
  // prólogo (props.step dos onboarding_step_viewed, via $queryRaw como
  // a campanha) e cadastros por PORTA (ctaId do signup_success:
  // register_submit × onboarding_save), para a página admin montar as
  // taxas pageview → CTA → Missão 1 → vitória → cadastro → 1ª atividade.
  async getFunnelSummary(): Promise<{
    totalsByEvent: Record<string, number>;
    clicksByCta: Array<{ event: string; ctaId: string; count: number }>;
    signupsByCampaign: Array<{ campaign: string; count: number }>;
    signupsByDoor: Array<{ door: string; count: number }>;
    mission: { started: number; completed: number; failed: number; skipped: number };
    onboarding: {
      steps: Array<{ step: string; count: number }>;
      resumed: number;
    };
    uniqueVisitors: number;
  }> {
    const [byEvent, byCta, campaignRows, visitorRows, stepRows] = await Promise.all([
      this.prisma.analyticsEvent.groupBy({
        by: ['event'],
        _count: { _all: true },
      }),
      this.prisma.analyticsEvent.groupBy({
        by: ['event', 'ctaId'],
        where: { ctaId: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<Array<{ campaign: string | null; count: number }>>`
        SELECT props ->> 'utmCampaign' AS campaign, COUNT(*)::int AS count
        FROM analytics_events
        WHERE event = 'signup_success'
        GROUP BY props ->> 'utmCampaign'
        ORDER BY count DESC
      `,
      this.prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(DISTINCT visitor_id)::int AS count
        FROM analytics_events
        WHERE event = 'pageview' AND visitor_id IS NOT NULL
      `,
      this.prisma.$queryRaw<Array<{ step: string | null; count: number }>>`
        SELECT props ->> 'step' AS step, COUNT(*)::int AS count
        FROM analytics_events
        WHERE event = 'onboarding_step_viewed'
        GROUP BY props ->> 'step'
        ORDER BY count DESC
      `,
    ]);

    const totalsByEvent: Record<string, number> = Object.fromEntries(
      byEvent.map((row) => [row.event, row._count._all]),
    );
    const clicksByCta = byCta.map((row) => ({
      event: row.event,
      ctaId: row.ctaId as string,
      count: row._count._all,
    }));

    return {
      totalsByEvent,
      clicksByCta,
      signupsByCampaign: campaignRows.map((row) => ({
        campaign: row.campaign ?? '(sem campanha)',
        count: Number(row.count),
      })),
      // Porta = ctaId do signup_success (o groupBy por evento+ctaId já
      // traz essas linhas; aqui elas viram a quebra nomeada da leitura).
      signupsByDoor: clicksByCta
        .filter((row) => row.event === 'signup_success')
        .map((row) => ({ door: row.ctaId, count: row.count })),
      mission: {
        started: totalsByEvent['mission_started'] ?? 0,
        completed: totalsByEvent['mission_completed'] ?? 0,
        failed: totalsByEvent['mission_failed'] ?? 0,
        skipped: totalsByEvent['mission_skipped'] ?? 0,
      },
      onboarding: {
        steps: stepRows.map((row) => ({
          step: row.step ?? '(sem etapa)',
          count: Number(row.count),
        })),
        resumed: totalsByEvent['onboarding_resumed'] ?? 0,
      },
      uniqueVisitors: Number(visitorRows[0]?.count ?? 0),
    };
  }
}
