// Trilha dinâmica v1 (Central 209 — DESIGN §2 item 2).
// Endpoints do aluno autenticados (o JwtAuthGuard global exige sessão;
// GET não tem efeito colateral — `seen` é POST separado, DESIGN D5).
// Endpoints admin exigem Role.admin (RolesGuard, mesmo padrão do
// AdminController).
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DynamicTrackService } from './dynamic-track.service';
import { SkillEvidenceService } from './skill-evidence.service';
import { LearningProfileDto } from './learning-profile.dto';

@Controller('dynamic-track')
@UseGuards(JwtAuthGuard)
export class DynamicTrackController {
  constructor(
    private readonly dynamicTrack: DynamicTrackService,
    private readonly skillEvidence: SkillEvidenceService,
  ) {}

  @Get('me/skill-goals')
  @Header('Cache-Control', 'no-store')
  getSkillGoals(@CurrentUser() user: JwtPayload) {
    return this.skillEvidence.goals(user.sub);
  }

  @Get('me/evidence')
  @Header('Cache-Control', 'no-store')
  getEvidence(@CurrentUser() user: JwtPayload) {
    return this.skillEvidence.portfolio(user.sub);
  }

  /** Estado da investigação do aluno logado (null = nunca investigado). */
  @Get('me')
  async getMine(@CurrentUser() user: JwtPayload) {
    const investigation = await this.dynamicTrack.getMyInvestigation(
      user.sub,
    );
    return { investigation };
  }

  /** Três atividades reais e ainda não aprovadas durante a investigação. */
  @Get('me/mini-track')
  async getMiniTrack(@CurrentUser() user: JwtPayload) {
    return this.dynamicTrack.getImmediateMiniTrack(user.sub);
  }

  /** Inicia a investigação para contas já existentes (1 por usuário). */
  @Post('me/start')
  async startMine(@CurrentUser() user: JwtPayload) {
    const { view, created } = await this.dynamicTrack.startForUser(user.sub);
    return { investigation: view, created };
  }

  @Post('me/learning-profile')
  @HttpCode(204)
  @UseGuards(RolesGuard)
  @Roles(Role.student)
  async saveLearningProfile(@CurrentUser() user: JwtPayload, @Body() body: LearningProfileDto) {
    await this.dynamicTrack.saveLearningProfile(user.sub, body);
  }

  /** Recalcula a sugestão do aluno com objetivos/stack atualizados ou diagnóstico. */
  @Post('me/refresh')
  async refreshMine(
    @CurrentUser() user: JwtPayload,
    @Body()
    body?: {
      careerGoals?: string[];
      primaryTechnology?: string | null;
    },
  ) {
    const investigation = await this.dynamicTrack.refreshForUser(user.sub, body);
    return { investigation };
  }

  /** Marca a sugestão como vista (só quando ready e ainda não vista). */
  @Post('me/seen')
  async markSeen(@CurrentUser() user: JwtPayload) {
    const investigation = await this.dynamicTrack.markSeen(user.sub);
    return { investigation };
  }

  /**
   * Dados complementares da espera: estado conhecido da investigação e mapa
   * educacional. Mercado e progresso granular só são exibidos quando houver
   * fontes reais e telemetria disponível.
   */
  @Get('me/immersion')
  async getImmersionModule(@CurrentUser() user: JwtPayload) {
    const investigation: any = await this.dynamicTrack.getMyInvestigation(user.sub);
    const goal =
      investigation?.careerGoals?.[0] ||
      investigation?.primaryTechnology ||
      'Full Stack';

    const visualArchitecture = [
      {
        layer: 'Frontend & Interface',
        title: 'Camada de Apresentação e Interação',
        description:
          'Construção de interfaces reativas, componentes performáticos e renderização híbrida.',
        technologies: ['React', 'Next.js', 'Tailwind CSS', 'TypeScript'],
        diagramFlow: 'Cliente (Browser / Mobile) ➔ SSR / SSG ➔ VDOM ➔ Event Handlers',
        practicalExample:
          'Dashboard interativo com gráficos em tempo real e atualização de estado atômica.',
      },
      {
        layer: 'APIs & Gateway',
        title: 'Camada de Comunicação e Segurança',
        description:
          'Roteamento seguro, rate limiting, middlewares de autenticação JWT e validação de DTOs.',
        technologies: ['RESTful APIs', 'WebSockets', 'GraphQL', 'Class-Validator'],
        diagramFlow: 'HTTP Request ➔ Rate Limiter ➔ Guards / JWT ➔ DTO Pipes ➔ Controllers',
        practicalExample:
          'Endpoint de checkout e submissão com streaming SSE de feedback da Tutora.',
      },
      {
        layer: 'Backend & Domínio',
        title: 'Regras de Negócio e Orquestração',
        description:
          'Modelagem orientada a domínio, controle de concorrência, idempotência e serviços resilientes.',
        technologies: ['NestJS', 'Node.js', 'Clean Architecture', 'Event-Driven'],
        diagramFlow: 'Controller ➔ Application Service ➔ Transaction Manager ➔ Entity Domain',
        practicalExample:
          'Concessão atômica de XP e cálculo de nível sob concorrência com row-level lock.',
      },
      {
        layer: 'Banco de Dados & Cache',
        title: 'Persistência Relacional e Alta Velocidade',
        description:
          'Modelagem relacional normalizada, índices em foreign keys e cache distribuído.',
        technologies: ['PostgreSQL', 'Prisma ORM', 'Redis', 'PgBouncer'],
        diagramFlow: 'Prisma Client ➔ Connection Pool ➔ PostgreSQL ACID ⇄ Redis Cache (30s TTL)',
        practicalExample:
          'Consultas agregadas groupBy paralelas com invalidação cirúrgica de cache por cursor.',
      },
      {
        layer: 'DevOps & Qualidade',
        title: 'Esteira Contínua e Sandboxes',
        description:
          'Pipelines CI/CD automatizadas, análise estática de código e isolamento de runtime.',
        technologies: ['Docker', 'Gitea/GitHub Actions', 'Jenkins', 'SonarQube', 'Piston Sandbox'],
        diagramFlow: 'Git Push ➔ Webhook ➔ CI Runner (Gitea/GitHub Actions/Jenkins) ➔ Sonar Quality Gate ➔ Sandbox Execution',
        practicalExample:
          'Execução de código de alunos em contêiner sem rede com teto de 256MB e Quality Gate.',
      },
    ];

    const createdAt = investigation?.createdAt
      ? new Date(investigation.createdAt).getTime()
      : Number.NaN;
    const hoursElapsed = Number.isFinite(createdAt)
      ? Math.max(0, Math.floor((Date.now() - createdAt) / 3600000))
      : null;

    return {
      goal,
      hoursElapsed,
      miningStage:
        investigation?.status === 'ready'
          ? 'Mineração e Síntese Concluídas'
          : investigation?.status === 'failed'
            ? 'A investigação falhou; nenhum progresso adicional está ocorrendo'
            : investigation
              ? 'Solicitação registrada; não há telemetria de progresso detalhado'
              : 'Nenhuma investigação iniciada',
      investigationStatus: investigation?.status ?? 'not_started',
      marketDataAvailable: false,
      visualArchitecture,
      marketXRay: null,
    };
  }

  /** Admin: lista investigações (com sinais registrados) — leitura. */
  @Get('admin/investigations')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async listAdmin() {
    const investigations =
      await this.dynamicTrack.listInvestigationsAdmin();
    return { investigations };
  }

  /** Admin: re-enfileira uma investigação investigating/failed. */
  @Post('admin/investigations/:id/reenqueue')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async reenqueueAdmin(@Param('id') id: string) {
    const { investigation, queued, deduped } =
      await this.dynamicTrack.reenqueueAdmin(id);
    if (!investigation) throw new NotFoundException('Investigação não encontrada.');
    return { investigation, queued, deduped };
  }
}
