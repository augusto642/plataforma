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
            <span>TECNOLOGIAS DO CURSO</span>
          </div>
          {/* B59 (Sprint 17 · Volta 2) — título de seção é H2: era o
              único <h3> de topo entre os H2 das demais seções e
              quebrava o outline da página. */}
          <h2 className="text-2xl sm:text-3xl font-heading font-black text-ink-heading tracking-tight mb-3">
            As tecnologias que o mercado usa
          </h2>
          <p className="text-body-sm sm:text-sm font-sans text-ink-span leading-relaxed">
            Sem simulações simplórias. Você constrói soluções nas mesmas linguagens compiladas e runtimes isolados que sustentam a infraestrutura moderna de Big Techs.
          </p>
        </div>

        {/* Coluna Direita: Grid de Tecnologias Distribuído */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          <div className="p-3.5 rounded-2xl bg-surface-1 border border-border-1 hover:border-brand-amber/50 flex items-center gap-3 transition-all group">
            <span className="text-brand-amber group-hover:scale-110 transition-transform"><IconGear className="w-7 h-7" /></span>
            <div className="text-left font-mono">
              <div className="text-body-sm font-bold text-ink-heading">Rust 1.78</div>
              <div className="text-body-sm text-ink-span">Zero-Cost Memory</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-1 border border-border-1 hover:border-brand-cyan-neon/50 flex items-center gap-3 transition-all group">
            <span className="text-brand-cyan-neon group-hover:scale-110 transition-transform"><IconNodes className="w-7 h-7" /></span>
            <div className="text-left font-mono">
              <div className="text-body-sm font-bold text-ink-heading">Go 1.22</div>
              <div className="text-body-sm text-ink-span">Goroutines & Canais</div>
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
              <div className="text-body-sm text-ink-span">IA & RAG Pipelines</div>
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
