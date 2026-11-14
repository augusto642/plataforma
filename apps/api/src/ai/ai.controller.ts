import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { randomUUID } from 'crypto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AiTutorPlanGuard } from '../plans/guards/ai-tutor-plan.guard';
import { AiService } from './ai.service';
import { ChatWithTutorDto } from './dto/chat-with-tutor.dto';
import { RequestResearchDto } from './dto/request-research.dto';
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

  // B32 (Sprint 10) — os endpoints da tutora passam pelo entitlement
  // plano × nível de carreira (AiTutorPlanGuard): free usa a tutora no
  // Iniciante; do Júnior em diante é Pro. history (dados do próprio
  // aluno), complexity-analysis (utilitário da IDE) e socratic-cat-hint
  // (gato do jogo, sem contexto de usuário por desenho) ficam fora.
  @Post('hint/:submissionId')
  @UseGuards(AiTutorPlanGuard)
  requestHint(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ai.generatePedagogicalHint(submissionId, user.sub);
  }

  @Post('feedback/:submissionId')
  @UseGuards(AiTutorPlanGuard)
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
  @UseGuards(AiTutorPlanGuard)
  chat(
    @Body() dto: ChatWithTutorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ai.chatWithTutor(dto, user.sub);
  }

  // B3 — gatilho "modelo" (DESIGN §3.5): o aluno define uma meta; o serviço
  // consulta pesquisa aprovada ou cria o pedido pendente, e devolve a
  // trilha existente mais próxima + aviso honesto. Nunca publica pesquisa
  // nem chama provedores sozinho.
  @Post('research-request')
  @UseGuards(AiTutorPlanGuard)
  requestResearch(
    @Body() dto: RequestResearchDto,
  ) {
    return this.ai.requestResearchForGoal(dto.goal);
  }

  @Post('chat/stream')
  @UseGuards(AiTutorPlanGuard)
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
      // Sprint 22 — antes do primeiro chunk, o serviço informa a
      // proveniência da resposta (LLM × heurística) num evento SSE de
      // metadados: o cliente exibe o rótulo honesto ("modo offline")
      // quando a tutora de IA não respondeu. Eventos sem `chunk` são
      // ignorados por clientes antigos.
      const onSource = (info: {
        source: string;
        provider?: string;
        model?: string;
        fallbackReason?: string;
      }) => {
        res.write(`data: ${JSON.stringify(info)}\n\n`);
      };
      for await (const chunk of this.ai.streamChatWithTutor(dto, user.sub, onSource)) {
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
  @UseGuards(AiTutorPlanGuard)
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
  @UseGuards(AiTutorPlanGuard)
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
