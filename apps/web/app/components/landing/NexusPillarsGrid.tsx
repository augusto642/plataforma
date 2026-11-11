import React from 'react';
import Link from 'next/link';
/* Sprint 10 · B34 — este grid virou Server Component: o único gesto
   rastreado (CTA pro onboarding) usa <TrackedLink/> (ilha mínima);
   o Link pro /game é navegação pura e segue server. */
// Frente 3 — ícones SVG únicos da landing
import { IconBolt, IconCards, IconChat, IconGamepad, IconShield } from './icons';
import { TrackedLink } from './TrackedLink';

interface Pillar {
  number: string;
  tag: string;
  title: string;
  description: string;
  badge: string;
  icon: 'gamepad' | 'chat' | 'cards' | 'shield';
  techHighlight: string;
  accentGradient: string;
}

const PILLARS: Pillar[] = [
  {
    number: '01',
    tag: 'EXPLORAÇÃO EM CANVAS',
    title: 'O Overworld 2D de Código',
    // B65 (Sprint 18 · Volta 3 · QA A4) — a descrição anterior
    // inventariava o que o jogo NÃO tem: "cidades em pixel art",
    // "NPCs arquitetos", "masmorras" e "portas e pontes que abrem com
    // 100% dos testes". O que a engine faz de fato (GameEngine.ts e
    // InteractiveProp.ts): cena em canvas com câmera suave, props
    // interativos (terminais de lição, totens, portas para interiores
    // como o laboratório), diálogos e batalhas/bosses por código.
    // O badge de 60 FPS tem lastro no próprio motor: loop
    // requestAnimationFrame com delta-time projetado para 60 FPS e
    // contador de FPS interno.
    description:
      'Explore um mundo 2D em canvas: ande pelo cenário, ative terminais de lição, passe por portas para os interiores e encare batalhas e chefes resolvendo código de verdade — cada avanço é o seu programa passando nos testes.',
    badge: 'Canvas Engine 60 FPS',
    icon: 'gamepad',
    techHighlight: 'Loop 60 FPS com delta-time • WASD / Touch • Batalhas por código',
    accentGradient: 'from-brand-cyan-neon/20 via-brand-cyan/10 to-transparent',
  },
  {
    number: '02',
    tag: 'IA PEDAGÓGICA AVANÇADA',
    title: 'Tutora de IA: Mentora que Ensina a Pensar',
    description:
      'Ao invés de cuspir código pronto que destrói sua capacidade analítica, nossa tutora de IA lê a mensagem de erro e o seu código, reconhece o padrão do problema e formula perguntas cirúrgicas para você desbloquear o raciocínio sozinho.',
    badge: 'Taxonomia de Bloom',
    icon: 'chat',
    techHighlight: 'Leitura do Erro • Análise de Causa Raiz • Dicas Graduais',
    accentGradient: 'from-brand-purple/20 via-brand-rose/10 to-transparent',
  },
  {
    // B48/P1 (Sprint 16) — os cards TCG NÃO são um pilar do produto:
    // não existe modelo de dados, desbloqueio nem atributos medidos
    // no sistema. O card vira item de ROADMAP rotulado "em exploração"
    // — a ideia segue visível (com os espécimes conceituais da seção
    // abaixo), mas sem prometer o que não existe.
    number: '03',
    tag: 'NO RADAR // EM EXPLORAÇÃO',
    title: 'Cards Colecionáveis — em exploração',
    description:
      'Estamos estudando transformar conquistas em cards colecionáveis 3D. Por enquanto é só um conceito: não está na plataforma, não tem data e não prometemos que vire recurso. Os cards exibidos mais abaixo são a arte conceitual desse estudo.',
    badge: 'Em exploração',
    icon: 'cards',
    techHighlight: 'Conceito em estudo • Fora da plataforma por enquanto',
    accentGradient: 'from-brand-amber/20 via-brand-amber-solar/10 to-transparent',
  },
  {
    number: '04',
    tag: 'ENGENHARIA DE MISSÃO CRÍTICA',
    title: 'Do Jogo ao Git Real & Mercado',
    // B48/P1 (Sprint 16) — a copy antiga prometia "commits automáticos
    // a cada desafio resolvido", que o sistema NÃO faz. O comportamento
    // real (courses.service): usuário e repositório Gitea são criados
    // na MATRÍCULA; projetos e certificados verificáveis ficam no
    // portfólio. A copy agora diz exatamente isso.
    description:
      'A diversão é em 2D, mas o motor é infraestrutura real. Ao se matricular, você ganha um repositório Git real no seu nome — e seus projetos e certificados verificáveis ficam no seu portfólio, com correção por testes em containers Linux isolados via Piston.',
    badge: 'Verificação SHA-256',
    icon: 'shield',
    techHighlight: 'Repositório Git na matrícula • Execução via Piston • Portfólio Auditável',
    accentGradient: 'from-brand-green/20 via-brand-green-neon/10 to-transparent',
  },
];

const PILLAR_ICONS: Record<Pillar['icon'], React.ReactNode> = {
  gamepad: <IconGamepad className="w-8 h-8 text-brand-cyan-neon" />,
  chat: <IconChat className="w-8 h-8 text-brand-purple-light" />,
  cards: <IconCards className="w-8 h-8 text-brand-amber" />,
  shield: <IconShield className="w-8 h-8 text-brand-green-neon" />,
};

export const NexusPillarsGrid: React.FC = () => {
  return (
    <section className="relative py-28 px-4 sm:px-6 max-w-7xl mx-auto border-t border-border-1">
      {/* Título de Seção Assimétrico (Esquerda + Direita) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16">
        <div className="max-w-2xl text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-2 border border-border-1 text-brand-cyan-neon text-xs font-mono font-bold mb-4 shadow-elev-xs">
            <IconBolt className="w-5 h-5" />
            <span>POR DENTRO DA PLATAFORMA // PILARES & RADAR</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-ink-heading tracking-tight mb-4">
            Três apoios de verdade — e um no radar
          </h2>
          <p className="text-base sm:text-lg text-ink-body font-sans leading-relaxed">
            Unimos o melhor do design de jogos clássicos à arquitetura de software contemporânea
            para que você nunca mais enfrente o tédio das videoaulas passivas.
          </p>
        </div>

        {/* Status de Infraestrutura no Canto Direito */}
        <div className="hidden lg:flex flex-col items-end gap-2 font-mono text-xs">
          <div className="px-4 py-2 rounded-xl bg-surface-2 border border-border-1 text-ink-body flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-neon" />
            <span>INFRA: CONTAINERS LINUX VIA PISTON</span>
          </div>
          <span className="text-body-sm text-ink-span">ISOLAMENTO TOTAL POR DESAFIO</span>
        </div>
      </div>

      {/* Grid Bento Assimétrico (7 cols + 5 cols / 5 cols + 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {PILLARS.map((pillar, idx) => {
          const colSpan = idx === 0 || idx === 3 ? 'lg:col-span-7' : 'lg:col-span-5';
          return (
            <div
              key={pillar.number}
              className={`relative ${colSpan} rounded-[28px] p-[1px] bg-gradient-to-b from-surface-4 via-surface-3 to-transparent group transition-all duration-300 hover:shadow-elev-lg`}
            >

            <div className="relative rounded-[27px] bg-gradient-to-br from-surface-1/95 via-surface-1/95 to-surface-1/90 p-8 h-full flex flex-col justify-between overflow-hidden">
              {/* Sutil ambient glow no hover */}
              <div className={`absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br ${pillar.accentGradient} rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

              <div>
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3.5">
                    <span className="w-13 h-13 rounded-2xl bg-background border border-border-1 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-inner">
                      {PILLAR_ICONS[pillar.icon]}
                    </span>
                    <div>
                      <span className="text-xs font-mono text-brand-cyan-neon tracking-widest uppercase font-black">
                        {pillar.tag}
                      </span>
                      <div className="text-xl sm:text-2xl font-heading font-black text-ink-heading">
                        {pillar.title}
                      </div>
                    </div>
                  </div>
                  <span className="text-4xl font-heading font-black text-surface-3 group-hover:text-ink-heading/15 transition-colors select-none">
                    {pillar.number}
                  </span>
                </div>

                <p className="text-sm sm:text-base text-ink-body font-sans leading-relaxed mb-6">
                  {pillar.description}
                </p>
              </div>

              <div className="pt-4 border-t border-border-1 flex flex-wrap items-center justify-between gap-2">
                <span className="text-body-sm font-mono text-ink-span flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green-neon" />
                  {pillar.techHighlight}
                </span>
                <span className="text-xs font-mono px-3 py-1 rounded-lg bg-surface-2 border border-border-1 text-ink-body font-semibold">
                  {pillar.badge}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      </div>

      {/* Ações de Conversão */}
      <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/game"
          className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-border-1 hover:border-brand-cyan-neon/50 text-brand-cyan-neon font-heading font-bold text-sm transition-all shadow-glow-cyan-soft active:scale-95"
        >
          <IconGamepad className="w-5 h-5" />
          <span>Explorar o Overworld 2D no Navegador</span>
          <span>→</span>
        </Link>
        {/* Sprint 5 — primário unificado (roxo sólido + rótulo único);
            a ação de jogo (Overworld, acima) segue secundária e distinta */}
        <TrackedLink
          href="/onboarding"
          ctaId="pillars_onboarding"
          event="nav_cta"
          className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-brand-purple hover:bg-brand-purple-dark text-white font-heading font-black text-sm tracking-tight transition-all shadow-lg shadow-brand-purple/30 active:scale-95"
        >
          <IconBolt className="w-5 h-5" />
          <span>Começar grátis agora</span>
          <span>→</span>
        </TrackedLink>
      </div>
    </section>
  );
};
