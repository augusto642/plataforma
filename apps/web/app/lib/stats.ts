// B78 (Sprint 19 · destravamento B3) — a faixa de números reais da
// landing consome as estatísticas públicas da API
// (GET /courses/public-stats, B77) com ISR de 10 min, no mesmo
// padrão do catálogo (lib/catalog.ts). FALLBACK HONESTO: se a API
// não responder (ou responder fora do contrato), a função devolve
// null e a seção NÃO renderiza número nenhum — a página prefere
// ficar sem a faixa a exibir um número velho ou estimado. Zero
// vindo da API é zero real e é exibido como zero (padrão B50/B72).

export interface PublicStats {
  publishedCourses: number;
  publishedActivities: number;
  registeredStudents: number;
  planInterestTotal: number;
}

function isCount(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0
  );
}

/**
 * Validação defensiva do payload: os quatro contadores precisam
 * ser inteiros não negativos; qualquer desvio do contrato vira
 * null (indisponível) — número pela metade não é exibido.
 */
export function mapPublicStats(raw: unknown): PublicStats | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (
    !isCount(record.publishedCourses) ||
    !isCount(record.publishedActivities) ||
    !isCount(record.registeredStudents) ||
    !isCount(record.planInterestTotal)
  ) {
    return null;
  }
  return {
    publishedCourses: record.publishedCourses,
    publishedActivities: record.publishedActivities,
    registeredStudents: record.registeredStudents,
    planInterestTotal: record.planInterestTotal,
  };
}

export async function fetchPublicStats(): Promise<PublicStats | null> {
  const base =
    process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/courses/public-stats`, {
      next: { revalidate: 600 },
      // Sem API no build, a geração estática não pode travar: 3s e
      // cai no fallback honesto (o ISR preenche em runtime).
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return mapPublicStats(await res.json());
  } catch {
    return null;
  }
}
