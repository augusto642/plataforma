{/* Sprint 10 · B34 — fatiado do antigo page.tsx monolítico ('use client' integral, 1.767 linhas): esta seção é Server Component; o estado interativo vive nas ilhas client. */}
import React from 'react';
import { TrackedLink } from './TrackedLink';
import { IconMap, TrackCoverGo, TrackCoverPython, TrackCoverRust, TrackCoverWeb } from './icons';

export const TracksSection: React.FC = () => (
  <>
  {/* 4. TRILHAS: DO ZERO AO AVANÇADO NA MESMA ORDEM DE CORES DE PAGE.TSX */}
  {/* 1: Rust (Âmbar) | 2: Go (Ciano) | 3: Next.js (Esmeralda) | 4: Python/IA (Roxo) */}
  <section id="trilhas" className="relative z-10 py-24 border-t border-border-2/70">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14 px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto">
      <div className="max-w-2xl text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-amber/10 border border-brand-amber/30 text-brand-amber text-xs font-mono font-bold mb-3">
          <IconMap className="w-4 h-4" />
          <span>CURRÍCULO & SKILL TREES PRÁTICAS</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-ink-heading tracking-tight mb-4">
          Trilhas do Zero ao Profissional
        </h2>
        <p className="text-base sm:text-lg text-ink-body leading-relaxed font-sans">
          Aprenda a programar resolvendo desafios práticos, do seu primeiro comando até a construção de sistemas distribuídos completos. Sem aulas maçantes — aqui você aprende codificando.
        </p>
      </div>

      <div className="hidden lg:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-surface-2 border border-border-1 text-body-sm font-mono text-ink-body">
        <span>Arraste para explorar as 4 trilhas</span>
        <span className="text-brand-cyan-neon font-bold">→</span>
      </div>
    </div>


    {/* CARROSSEL HORIZONTAL COM SCROLL SNAP (10% À ESQUERDA) */}
    <div className="relative">
      {/* Sombra fade esquerda */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-20 z-10 bg-gradient-to-r from-background to-transparent" />
      {/* Sombra fade direita */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-16 z-10 bg-gradient-to-l from-background to-transparent" />

      <div
        className="flex gap-6 overflow-x-auto scroll-smooth pb-6 pl-[10%] pr-12"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >

        {/* TRILHA 1: Rust — Lógica & Alta Performance */}
        <article
          className="group relative flex flex-col justify-between bg-surface-1 border border-border-2 hover:border-brand-amber/60 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-amber shrink-0 w-[338px]"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div>
            {/* Capa com Imagem Vetorial Rust */}
            <div className="relative h-36 w-full rounded-xl overflow-hidden bg-surface-1 border border-border-1 mb-4 flex items-center justify-center select-none group-hover:border-brand-amber/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-amber/10 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute -top-8 -right-8 w-36 h-36 bg-brand-amber/20 rounded-full blur-2xl pointer-events-none group-hover:bg-brand-amber/30 transition-all duration-500" />
              <div className="relative z-10 w-20 h-20 rounded-xl bg-surface-1/90 border border-brand-amber/30 flex items-center justify-center p-2 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <TrackCoverRust />
              </div>
            </div>

            {/* Título & Especialidade */}
            <h3 className="text-base font-heading font-bold text-ink-heading tracking-tight group-hover:text-brand-amber transition-colors mb-1">
              Programação do Zero com Rust
            </h3>
            <p className="text-body-sm text-brand-amber/80 font-mono mb-2">Lógica • Algoritmos • Alta Performance</p>

            {/* Resumo do Curso */}
            <p className="text-body-sm text-ink-span leading-relaxed line-clamp-2 mb-4 font-sans">
              Do primeiro <code className="text-brand-amber bg-brand-amber/10 px-1 rounded">println!</code> à resolução de problemas reais. Aprenda a pensar como programador e a escrever códigos rápidos e sem erros de memória.
            </p>

            {/* Tecnologias & Conteúdos-Chave */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">Lógica do Zero</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">Algoritmos</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">Rust 2024</span>
              <span className="bg-brand-amber/10 border border-brand-amber/30 text-brand-amber text-body-sm font-mono px-2 py-0.5 rounded-md">Memory Safety</span>
            </div>

            {/* Sprint 6 — números da ementa oficial do produto
                (CURRICULUM-AND-PEDAGOGY-SPEC.md, seção 3, Trilha 1).
                Carga horária não entra: a ementa não a declara. */}
            <div className="mb-4 space-y-1 border-t border-border-1/60 pt-3 font-mono text-body-sm text-ink-span">
              <div>4 módulos · 7 desafios práticos</div>
              {/* Sprint 7 — capstone em linguagem de resultado: o destaque
                  é o que o aluno constrói; o nome técnico vira subtítulo */}
              <div>Projeto final: <span className="font-bold text-ink-heading">Banco de dados distribuído próprio</span></div>
              <div>NexusDB Distribuído</div>
            </div>
          </div>

          {/* Rodapé: Nível e CTA — Sprint 10 (B36): empilhado. Lado a
              lado, o CTA quebrava em 2 linhas e os selos desalinhavam
              entre os 4 cards; agora o selo vai acima e o CTA ocupa a
              largura toda, sem quebra. */}
          <div className="pt-3.5 border-t border-border-1/80 flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-amber"></span>
              <span className="text-xs font-mono text-ink-span">Do Zero ao Avançado</span>
            </div>
            <TrackedLink href="/register?track=rust" ctaId="trilha_rust" event="trilha_cta" eventProps={{ track: 'rust' }} className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm font-mono font-bold whitespace-nowrap transition-all duration-200 active:scale-95 border border-transparent shadow-md shadow-brand-purple/25">
              <span>Começar grátis agora</span>
            </TrackedLink>
          </div>
        </article>

        {/* TRILHA 2: Go — APIs & Backend Moderno */}
        <article
          className="group relative flex flex-col justify-between bg-surface-1 border border-border-2 hover:border-brand-cyan-neon/60 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-cyan shrink-0 w-[338px]"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div>
            {/* Capa com Imagem Vetorial Go */}
            <div className="relative h-36 w-full rounded-xl overflow-hidden bg-surface-1 border border-border-1 mb-4 flex items-center justify-center select-none group-hover:border-brand-cyan-neon/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan-neon/10 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute -top-8 -right-8 w-36 h-36 bg-brand-cyan-neon/20 rounded-full blur-2xl pointer-events-none group-hover:bg-brand-cyan-neon/30 transition-all duration-500" />
              <div className="relative z-10 w-20 h-20 rounded-xl bg-surface-1/90 border border-brand-cyan-neon/30 flex items-center justify-center p-2 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <TrackCoverGo />
              </div>
            </div>

            {/* Título & Especialidade */}
            <h3 className="text-base font-heading font-bold text-ink-heading tracking-tight group-hover:text-brand-cyan-neon transition-colors mb-1">
              APIs & Servidores Web com Go
            </h3>
            <p className="text-body-sm text-brand-cyan-neon/80 font-mono mb-2">REST • Banco de Dados • Microsserviços</p>

            {/* Resumo do Curso */}
            <p className="text-body-sm text-ink-span leading-relaxed line-clamp-2 mb-4 font-sans">
              Construa o backend que move gigantes da tecnologia. Crie rotas HTTP ultra rápidas, conecte bancos de dados PostgreSQL e faça deploys reais de microsserviços.
            </p>

            {/* Tecnologias & Conteúdos-Chave */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">REST APIs</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">PostgreSQL</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">Docker</span>
              <span className="bg-brand-cyan-neon/10 border border-brand-cyan-neon/30 text-brand-cyan-neon text-body-sm font-mono px-2 py-0.5 rounded-md">Go 1.22</span>
            </div>

            {/* Sprint 6 — números da ementa oficial do produto
                (CURRICULUM-AND-PEDAGOGY-SPEC.md, seção 3, Trilha 2) */}
            <div className="mb-4 space-y-1 border-t border-border-1/60 pt-3 font-mono text-body-sm text-ink-span">
              <div>4 módulos · 4 desafios práticos</div>
              <div>Projeto final: <span className="font-bold text-ink-heading">Motor de pagamentos de alta vazão</span></div>
              <div>High-Throughput Payment Engine</div>
            </div>
          </div>

          {/* Rodapé: Nível e CTA — Sprint 10 (B36): empilhado (ver Trilha 1) */}
          <div className="pt-3.5 border-t border-border-1/80 flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-cyan-neon"></span>
              <span className="text-xs font-mono text-ink-span">Intermediário</span>
            </div>
            <TrackedLink href="/register?track=go" ctaId="trilha_go" event="trilha_cta" eventProps={{ track: 'go' }} className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm font-mono font-bold whitespace-nowrap transition-all duration-200 active:scale-95 border border-transparent shadow-md shadow-brand-purple/25">
              <span>Começar grátis agora</span>
            </TrackedLink>
          </div>
        </article>

        {/* TRILHA 3: React & Next.js — Desenvolvimento Web */}
        <article
          className="group relative flex flex-col justify-between bg-surface-1 border border-border-2 hover:border-brand-green/60 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-green shrink-0 w-[338px]"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div>
            {/* Capa com Imagem Vetorial Next.js */}
            <div className="relative h-36 w-full rounded-xl overflow-hidden bg-surface-1 border border-border-1 mb-4 flex items-center justify-center select-none group-hover:border-brand-green/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-green/10 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute -top-8 -right-8 w-36 h-36 bg-brand-green-neon/20 rounded-full blur-2xl pointer-events-none group-hover:bg-brand-green-neon/30 transition-all duration-500" />
              <div className="relative z-10 w-20 h-20 rounded-xl bg-surface-1/90 border border-brand-green/30 flex items-center justify-center p-2 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <TrackCoverWeb />
              </div>
            </div>

            {/* Título & Especialidade */}
            <h3 className="text-base font-heading font-bold text-ink-heading tracking-tight group-hover:text-brand-green-neon transition-colors mb-1">
              Desenvolvimento Web com React & Next.js
            </h3>
            <p className="text-body-sm text-brand-green-neon/80 font-mono mb-2">Frontend • TypeScript • Interfaces Modernas</p>

            {/* Resumo do Curso */}
            <p className="text-body-sm text-ink-span leading-relaxed line-clamp-2 mb-4 font-sans">
              Crie sites modernos, interativos e rápidos com as ferramentas usadas por startups unicórnio. Aprenda TypeScript, Tailwind e Next.js criando produtos reais.
            </p>

            {/* Tecnologias & Conteúdos-Chave */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">React 18</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">Next.js 14</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">TypeScript</span>
              <span className="bg-brand-green/10 border border-brand-green/30 text-brand-green-neon text-body-sm font-mono px-2 py-0.5 rounded-md">Tailwind CSS</span>
            </div>

            {/* Sprint 6 — números da ementa oficial do produto
                (CURRICULUM-AND-PEDAGOGY-SPEC.md, seção 3, Trilha 3) */}
            <div className="mb-4 space-y-1 border-t border-border-1/60 pt-3 font-mono text-body-sm text-ink-span">
              <div>3 módulos · 3 desafios práticos</div>
              <div>Projeto final: <span className="font-bold text-ink-heading">IDE web colaborativa em tempo real</span></div>
              <div>Web IDE Colaborativa em Tempo Real</div>
            </div>
          </div>

          {/* Rodapé: Nível e CTA — Sprint 10 (B36): empilhado (ver Trilha 1) */}
          <div className="pt-3.5 border-t border-border-1/80 flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-green-neon"></span>
              <span className="text-xs font-mono text-ink-span">Do Zero ao Deploy</span>
            </div>
            <TrackedLink href="/register?track=web" ctaId="trilha_web" event="trilha_cta" eventProps={{ track: 'web' }} className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm font-mono font-bold whitespace-nowrap transition-all duration-200 active:scale-95 border border-transparent shadow-md shadow-brand-purple/25">
              <span>Começar grátis agora</span>
            </TrackedLink>
          </div>
        </article>

        {/* TRILHA 4: Python & Inteligência Artificial */}
        <article
          className="group relative flex flex-col justify-between bg-surface-1 border border-border-2 hover:border-brand-purple/60 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-purple shrink-0 w-[338px]"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div>
            {/* Capa com Imagem Vetorial Python IA */}
            <div className="relative h-36 w-full rounded-xl overflow-hidden bg-surface-1 border border-border-1 mb-4 flex items-center justify-center select-none group-hover:border-brand-purple/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/10 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute -top-8 -right-8 w-36 h-36 bg-brand-purple/20 rounded-full blur-2xl pointer-events-none group-hover:bg-brand-purple/30 transition-all duration-500" />
              <div className="relative z-10 w-20 h-20 rounded-xl bg-surface-1/90 border border-brand-purple/30 flex items-center justify-center p-2 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <TrackCoverPython />
              </div>
            </div>

            {/* Título & Especialidade */}
            <h3 className="text-base font-heading font-bold text-ink-heading tracking-tight group-hover:text-brand-purple-light transition-colors mb-1">
              Python & IA — Do Zero ao Agente Inteligente
            </h3>
            <p className="text-body-sm text-brand-purple-light/80 font-mono mb-2">Python • Machine Learning • Automações</p>

            {/* Resumo do Curso */}
            <p className="text-body-sm text-ink-span leading-relaxed line-clamp-2 mb-4 font-sans">
              Comece com scripts básicos em Python e avance até criar agentes autônomos com LLMs que leem arquivos, resolvem tarefas e integram APIs inteligentes.
            </p>

            {/* Tecnologias & Conteúdos-Chave */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">Python 3.12</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">OpenAI API</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">LangChain</span>
              <span className="bg-brand-purple/10 border border-brand-purple/30 text-brand-purple-light text-body-sm font-mono px-2 py-0.5 rounded-md">Automações</span>
            </div>

            {/* Sprint 6 — números da ementa oficial do produto
                (CURRICULUM-AND-PEDAGOGY-SPEC.md, seção 3, Trilha 4) */}
            <div className="mb-4 space-y-1 border-t border-border-1/60 pt-3 font-mono text-body-sm text-ink-span">
              <div>3 módulos · 3 desafios práticos</div>
              <div>Projeto final: <span className="font-bold text-ink-heading">Revisor de código autônomo com IA</span></div>
              <div>Autonomous Socratic Code Reviewer</div>
            </div>
          </div>

          {/* Rodapé: Nível e CTA — Sprint 10 (B36): empilhado (ver Trilha 1) */}
          <div className="pt-3.5 border-t border-border-1/80 flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
              <span className="text-xs font-mono text-ink-span">Do Zero ao Avançado</span>
            </div>
            <TrackedLink href="/register?track=python" ctaId="trilha_python" event="trilha_cta" eventProps={{ track: 'python' }} className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm font-bold whitespace-nowrap transition-all duration-200 active:scale-95 shadow-md shadow-brand-purple/25">
              <span>Começar grátis agora</span>
            </TrackedLink>
          </div>
        </article>

      </div>

      {/* Indicadores de navegação (dots) */}
      <div className="flex items-center justify-center gap-2 mt-6">
        <span className="w-6 h-1.5 rounded-full bg-brand-amber"></span>
        <span className="w-2 h-1.5 rounded-full bg-surface-3"></span>
        <span className="w-2 h-1.5 rounded-full bg-surface-3"></span>
        <span className="w-2 h-1.5 rounded-full bg-surface-3"></span>
      </div>
    </div>
  </section>
  </>
);
