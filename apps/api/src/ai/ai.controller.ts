import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AiService } from './ai.service';
import { ChatWithTutorDto } from './dto/chat-with-tutor.dto';
import { ComplexityAnalysisDto } from './dto/complexity-analysis.dto';
import { LineFeedbackDto } from './dto/line-feedback.dto';
import { LineFeedbackService } from './line-feedback.service';

@Controller('ai')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly lineFeedback: LineFeedbackService,
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
      res.write(`data: ${JSON.stringify({ error: err?.message || 'Stream error' })}\n\n`);
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
}
