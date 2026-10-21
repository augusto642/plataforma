import type { MetadataRoute } from 'next';

/**
 * B33 (Sprint 10) — robots.txt gerado pelo Next.
 * Libera as páginas públicas de marketing/conteúdo e mantém fora do
 * índice as áreas autenticadas e internas do app.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/dashboard',
          '/settings',
          '/ide',
          '/game',
          '/profile',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://nexuscode.dev/sitemap.xml',
  };
}
