import { Body, Controller, Get, Param, Post, Headers, Query, UseGuards } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { FeatureGuard } from '../plans/guards/feature.guard';
import { DiagnosticService } from './diagnostic.service';
import { SkillDiagnosticService } from './skill-diagnostic.service';
import { SubmitDiagnosticDto } from './dto/submit-diagnostic.dto';

// Funil anônimo primeiro (B09/B10): os três endpoints são públicos.
// No submit, um JWT válido é aceito de forma OPCIONAL para vincular o
// resultado à conta — sem token, o resultado fica anônimo, identificado
// apenas pelo sessionToken devolvido.
@Controller('diagnostic')
export class DiagnosticController {
  constructor(
    private readonly diagnostic: DiagnosticService,
    private readonly skillDiagnostic: SkillDiagnosticService,
  ) {}

  @Public()
  @Get('quiz')
  getQuiz() {
    return this.diagnostic.getPublicQuiz();
  }

  @Public()
  @Post('submit')
  submit(
    @Body() dto: SubmitDiagnosticDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.diagnostic.submit(dto, authorization);
  }

  @Public()
  @Get('result/:sessionToken')
  getResult(@Param('sessionToken') sessionToken: string) {
    return this.diagnostic.getResult(sessionToken);
  }

  // Fase 5 premium (desenho §6.1) — mapa de gaps por skill. Rotas NOVAS,
  // sem tocar nas rotas B09 acima. Guard Pro/Carreira (matriz §1.1):
  // o grátis segue com o diagnóstico B09; o mapa completo é pago.
  @UseGuards(FeatureGuard('diagnostic-full-map'))
  @Get('skills/me')
  getSkillMap(
    @CurrentUser() user: JwtPayload,
    @Query('targetJobId') targetJobId?: string,
  ) {
    return this.skillDiagnostic.getSkillMap(user.sub, targetJobId || undefined);
  }

  @UseGuards(FeatureGuard('diagnostic-full-map'))
  @Post('skills/refresh')
  refreshSkillMap(@CurrentUser() user: JwtPayload) {
    return this.skillDiagnostic.refreshSkillMap(user.sub);
  }
}
