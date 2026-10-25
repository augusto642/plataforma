import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { FeatureGuard } from '../plans/guards/feature.guard';
import { CommunityService } from './community.service';
import { CreatePostDto, CreateThreadDto, SubmitPeerReviewDto } from './dto/community.dto';
import { PeerReviewsService } from './peer-reviews.service';

/**
 * Fase 3 premium (desenho §4.2) — fórum, galeria de soluções e pares.
 *
 * Gates (matriz §1.1): ler é livre; postar/comentar/compartilhar/
 * revisar exigem `community-post` (Pro/Carreira; staff passa direto).
 * Sinalizar um post é livre para qualquer aluno autenticado.
 * A galeria nunca devolve testes ocultos nem solução de referência.
 */
@Controller('community')
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get('threads')
  listThreads(@Query('activityId') activityId?: string) {
    return this.community.listThreads(activityId);
  }

  @Post('threads')
  @UseGuards(FeatureGuard('community-post'))
  createThread(@CurrentUser() user: JwtPayload, @Body() dto: CreateThreadDto) {
    return this.community.createThread(user.sub, dto.title, dto.body, dto.activityId);
  }

  @Get('threads/:id/posts')
  listPosts(@Param('id') id: string) {
    return this.community.listPosts(id);
  }

  @Post('threads/:id/posts')
  @UseGuards(FeatureGuard('community-post'))
  createPost(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.community.createPost(user.sub, id, dto.body);
  }

  @Post('posts/:id/flag')
  flagPost(@Param('id') id: string) {
    return this.community.flagPost(id);
  }

  @Get('solutions/:activityId')
  listSolutions(@Param('activityId') activityId: string) {
    return this.community.listSolutions(activityId);
  }

  @Post('solutions/:submissionId/share')
  @UseGuards(FeatureGuard('community-post'))
  shareSolution(@CurrentUser() user: JwtPayload, @Param('submissionId') submissionId: string) {
    return this.community.shareSolution(user.sub, submissionId);
  }

  @Post('solutions/:submissionId/unshare')
  @UseGuards(FeatureGuard('community-post'))
  unshareSolution(@CurrentUser() user: JwtPayload, @Param('submissionId') submissionId: string) {
    return this.community.unshareSolution(user.sub, submissionId);
  }

  @Get('reputation/me')
  reputation(@CurrentUser() user: JwtPayload) {
    return this.community.reviewerReputation(user.sub);
  }
}

/**
 * Revisão por pares — sob o prefixo `/reviews` do desenho §4.2 (não
 * no controller da Fase 2, cujo guard de classe é `code-review` da IA;
 * aqui o gate é `community-post`, porque revisar é postar).
 */
@Controller('reviews')
export class PeerReviewsController {
  constructor(private readonly peers: PeerReviewsService) {}

  @Post('submissions/:submissionId/peer')
  @UseGuards(FeatureGuard('community-post'))
  requestPeerReview(
    @CurrentUser() user: JwtPayload,
    @Param('submissionId') submissionId: string,
  ) {
    return this.peers.requestPeerReview(user.sub, submissionId);
  }

  @Get('peer/open')
  @UseGuards(FeatureGuard('community-post'))
  listOpenRequests(@CurrentUser() user: JwtPayload) {
    return this.peers.listOpenRequests(user.sub);
  }

  @Post('peer/:reviewId')
  @UseGuards(FeatureGuard('community-post'))
  submitReview(
    @CurrentUser() user: JwtPayload,
    @Param('reviewId') reviewId: string,
    @Body() dto: SubmitPeerReviewDto,
  ) {
    return this.peers.submitReview(user.sub, reviewId, {
      rubric: dto.rubric,
      summary: dto.summary,
      suggestions: dto.suggestions,
    });
  }
}

/**
 * Moderação — fila admin (desenho §4.2). A tutora pode sinalizar
 * conteúdo impróprio pela mesma rota de flag, mas a DECISÃO (ocultar
 * ou limpar a flag) é humana, aqui.
 */
@Controller('admin/community')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin)
export class CommunityAdminController {
  constructor(private readonly community: CommunityService) {}

  @Get('flags')
  flaggedQueue() {
    return this.community.flaggedQueue();
  }

  @Post('posts/:id/hide')
  hidePost(@Param('id') id: string) {
    return this.community.hidePost(id);
  }

  @Post('posts/:id/clear-flag')
  clearFlag(@Param('id') id: string) {
    return this.community.clearFlag(id);
  }
}
