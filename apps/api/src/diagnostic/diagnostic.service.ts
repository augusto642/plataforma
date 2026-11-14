import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import {
  DIAGNOSTIC_TEST_OUT_MODULE_TAG,
  TRACK_TO_COURSE_SLUG,
  diagnosticShowsCodeKnowledge,
  primaryModuleTag,
} from '../adaptation/adaptation.rules';
import { SPINE_MODULE_BY_TAG } from '../adaptation/data/concept-spine';
import { DynamicTrackService } from '../dynamic-track/dynamic-track.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ARCHETYPES,
  AXES,
  AXIS_TO_ARCHETYPE,
  FLAT_PROFILE_MARGIN,
  KNOWLEDGE_CORRECT_POINTS,
  KNOWLEDGE_WRONG_POINTS,
  QUESTIONS,
  QUIZ_VERSION,
  TRACK_NAMES,
  type ArchetypeDef,
  type AxisId,
  type QuizQuestionDef,
  type TrackId,
} from './data/quiz-v1';
import { SubmitDiagnosticDto } from './dto/submit-diagnostic.dto';

export interface PublicQuizOption {
  id: string;
  label: string;
}

export interface PublicQuizQuestion {
  id: string;
  axis: AxisId;
  type: 'knowledge' | 'preference';
  prompt: string;
  options: PublicQuizOption[];
}

export interface PublicQuiz {
  version: string;
  questions: PublicQuizQuestion[];
}

export type DiagnosticScores = Record<AxisId, number>;

export interface DiagnosticResultView {
  sessionToken: string;
  scores: DiagnosticScores;
  archetype: {
    id: string;
    name: string;
    description: string;
    /** Lista de frases de pontos fortes (contrato com o web: string[]). */
    strengths: string[];
  };
  recommendedTrack: TrackId;
  /** Nome legível da trilha recomendada (ver TRACK_NAMES em quiz-v1.ts). */
  recommendedTrackName: string;
  /**
   * Sprint 21 (adaptação v1) — a recomendação vira OFERTA REAL: o curso
   * do catálogo para o qual o TrackId aponta (TRACK_TO_COURSE_SLUG).
   * `null` quando o curso não existe no banco — nunca um slug fabricado.
   */
  recommendedCourse: { slug: string; title: string } | null;
  /**
   * Sprint 21 — ponto de entrada: preenchido apenas quando o aluno
   * acertou TODAS as questões de conhecimento do eixo `codigo`
   * (diagnosticShowsCodeKnowledge). É uma RECOMENDAÇÃO de provar o
   * módulo pelo test-out; o crédito continua vindo de passar no
   * desafio de entrada — o diagnóstico nunca conclui módulo sozinho.
   */
  recommendedTestOut: {
    courseSlug: string;
    moduleTag: string;
    moduleTitle: string;
  } | null;
}

interface ScoredProfile {
  scores: DiagnosticScores;
  archetype: ArchetypeDef;
}

/** Máximo bruto alcançável por eixo, derivado dos dados do quiz. */
const MAX_RAW: Record<AxisId, number> = computeMaxRaw();

function computeMaxRaw(): Record<AxisId, number> {
  const max = Object.fromEntries(AXES.map((a) => [a, 0])) as Record<
    AxisId,
    number
  >;
  for (const q of QUESTIONS) {
    if (q.type === 'knowledge') {
      max[q.axis] += KNOWLEDGE_CORRECT_POINTS;
    } else {
      for (const axis of AXES) {
        const best = Math.max(
          0,
          ...q.options.map((o) => o.weights?.[axis] ?? 0),
        );
        max[axis] += best;
      }
    }
  }
  return max;
}

@Injectable()
export class DiagnosticService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Optional() private readonly dynamicTrack?: DynamicTrackService,
  ) {}

  /**
   * Quiz público: apenas o que o front precisa para renderizar.
   * NUNCA inclui correctOptionId, pesos ou qualquer gabarito.
   */
  getPublicQuiz(): PublicQuiz {
    return {
      version: QUIZ_VERSION,
      questions: QUESTIONS.map((q) => ({
        id: q.id,
        axis: q.axis,
        type: q.type,
        prompt: q.prompt,
        options: q.options.map((o) => ({ id: o.id, label: o.label })),
      })),
    };
  }

  async submit(
    dto: SubmitDiagnosticDto,
    authorizationHeader?: string,
  ): Promise<DiagnosticResultView> {
    const answers = this.validateAnswers(dto.answers);
    const { scores, archetype } = this.score(answers);
    const userId = await this.optionalUserId(authorizationHeader);
    const offer = await this.buildOffer(archetype.recommendedTrack, answers);

    const data = {
      quizVersion: QUIZ_VERSION,
      answers: answers as unknown as object,
      scores: scores as unknown as object,
      archetype: archetype.id,
    };

    // Retomada: se o token já existe e está livre (sem dono ou do mesmo
    // usuário), atualiza o resultado daquela sessão. Se pertence a outro
    // usuário, não vaza nem sobrescreve: cria um resultado novo com
    // token novo.
    if (dto.sessionToken) {
      const existing = await this.prisma.diagnosticResult.findUnique({
        where: { sessionToken: dto.sessionToken },
      });
      if (existing && (existing.userId === null || existing.userId === userId)) {
        const updated = await this.prisma.diagnosticResult.update({
          where: { id: existing.id },
          data: { ...data, userId: existing.userId ?? userId },
        });
        const ownerId = existing.userId ?? userId;
        if (ownerId) {
          await this.dynamicTrack
            ?.syncFromDiagnostic(ownerId, archetype.recommendedTrack)
            .catch(() => undefined);
        }
        return this.toView(updated.sessionToken, scores, archetype, offer);
      }
      if (!existing) {
        const created = await this.prisma.diagnosticResult.create({
          data: { ...data, sessionToken: dto.sessionToken, userId },
        });
        if (userId) {
          await this.dynamicTrack
            ?.syncFromDiagnostic(userId, archetype.recommendedTrack)
            .catch(() => undefined);
        }
        return this.toView(created.sessionToken, scores, archetype, offer);
      }
    }

    const created = await this.prisma.diagnosticResult.create({
      data: { ...data, sessionToken: randomUUID(), userId },
    });
    if (userId) {
      await this.dynamicTrack
        ?.syncFromDiagnostic(userId, archetype.recommendedTrack)
        .catch(() => undefined);
    }
    return this.toView(created.sessionToken, scores, archetype, offer);
  }

  async getResult(sessionToken: string): Promise<DiagnosticResultView> {
    const found = await this.prisma.diagnosticResult.findUnique({
      where: { sessionToken },
    });
    if (!found) {
      throw new NotFoundException('Resultado do diagnóstico não encontrado.');
    }
    const archetype = ARCHETYPES[found.archetype as keyof typeof ARCHETYPES];
    if (!archetype) {
      throw new NotFoundException('Resultado do diagnóstico não encontrado.');
    }
    const answers = Array.isArray(found.answers)
      ? (found.answers as { questionId: string; optionId: string }[])
      : [];
    const offer = await this.buildOffer(archetype.recommendedTrack, answers);
    return this.toView(
      found.sessionToken,
      found.scores as unknown as DiagnosticScores,
      archetype,
      offer,
    );
  }

  /**
   * Monta a oferta da adaptação v1 a partir do TrackId recomendado:
   * resolve o curso REAL do catálogo e, quando o sinal de conhecimento
   * de código está presente, a recomendação de test-out do módulo 1.
   * Curso ausente no banco ⇒ oferta nula (a view cai no rótulo de hoje).
   */
  private async buildOffer(
    recommendedTrack: TrackId,
    answers: { questionId: string; optionId: string }[],
  ): Promise<{
    recommendedCourse: DiagnosticResultView['recommendedCourse'];
    recommendedTestOut: DiagnosticResultView['recommendedTestOut'];
  }> {
    const slug = TRACK_TO_COURSE_SLUG[recommendedTrack];
    const course = await this.prisma.course.findUnique({
      where: { slug },
      select: {
        slug: true,
        title: true,
        activities: { select: { conceptTags: true } },
      },
    });
    if (!course) {
      return { recommendedCourse: null, recommendedTestOut: null };
    }

    let recommendedTestOut: DiagnosticResultView['recommendedTestOut'] = null;
    if (diagnosticShowsCodeKnowledge(answers)) {
      const hasEntryModule = course.activities.some(
        (a) =>
          primaryModuleTag(a.conceptTags) === DIAGNOSTIC_TEST_OUT_MODULE_TAG,
      );
      if (hasEntryModule) {
        recommendedTestOut = {
          courseSlug: course.slug,
          moduleTag: DIAGNOSTIC_TEST_OUT_MODULE_TAG,
          moduleTitle:
            SPINE_MODULE_BY_TAG.get(DIAGNOSTIC_TEST_OUT_MODULE_TAG)?.title ??
            DIAGNOSTIC_TEST_OUT_MODULE_TAG,
        };
      }
    }

    return {
      recommendedCourse: { slug: course.slug, title: course.title },
      recommendedTestOut,
    };
  }

  /**
   * Scoring determinístico (ver data/quiz-v1.ts):
   * - conhecimento: certo +10 / errado +3 no eixo da questão;
   * - preferência: soma os pesos da opção escolhida;
   * - normalização 0–100 pelo máximo alcançável de cada eixo;
   * - arquétipo: eixo dominante (desempate: maior subtotal de preferência,
   *   depois a ordem fixa de AXES). Se a vantagem do líder sobre o segundo
   *   for <= FLAT_PROFILE_MARGIN, o perfil é equilibrado → explorador.
   */
  score(answers: { questionId: string; optionId: string }[]): ScoredProfile {
    const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
    const raw = Object.fromEntries(AXES.map((a) => [a, 0])) as Record<
      AxisId,
      number
    >;
    const preferenceRaw = { ...raw };

    for (const answer of answers) {
      const question = byId.get(answer.questionId) as QuizQuestionDef;
      const option = question.options.find((o) => o.id === answer.optionId);
      if (question.type === 'knowledge') {
        raw[question.axis] +=
          answer.optionId === question.correctOptionId
            ? KNOWLEDGE_CORRECT_POINTS
            : KNOWLEDGE_WRONG_POINTS;
      } else if (option?.weights) {
        for (const [axis, points] of Object.entries(option.weights)) {
          raw[axis as AxisId] += points ?? 0;
          preferenceRaw[axis as AxisId] += points ?? 0;
        }
      }
    }

    const scores = Object.fromEntries(
      AXES.map((axis) => [
        axis,
        Math.round((raw[axis] / MAX_RAW[axis]) * 100),
      ]),
    ) as DiagnosticScores;

    const ranked = [...AXES].sort((a, b) => {
      if (scores[b] !== scores[a]) return scores[b] - scores[a];
      if (preferenceRaw[b] !== preferenceRaw[a])
        return preferenceRaw[b] - preferenceRaw[a];
      return AXES.indexOf(a) - AXES.indexOf(b);
    });

    const [leader, runnerUp] = ranked;
    const archetype =
      scores[leader] - scores[runnerUp] <= FLAT_PROFILE_MARGIN
        ? ARCHETYPES.explorador
        : ARCHETYPES[AXIS_TO_ARCHETYPE[leader]];

    return { scores, archetype };
  }

  /** Validação semântica contra o banco de questões versionado. */
  private validateAnswers(
    answers: { questionId: string; optionId: string }[],
  ): { questionId: string; optionId: string }[] {
    const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
    const seen = new Set<string>();
    for (const answer of answers) {
      const question = byId.get(answer.questionId);
      if (!question) {
        throw new BadRequestException(
          `Questão desconhecida: ${answer.questionId}`,
        );
      }
      if (seen.has(answer.questionId)) {
        throw new BadRequestException(
          `Questão respondida mais de uma vez: ${answer.questionId}`,
        );
      }
      seen.add(answer.questionId);
      if (!question.options.some((o) => o.id === answer.optionId)) {
        throw new BadRequestException(
          `Opção inválida para a questão ${answer.questionId}: ${answer.optionId}`,
        );
      }
    }
    if (seen.size !== QUESTIONS.length) {
      throw new BadRequestException(
        'O diagnóstico precisa estar completo: responda todas as questões.',
      );
    }
    return answers.map((a) => ({
      questionId: a.questionId,
      optionId: a.optionId,
    }));
  }

  /**
   * JWT é opcional no submit (o funil é anônimo primeiro): se vier um
   * Bearer válido, vincula o resultado ao usuário; qualquer problema com
   * o token apenas mantém o resultado anônimo — nunca bloqueia o quiz.
   */
  private async optionalUserId(
    authorizationHeader?: string,
  ): Promise<string | null> {
    if (!authorizationHeader?.startsWith('Bearer ')) return null;
    const secret = this.config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) return null;
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: string }>(
        authorizationHeader.slice('Bearer '.length),
        { secret },
      );
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }

  private toView(
    sessionToken: string,
    scores: DiagnosticScores,
    archetype: ArchetypeDef,
    offer: {
      recommendedCourse: DiagnosticResultView['recommendedCourse'];
      recommendedTestOut: DiagnosticResultView['recommendedTestOut'];
    },
  ): DiagnosticResultView {
    return {
      sessionToken,
      scores,
      archetype: {
        id: archetype.id,
        name: archetype.name,
        description: archetype.description,
        strengths: archetype.strengths,
      },
      recommendedTrack: archetype.recommendedTrack,
      recommendedTrackName: TRACK_NAMES[archetype.recommendedTrack],
      recommendedCourse: offer.recommendedCourse,
      recommendedTestOut: offer.recommendedTestOut,
    };
  }
}
