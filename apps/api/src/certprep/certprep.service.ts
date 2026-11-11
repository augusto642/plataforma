import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Fase 5 premium (desenho §6.3) — preparação para certificações, módulo
 * FINO. Reutiliza diagnóstico (§6.1) e o formato de relatório da
 * entrevista (§3.1); não cria banco de questões paralelo: o simulado é
 * um conjunto de Activities com `lessonPayload`, com questões PRÓPRIAS
 * no formato da prova — nunca reprodução de provas reais (direito
 * autoral das certificadoras). Este serviço só registra a tentativa
 * (tallies por domínio, vindos da conclusão dessas Activities) e deriva
 * a prontidão. Não promete aprovação, emprego ou reconhecimento oficial.
 */
export interface DomainTally {
  correct: number;
  total: number;
}

export interface DomainScore extends DomainTally {
  score: number;
}

export type ReadinessBand = 'not-ready' | 'almost-ready' | 'ready';

export function readinessBand(readiness: number): ReadinessBand {
  if (readiness >= 0.8) return 'ready';
  if (readiness >= 0.6) return 'almost-ready';
  return 'not-ready';
}

export function computeReadiness(
  domainScores: Record<string, DomainScore>,
): number {
  const entries = Object.values(domainScores);
  if (!entries.length) return 0;
  const totalWeight = entries.reduce((sum, d) => sum + d.total, 0);
  if (totalWeight === 0) return 0;
  // Média ponderada pelo nº de questões — domínio com mais questões
  // pesa mais, sem inventar peso por domínio.
  const weighted = entries.reduce((sum, d) => sum + d.score * d.total, 0);
  return Math.min(1, Math.max(0, weighted / totalWeight));
}

@Injectable()
export class CertprepService {
  constructor(private readonly prisma: PrismaService) {}

  listExams() {
    return this.prisma.certExam.findMany({
      orderBy: [{ provider: 'asc' }, { name: 'asc' }],
      select: { id: true, provider: true, name: true, domains: true },
    });
  }

  async createAttempt(
    userId: string,
    examId: string,
    tallies: Record<string, DomainTally>,
  ) {
    const exam = await this.prisma.certExam.findUnique({
      where: { id: examId },
      select: { id: true, domains: true },
    });
    if (!exam) throw new NotFoundException('Exame não encontrado.');
    const scores: Record<string, DomainScore> = {};
    for (const [domain, tally] of Object.entries(tallies)) {
      if (exam.domains.length && !exam.domains.includes(domain)) {
        throw new BadRequestException(
          `Domínio "${domain}" não pertence ao formato deste exame.`,
        );
      }
      if (
        !Number.isInteger(tally.correct) ||
        !Number.isInteger(tally.total) ||
        tally.total <= 0 ||
        tally.correct < 0 ||
        tally.correct > tally.total
      ) {
        throw new BadRequestException(
          `Tally inválido para o domínio "${domain}": esperado 0 <= correct <= total, total > 0.`,
        );
      }
      scores[domain] = { ...tally, score: tally.correct / tally.total };
    }
    if (!Object.keys(scores).length) {
      throw new BadRequestException('Informe ao menos um domínio com tally.');
    }
    const readiness = computeReadiness(scores);
    const attempt = await this.prisma.certAttempt.create({
      data: { examId, userId, scores: scores as unknown as object, readiness },
    });
    return { ...attempt, readinessBand: readinessBand(readiness) };
  }

  async getReadiness(userId: string, attemptId: string) {
    const attempt = await this.prisma.certAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: { select: { id: true, provider: true, name: true, domains: true } } },
    });
    // Dono diferente ou inexistente: 404 nos dois casos (não vaza existência).
    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException('Tentativa não encontrada.');
    }
    const scores = attempt.scores as unknown as Record<string, DomainScore>;
    const weakest = Object.entries(scores).sort((a, b) => a[1].score - b[1].score)[0];
    return {
      attemptId: attempt.id,
      exam: attempt.exam,
      scores,
      readiness: attempt.readiness,
      readinessBand: readinessBand(attempt.readiness),
      weakestDomain: weakest ? weakest[0] : null,
      createdAt: attempt.createdAt,
    };
  }

  listMyAttempts(userId: string) {
    return this.prisma.certAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { exam: { select: { provider: true, name: true } } },
    });
  }
}
