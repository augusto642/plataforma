{/* Sprint 10 · B34 — fatiado do antigo page.tsx monolítico ('use client' integral, 1.767 linhas): esta seção é Server Component; o estado interativo vive nas ilhas client. */}
import React from 'react';
import { MaterialIcon } from '../MaterialIcon';
import { TrackedLink } from './TrackedLink';

/* Central 216 r3 (Q-3) — "Trilhas estruturadas para cada momento" do
   protótipo Stitch v2 (home-desktop.html §3): os 3 níveis Iniciante
   (100% Grátis) / Júnior / Pleno com "O que você aprende". Sem
   números inventados: só níveis, planos e os tópicos do protótipo —
   nada de carga horária, nº de alunos ou datas. CTAs: Iniciante →
   /register (começar grátis); Júnior/Pleno → #planos (a seção de
   planos da home).
   Central 218 (D1) — o catálogo/radar "Comece hoje. O resto está
   no radar." saiu da home: não existe no protótipo. O catálogo
   real segue vivo em /courses e as trilhas do radar seguem na
   ementa; a seção volta a ser só os 3 cards estruturados (e, por
   isso, volta a ser um Server Component síncrono — sem fetch de
   catálogo aqui).
   Q-8 (218, baixo): o selo "Todas com projetos práticos inclusos"
   quebrava linha em 1440px — agora com whitespace-nowrap. */
interface StructuredTrack {
  level: string;
  plan: string;
  name: string;
  description: string;
  items: string[];
  ctaLabel: string;
  ctaHref: string;
  ctaId: string;
  featured?: boolean;
}

const STRUCTURED_TRACKS: StructuredTrack[] = [
  {
    level: 'Nível 1',
    plan: '100% Grátis',
    name: 'Iniciante',
    description:
      'Para quem nunca escreveu uma única linha de código e quer entender a lógica dos computadores de forma intuitiva.',
    items: [
      'Fundamentos de lógica de programação',
      'Variáveis, condicionais e estruturas de repetição',
      'Resolução de problemas em formato de jogo',
      'Construção dos primeiros pequenos programas',
    ],
    ctaLabel: 'Começar trilha grátis',
    ctaHref: '/register',
    ctaId: 'trilha_estruturada_iniciante',
  },
  {
    level: 'Nível 2',
    plan: 'Plano Pro',
    name: 'Júnior',
    description:
      'Construa sua base para ingressar no mercado profissional desenvolvendo aplicações web completas e APIs.',
    items: [
      'JavaScript moderno, TypeScript e manipulação do DOM',
      'Criação de APIs REST com Node.js e banco de dados',
      'Controle de versão com Git e fluxo de trabalho em equipe',
      'Simulações de entrevistas técnicas e revisão de código por IA',
    ],
    ctaLabel: 'Desbloquear trilha Júnior',
    ctaHref: '#planos',
    ctaId: 'trilha_estruturada_junior',
    featured: true,
  },
  {
    level: 'Nível 3',
    plan: 'Plano Pro / Carreira',
    name: 'Pleno',
    description:
      'Para quem já coda e busca domínio de arquitetura, testes avançados, padrões de projeto e performance de alta escala.',
    items: [
      'Clean Architecture, SOLID e Design Patterns',
      'Testes automatizados avançados (Unitários, Integração e E2E)',
      'Microserviços, filas assíncronas e mensageria',
      'Otimização de performance e segurança em produção',
    ],
    ctaLabel: 'Explorar trilha Pleno',
    ctaHref: '#planos',
    ctaId: 'trilha_estruturada_pleno',
  },
];

const StructuredTrackCard: React.FC<{ track: StructuredTrack }> = ({ track }) => (
  <article
    className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-300 ${
      track.featured
        ? 'bg-surface-1 border-2 border-brand-purple/60 shadow-accent-purple'
        : 'bg-surface-1 border border-border-2 hover:border-brand-purple/40'
    }`}
  >
    {track.featured && (
      <span className="absolute -top-3 left-6 px-3 py-0.5 bg-brand-purple text-white font-mono text-xs font-bold rounded-full uppercase tracking-wider">
        Mais procurada
      </span>
    )}
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <span
          className={`px-3 py-1 rounded font-mono text-xs border ${
            track.featured
              ? 'bg-brand-purple/10 text-brand-purple-light border-brand-purple/20'
              : 'bg-surface-2 text-ink-body border-border-1'
          }`}
        >
          {track.level}
        </span>
        <span
          className={`font-mono text-xs font-bold ${
            track.plan === '100% Grátis' ? 'text-brand-green-neon' : 'text-ink-span'
          }`}
        >
          {track.plan}
        </span>
      </div>
      <h3 className="text-xl font-heading font-bold text-ink-heading tracking-tight mb-3">
        {track.name}
      </h3>
      <p className="text-body-sm text-ink-span leading-relaxed font-sans mb-6">
        {track.description}
      </p>
      <div className="space-y-3 mb-8">
        <div className="text-[11px] font-mono font-bold text-ink-span uppercase tracking-wider">
          O que você aprende:
        </div>
        {track.items.map((item) => (
          <div key={item} className="flex items-start gap-2.5 text-body-sm text-ink-body">
            <MaterialIcon name="check" className="text-[18px] text-brand-green-neon shrink-0 mt-0.5" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
    <TrackedLink
      href={track.ctaHref}
      ctaId={track.ctaId}
      event="trilha_cta"
      className={`cursor-pointer inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-body-sm font-mono font-bold whitespace-nowrap transition-all duration-200 active:scale-95 border ${
        track.featured
          ? 'bg-brand-purple hover:bg-brand-purple-dark text-white border-transparent shadow-md shadow-brand-purple/25'
          : 'bg-surface-2 hover:bg-surface-2/80 border-border-strong text-white'
      }`}
    >
      <span>{track.ctaLabel}</span>
    </TrackedLink>
  </article>
);

export function TracksSection() {
  return (
    <section id="trilhas" className="relative z-10 py-24 border-t border-border-2/70">
      <div className="px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <span className="font-mono text-xs text-brand-green-neon uppercase tracking-widest font-bold block mb-2">
              Da base ao código profissional
            </span>
            <h2 className="text-3xl sm:text-4xl sm:leading-[44px] font-heading font-bold text-ink-heading tracking-tight mb-2">
              Trilhas estruturadas para cada momento
            </h2>
            <p className="text-base sm:text-lg text-ink-body leading-relaxed font-sans max-w-xl">
              Conteúdo progressivo desenhado para construir maturidade técnica sem lacunas de lógica.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-ink-span whitespace-nowrap shrink-0">
            <span className="w-2 h-2 rounded-full bg-brand-green-neon shrink-0" />
            Todas com projetos práticos inclusos
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {STRUCTURED_TRACKS.map((track) => (
            <StructuredTrackCard key={track.name} track={track} />
          ))}
        </div>
      </div>
    </section>
  );
}
