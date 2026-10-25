/**
 * Fase 2 premium (desenho §3.2) — rubrica do revisor sênior de código.
 * A revisão é ESPECÍFICA ao código enviado: cada sugestão deve estar
 * ancorada num trecho do código (o prompt exige isso e proíbe conselhos
 * genéricos). Nota 0–5 por critério + comentário.
 *
 * NUNCA entram no prompt: testes ocultos (Activity.hiddenTests) nem a
 * solução de referência (Activity.referenceSolution). Entram: o
 * codeSnapshot do aluno + os testes visíveis (Activity.testCode).
 */

/** Teto de código enviado ao LLM: controla custo de tokens. */
export const REVIEW_MAX_CODE_CHARS = 8000;

export interface ReviewCriterion {
  key: string;
  label: string;
  description: string;
}

export const REVIEW_CRITERIA: ReviewCriterion[] = [
  {
    key: 'legibilidade',
    label: 'Legibilidade',
    description: 'O código é fácil de ler e entender?',
  },
  {
    key: 'estrutura',
    label: 'Estrutura',
    description: 'Organização, separação de responsabilidades, duplicação.',
  },
  {
    key: 'nomes',
    label: 'Nomes',
    description: 'Variáveis e funções com nomes claros sobre o que fazem.',
  },
  {
    key: 'casosDeBorda',
    label: 'Casos de borda',
    description: 'Entradas vazias, inválidas e limites tratados?',
  },
];

export function buildReviewPrompt(
  language: string,
  code: string,
  visibleTests: string | null,
): string {
  const truncated = code.length > REVIEW_MAX_CODE_CHARS;
  const shownCode = truncated ? code.slice(0, REVIEW_MAX_CODE_CHARS) : code;
  return [
    'Você é um revisor sênior de código. Revise SOMENTE o código abaixo.',
    'Regras obrigatórias:',
    '- Cada sugestão deve citar o trecho do código a que se refere — sugestão genérica que valeria para qualquer código é erro.',
    '- Não avalie testes, nota ou aprovação: a revisão complementa o resultado dos testes, não o substitui.',
    '- Seja direto: aponte o que está bom em uma frase e concentre-se no que melhorar.',
    `- Linguagem: ${language}.`,
    truncated
      ? `(O código foi truncado em ${REVIEW_MAX_CODE_CHARS} caracteres para controle de custo; revise só o trecho visível.)`
      : '',
    'Código enviado pelo aluno:',
    '```',
    shownCode,
    '```',
    visibleTests
      ? `Testes visíveis do exercício (só contexto; os testes ocultos NÃO fazem parte desta revisão):\n\`\`\`\n${visibleTests.slice(0, 4000)}\n\`\`\``
      : 'Sem testes visíveis anexados.',
    'Responda SOMENTE com JSON neste formato exato, sem texto fora do JSON:',
    '{"summary": "resumo em 2-3 frases", "rubric": {"legibilidade": {"score": 0-5, "comment": "..."}, "estrutura": {"score": 0-5, "comment": "..."}, "nomes": {"score": 0-5, "comment": "..."}, "casosDeBorda": {"score": 0-5, "comment": "..."}}, "suggestions": ["sugestão ancorada num trecho", "..."]}',
  ].join('\n');
}

export function asReviewRubric(value: unknown): Record<string, { score: number; comment: string }> {
  const out: Record<string, { score: number; comment: string }> = {};
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  for (const c of REVIEW_CRITERIA) {
    const entry = raw[c.key] as { score?: unknown; comment?: unknown } | undefined;
    const score =
      typeof entry?.score === 'number' && Number.isFinite(entry.score)
        ? Math.max(0, Math.min(5, Math.round(entry.score)))
        : 0;
    out[c.key] = {
      score,
      comment:
        typeof entry?.comment === 'string' && entry.comment.trim()
          ? entry.comment
          : 'não avaliado',
    };
  }
  return out;
}
