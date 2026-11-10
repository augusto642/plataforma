/**
 * Central 219 lote 3 (D3) — apresentação da sessão do simulador.
 * Funções puras (testáveis sem navegador) para os textos que dependem
 * de dados reais da sessão — nunca inventados:
 * - iniciais do avatar: do nome real do usuário (fallback: e-mail);
 * - rótulo da pergunta atual: do contador real de respostas (cap 20);
 * - nota de feedback: da evidência real da última avaliação.
 */

/** Cap de turnos por sessão (mesmo da API). */
export const INTERVIEW_TURN_CAP = 20;

/** Iniciais (até 2 letras) para o avatar do topo da sessão. */
export function userInitials(
  name: string | null | undefined,
  email: string,
): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length > 0) {
    return parts
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('');
  }
  return (email.split('@')[0] ?? '').slice(0, 2).toUpperCase();
}

/** "Pergunta N de 20" — N é a pergunta sendo respondida agora. */
export function currentQuestionLabel(candidateCount: number): string {
  const n = Math.min(Math.max(candidateCount + 1, 1), INTERVIEW_TURN_CAP);
  return `Pergunta ${n} de ${INTERVIEW_TURN_CAP}`;
}

/** Evidência real da primeira entrada da última avaliação, ou null. */
export function latestFeedbackText(
  evaluation: Record<string, { score: number; evidence: string }> | null | undefined,
): string | null {
  if (!evaluation) return null;
  const text = Object.values(evaluation)[0]?.evidence?.trim();
  return text ? text : null;
}
