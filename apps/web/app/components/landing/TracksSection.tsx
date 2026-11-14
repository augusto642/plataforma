import React from 'react';
import { MaterialIcon } from '../MaterialIcon';
import { TrackedLink } from './TrackedLink';

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
    className={`relative flex flex-col justify-between rounded-lg p-8 transition-colors ${
      track.featured
        ? 'bg-dark-surface border-2 border-primary/60 shadow-xl shadow-primary/10'
        : 'bg-dark-surface border border-border-subtle hover:border-primary/40'
    }`}
  >
    {track.featured && (
      <span className="absolute -top-3 left-8 px-3 py-0.5 bg-primary text-on-primary font-code text-xs font-bold rounded-full uppercase tracking-wider">
        Mais procurada
      </span>
    )}
    <div>
      <div className="flex items-center justify-between mb-4">
        <span
          className={`px-3 py-1 rounded font-code text-code-sm border ${
            track.featured
              ? 'bg-primary/10 text-dark-primary border-primary/20'
              : 'bg-dark-surface-container-high text-dark-on-surface border-border-subtle'
          }`}
        >
          {track.level}
        </span>
        <span
          className={`font-code text-code-sm ${
            track.plan === '100% Grátis'
              ? 'text-secondary font-bold'
              : 'text-dark-on-surface-variant'
          }`}
        >
          {track.plan}
        </span>
      </div>
      <h3 className="font-headline text-headline-md text-white font-bold mb-3">{track.name}</h3>
      <p className="text-body-sm text-dark-on-surface-variant mb-6 leading-relaxed">
        {track.description}
      </p>
      <div className="space-y-3 mb-8">
        <div className="text-[11px] font-label text-dark-on-surface-variant uppercase tracking-wider mb-2">
          O que você aprende:
        </div>
        {track.items.map((item) => (
          <div key={item} className="flex items-start gap-2.5 text-body-sm text-dark-on-surface">
            <MaterialIcon name="check" className="text-secondary text-[18px] mt-0.5 shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
    <TrackedLink
      href={track.ctaHref}
      ctaId={track.ctaId}
      event="trilha_cta"
      className={`w-full py-3 px-4 font-label text-label-md rounded text-center transition-colors whitespace-nowrap ${
        track.featured
          ? 'bg-primary hover:bg-dark-primary text-on-primary shadow-md shadow-primary/20'
          : 'bg-dark-surface-container hover:bg-dark-surface-container-high border border-border-strong text-white'
      }`}
    >
      <span>{track.ctaLabel}</span>
    </TrackedLink>
  </article>
);

export function TracksSection() {
  return (
    <section
      id="trilhas"
      className="py-24 border-b border-border-subtle bg-dark-surface-container-low"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <span className="font-code text-code-sm text-secondary uppercase tracking-widest font-semibold block mb-2">
              Da base ao código profissional
            </span>
            <h2 className="font-headline text-headline-lg-mobile md:text-headline-lg font-bold text-white tracking-tight mb-2">
              Trilhas estruturadas para cada momento
            </h2>
            <p className="font-body text-body-lg text-dark-on-surface-variant max-w-xl">
              Conteúdo progressivo desenhado para construir maturidade técnica sem lacunas de
              lógica.
            </p>
          </div>
          <div className="flex items-center gap-2 font-code text-code-sm text-dark-on-surface-variant whitespace-nowrap shrink-0">
            <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
            <span>Todas com projetos práticos inclusos</span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {STRUCTURED_TRACKS.map((track) => (
            <StructuredTrackCard key={track.name} track={track} />
          ))}
        </div>
      </div>
    </section>
  );
}
