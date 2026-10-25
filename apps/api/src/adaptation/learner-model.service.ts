import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CONCEPT_SPINE_MODULES } from './data/concept-spine';
import { calibrateSkill } from './skill-calibration';

/**
 * Fase 5 premium (desenho §6.4) — INTERFACE do tutor adaptativo.
 *
 * REGISTRO EXPLÍCITO DE DEFERIMENTO: o motor adaptativo completo
 * (ajuste de dificuldade em tempo real, repetição espaçada com
 * meia-vida, grafo próprio de pré-requisitos) está DEFERIDO. Construí-lo
 * aqui duplicaria o KMS (`KnowledgeModule`) e a adaptação existente
 * (`AdaptationModule`), o que a regra de reuso máximo proíbe. Ele só
 * volta à pauta depois que (a) o diagnóstico por skill (§6.1) tiver
 * volume calibrado e (b) a frente KMS entregar o gerador de trilhas —
 * e, quando voltar, vive DENTRO de `AdaptationModule` + `KnowledgeModule`,
 * nunca como serviço paralelo.
 *
 * O que ESTE serviço faz (só isso):
 * - `getLearnerModel(userId)`: agrega `DiagnosticSkillResult` +
 *   `Submission` por `conceptTags` + `LearnerSkillMastery` e devolve
 *   `{ skill, mastery, lastSeen, weakSpots }` — a tabela derivada é
 *   recomputada a partir das fontes, nunca editada como verdade própria;
 * - `buildTutorPromptBlock(userId, activityTags?)`: texto que a tutora
 *   (`AiService`) injeta no prompt — o que o aluno domina, onde erra
 *   sempre, o que já revisou — com ajuste de dificuldade e volta a
 *   pré-requisitos VIA PROMPT. Sem mudar o `LlmClient`, sem novo
 *   provedor, sem novo grafo. Sem dados, devolve '' (regressão zero).
 */
export interface LearnerSkillView {
  skillTag: string;
  title: string;
  mastery: number | null;
  lastSeen: Date | null;
  weakSpot: boolean;
  attempts: number;
}

export interface LearnerModelView {
  skills: LearnerSkillView[];
  weakSpots: string[];
  mastered: string[];
  /** true quando não há evidência alguma — o prompt fica vazio. */
  empty: boolean;
}

@Injectable()
export class LearnerModelService {
  constructor(private readonly prisma: PrismaService) {}

  async getLearnerModel(userId: string): Promise<LearnerModelView> {
    const [activities, submissions, stored] = await Promise.all([
      this.prisma.activity.findMany({
        where: {
          conceptTags: { hasSome: CONCEPT_SPINE_MODULES.map((m) => m.tag) },
        },
        select: { id: true, conceptTags: true },
      }),
      this.prisma.submission.findMany({
        where: { userId, status: { in: ['passed', 'failed'] } },
        select: { id: true, activityId: true, status: true, createdAt: true },
      }),
      this.prisma.learnerSkillMastery.findMany({
        where: { userId },
        select: { skillTag: true, mastery: true },
      }),
    ]);
    const activityTags = new Map(activities.map((a) => [a.id, a.conceptTags]));
    const storedByTag = new Map(stored.map((s) => [s.skillTag, s.mastery]));

    const skills: LearnerSkillView[] = CONCEPT_SPINE_MODULES.map((module) => {
      const tagSubs = submissions.filter((s) =>
        (activityTags.get(s.activityId) ?? []).includes(module.tag),
      );
      const passed = tagSubs.filter((s) => s.status === 'passed').length;
      const calibrated =
        tagSubs.length > 0
          ? calibrateSkill({ passed, failed: tagSubs.length - passed, rubricMean: null })
          : null;
      const lastSeen =
        tagSubs.length > 0
          ? new Date(Math.max(...tagSubs.map((s) => s.createdAt.getTime())))
          : null;
      return {
        skillTag: module.tag,
        title: module.title,
        mastery: calibrated?.score ?? storedByTag.get(module.tag) ?? null,
        lastSeen,
        weakSpot: calibrated?.weakSpot ?? false,
        attempts: tagSubs.length,
      };
    });
    return {
      skills,
      weakSpots: skills.filter((s) => s.weakSpot).map((s) => s.skillTag),
      mastered: skills.filter((s) => (s.mastery ?? 0) >= 0.75).map((s) => s.skillTag),
      empty: submissions.length === 0 && stored.length === 0,
    };
  }

  /** Recomputa a tabela derivada (chamado após refresh do diagnóstico). */
  async refreshLearnerMastery(userId: string): Promise<LearnerModelView> {
    const model = await this.getLearnerModel(userId);
    for (const skill of model.skills) {
      if (skill.mastery === null) continue;
      const existing = await this.prisma.learnerSkillMastery.findFirst({
        where: { userId, skillTag: skill.skillTag },
        select: { id: true },
      });
      if (existing) {
        await this.prisma.learnerSkillMastery.update({
          where: { id: existing.id },
          data: { mastery: skill.mastery },
        });
      } else {
        await this.prisma.learnerSkillMastery.create({
          data: { userId, skillTag: skill.skillTag, mastery: skill.mastery },
        });
      }
    }
    return model;
  }

  /**
   * Bloco de prompt da tutora. Fail-open por desenho: qualquer erro de
   * leitura devolve '' — o modelo do aluno nunca pode quebrar o chat.
   * Sem dados, '' também (a tutora segue o comportamento Sprint 22).
   */
  async buildTutorPromptBlock(
    userId: string,
    activityTags: string[] = [],
  ): Promise<string> {
    try {
      const model = await this.getLearnerModel(userId);
      if (model.empty) return '';
      const mastered = model.skills.filter((s) => (s.mastery ?? 0) >= 0.75);
      const weak = model.skills.filter((s) => s.weakSpot);
      const inFocus = activityTags.length
        ? model.skills.filter((s) => activityTags.includes(s.skillTag))
        : [];
      const lines = [
        'MODELO DO ALUNO (derivado do histórico real — use para calibrar, sem citar números):',
      ];
      if (mastered.length) {
        lines.push(`- Já domina: ${mastered.map((s) => s.title).join(', ')} — pode acelerar e propor desafios, sem repetir o básico.`);
      }
      if (weak.length) {
        lines.push(`- Erra com frequência (revisar com calma, voltar a pré-requisitos antes de avançar): ${weak.map((s) => s.title).join(', ')}.`);
      }
      for (const skill of inFocus) {
        if (skill.mastery === null) continue;
        if (skill.mastery < 0.4) {
          lines.push(`- Na atividade atual (${skill.title}): o aluno ainda não domina o tema — explique do zero, com um exemplo pequeno, antes de pedir código.`);
        } else if (skill.mastery < 0.75) {
          lines.push(`- Na atividade atual (${skill.title}): o aluno está em desenvolvimento — guie com perguntas e deixe-o tentar, sem entregar a solução.`);
        }
      }
      if (lines.length === 1) return '';
      return lines.join('\n');
    } catch {
      return '';
    }
  }
}
