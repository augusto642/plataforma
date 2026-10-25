import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { FeatureGuard } from '../plans/guards/feature.guard';
import { AnswerInterviewDto, CreateInterviewSessionDto } from './dto/interview.dto';
import { InterviewService } from './interview.service';

/**
 * Fase 2 premium (desenho §3.1) — rotas do simulador de entrevista.
 * Gate Pro/Carreira pelo FeatureGuard ('interview-simulator'); free
 * recebe 403 antes de qualquer chamada LLM ou reserva de cota.
 * Posicionamento: treino, não substituto de entrevista humana real.
 */
@Controller('interview')
@UseGuards(FeatureGuard('interview-simulator'))
export class InterviewController {
  constructor(private readonly interview: InterviewService) {}

  @Post('sessions')
  createSession(@CurrentUser() user: JwtPayload, @Body() dto: CreateInterviewSessionDto) {
    return this.interview.createSession(user.sub, dto.mode, dto.track);
  }

  @Get('sessions/me')
  listMySessions(@CurrentUser() user: JwtPayload) {
    return this.interview.listMySessions(user.sub);
  }

  @Get('sessions/:id')
  getSession(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.interview.getSession(user.sub, id);
  }

  @Post('sessions/:id/answer')
  answer(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AnswerInterviewDto,
  ) {
    return this.interview.answer(user.sub, id, dto.content);
  }

  @Post('sessions/:id/finish')
  finish(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.interview.finish(user.sub, id);
  }

  @Get('sessions/:id/report')
  getReport(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.interview.getReport(user.sub, id);
  }
}
