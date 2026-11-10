import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { Role } from '@prisma/client';
import { EntitlementsService } from '../plans/entitlements.service';
import { PLAN_ENTITLEMENTS } from '../plans/plan-entitlements';
import { PrismaService } from '../prisma/prisma.service';

export const AI_REVIEWS_QUEUE = 'ai-reviews';

export interface AiReviewJobData {
  reviewId: string;
}

/**
 * Fase 2 premium (desenho §3.2) — revisão de código por IA, assíncrona.
 *
 * Complementa, NUNCA substitui, os testes ocultos: `Submission.status`
 * continua decidido só pelo EvaluatorService + Piston. A revisão vive
 * numa tabela à parte (CodeReview) e é exibida AO LADO do passa/falha.
 *
 * Gate de escopo (matriz §1.1, via EntitlementsService + Activity):
 * - Pro: só quando `Activity.isCapstone` (projeto final);
 * - Carreira: qualquer projeto;
 * - free: sem revisão (FeatureGuard 'code-review' já barra antes);
 * - instructor/admin: sem bloqueio (não são clientes do plano).
 * A revisão por pares (kind=peer) é da Fase 3 — aqui só kind=ai.
 */
@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    @InjectQueue(AI_REVIEWS_QUEUE) private readonly queue: Queue<AiReviewJobData>,
  ) {}

  async requestAiReview(userId: string, submissionId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { activity: { select: { isCapstone: true } } },
    });
    if (!submission) {
      throw new NotFoundException('Submissão não encontrada');
    }
    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!requester) {
      throw new NotFoundException('Usuário não encontrado');
    }
    const isStaff = requester.role !== Role.student;
    if (!isStaff && submission.userId !== userId) {
      throw new ForbiddenException('Você só pode pedir revisão das suas próprias submissões.');
    }
    if (!isStaff) {
      const plan = await this.entitlements.getUserPlan(userId);
      // Escopo lido da matriz única (plan-entitlements.ts), não duplicado aqui.
      const scope = PLAN_ENTITLEMENTS[plan].codeReviewScope;
      if (scope === 'none' || (scope === 'capstone' && !submission.activity.isCapstone)) {
        throw new ForbiddenException(
          scope === 'capstone'
            ? 'No plano Pro, a revisão por IA cobre apenas projetos finais. No Carreira, cobre todos os projetos.'
            : 'A revisão de código por IA faz parte de um plano pago.',
        );
      }
    }

    // Idempotente: revisão de IA já pedida (pendente ou concluída) volta
    // como está, sem enfileirar de novo e sem custo duplicado.
    const existing = await this.prisma.codeReview.findFirst({
      where: { submissionId, kind: 'ai' },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;

    const review = await this.prisma.codeReview.create({
      data: { submissionId, kind: 'ai', status: 'pending' },
    });
    await this.queue.add(
      'ai-review',
      { reviewId: review.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 30_000 } },
    );
    return review;
  }

  async listForSubmission(userId: string, submissionId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      select: { userId: true },
    });
    if (!submission) {
      throw new NotFoundException('Submissão não encontrada');
    }
    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!requester) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (requester.role === Role.student && submission.userId !== userId) {
      throw new ForbiddenException('Você só pode ver revisões das suas próprias submissões.');
    }
    return this.prisma.codeReview.findMany({
      where: { submissionId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
