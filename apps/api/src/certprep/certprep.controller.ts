import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { FeatureGuard } from '../plans/guards/feature.guard';
import { CertprepService, type DomainTally } from './certprep.service';

/**
 * Fase 5 premium (desenho §6.3) — rotas de cert-prep.
 * Listar exames é catálogo (qualquer aluno autenticado vê o formato);
 * criar tentativa e ver prontidão é Pro/Carreira (matriz §1.1).
 * Nenhuma rota serve questão de prova real: as questões do simulado
 * são Activities próprias, no formato da prova.
 */
@Controller('certprep')
export class CertprepController {
  constructor(private readonly certprep: CertprepService) {}

  @Get('exams')
  listExams() {
    return this.certprep.listExams();
  }

  @UseGuards(FeatureGuard('cert-prep'))
  @Post('exams/:id/attempts')
  createAttempt(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) examId: string,
    @Body() body: { domainScores: Record<string, DomainTally> },
  ) {
    return this.certprep.createAttempt(user.sub, examId, body.domainScores ?? {});
  }

  @UseGuards(FeatureGuard('cert-prep'))
  @Get('attempts/me')
  listMyAttempts(@CurrentUser() user: JwtPayload) {
    return this.certprep.listMyAttempts(user.sub);
  }

  @UseGuards(FeatureGuard('cert-prep'))
  @Get('attempts/:id/readiness')
  getReadiness(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) attemptId: string,
  ) {
    return this.certprep.getReadiness(user.sub, attemptId);
  }
}
