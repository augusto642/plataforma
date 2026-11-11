{/* Sprint 10 · B34 — fatiado do antigo page.tsx monolítico ('use client' integral, 1.767 linhas): esta seção é Server Component; o estado interativo vive nas ilhas client. */}
import React from 'react';
import {
  IconBolt, IconCode, IconGear, IconGitBranch, IconNodes, IconShield, IconTerminal,
} from './icons';

export const StackSection: React.FC = () => (
  <>
  {/* TRUST BANNER: INFRAESTRUTURA DE MISSÃO CRÍTICA & PILHAS BIG TECH (ASYMMETRIC SPLIT) */}
  <section className="relative py-16 border-y border-border-1 bg-surface-1">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Coluna Esquerda: Contexto de Engenharia */}
        <div className="lg:col-span-4 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-border-1 text-brand-cyan-neon text-xs font-mono mb-3">
            <IconShield className="w-4 h-4" />
            {/* B64 (Sprint 18 · Volta 3 · QA A2) — o selo dizia
                "TECNOLOGIAS DO CURSO" sobre uma grade que mistura o
                que já roda na plataforma com Rust/Go, que são trilhas
                NO RADAR. O selo e a grade agora contam a mesma
                história da seção de trilhas. */}
            <span>TECNOLOGIAS DE HOJE & DO RADAR</span>
          </div>
          {/* B59 (Sprint 17 · Volta 2) — título de seção é H2: era o
              único <h3> de topo entre os H2 das demais seções e
              quebrava o outline da página. */}
          <h2 className="text-2xl sm:text-3xl font-heading font-black text-ink-heading tracking-tight mb-3">
            As tecnologias que o mercado usa
          </h2>
          <p className="text-body-sm sm:text-sm font-sans text-ink-span leading-relaxed">
            Sem simulações simplórias: você escreve e executa código de verdade nas linguagens e
            na infraestrutura que já rodam na plataforma. As tecnologias marcadas como{' '}
            <span className="text-brand-amber font-semibold">NO RADAR</span> são as próximas do
            roteiro — ainda não são cursos abertos.
          </p>
        </div>

        {/* Coluna Direita: Grid de Tecnologias Distribuído */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          <div className="p-3.5 rounded-2xl bg-surface-1 border border-border-1 hover:border-brand-amber/50 flex items-center gap-3 transition-all group">
            <span className="text-brand-amber group-hover:scale-110 transition-transform"><IconGear className="w-7 h-7" /></span>
            <div className="text-left font-mono">
              <div className="text-body-sm font-bold text-ink-heading">Rust 1.78</div>
              <div className="text-body-sm text-ink-span">Zero-Cost Memory</div>
              {/* B64 — Rust é trilha do radar (ver TracksSection): o
                  card carrega o mesmo selo NO RADAR da vitrine. */}
              <span className="mt-1 inline-block text-[10px] font-mono font-black px-1.5 py-0.5 rounded border border-brand-amber/40 bg-brand-amber/10 text-brand-amber">NO RADAR</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-1 border border-border-1 hover:border-brand-cyan-neon/50 flex items-center gap-3 transition-all group">
            <span className="text-brand-cyan-neon group-hover:scale-110 transition-transform"><IconNodes className="w-7 h-7" /></span>
            <div className="text-left font-mono">
              <div className="text-body-sm font-bold text-ink-heading">Go 1.22</div>
              <div className="text-body-sm text-ink-span">Goroutines & Canais</div>
              {/* B64 — Go é trilha do radar: selo NO RADAR. */}
              <span className="mt-1 inline-block text-[10px] font-mono font-black px-1.5 py-0.5 rounded border border-brand-amber/40 bg-brand-amber/10 text-brand-amber">NO RADAR</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-1 border border-border-1 hover:border-brand-cyan/50 flex items-center gap-3 transition-all group">
            <span className="text-brand-cyan group-hover:scale-110 transition-transform"><IconBolt className="w-7 h-7" /></span>
            <div className="text-left font-mono">
              <div className="text-body-sm font-bold text-ink-heading">TypeScript 5.4</div>
              <div className="text-body-sm text-ink-span">Type Soundness</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-1 border border-border-1 hover:border-brand-amber-solar/50 flex items-center gap-3 transition-all group">
            <span className="text-brand-amber group-hover:scale-110 transition-transform"><IconCode className="w-7 h-7" /></span>
            <div className="text-left font-mono">
              <div className="text-body-sm font-bold text-ink-heading">Python 3.12</div>
              {/* B64 — "IA & RAG Pipelines" é a trilha Python & IA do
                  RADAR; o Python de hoje na plataforma é o dos cursos
                  introdutórios (funções, laços e listas, como no seed). */}
              <div className="text-body-sm text-ink-span">Funções, Laços & Listas</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-1 border border-border-1 hover:border-brand-rose/50 flex items-center gap-3 transition-all group">
            <span className="text-brand-rose group-hover:scale-110 transition-transform"><IconTerminal className="w-7 h-7" /></span>
            <div className="text-left font-mono">
              {/* B48/P1 (Sprint 16) — a stack descrevia a execução de um
                  terceiro jeito ("Linux cgroups-v2"). Formulação única
                  e verdadeira em toda a landing: containers Linux
                  isolados via Piston (runner.config da API). */}
              <div className="text-body-sm font-bold text-ink-heading">Sandbox Piston</div>
              <div className="text-body-sm text-ink-span">Containers Linux Isolados</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-1 border border-border-1 hover:border-brand-green/50 flex items-center gap-3 transition-all group">
            <span className="text-brand-green-neon group-hover:scale-110 transition-transform"><IconGitBranch className="w-7 h-7" /></span>
            <div className="text-left font-mono">
              <div className="text-body-sm font-bold text-ink-heading">Gitea Git Real</div>
              <div className="text-body-sm text-ink-span">Hash SHA-256</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  </>
);
