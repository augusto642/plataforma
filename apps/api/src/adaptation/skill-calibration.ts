/**
 * Fase 5 premium (desenho §6.1/§6.4) — calibração de score por skill.
 *
 * Função PURA (sem Nest, sem Prisma): a mesma regra calibra o mapa de
 * gaps (`SkillDiagnosticService`) e o modelo do aluno
 * (`LearnerModelService`), para os dois nunca divergirem. Diagnóstico
 * calibrado por nível, não só certo/errado:
 *
 * - Taxa de acerto com suavização de Laplace (prior 0,5 com peso 2):
 *   pouca evidência puxa o score para o meio — nunca 0 ou 1 com 1
 *   tentativa. Isso é o que impede o mapa de "condenar" ou "aprovar"
 *   uma skill com uma única submissão.
 * - Média da rubrica de revisão (CodeReview, critérios 0–5) misturada
 *   com peso 0,4 quando existe; sem revisão, vale só a taxa de acerto.
 * - Níveis: < 0,40 missing · < 0,75 developing · >= 0,75 proficient.
 * - `weakSpot`: taxa de falha alta (>= 60%) com pelo menos 3 tentativas
 *   — o "erra sempre" que a tutora precisa ver no prompt.
 */
export type SkillLevel = 'missing' | 'developing' | 'proficient';

export interface SkillEvidence {
  passed: number;
  failed: number;
  /** Média dos critérios da rubrica (0–5), quando há revisão. */
  rubricMean: number | null;
}

export interface CalibratedSkill {
  score: number;
  level: SkillLevel;
  weakSpot: boolean;
  evidenceCount: number;
}

export function calibrateSkill(evidence: SkillEvidence): CalibratedSkill {
  const { passed, failed, rubricMean } = evidence;
  const attempts = passed + failed;
  // Laplace: (acertos + 0,5·2) / (tentativas + 2).
  const passRate = (passed + 1) / (attempts + 2);
  let score = passRate;
  if (rubricMean !== null) {
    const rubric01 = Math.min(5, Math.max(0, rubricMean)) / 5;
    score = 0.6 * passRate + 0.4 * rubric01;
  }
  score = Math.min(1, Math.max(0, score));
  const level: SkillLevel =
    score < 0.4 ? 'missing' : score < 0.75 ? 'developing' : 'proficient';
  const weakSpot = attempts >= 3 && failed / attempts >= 0.6;
  return { score, level, weakSpot, evidenceCount: attempts };
}

/**
 * Média dos critérios da rubrica de todas as revisões dadas.
 * Extraída para cá (e não duplicada em cada serviço) para que mapa
 * (`SkillDiagnosticService`) e modelo (`LearnerModelService`) usem
 * EXATAMENTE a mesma leitura da rubrica — divergência aqui é o defeito
 * D1 do QA da Fase 5. Critérios sem `score` numérico são ignorados;
 * sem nenhum critério válido, devolve null (vale só a taxa de acerto).
 */
export function meanRubricScore(
  reviews: { rubric: unknown }[],
): number | null {
  const values: number[] = [];
  for (const r of reviews) {
    const rubric = r.rubric as Record<string, { score?: unknown }> | null;
    if (!rubric) continue;
    for (const criterion of Object.values(rubric)) {
      if (typeof criterion?.score === 'number') values.push(criterion.score);
    }
  }
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Limiar de evidência abaixo do qual o mapa é "estimativa" (§6.1). */
export const SKILL_MAP_ESTIMATE_THRESHOLD = 10;
