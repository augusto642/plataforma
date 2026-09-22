'use client';

import React from 'react';
import Link from 'next/link';

interface Pillar {
  number: string;
  tag: string;
  title: string;
  description: string;
  badge: string;
  icon: string;
  techHighlight: string;
  accentGradient: string;
}

const PILLARS: Pillar[] = [
  {
    number: '01',
    tag: 'EXPLORAÇÃO EM CANVAS',
    title: 'O Overworld 2D de Código',
    description:
      'Ande por cidades em pixel art, converse com NPCs arquitetos e explore masmorras onde portas e pontes só abrem quando sua lógica passa por 100% dos testes unitários.',
    badge: 'Canvas Engine 60 FPS',
    icon: '🎮',
    techHighlight: 'Zero Lag • Controles WASD / Touch • Física Retrô 16-bit',
    accentGradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
  },
  {
    number: '02',
    tag: 'IA PEDAGÓGICA AVANÇADA',
    title: 'Lumi: Mentora que Ensina a Pensar',
    description:
      'Ao invés de cuspir código pronto que destrói sua capacidade analítica, Lumi inspeciona a Árvore Sintática (AST) do seu código e formula perguntas cirúrgicas para você desbloquear o raciocínio sozinho.',
    badge: 'Taxonomia de Bloom',
    icon: '🦊',
    techHighlight: 'Inspeção de AST • Análise de Causa Raiz • Dicas Graduais',
    accentGradient: 'from-purple-500/20 via-pink-500/10 to-transparent',
  },
  {
    number: '03',
    tag: 'GAMIFICAÇÃO DE ALTA RETENÇÃO',
    title: 'Cards TCG Holográficos 3D',
    description:
      'Conquiste criaturas digitais raras com efeito foil 3D e tilt dinâmico. Compartilhe suas cartas no LinkedIn e GitHub com atributos reais medidos a partir do seu código.',
    badge: 'Foil 3D Shaders',
    icon: '🃏',
    techHighlight: 'Colecionismo Real • Metamorfose de Deck • Badges Raras',
    accentGradient: 'from-amber-500/20 via-yellow-500/10 to-transparent',
  },
  {
    number: '04',
    tag: 'ENGENHARIA DE MISSÃO CRÍTICA',
    title: 'Do Jogo ao Git Real & Mercado',
    description:
      'A diversão é em 2D, mas o motor é infraestrutura real. Cada desafio resolvido gera commits automáticos em repositórios Git reais com testes de estresse em containers Linux isolados.',
    badge: 'Verificação SHA-256',
    icon: '🛡️',
    techHighlight: 'Kernel Linux Piston • Commits no Git • Portfólio Auditável',
    accentGradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
  },
];

export const NexusPillarsGrid: React.FC = () => {
  return (
    <section className="relative py-28 px-4 sm:px-6 max-w-7xl mx-auto border-t border-white/[0.08]">
      {/* Título de Seção Assimétrico (Esquerda + Direita) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16">
        <div className="max-w-2xl text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-cyan-300 text-xs font-mono font-bold mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <span className="text-base">⚡</span>
            <span>ARQUITETURA DE PLATAFORMA // 4 PILARES</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-white tracking-tight mb-4">
            A Engenharia por Trás do Jogo
          </h2>
          <p className="text-base sm:text-lg text-zinc-300 font-sans leading-relaxed">
            Unimos o melhor do design de jogos clássicos à arquitetura de software contemporânea
            para que você nunca mais enfrente o tédio das videoaulas passivas.
          </p>
        </div>

        {/* Status de Infraestrutura no Canto Direito */}
        <div className="hidden lg:flex flex-col items-end gap-2 font-mono text-xs">
          <div className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-300 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#04D361] animate-pulse" />
            <span>INFRA: DOCKER + LINUX CGROUPS</span>
          </div>
          <span className="text-[11px] text-zinc-500">ISOLAMENTO TOTAL // SUB-20MS P99</span>
        </div>
      </div>

      {/* Grid Bento Assimétrico (7 cols + 5 cols / 5 cols + 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {PILLARS.map((pillar, idx) => {
          const colSpan = idx === 0 || idx === 3 ? 'lg:col-span-7' : 'lg:col-span-5';
          return (
            <div
              key={pillar.number}
              className={`relative ${colSpan} rounded-[28px] p-[1px] bg-gradient-to-b from-white/[0.15] via-white/[0.05] to-transparent group transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.8)]`}
            >

            <div className="relative rounded-[27px] bg-gradient-to-br from-[#0B1021]/95 via-[#060914]/95 to-[#0F162B]/90 p-8 h-full flex flex-col justify-between overflow-hidden">
              {/* Sutil ambient glow no hover */}
              <div className={`absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br ${pillar.accentGradient} rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

              <div>
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3.5">
                    <span className="w-13 h-13 rounded-2xl bg-[#050814] border border-white/10 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-inner">
                      {pillar.icon}
                    </span>
                    <div>
                      <span className="text-[10px] font-mono text-[#00E5FF] tracking-widest uppercase font-black">
                        {pillar.tag}
                      </span>
                      <div className="text-xl sm:text-2xl font-heading font-black text-white">
                        {pillar.title}
                      </div>
                    </div>
                  </div>
                  <span className="text-4xl font-heading font-black text-zinc-800 group-hover:text-white/15 transition-colors select-none">
                    {pillar.number}
                  </span>
                </div>

                <p className="text-sm sm:text-base text-zinc-300 font-sans leading-relaxed mb-6">
                  {pillar.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono text-zinc-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#04D361]" />
                  {pillar.techHighlight}
                </span>
                <span className="text-[11px] font-mono px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 font-semibold">
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
          className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-400/50 text-[#00E5FF] font-heading font-bold text-sm transition-all shadow-[0_0_20px_rgba(0,229,255,0.15)] active:scale-95"
        >
          <span>🎮 Explorar o Overworld 2D no Navegador</span>
          <span>→</span>
        </Link>
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-[#04D361] hover:bg-[#00E58F] text-black font-heading font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_30px_rgba(4,211,97,0.35)] active:scale-95"
        >
          <span>⚡ Criar Meu Personagem Grátis</span>
          <span>→</span>
        </Link>
      </div>
    </section>
  );
};
