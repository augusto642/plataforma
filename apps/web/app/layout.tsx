import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import ServiceWorkerRegister from './components/ServiceWorkerRegister';

// Fontes auto-hospedadas (next/font/local) — os arquivos .woff2 são os
// MESMOS servidos pelo Google Fonts (variáveis, subset latin; licenças
// OFL na mesma pasta). Motivo: `next/font/google` busca o CSS no Google
// Fonts em build-time e o loader quebra quando a resposta não casa com o
// padrão esperado — foi o que derrubou o `next build` dentro do Docker
// no CI (PR #11), embora o mesmo build passasse no host do runner. Com
// os arquivos locais o build não depende de rede externa e o resultado
// visual é o mesmo: mesmas famílias, mesmos pesos, mesmas variáveis CSS.
// Nota: só o subset latin é empacotado — `next/font/local` não emite
// unicode-range, então subsets extras nunca seriam usados; o produto é
// 100% pt-BR e o latin cobre todo o conteúdo.
const inter = localFont({
  src: './fonts/inter-latin.woff2',
  weight: '100 900',
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = localFont({
  src: './fonts/jetbrains-mono-latin.woff2',
  weight: '100 800',
  variable: '--font-mono',
  display: 'swap',
});

const spaceGrotesk = localFont({
  src: './fonts/space-grotesk-latin.woff2',
  weight: '300 700',
  variable: '--font-space',
  display: 'swap',
});

const plusJakartaSans = localFont({
  src: './fonts/plus-jakarta-sans-latin.woff2',
  weight: '500 800',
  variable: '--font-brand',
  display: 'swap',
});

// B33 (Sprint 10) — pacote SEO: antes o metadata era só title +
// description do posicionamento antigo ("Engenharia de Elite",
// "correção em Git nativo"), sem OpenGraph/Twitter/canonical, e o
// og-image.svg órfão nunca era referenciado (e SVG nem é aceito como
// imagem de compartilhamento). Agora: proposta atual da página +
// og-image.png real (1200×630) + robots/sitemap próprios.
const SITE_URL = 'https://nexuscode.dev';
const TITLE = 'Nexus Code — Aprenda a programar de verdade, jogando';
const DESCRIPTION =
  'Aprenda programação escrevendo código desde o primeiro exercício: missões em formato de jogo, IDE completa no navegador, correção por testes reais e uma tutora de IA socrática que ensina você a pensar. Grátis para começar, 100% em português.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  // Fase 5 premium (§6.2) — PWA: manifest + cor do tema (roxo Nexus).
  manifest: '/manifest.webmanifest',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/',
    siteName: 'Nexus Code',
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Nexus Code — Aprenda a programar de verdade. Do primeiro exercício ao mercado de tecnologia.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#8257E5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // B75 (Sprint 18 · Volta 3 · TL M2) — route groups: o layout raiz
  // guarda só o esqueleto (html/body/fontes/metadata). Os providers
  // de sessão moram no layout de (app); as rotas de (public) nascem
  // sem nenhum provider — a allowlist manual de rotas públicas do
  // AuthContext (PUBLIC_PATHS) foi aposentada junto.
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} ${plusJakartaSans.variable}`}>
      <body className="bg-[#0D0E15] text-[#F4F4F5] antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
