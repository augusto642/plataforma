import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { LlmClient } from '../ai/llm-client';
import { AiUsageService } from '../ai/llm/ai-usage.service';
import { EntitlementsService } from '../plans/entitlements.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  asScoreMap,
  asStringArray,
  buildReportPrompt,
  buildTurnPrompt,
  criteriaForMode,
  extractJsonObject,
  INTERVIEW_MAX_TURNS,
  starterQuestion,
  type InterviewMode,
} from './interview.rubric';

/**
 * Fase 2 premium (desenho §3.1) — simulador de entrevista com IA.
 *
 * É um MODO da tutora existente, não um cliente de LLM novo: cada turno
 * usa `LlmClient` (Gemini / OpenAI-compatível / Ollama, por config) e
 * cada chamada é debitada da cota do plano via `AiUsageService.reserve()`
 * com o plano EFETIVO (EntitlementsService — Subscription ativa, senão
 * User.plan). A reserva é feita aqui, e o `LlmClient` é chamado SEM
 * userId, para a mesma chamada não ser debitada duas vezes (o gateway
 * reserva de novo quando recebe userId). Falha do provedor = estorno.
 *
 * Anti-bajulação: a avaliação de cada turno e o relatório final seguem
 * a rubrica explícita (`interview.rubric.ts`) — nota sem evidência
 * citada da resposta não vale. O relatório é DADO PERSISTIDO
 * (InterviewReport), não chat efêmero.
 *
 * Posicionamento (UI): treino, não substituto de entrevista humana real.
 * Cap: 20 turnos (respostas do candidato) por sessão; 1 sessão ativa
 * por usuário — evita drenar a cota de 200/dia.
 */
@Injectable()
export class InterviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClient,
    private readonly usage: AiUsageService,
    private readonly entitlements: EntitlementsService,
  ) {}

  /** 1 chamada LLM debitada da cota; sem reserva = 429 `quota-exceeded`. */
  private async reserveOneCall(userId: string): Promise<void> {
    const plan = await this.entitlements.getUserPlan(userId);
    const reservation = await this.usage.reserve(userId, plan);
    if (!reservation.ok) {
      throw new HttpException(
        {
          message: `Cota diária de IA esgotada (${reservation.used}/${reservation.limit} chamadas). Tente novamente amanhã.`,
          reason: 'quota-exceeded',
          used: reservation.used,
          limit: reservation.limit,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async callLlm(prompt: string, purpose: string): Promise<string> {
    return this.llm.complete({
      messages: [{ role: 'user', content: prompt }],
      jsonMode: true,
      purpose,
    });
  }

  private async loadOwnedSession(userId: string, sessionId: string) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { turns: { orderBy: { createdAt: 'asc' } }, report: true },
    });
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Sessão de entrevista não encontrada');
    }
    return session;
  }

  async createSession(userId: string, mode: InterviewMode, track?: string) {
    const active = await this.prisma.interviewSession.findFirst({
      where: { userId, status: 'active' },
    });
    if (active) {
      throw new ConflictException(
        'Você já tem uma sessão de entrevista ativa. Finalize-a antes de começar outra.',
      );
    }
    // Criação NÃO consome LLM nem cota (desenho: 1 chamada por turno de
    // resposta + 1 no relatório): a primeira pergunta é determinística.
    const session = await this.prisma.interviewSession.create({
      data: {
        userId,
        mode,
        track: track?.trim() ? track.trim().slice(0, 64) : null,
        turns: { create: [{ role: 'interviewer', content: starterQuestion(mode, track) }] },
      },
      include: { turns: { orderBy: { createdAt: 'asc' } }, report: true },
    });
    return session;
  }

  async listMySessions(userId: string) {
    return this.prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        turns: { orderBy: { createdAt: 'asc' } },
        report: true,
      },
    });
  }

  async getSession(userId: string, sessionId: string) {
    return this.loadOwnedSession(userId, sessionId);
  }

  async answer(userId: string, sessionId: string, content: string) {
    const session = await this.loadOwnedSession(userId, sessionId);
    if (session.status !== 'active') {
      throw new ConflictException('Esta sessão já foi finalizada.');
    }
    const candidateTurns = session.turns.filter((t) => t.role === 'candidate');
    if (candidateTurns.length >= INTERVIEW_MAX_TURNS) {
      throw new ConflictException(
        `Limite de ${INTERVIEW_MAX_TURNS} turnos por sessão atingido. Finalize a sessão para ver o relatório.`,
      );
    }

    await this.reserveOneCall(userId);
    let raw: string;
    try {
      raw = await this.callLlm(
        buildTurnPrompt(session.mode as InterviewMode, session.track, session.turns, content),
        'interview',
      );
    } catch {
      // Falha do provedor não consome a cota do aluno.
      await this.usage.refund(userId);
      throw new ServiceUnavailableException(
        'A tutora está indisponível no momento. Sua resposta não foi registrada — tente novamente.',
      );
    }

    const parsed = extractJsonObject(raw);
    const criteria = criteriaForMode(session.mode as InterviewMode);
    const evaluation = asScoreMap(parsed?.scores, criteria);
    const feedback = typeof parsed?.feedback === 'string' ? parsed.feedback : '';
    const nextQuestion =
      typeof parsed?.nextQuestion === 'string' && parsed.nextQuestion.trim()
        ? parsed.nextQuestion
        : null;
    const interviewerContent =
      feedback && nextQuestion
        ? `${feedback}\n\nPróxima pergunta: ${nextQuestion}`
        : feedback || nextQuestion || raw;

    // Turno do candidato + avaliação + próxima pergunta salvos juntos;
    // se a gravação falhar, nada fica pela metade no histórico.
    await this.prisma.$transaction([
      this.prisma.interviewTurn.create({
        data: { sessionId, role: 'candidate', content, evaluation },
      }),
      this.prisma.interviewTurn.create({
        data: { sessionId, role: 'interviewer', content: interviewerContent },
      }),
    ]);
    return this.loadOwnedSession(userId, sessionId);
  }

  async finish(userId: string, sessionId: string) {
    const session = await this.loadOwnedSession(userId, sessionId);
    if (session.report) return session.report;
    if (session.status !== 'active') {
      throw new ConflictException('Esta sessão já foi finalizada.');
    }
    const candidateTurns = session.turns.filter((t) => t.role === 'candidate');
    if (candidateTurns.length === 0) {
      throw new ConflictException(
        'Responda ao menos uma pergunta antes de finalizar a sessão.',
      );
    }

    const criteria = criteriaForMode(session.mode as InterviewMode);
    let reportData: {
      scores: Record<string, { score: number; evidence: string }>;
      strengths: string[];
      gaps: string[];
      nextSteps: string[];
    } | null = null;

    await this.reserveOneCall(userId);
    try {
      const raw = await this.callLlm(
        buildReportPrompt(session.mode as InterviewMode, session.track, session.turns),
        'interview-report',
      );
      const parsed = extractJsonObject(raw);
      if (parsed) {
        reportData = {
          scores: asScoreMap(parsed.scores, criteria),
          strengths: asStringArray(parsed.strengths),
          gaps: asStringArray(parsed.gaps),
          nextSteps: asStringArray(parsed.nextSteps),
        };
      }
    } catch {
      // Sem LLM, o relatório cai para a agregação determinística das
      // avaliações por turno (dados reais, sem inventar desempenho).
      await this.usage.refund(userId);
    }
    if (!reportData) {
      reportData = this.fallbackReport(session.turns, criteria);
      if (!reportData) {
        throw new ServiceUnavailableException(
          'Não foi possível gerar o relatório agora. A sessão continua ativa — tente finalizar novamente.',
        );
      }
    }

    const [report] = await this.prisma.$transaction([
      this.prisma.interviewReport.create({
        data: {
          sessionId,
          scores: reportData.scores,
          strengths: reportData.strengths,
          gaps: reportData.gaps,
          nextSteps: reportData.nextSteps,
        },
      }),
      this.prisma.interviewSession.update({
        where: { id: sessionId },
        data: { status: 'completed', endedAt: new Date() },
      }),
    ]);
    return report;
  }

  async getReport(userId: string, sessionId: string) {
    const session = await this.loadOwnedSession(userId, sessionId);
    if (!session.report) {
      throw new NotFoundException('Esta sessão ainda não tem relatório. Finalize-a primeiro.');
    }
    return session.report;
  }

  /**
   * Relatório sem LLM: média das avaliações por turno. Critério com
   * média >= 4 vira ponto forte; < 3 vira ponto fraco; o próximo passo
   * é estudar o critério mais fraco. Nunca inventa nota: sem nenhuma
   * avaliação por turno, retorna null e o finish falha com 503.
   */
  private fallbackReport(
    turns: Array<{ role: string; evaluation?: unknown }>,
    criteria: Array<{ key: string; label: string }>,
  ): {
    scores: Record<string, { score: number; evidence: string }>;
    strengths: string[];
    gaps: string[];
    nextSteps: string[];
  } | null {
    const sums = new Map<string, { total: number; count: number }>();
    for (const turn of turns) {
      if (turn.role !== 'candidate') continue;
      const evaluation =
        turn.evaluation && typeof turn.evaluation === 'object'
          ? (turn.evaluation as Record<string, { score?: unknown }>)
          : null;
      if (!evaluation) continue;
      for (const c of criteria) {
        const score = evaluation[c.key]?.score;
        if (typeof score !== 'number') continue;
        const acc = sums.get(c.key) ?? { total: 0, count: 0 };
        acc.total += score;
        acc.count += 1;
        sums.set(c.key, acc);
      }
    }
    if (sums.size === 0) return null;
    const scores: Record<string, { score: number; evidence: string }> = {};
    const strengths: string[] = [];
    const gaps: string[] = [];
    let weakest: { key: string; label: string; avg: number } | null = null;
    for (const c of criteria) {
      const acc = sums.get(c.key);
      const avg = acc ? Math.round((acc.total / acc.count) * 10) / 10 : 0;
      scores[c.key] = { score: avg, evidence: 'média das avaliações por turno' };
      if (avg >= 4) strengths.push(c.label);
      if (avg < 3) gaps.push(c.label);
      if (!weakest || avg < weakest.avg) weakest = { key: c.key, label: c.label, avg };
    }
    return {
      scores,
      strengths,
      gaps,
      nextSteps: weakest ? [`Revisar ${weakest.label.toLowerCase()}`] : [],
    };
  }
}
