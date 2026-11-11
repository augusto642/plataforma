import React from 'react';
import { fetchPublicStats, type PublicStats } from '../../lib/stats';

/* B78 (Sprint 19 · destravamento B3) — a faixa de NÚMEROS REAIS da
   landing. Cada número exibido aqui é a contagem viva que a API
   contou no banco (GET /courses/public-stats, B77) — a invariante é
   "número exibido = número da fonte", travada por teste
   (stats-section.spec.ts usa contagens deliberadamente diferentes
   das do seed: se um espelho hardcoded voltar, o teste quebra).
   FALLBACK HONESTO: sem resposta da API, a seção não renderiza —
   nenhum número é melhor que um número errado. Zero real aparece
   como zero (padrão B50/B72), com o rótulo no singular só para 1. */

const numberFormat = new Intl.NumberFormat('pt-BR');

export function statLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

interface StatItem {
  value: number;
  label: string;
}

function statItems(stats: PublicStats): StatItem[] {
  return [
    {
      value: stats.publishedCourses,
      label: statLabel(stats.publishedCourses, 'curso publicado', 'cursos publicados'),
    },
    {
      value: stats.publishedActivities,
      label: statLabel(
        stats.publishedActivities,
        'atividade prática publicada',
        'atividades práticas publicadas',
      ),
    },
    {
      value: stats.registeredStudents,
      label: statLabel(stats.registeredStudents, 'aluno cadastrado', 'alunos cadastrados'),
    },
    {
      value: stats.planInterestTotal,
      label: statLabel(
        stats.planInterestTotal,
        'interessado nos planos pagos',
        'interessados nos planos pagos',
      ),
    },
  ];
}

export async function PlatformStatsSection(): Promise<React.JSX.Element | null> {
  const stats = await fetchPublicStats();
  if (!stats) return null;

  return (
    <section
      id="numeros"
      aria-label="Números reais da plataforma"
      className="relative z-10 py-16 px-6 sm:px-8 max-w-7xl mx-auto border-t border-border-2/70"
    >
      <div className="flex items-center gap-2 mb-10">
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-purple-low border border-brand-purple/30 text-brand-purple-light text-xs font-mono font-bold">
          <span className="w-2 h-2 rounded-full bg-brand-green-neon"></span>
          <span>NÚMEROS REAIS // CONTADOS DA PLATAFORMA</span>
        </span>
      </div>

      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
        {statItems(stats).map((item) => (
          <div key={item.label} className="flex flex-col">
            {/* DOM na ordem válida (dt → dd); o visual inverte com
                order: número grande em cima, rótulo embaixo. */}
            <dt className="order-2 mt-2 text-sm font-sans text-ink-span">{item.label}</dt>
            <dd className="order-1 font-heading text-4xl sm:text-5xl font-black text-ink-heading tracking-tight">
              {numberFormat.format(item.value)}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-10 text-xs font-mono text-ink-span">
        Contagem dos registros reais da plataforma: os cursos e as atividades são os do
        catálogo público, os alunos são as contas cadastradas e os interessados são as
        pessoas na lista dos planos pagos.
      </p>
    </section>
  );
}
