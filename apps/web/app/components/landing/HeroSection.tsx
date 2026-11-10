{/* Sprint 10 · B34 — fatiado do antigo page.tsx monolítico ('use client' integral, 1.767 linhas): esta seção é Server Component; o estado interativo vive nas ilhas client. */}
import React from 'react';
import { HeroEvolution } from './HeroEvolution';
import { TrackedLink } from './TrackedLink';
// B52/P5 (Sprint 16) — a âncora de preço do hero lê da fonte única
// de preços (pricing-data.ts), a mesma do card e do JSON-LD.
import { PLAN_PRICES, formatBRL } from './pricing-data';

export const HeroSection: React.FC = () => (
  <>
{/* 2. HERO SECTION: O ARCO DE EVOLUÇÃO — DO JOGO AO MERCADO */}
  <section id="hero" className="relative z-10 pt-10 sm:pt-14 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    {/* Animação de entrada única e orquestrada do bloco (escalonada via animation-delay inline) */}
    <style>{`
      @keyframes heroRise {
        from { opacity: 0; transform: translateY(18px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .hero-rise {
        opacity: 0;
        animation: heroRise 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      @media (prefers-reduced-motion: reduce) {
        .hero-rise { opacity: 1; animation: none; }
      }
    `}</style>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

      {/* COLUNA ESQUERDA: NARRATIVA & AÇÃO (5 COLS) */}
      <div className="lg:col-span-5 text-left">
        {/* EYEBROW: UMA MENSAGEM SÓ, NOMEANDO O PÚBLICO */}
        <div className="hero-rise inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-purple-low border border-border-brand text-brand-purple-light text-[11px] font-mono font-bold mb-6" style={{ animationDelay: '0ms' }}>
          <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
          <span>PARA QUEM ESTÁ COMEÇANDO DO ZERO</span>
        </div>

        {/* HEADLINE H1: A PROMESSA — APRENDER DE VERDADE, DO PRIMEIRO EXERCÍCIO AO MERCADO */}
        <h1 className="hero-rise font-heading text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight text-ink-heading leading-[1.08] mb-6" style={{ animationDelay: '90ms' }}>
          Aprenda a programar <span className="text-brand-purple">de verdade</span>.
          Do primeiro exercício ao <span className="text-brand-purple">mercado de tecnologia</span>.
        </h1>

        {/* SUBHEADLINE: O PONTO DE PARTIDA REAL + A JORNADA COMO CAMINHO
            B53 (Sprint 17 · Volta 2) — a versão anterior narrava o arco
            inteiro no presente ("sobe de nível: projetos guiados, a IDE
            completa, até montar um portfólio"), como se cada estágio já
            fosse inventário. Agora: o que está no ar hoje (prólogo
            jogável + cursos introdutórios de JavaScript e Python) é o
            ponto de partida declarado; os estágios seguintes são o
            caminho/destino — a gramática que o HeroEvolution usa. */}
        <p className="hero-rise font-sans text-base sm:text-lg text-ink-body leading-relaxed mb-4 max-w-xl" style={{ animationDelay: '180ms' }}>
          Sem horas de vídeo que não viram prática: aqui, <strong className="text-ink-heading">cada conceito vira um exercício</strong> — código escrito por você e corrigido na hora.
          Você começa hoje pelo prólogo jogável e pelos cursos introdutórios de JavaScript e Python que já estão no ar — e a jornada continua em estágios: projetos guiados, níveis avançados e o portfólio verificável são o caminho até o mercado.
          O destino não é um certificado. É você, <strong className="text-ink-heading">dev completo, pronto para o mercado</strong>.
        </p>

        {/* A GUIA PRESENTE EM TODOS OS ESTÁGIOS */}
        <p className="hero-rise text-sm text-ink-span font-sans mb-8" style={{ animationDelay: '240ms' }}>
          Nossa <strong className="text-brand-purple-light">tutora de IA</strong> acompanha você em cada exercício: em vez de entregar a resposta, ela faz a pergunta certa e libera dicas em 3 níveis. A resposta pronta, nunca — quem resolve é você.
        </p>

        {/* AÇÃO: UM CTA PRIMÁRIO (ROXO SÓLIDO) + O QUIZ COMO CAMINHO DE BAIXO COMPROMISSO */}
        <div className="hero-rise flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-4" style={{ animationDelay: '300ms' }}>
          <TrackedLink
            href="/onboarding"
            ctaId="hero_primary"
            event="hero_cta"
            className="group inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl bg-brand-purple hover:bg-brand-purple-dark text-white text-sm sm:text-base font-heading font-black tracking-tight transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-brand-purple/30 cursor-pointer"
          >
            <span>Começar grátis agora</span>
            <span className="group-hover:translate-x-1.5 transition-transform duration-200 font-bold">→</span>
          </TrackedLink>

          <TrackedLink
            href="/diagnostico"
            ctaId="hero_quiz"
            event="quiz_cta"
            className="group inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-transparent hover:bg-surface-2 border border-border-2 hover:border-border-brand text-ink-heading font-heading font-bold text-sm sm:text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Descubra seu nível em 3 min</span>
          </TrackedLink>
        </div>

        {/* MICROCOPY DE PREÇO (HONESTA, SEM URGÊNCIA INVENTADA)
            B54 (Sprint 17 · Volta 2) — "lote fundador" saiu: não existe
            lote, cota nem prazo definidos. O que existe é a lista de
            interessados do plano (B54), e é ela que a microcopy nomeia. */}
        <p className="hero-rise text-xs font-mono text-ink-span mb-8" style={{ animationDelay: '380ms' }}>
          Lista de interessados do Pro aberta · Pro por {formatBRL(PLAN_PRICES.pro.monthly)}/mês · grátis para começar, sem cartão
        </p>

        {/* PROVAS DE MECANISMO (SUBSTITUEM AS MÉTRICAS FABRICADAS) */}
        <div className="hero-rise rounded-2xl bg-surface-1 border border-border-1 p-4 max-w-lg" style={{ animationDelay: '440ms' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4 text-sm font-sans text-ink-body">
            <div className="flex items-center gap-2">
              <span className="text-brand-green-neon font-black">✔</span>
              <span>100% em português</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-brand-green-neon font-black">✔</span>
              <span>Correção por testes reais, a cada exercício</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-brand-green-neon font-black">✔</span>
              <span>Comece no navegador, sem instalar nada</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-brand-green-neon font-black">✔</span>
              <span>Monte um portfólio profissional e de alto valor</span>
            </div>
          </div>
        </div>
      </div>

      {/* COLUNA DIREITA: O ARCO DE EVOLUÇÃO DO ALUNO (6 COLS) */}
      <div className="lg:col-span-6 w-full">
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-[11px] font-mono text-brand-purple-light uppercase tracking-widest font-black flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-purple" />
            A JORNADA · 4 ESTÁGIOS
          </span>
          <span className="text-[10px] font-mono text-ink-span font-semibold">DO JOGO AO MERCADO</span>
        </div>
        <HeroEvolution />
      </div>

    </div>

  </section>
  </>
);
