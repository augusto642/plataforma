import type { MetadataRoute } from 'next';

/**
 * B33 (Sprint 10) — sitemap.xml gerado pelo Next com as rotas públicas
 * reais do produto (as mesmas que a auditoria do QA provou no ar).
 */
const SITE_URL = 'https://nexuscode.dev';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{ path: string; priority: number; changeFrequency: 'weekly' | 'monthly' }> = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/diagnostico', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/onboarding', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/register', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/login', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/courses', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/leaderboard', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/contato', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/termos', priority: 0.3, changeFrequency: 'monthly' },
    { path: '/privacidade', priority: 0.3, changeFrequency: 'monthly' },
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
