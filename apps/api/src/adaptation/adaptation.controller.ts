import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AdaptationService } from './adaptation.service';
import { LearnerModelService } from './learner-model.service';

// Sprint 21 — superfícies da adaptação v1 (autenticadas: derivam das
// submissões do próprio aluno).
@Controller('adaptation')
export class AdaptationController {
  constructor(
    private readonly adaptation: AdaptationService,
    private readonly learnerModel: LearnerModelService,
  ) {}

  /** Caminho do aluno no curso: módulos, test-out e próximo passo. */
  @Get('courses/:courseId/path')
  getCoursePath(
    @CurrentUser() user: JwtPayload,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.adaptation.getCoursePath(user.sub, courseId);
  }

  /** Conceitos frágeis (>= 3 falhas) com a oferta de reforço de cada um. */
  @Get('remediation')
  getRemediation(@CurrentUser() user: JwtPayload) {
    return this.adaptation.getRemediation(user.sub);
  }

  /**
   * Fase 5 (§6.4) — modelo do aluno (interface do tutor adaptativo):
   * o que domina, onde erra sempre, o que já revisou. É o mesmo modelo
   * que a tutora recebe no prompt; exposto aqui para a UI e verificação.
   */
  @Get('learner-model')
  getLearnerModel(@CurrentUser() user: JwtPayload) {
    return this.learnerModel.getLearnerModel(user.sub);
  }
}
