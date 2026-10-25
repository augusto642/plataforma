import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CONCEPT_SPINE_MODULES } from '../adaptation/data/concept-spine';
import {
  calibrateSkill,
  SKILL_MAP_ESTIMATE_THRESHOLD,
  type SkillLevel,
} from '../adaptation/skill-calibration';

/**
 * Fase 5 premium (desenho §6.1) — diagnóstico de skills com mapa de gaps.
 *
 * Segunda camada sobre o quiz B09, que permanece INTACTO (nenhuma rota,
 * questão ou regra do `DiagnosticService` muda aqui). Agrega, por tag da
 * espinha de conceitos (`concept-spine` + `Activity.conceptTags`):
 * - `Submission` (pass/fail) por atividade da tag;
 * - `CodeReview.rubric` (média dos critérios) das submissões da tag;
 * - o `DiagnosticResult` mais recente só entra como contexto do mapa
 *   (arquétipo/trilha), não como score por skill — os eixos do B09 não
 *   mapeiam 1:1 para as tags da espinha, e inventar esse mapeamento
 *   seria calibrar com dado errado.
 *
 * `nextSteps` aponta para a primeira atividade não concluída da tag (e,
 * quando pronta, para o gerador dinâmico do KMS) — o diagnóstico
 * alimenta a trilha, não a substitui. O mapa inteiro é marcado como
 * "estimativa" até haver volume de dados (>= 10 submissões no total).
 */
export interface SkillGapEntry {
  skillTag: string;
  title: string;
  order: number;
  score: number | null;
  level: SkillLevel | 'unknown';
  weakSpot: boolean;
  evidenceCount: number;
  nextSteps: { activityId: string; slug: string; title: string } | null;
}

export interface SkillMapView {
  /** true enquanto a evidência total for pequena — mapa = estimativa. */
  estimate: boolean;
  evidenceTotal: number;
  b09: { archetype: string | null; scores: unknown } | null;
  skills: SkillGapEntry[];
  /** Skills da vaga-alvo que não estão proficientes (vazio sem alvo). */
  targetGaps: string[];
}

@Injectable()
export class SkillDiagnosticService {
  constructor(private readonly prisma: PrismaService) {}

  /** Recomputa e persiste o mapa (uma linha por tag, com evidência). */
  async refreshSkillMap(userId: string): Promise<SkillMapView> {
    const map = await this.buildSkillMap(userId, null);
    for (const entry of map.skills) {
      if (entry.score === null) continue;
      const existing = await this.prisma.diagnosticSkillResult.findFirst({
        where: { userId, skillTag: entry.skillTag },
        select: { id: true },
      });
      if (existing) {
        await this.prisma.diagnosticSkillResult.update({
          where: { id: existing.id },
          data: {
            score: entry.score,
            level: entry.level as SkillLevel,
            assessedAt: new Date(),
          },
        });
      } else {
        await this.prisma.diagnosticSkillResult.create({
          data: {
            userId,
            skillTag: entry.skillTag,
            score: entry.score,
            level: entry.level as SkillLevel,
          },
        });
      }
    }
    return map;
  }

  async getSkillMap(
    userId: string,
    targetJobId?: string,
  ): Promise<SkillMapView> {
    return this.buildSkillMap(userId, targetJobId ?? null);
  }

  private async buildSkillMap(
    userId: string,
    targetJobId: string | null,
  ): Promise<SkillMapView> {
    const [activities, submissions, b09, targetJob] = await Promise.all([
      this.prisma.activity.findMany({
        where: { conceptTags: { hasSome: CONCEPT_SPINE_MODULES.map((m) => m.tag) } },
        select: { id: true, slug: true, title: true, conceptTags: true },
      }),
      this.prisma.submission.findMany({
        where: { userId, status: { in: ['passed', 'failed'] } },
        select: {
          id: true,
          activityId: true,
          status: true,
          codeReviews: { select: { rubric: true } },
        },
      }),
      this.prisma.diagnosticResult.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { archetype: true, scores: true },
      }),
      targetJobId
        ? this.prisma.jobPosting.findUnique({
            where: { id: targetJobId },
            select: { skills: true },
          })
        : Promise.resolve(null),
    ]);

    const passedByActivity = new Set(
      submissions.filter((s) => s.status === 'passed').map((s) => s.activityId),
    );
    const activityTags = new Map(activities.map((a) => [a.id, a.conceptTags]));
    const rubricMean = (rubrics: { rubric: unknown }[]): number | null => {
      const values: number[] = [];
      for (const r of rubrics) {
        const rubric = r.rubric as Record<string, { score?: unknown }> | null;
        if (!rubric) continue;
        for (const criterion of Object.values(rubric)) {
          if (typeof criterion?.score === 'number') values.push(criterion.score);
        }
      }
      if (!values.length) return null;
      return values.reduce((a, b) => a + b, 0) / values.length;
    };

    let evidenceTotal = 0;
    const skills: SkillGapEntry[] = CONCEPT_SPINE_MODULES.map((module) => {
      const tagSubs = submissions.filter((s) =>
        (activityTags.get(s.activityId) ?? []).includes(module.tag),
      );
      const passed = tagSubs.filter((s) => s.status === 'passed').length;
      const failed = tagSubs.length - passed;
      evidenceTotal += tagSubs.length;
      const calibrated =
        tagSubs.length > 0
          ? calibrateSkill({
              passed,
              failed,
              rubricMean: rubricMean(tagSubs.flatMap((s) => s.codeReviews)),
            })
          : null;
      const nextActivity =
        activities.find(
          (a) =>
            a.conceptTags.includes(module.tag) && !passedByActivity.has(a.id),
        ) ?? null;
      return {
        skillTag: module.tag,
        title: module.title,
        order: module.order,
        score: calibrated?.score ?? null,
        level: calibrated?.level ?? 'unknown',
        weakSpot: calibrated?.weakSpot ?? false,
        evidenceCount: tagSubs.length,
        nextSteps: nextActivity
          ? {
              activityId: nextActivity.id,
              slug: nextActivity.slug,
              title: nextActivity.title,
            }
          : null,
      };
    });

    const proficient = new Set(
      skills.filter((s) => s.level === 'proficient').map((s) => s.skillTag),
    );
    const targetGaps = (targetJob?.skills ?? []).filter(
      (skill) => !proficient.has(skill),
    );

    return {
      estimate: evidenceTotal < SKILL_MAP_ESTIMATE_THRESHOLD,
      evidenceTotal,
      b09: b09 ? { archetype: b09.archetype, scores: b09.scores } : null,
      skills,
      targetGaps,
    };
  }
}
