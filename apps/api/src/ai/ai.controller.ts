import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { randomUUID } from 'crypto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AiService } from './ai.service';
import { ChatWithTutorDto } from './dto/chat-with-tutor.dto';
import { ComplexityAnalysisDto } from './dto/complexity-analysis.dto';
import { LineFeedbackDto } from './dto/line-feedback.dto';
import { SocraticCatHintDto } from './dto/socratic-cat-hint.dto';
import { SocraticGuidanceDto } from './dto/socratic-guidance.dto';
import { LineFeedbackService } from './line-feedback.service';
import { SocraticCatService } from './socratic-cat.service';

@Controller('ai')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly ai: AiService,
    private readonly lineFeedback: LineFeedbackService,
    private readonly socraticCat: SocraticCatService,
  ) {}

  @Post('hint/:submissionId')
  requestHint(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ai.generatePedagogicalHint(submissionId, user.sub);
  }

  @Post('feedback/:submissionId')
  getFeedback(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ai.generatePedagogicalHint(submissionId, user.sub);
  }

  @Get('history/:activityId')
  getHistory(
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ai.getChatHistory(user.sub, activityId);
  }

  @Post('chat')
  chat(
    @Body() dto: ChatWithTutorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ai.chatWithTutor(dto, user.sub);
  }

  @Post('chat/stream')
  async streamChat(
    @Body() dto: ChatWithTutorDto,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    try {
      for await (const chunk of this.ai.streamChatWithTutor(dto, user.sub)) {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
      res.write(`data: [DONE]\n\n`);
    } catch (err: any) {
      // Nunca vazar err.message ao cliente (pode expor detalhes internos,
      // URLs de upstream ou chaves). Loga com correlation id para o suporte.
      const errorId = randomUUID();
      this.logger.error(
        `[${errorId}] SSE stream error in /ai/chat/stream (user=${user.sub}, activity=${dto.activityId}): ${err?.message || err}`,
        err?.stack,
      );
      res.write(
        `data: ${JSON.stringify({ error: 'Não foi possível concluir a resposta do tutor agora. Tente novamente em instantes.', errorId })}\n\n`,
      );
    } finally {
      res.end();
    }
  }

  @Post('complexity-analysis')
  analyzeComplexity(
    @Body() dto: ComplexityAnalysisDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ai.analyzeComplexity(dto.code, dto.activityId);
  }

  @Post('line-feedback')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  requestLineFeedback(
    @Body() dto: LineFeedbackDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lineFeedback.analyze(dto.submissionId, user.sub, user.role);
  }

  /**
   * Socratic hints agora exigem JWT (finding MÉDIA — AppSec): eram @Public(),
   * permitindo que não autenticados consumissem a AI_API_KEY (custo/abuso)
   * e vetores de prompt injection. O front (LumiAITutorDrawer/AITutorPanel)
   * já envia cookies via apiFetch com credentials:'include'.
   */
  @Post('socratic-hint')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  getSocraticHint(
    @Body() dto: SocraticGuidanceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ai.generateSocraticGuidance(dto, user.sub);
  }

  @Post('socratic-cat-hint')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  getSocraticCatHint(@Body() dto: SocraticCatHintDto) {
    return this.socraticCat.generateCatHint(dto);
  }
}
