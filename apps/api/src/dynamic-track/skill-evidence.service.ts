import { Injectable } from '@nestjs/common';
import { Language } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DynamicTrackService } from './dynamic-track.service';

const LANGUAGE_SKILLS: Record<string, Language> = {
  JavaScript: Language.javascript,
  TypeScript: Language.typescript,
  Python: Language.python,
};

export function canTransfer(language: string, concepts: string[]): boolean {
  return Object.values(LANGUAGE_SKILLS).includes(language as Language) && concepts.includes('funcoes');
}

function hasTestExpressions(script: string | null): boolean {
  return !!script && script.split('\n').some((line) => {
    const text = line.trim();
    return text.length > 0 && !text.startsWith('//') && !text.startsWith('#');
  });
}

@Injectable()
export class SkillEvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly track: DynamicTrackService,
  ) {}

  async goals(userId: string) {
    const investigation = await this.track.getMyInvestigation(userId);
    if (!investigation || investigation.status !== 'ready') return [];
    const signals = investigation.marketSkillEvidence;
    if (!signals.length) return [];
    if (!investigation.startCourse) return signals.map((signal) => ({
      signal, practice: null, excludedReason: 'O curso inicial deste percurso não está disponível.',
    }));
    const activities = await this.prisma.activity.findMany({
      where: {
        course: { slug: investigation.startCourse.slug },
        testCode: { not: null },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true, courseId: true, title: true, language: true,
        conceptTags: true, testCode: true,
      },
    });
    return signals.map((signal) => {
      const language = LANGUAGE_SKILLS[signal.skill];
      const activity = language && activities.find(
        (item) => item.language === language && hasTestExpressions(item.testCode) && canTransfer(item.language, item.conceptTags),
      );
      return {
        signal,
        excludedReason: activity ? null : language
          ? 'Não há atividade de funções com testes neste curso inicial.'
          : signal.skill === 'Java'
            ? 'A execução dos testes não é garantida para submissões Java com declaração de classe.'
            : 'Ainda não há objetivo e prática avaliados para esta habilidade.',
        practice: activity ? {
          id: activity.id,
          courseId: activity.courseId,
          title: activity.title,
          concepts: activity.conceptTags,
          objective: `Resolver uma atividade de funções em ${signal.skill} e demonstrar a aplicação das regras em outro contexto.`,
          criterion: 'Passar nos casos de teste automatizados da atividade.',
        } : null,
      };
    });
  }

  async portfolio(userId: string) {
    const submissions = await this.prisma.submission.findMany({
      where: { userId, status: 'passed', isBattleRun: false },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, createdAt: true, score: true, maxScore: true,
        activity: { select: { id: true, title: true, language: true, conceptTags: true } },
        testResults: { select: { name: true, passed: true } },
        transferAttempt: { select: { taskVersion: true, score: true, maxScore: true, passed: true, assessedAt: true } },
      },
    });
    return submissions.flatMap((submission) => {
      if (submission.activity.language === Language.java ||
          !submission.testResults.length ||
          submission.testResults.some((test) => !test.passed || !/^Caso de Teste \d+(?: \(Oculto\))?$/.test(test.name))) return [];
      return [{
        submissionId: submission.id,
        activityId: submission.activity.id,
        activity: submission.activity.title,
        language: submission.activity.language,
        concepts: submission.activity.conceptTags,
        criterion: 'Passar nos casos de teste automatizados da atividade.',
        testsPassed: submission.testResults.length,
        score: submission.score,
        maxScore: submission.maxScore,
        submittedAt: submission.createdAt,
        independence: 'não verificada',
        transferEligible: canTransfer(submission.activity.language, submission.activity.conceptTags),
        transfer: submission.transferAttempt ?? null,
      }];
    });
  }
}
