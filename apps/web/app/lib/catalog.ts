// B74 (Sprint 18 · Volta 3 · TL M1) — a vitrine "Disponível agora"
// consome o catálogo REAL da API (GET /courses/public-catalog) com
// ISR de 10 min, em vez do espelho hardcoded do seed (AVAILABLE_COURSES)
// que apodrecia em silêncio a cada curso novo. FALLBACK HONESTO: se a
// API não responder (ou responder fora do contrato), a função devolve
// null e a seção mostra o estado de indisponibilidade com o caminho
// para /courses — nunca uma lista velha disfarçada de atual. A
// degradação também protege a geração estática: sem API no build, a
// página nasce com o aviso e o ISR preenche o catálogo em runtime.

export interface CatalogActivity {
  title: string;
  language: string;
}

export interface CatalogCourse {
  slug: string;
  title: string;
  description: string;
  activityCount: number;
  activities: CatalogActivity[];
}

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  portugol: 'Portugol',
};

/** Rótulo legível da linguagem (enum da API → nome exibido). */
export function languageLabel(language: string | null | undefined): string {
  if (!language) return 'Programação';
  return (
    LANGUAGE_LABELS[language] ??
    language.charAt(0).toUpperCase() + language.slice(1)
  );
}

/** A linguagem de um curso é a das suas atividades (uniforme no catálogo). */
export function courseLanguage(course: CatalogCourse): string | null {
  return course.activities[0]?.language ?? null;
}

/**
 * Validação defensiva do payload: qualquer item fora do contrato é
 * descartado (a vitrine prefere mostrar menos a mostrar errado) e um
 * payload que nem lista é vira null (indisponível).
 */
export function mapCatalogCourse(raw: unknown): CatalogCourse | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.slug !== 'string' || typeof record.title !== 'string') {
    return null;
  }
  const rawActivities = Array.isArray(record.activities) ? record.activities : [];
  const activities: CatalogActivity[] = rawActivities
    .filter(
      (a): a is Record<string, unknown> =>
        !!a && typeof a === 'object' && typeof (a as { title?: unknown }).title === 'string',
    )
    .map((a) => ({
      title: a.title as string,
      language: typeof a.language === 'string' ? a.language : '',
    }));
  return {
    slug: record.slug,
    title: record.title,
    description: typeof record.description === 'string' ? record.description : '',
    activityCount:
      typeof record.activityCount === 'number' ? record.activityCount : activities.length,
    activities,
  };
}

export async function fetchPublicCatalog(): Promise<CatalogCourse[] | null> {
  const base =
    process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/courses/public-catalog`, {
      next: { revalidate: 600 },
      // Sem API no build, a geração estática não pode travar: 3s e cai
      // no fallback honesto (o ISR corrige em runtime).
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return null;
    return data
      .map(mapCatalogCourse)
      .filter((course): course is CatalogCourse => course !== null);
  } catch {
    return null;
  }
}
