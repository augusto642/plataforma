{/* Sprint 10 · B34 — fatiado do antigo page.tsx monolítico ('use client' integral, 1.767 linhas): esta seção é Server Component; o estado interativo vive nas ilhas client. */}
import React from 'react';
import { IconCpu, IconTarget } from './icons';

export const MethodologySection: React.FC = () => (
  <>
  {/* 3. METODOLOGIA COM LASER BEAMS NA ORDEM EXATA DA MARCA (ROXO, CIANO, VERDE) */}
  <section id="metodologia" className="relative z-10 py-24 px-6 sm:px-8 max-w-7xl mx-auto border-t border-border-2/70">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16">
      <div className="max-w-2xl text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-purple-low border border-brand-purple/30 text-brand-purple-light text-xs font-mono font-bold mb-3">
          <IconCpu className="w-4 h-4" />
          <span>CIÊNCIA COGNITIVA // APRENDIZADO ATIVO</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-ink-heading tracking-tight mb-4">
          Como Você Aprende de Verdade
        </h2>
        <p className="text-base sm:text-lg text-ink-body leading-relaxed font-sans">
          Quem aprende depurando código real fixa o conteúdo de um jeito que aula passiva não fixa. Combinamos feedback determinístico de testes com tutoria socrática: você escreve, o sistema corrige na hora e a tutora guia o seu raciocínio.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2 text-xs font-mono">
        <div className="px-4 py-2 rounded-xl bg-brand-purple-low border border-brand-purple/30 text-brand-purple-light font-bold flex items-center gap-2">
          <IconTarget className="w-4 h-4" />
          <span>TAXONOMIA DE BLOOM: NÍVEIS 1 A 5</span>
        </div>
        <span className="text-body-sm text-ink-span">RETENÇÃO BASEADA EM FEEDBACK IMEDIATO</span>
      </div>
    </div>

    {/* 3 ETAPAS DA JORNADA NAS CORES DA MARCA (ROXO -> CIANO -> VERDE) */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* 01: Roxo */}
      <div className="p-7 rounded-2xl bg-surface-1 border border-border-2 relative flex flex-col justify-between">
        <div className="top-laser-beam bg-brand-purple"></div>
        <div>
          <div className="w-12 h-12 rounded-xl bg-background border border-border-2 flex items-center justify-center font-mono font-bold text-lg text-brand-purple-light mb-5">
            01
          </div>
          <h3 className="text-lg font-heading font-bold text-ink-heading mb-2.5">Desafios Práticos do Mundo Real</h3>
          <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
            Você recebe objetivos práticos com explicações simples e claras, entendendo exatamente o que precisa construir e o porquê de cada linha de código.
          </p>
        </div>
        <div className="mt-5 pt-3 border-t border-border-2 text-body-sm font-mono text-brand-purple-light">
          ✔ Aprendizado com propósito
        </div>
      </div>

      {/* 02: Ciano */}
      <div className="p-7 rounded-2xl bg-surface-1 border border-border-2 relative flex flex-col justify-between">
        <div className="top-laser-beam bg-brand-cyan-neon"></div>
        <div>
          <div className="w-12 h-12 rounded-xl bg-background border border-border-2 flex items-center justify-center font-mono font-bold text-lg text-brand-cyan-neon mb-5">
            02
          </div>
          <h3 className="text-lg font-heading font-bold text-ink-heading mb-2.5">Código Direto no Navegador</h3>
          <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
            Nada de perder horas configurando ferramentas complexas no seu computador. Escreva, teste e execute seu código direto pelo navegador, sem travar.
          </p>
        </div>
        <div className="mt-5 pt-3 border-t border-border-2 text-body-sm font-mono text-brand-cyan-neon">
          ✔ Zero instalação ou dores de cabeça
        </div>
      </div>

      {/* 03: Verde Neon */}
      <div className="p-7 rounded-2xl bg-surface-1 border border-border-2 relative flex flex-col justify-between">
        <div className="top-laser-beam bg-brand-green-neon"></div>
        <div>
          <div className="w-12 h-12 rounded-xl bg-background border border-border-2 flex items-center justify-center font-mono font-bold text-lg text-brand-green-neon mb-5">
            03
          </div>
          <h3 className="text-lg font-heading font-bold text-ink-heading mb-2.5">Correção na Hora & Dicas Amigáveis</h3>
          <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
            Seu código é corrigido imediatamente. Se você travar ou esquecer um comando, nosso tutor inteligente te dá dicas amigáveis passo a passo para achar a solução.
          </p>
        </div>
        <div className="mt-5 pt-3 border-t border-border-2 text-body-sm font-mono text-brand-green-neon">
          ✔ Evolução sem frustração
        </div>
      </div>

    </div>
  </section>
  </>
);
