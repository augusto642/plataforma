/** @type {import('next').NextConfig} */

// Central 216 r3 (Q-2) — Monaco local: garante `public/monaco/vs`
// (cópia de `monaco-editor/min/vs`, ver scripts/copy-monaco-vs.cjs)
// em todo `next build/dev/start`, qualquer que seja o comando usado
// no deploy. Idempotente (marcador de versão, ~0 ms quando presente)
// e silencioso quando o pacote não está resolvível (ex.: output
// standalone, onde os arquivos já foram copiados no build).
try {
  require('./scripts/copy-monaco-vs.cjs')();
} catch {
  // Sem monaco-editor resolvível aqui: nada a copiar; o editor usa
  // o que já está em public/monaco/vs (ou falha fechado, sem CDN).
}

const isWindows = process.platform === 'win32';
const isDev = process.env.NODE_ENV === 'development';

// B73 (Sprint 18 · Volta 3 · TL A1) — CSP POR ROTA. Até aqui UMA
// política global carregava 'unsafe-eval' por causa do Monaco — que
// a landing e as rotas públicas nem carregam (Monaco só existe em
// /ide, no modal de batalha de /game, na sessão de /entrevista/[id]
// e no desafio de /desafios — Central 216 r3 (Q-2) incluiu as duas
// últimas na variante monaco). Agora:
// - política ESTRITA (sem unsafe-eval) para tudo, inclusive a
//   landing; em dev, o unsafe-eval volta (React Refresh/HMR do
//   Next dev exige) — só em desenvolvimento;
// - /ide e /game mantêm o unsafe-eval + worker-src de blob, que é
//   o que o Monaco precisa (idem /entrevista e /desafios, que usam
//   o mesmo IdeEditorPane);
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
        // Política estrita: tudo que NÃO é /ide, /game, /entrevista
        // nem /desafios (a landing e as rotas públicas incluídas). O
        // lookahead negativo é o padrão de matcher do Next para
        // exclusão de prefixos. /entrevista e /desafios usam o
        // IdeEditorPane (Monaco) — Central 216 r3 (Q-2).
        source: '/((?!ide(?:/|$)|game(?:/|$)|entrevista(?:/|$)|desafios(?:/|$)).*)',
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
      {
        // Central 216 r3 (Q-2) — /entrevista/[id] e /desafios usam o
        // IdeEditorPane (Monaco local, mesma origem): precisam da
        // variante com unsafe-eval + worker-src, como /ide e /game.
        source: '/entrevista/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy({ monaco: true }),
          },
        ],
      },
      {
        source: '/desafios/:path*',
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
