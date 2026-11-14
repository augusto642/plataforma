// Trilha dinâmica v1 (Central 209 — DESIGN §2 item 2).
// Endpoints do aluno autenticados (o JwtAuthGuard global exige sessão;
// GET não tem efeito colateral — `seen` é POST separado, DESIGN D5).
// Endpoints admin exigem Role.admin (RolesGuard, mesmo padrão do
// AdminController).
import {
  Body,
  Controller,
  Get,
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
import { JobsMarketProvider } from '../knowledge/research/jobs-market.provider';

@Controller('dynamic-track')
@UseGuards(JwtAuthGuard)
export class DynamicTrackController {
  constructor(
    private readonly dynamicTrack: DynamicTrackService,
    private readonly jobsMarketProvider: JobsMarketProvider = new JobsMarketProvider(),
  ) {}

  /** Estado da investigação do aluno logado (null = nunca investigado). */
  @Get('me')
  async getMine(@CurrentUser() user: JwtPayload) {
    const investigation = await this.dynamicTrack.getMyInvestigation(
      user.sub,
    );
    return { investigation };
  }

  /** Inicia a investigação para contas já existentes (1 por usuário). */
  @Post('me/start')
  async startMine(@CurrentUser() user: JwtPayload) {
    const { view, created } = await this.dynamicTrack.startForUser(user.sub);
    return { investigation: view, created };
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
   * Pacote 2.3 — Módulo de Imersão Visual na Espera (/trilha/aguardando)
   * Carrega instantaneamente dados do KMS/RAG com Arquitetura Visual, Raio-X de Mercado e Status da Mineração.
   */
  @Get('me/immersion')
  async getImmersionModule(@CurrentUser() user: JwtPayload) {
    const investigation: any = await this.dynamicTrack.getMyInvestigation(user.sub);
    const goal =
      investigation?.careerGoals?.[0] ||
      investigation?.primaryTechnology ||
      'Full Stack';
    const marketXRay = (this.jobsMarketProvider || new JobsMarketProvider()).getComprehensiveOverview(goal);

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
        technologies: ['Docker', 'Jenkins', 'SonarQube', 'Piston Sandbox'],
        diagramFlow: 'Git Push ➔ Webhook ➔ Jenkins Runner ➔ Sonar Quality Gate ➔ Sandbox Execution',
        practicalExample:
          'Execução de código de alunos em contêiner sem rede com teto de 256MB e Quality Gate.',
      },
    ];

    const hoursElapsed = investigation?.createdAt
      ? Math.min(
          48,
          Math.max(
            1,
            Math.round(
              (Date.now() - new Date(investigation.createdAt).getTime()) /
                3600000,
            ),
          ),
        )
      : 2;
    const progressPercentage =
      investigation?.status === 'ready'
        ? 100
        : Math.min(95, Math.round((hoursElapsed / 48) * 100) + 12);

    return {
      goal,
      hoursElapsed,
      progressPercentage,
      miningStage:
        investigation?.status === 'ready'
          ? 'Mineração e Síntese Concluídas'
          : hoursElapsed < 8
            ? 'Minerando vagas ativas (Brasil & Internacional remoto)'
            : hoursElapsed < 24
              ? 'Mapeando roadmaps, livros técnicos e repositórios públicos'
              : 'Sintetizando Macro-Trilha e calibrando Desafios de Graduação',
      workersActive: 4,
      visualArchitecture,
      marketXRay,
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
