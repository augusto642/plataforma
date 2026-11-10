/** @type {import('next').NextConfig} */
const isWindows = process.platform === 'win32';
const isDev = process.env.NODE_ENV === 'development';

// B73 (Sprint 18 · Volta 3 · TL A1) — CSP POR ROTA. Até aqui UMA
// política global carregava 'unsafe-eval' por causa do Monaco — que
// a landing e as rotas públicas nem carregam (Monaco só existe em
// /ide e no modal de batalha de /game). Agora:
// - política ESTRITA (sem unsafe-eval) para tudo, inclusive a
//   landing; em dev, o unsafe-eval volta (React Refresh/HMR do
//   Next dev exige) — só em desenvolvimento;
// - /ide e /game mantêm o unsafe-eval + worker-src de blob, que é
//   o que o Monaco precisa;
// - localhost/127.0.0.1 no connect-src SÓ em dev (em produção o
//   connect-src é 'self': a API é acessada pelo rewrite /api).
const connectSrc = isDev
  ? "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*"
  : "connect-src 'self'";

function contentSecurityPolicy({ monaco }) {
  const scriptSrc = monaco
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";
  return [
    "default-src 'self'",
    scriptSrc,
    ...(monaco ? ["worker-src 'self' blob:"] : []),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    connectSrc,
    "font-src 'self' data: https://fonts.gstatic.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

const commonHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig = {
  // Standalone ativado em Linux / Docker / CI; no Windows local desativa para prevenir EPERM symlink
  output: !isWindows || process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL || 'http://localhost:3000'}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        // Headers comuns a todas as rotas (sem CSP — a política é por rota).
        source: '/:path*',
        headers: commonHeaders,
      },
      {
        // Política estrita: tudo que NÃO é /ide nem /game (a landing
        // e as rotas públicas incluídas). O lookahead negativo é o
        // padrão de matcher do Next para exclusão de prefixos.
        source: '/((?!ide(?:/|$)|game(?:/|$)).*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy({ monaco: false }),
          },
        ],
      },
      {
        source: '/ide/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy({ monaco: true }),
          },
        ],
      },
      {
        source: '/game/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy({ monaco: true }),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
