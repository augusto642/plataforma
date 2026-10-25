import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { REVIEW_CRITERIA } from '../reviews/review.rubric';
import { PrismaService } from '../prisma/prisma.service';
import {
  PEER_REVIEWER_BADGE,
  PEER_REVIEWER_BADGE_THRESHOLD,
} from './community.service';

export interface PeerReviewInput {
  rubric: Record<string, { score: number; comment: string }>;
  summary: string;
  suggestions: string[];
}

/**
 * Fase 3 premium (desenho §4.2) — revisão por pares.
 *
 * REUTILIZA `CodeReview(kind=peer)` da Fase 2 — é a mesma tabela da
 * revisão por IA, distinguida pelo `kind`. Diferenças que importam:
 * - quem escreve é um ALUNO (par), não o LLM — nada de cota de IA, nada
 *   de fila `ai-reviews`, nada de prompt;
 * - o revisor preenche a mesma rubrica da Fase 2 (legibilidade,
 *   estrutura, nomes, casos de borda), com nota 0–5 por critério;
 * - a revisão NUNCA altera `Submission.status` (a tabela é à parte,
 *   como na revisão por IA);
 * - o autor pede explicitamente (opt-in): só pedidos abertos aparecem
 *   para revisores, e o revisor vê o `codeSnapshot` porque o autor
 *   pediu — nunca por padrão.
 *
 * Reputação: contagem de revisões concluídas (derivada, sem tabela
 * nova); ao atingir o limiar, o revisor ganha o badge `peer_reviewer`
 * via `UserBadge` existente.
 */
@Injectable()
export class PeerReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** O autor pede revisão por pares da sua própria submissão. */
  async requestPeerReview(authorId: string, submissionId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      select: { id: true, userId: true },
    });
    if (!submission) throw new NotFoundException('Submissão não encontrada');
    if (submission.userId !== authorId) {
      throw new ForbiddenException('Você só pode pedir revisão das suas próprias submissões.');
    }
    const pending = await this.prisma.codeReview.findFirst({
      where: { submissionId, kind: 'peer', status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    if (pending) return pending;
    return this.prisma.codeReview.create({
      data: { submissionId, kind: 'peer', status: 'pending' },
    });
  }

  /**
   * Pedidos abertos para revisar: só de OUTROS alunos, só pendentes.
   * O revisor recebe o código (o autor pediu) + o título da atividade
   * — nunca testes ocultos nem solução de referência.
   */
  async listOpenRequests(reviewerId: string) {
    const reviews = await this.prisma.codeReview.findMany({
      where: {
        kind: 'peer',
        status: 'pending',
        submission: { userId: { not: reviewerId } },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        submission: {
          select: {
            id: true,
            codeSnapshot: true,
            createdAt: true,
            user: { select: { id: true, name: true, nickname: true } },
            activity: { select: { id: true, title: true } },
          },
        },
      },
    });
    return reviews.map((r) => ({
      reviewId: r.id,
      requestedAt: r.createdAt,
      author: r.submission.user,
      activity: r.submission.activity,
      codeSnapshot: r.submission.codeSnapshot,
    }));
  }

  /** O par entrega a revisão (rubrica + resumo + sugestões). */
  async submitReview(reviewerId: string, reviewId: string, input: PeerReviewInput) {
    const review = await this.prisma.codeReview.findUnique({
      where: { id: reviewId },
      include: { submission: { select: { userId: true } } },
    });
    if (!review) throw new NotFoundException('Revisão não encontrada');
    if (review.kind !== 'peer') {
      throw new ForbiddenException('Esta revisão não é uma revisão por pares.');
    }
    if (review.status !== 'pending') {
      throw new ForbiddenException('Esta revisão já foi concluída.');
    }
    if (review.submission.userId === reviewerId) {
      throw new ForbiddenException('Você não pode revisar o seu próprio código.');
    }
    this.validateRubric(input.rubric);

    const completed = await this.prisma.codeReview.update({
      where: { id: reviewId },
      data: {
        reviewerId,
        status: 'completed',
        rubric: input.rubric,
        summary: input.summary,
        suggestions: input.suggestions,
      },
    });
    await this.maybeAwardReviewerBadge(reviewerId);
    return completed;
  }

  /** Rubrica da Fase 2, com nota 0–5 por critério (sem critério inventado). */
  private validateRubric(rubric: PeerReviewInput['rubric']) {
    const keys = REVIEW_CRITERIA.map((c) => c.key);
    for (const key of keys) {
      const criterion = rubric?.[key];
      if (
        !criterion ||
        typeof criterion.score !== 'number' ||
        criterion.score < 0 ||
        criterion.score > 5 ||
        typeof criterion.comment !== 'string'
      ) {
        throw new ForbiddenException(
          `Rubrica inválida: o critério "${key}" exige nota de 0 a 5 com comentário.`,
        );
      }
    }
  }

  private async maybeAwardReviewerBadge(reviewerId: string) {
    const count = await this.prisma.codeReview.count({
      where: { reviewerId, kind: 'peer', status: 'completed' },
    });
    if (count < PEER_REVIEWER_BADGE_THRESHOLD) return;
    const existing = await this.prisma.userBadge.findUnique({
      where: { userId_badgeCode: { userId: reviewerId, badgeCode: PEER_REVIEWER_BADGE } },
    });
    if (existing) return;
    await this.prisma.userBadge.create({
      data: {
        userId: reviewerId,
        badgeCode: PEER_REVIEWER_BADGE,
        title: 'Revisor da comunidade',
        description: 'Concluiu 5 ou mais revisões por pares úteis para outros alunos.',
        icon: '🤝',
      },
    });
  }
}
