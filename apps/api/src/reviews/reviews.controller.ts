import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { FeatureGuard } from '../plans/guards/feature.guard';
import { ReviewsService } from './reviews.service';

/**
 * Fase 2 premium (desenho §3.2) — rotas de revisão de código por IA.
 * Gate 'code-review' (Pro/Carreira); o escopo fino (Pro = só projeto
 * final) é conferido no serviço, que conhece a Activity. A revisão
 * aparece AO LADO do resultado dos testes, nunca no lugar dele.
 */
@Controller('reviews')
@UseGuards(FeatureGuard('code-review'))
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post('submissions/:submissionId')
  requestAiReview(
    @CurrentUser() user: JwtPayload,
    @Param('submissionId') submissionId: string,
  ) {
    return this.reviews.requestAiReview(user.sub, submissionId);
  }

  @Get('submissions/:submissionId')
  listForSubmission(
    @CurrentUser() user: JwtPayload,
    @Param('submissionId') submissionId: string,
  ) {
    return this.reviews.listForSubmission(user.sub, submissionId);
  }
}
