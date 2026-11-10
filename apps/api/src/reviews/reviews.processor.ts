import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { LlmClient } from '../ai/llm-client';
import { AiUsageService } from '../ai/llm/ai-usage.service';
import { EntitlementsService } from '../plans/entitlements.service';
import { PrismaService } from '../prisma/prisma.service';
import { extractJsonObject } from '../interview/interview.rubric';
import { asReviewRubric, buildReviewPrompt } from './review.rubric';
import { AI_REVIEWS_QUEUE, type AiReviewJobData } from './reviews.service';

/**
 * Fase 2 premium (desenho §3.2) — worker da fila `ai-reviews`.
 *
 * Custo controlado: 1 reserva de cota por revisão (plano efetivo do
 * dono da submissão). Sem reserva, a revisão volta a `pending` com o
 * aviso "cota do dia esgotada" — e NÃO reenfileira em loop: o aluno
 * pede de novo quando a cota renovar. Falha do provedor = estorno da
 * reserva + status `failed` (o retry com backoff vem das job options,
 * não de um loop manual) e nunca bloqueia o aluno: o passa/falha dos
 * testes já foi entregue pelo fluxo de submissão.
 *
 * Anti-vazamento (desenho §3.3d): o prompt recebe SOMENTE o
 * codeSnapshot + os testes visíveis (Activity.testCode). Testes ocultos
 * (hiddenTests) e solução de referência (referenceSolution) nunca são
 * lidos aqui — nem por acidente, pois o select os exclui.
 */
@Processor(AI_REVIEWS_QUEUE)
export class ReviewsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReviewsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClient,
    private readonly usage: AiUsageService,
    private readonly entitlements: EntitlementsService,
  ) {
    super();
  }

  async process(job: Job<AiReviewJobData>): Promise<{ status: string }> {
    const review = await this.prisma.codeReview.findUnique({
      where: { id: job.data.reviewId },
      include: {
        submission: {
          select: {
            userId: true,
            codeSnapshot: true,
            activity: { select: { language: true, testCode: true } },
          },
        },
      },
    });
    if (!review) {
      this.logger.warn(`ai-review ${job.data.reviewId}: revisão não encontrada, descartando job`);
      return { status: 'discarded' };
    }
    if (review.status === 'completed') return { status: 'already-completed' };

    const plan = await this.entitlements.getUserPlan(review.submission.userId);
    const reservation = await this.usage.reserve(review.submission.userId, plan);
    if (!reservation.ok) {
      // M17 (Lote 4) — backend de cota fora: fica pending com aviso de
      // indisponibilidade temporária (não de cota esgotada) — sem loop,
      // sem consumo, sem chamar o LLM.
      const unavailable = reservation.error === 'quota-unavailable';
      await this.prisma.codeReview.update({
        where: { id: review.id },
        data: {
          status: 'pending',
          note: unavailable
            ? 'O serviço de cota de IA está temporariamente indisponível. Peça a revisão novamente em instantes.'
            : `Cota diária de IA esgotada (${reservation.used}/${reservation.limit}). Peça a revisão novamente amanhã.`,
        },
      });
      return { status: unavailable ? 'quota-unavailable' : 'quota-exceeded' };
    }

    let raw: string;
    try {
      raw = await this.llm.complete({
        // Sem userId: a reserva já foi feita acima; passar userId aqui
        // debitaria a mesma revisão duas vezes (ver InterviewService).
        messages: [
          {
            role: 'user',
            content: buildReviewPrompt(
              review.submission.activity.language,
              review.submission.codeSnapshot ?? '',
              review.submission.activity.testCode,
            ),
          },
        ],
        jsonMode: true,
        purpose: 'code-review',
      });
    } catch (err) {
      await this.usage.refund(review.submission.userId);
      await this.prisma.codeReview.update({
        where: { id: review.id },
        data: { status: 'failed', note: 'A tutora estava indisponível; a revisão pode ser pedida novamente.' },
      });
      throw err;
    }

    const parsed = extractJsonObject(raw);
    const summary =
      typeof parsed?.summary === 'string' && parsed.summary.trim()
        ? parsed.summary
        : raw.slice(0, 2000);
    const suggestions = Array.isArray(parsed?.suggestions)
      ? parsed.suggestions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      : [];
    await this.prisma.codeReview.update({
      where: { id: review.id },
      data: {
        status: 'completed',
        rubric: asReviewRubric(parsed?.rubric),
        summary,
        suggestions,
        note: null,
      },
    });
    return { status: 'completed' };
  }
}
