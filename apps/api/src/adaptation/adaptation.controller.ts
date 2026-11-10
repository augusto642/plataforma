import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AdaptationService } from './adaptation.service';

// Sprint 21 — superfícies da adaptação v1 (autenticadas: derivam das
// submissões do próprio aluno).
@Controller('adaptation')
export class AdaptationController {
  constructor(private readonly adaptation: AdaptationService) {}

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
}
