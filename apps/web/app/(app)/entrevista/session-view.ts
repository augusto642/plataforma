/**
 * Central 219 lote 3 (D3) — apresentação da sessão do simulador.
 * Funções puras (testáveis sem navegador) para os textos que dependem
 * de dados reais da sessão — nunca inventados:
 * - iniciais do avatar: do nome real do usuário (fallback: e-mail);
 * - rótulo da pergunta atual: do contador real de respostas (cap 20);
 * - nota de feedback: da evidência real da última avaliação.
 *
 * Central 219 lote 4 (D12/D13) — a avaliação chega da API como jsonb
 * (só as chaves, sem rótulos) e o Postgres ORDENA as chaves do jsonb
 * (por tamanho, depois alfabeto): `Object.values(evaluation)[0]` não
 * é o primeiro critério da rubrica. Por isso:
 * - `INTERVIEW_CRITERION_LABELS` espelha os `label`s de
 *   `apps/api/src/interview/interview.rubric.ts` (TECHNICAL_CRITERIA /
 *   BEHAVIORAL_CRITERIA) — manter os dois lados sincronizados; o
 *   spec deste módulo trava o mapa completo das duas rubricas;
 * - `orderedEvaluationEntries` devolve os critérios na ordem da
 *   rubrica (chave desconhecida vai para o fim, na ordem recebida);
 * - `latestFeedbackText` usa o PRIMEIRO critério da rubrica, não o
 *   primeiro que o jsonb ordena.
 */

/** Cap de turnos por sessão (mesmo da API). */
export const INTERVIEW_TURN_CAP = 20;

/** Modos da rubrica (mesmos de `interview.rubric.ts`). */
export type InterviewMode = 'technical' | 'behavioral';

function normalizeMode(mode: string | undefined | null): InterviewMode {
  return mode === 'behavioral' ? 'behavioral' : 'technical';
}

/** Ordem dos critérios da rubrica técnica (mesma de TECHNICAL_CRITERIA). */
export const TECHNICAL_CRITERION_KEYS: readonly string[] = [
  'correcao',
  'complexidade',
  'casosDeBorda',
  'clareza',
];

/** Ordem dos critérios da rubrica comportamental (mesma de BEHAVIORAL_CRITERIA). */
export const BEHAVIORAL_CRITERION_KEYS: readonly string[] = [
  'estruturaStar',
  'especificidade',
  'concisao',
];

/** Rótulos legíveis das chaves da rubrica (mesmos `label`s do backend). */
export const INTERVIEW_CRITERION_LABELS: Record<string, string> = {
  correcao: 'Correção',
  complexidade: 'Complexidade',
  casosDeBorda: 'Casos de borda',
  clareza: 'Clareza',
  estruturaStar: 'Estrutura STAR',
  especificidade: 'Especificidade',
  concisao: 'Concisão',
};

/** Rótulo legível de um critério; chave desconhecida passa como está. */
export function criterionLabel(key: string): string {
  return INTERVIEW_CRITERION_LABELS[key] ?? key;
}

/** Chaves da rubrica na ordem, para o modo da sessão. */
export function criterionKeysForMode(mode: string | undefined | null): readonly string[] {
  return normalizeMode(mode) === 'behavioral'
    ? BEHAVIORAL_CRITERION_KEYS
    : TECHNICAL_CRITERION_KEYS;
}

export type EvaluationEntry = [string, { score: number; evidence: string }];

/**
 * Entradas da avaliação na ordem da rubrica do modo; chaves fora da
 * rubrica (ex.: critério removido) vão para o fim, na ordem recebida.
 */
export function orderedEvaluationEntries(
  evaluation: Record<string, { score: number; evidence: string }> | null | undefined,
  mode: string | undefined | null = 'technical',
): EvaluationEntry[] {
  if (!evaluation) return [];
  const order = criterionKeysForMode(mode);
  return [...Object.entries(evaluation)].sort(([a], [b]) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

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

/**
 * Evidência real do PRIMEIRO critério da rubrica na última avaliação,
 * ou null. Nunca `Object.values()[0]`: o jsonb reordena as chaves.
 */
export function latestFeedbackText(
  evaluation: Record<string, { score: number; evidence: string }> | null | undefined,
  mode: string | undefined | null = 'technical',
): string | null {
  if (!evaluation) return null;
  const text = orderedEvaluationEntries(evaluation, mode)[0]?.[1]?.evidence?.trim();
  return text ? text : null;
}
