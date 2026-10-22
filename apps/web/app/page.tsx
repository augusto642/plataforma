import React from 'react';
import Image from 'next/image';
import { LandingChrome } from './components/landing/LandingChrome';
import { HeroSection } from './components/landing/HeroSection';
import { MethodologySection } from './components/landing/MethodologySection';
import { LumiMascotHero } from './components/landing/LumiMascotHero';
import { TracksSection } from './components/landing/TracksSection';
import { SandboxDemo } from './components/landing/SandboxDemo';
import { NexusPillarsGrid } from './components/landing/NexusPillarsGrid';
import { TcgCardsShowcase } from './components/landing/TcgCardsShowcase';
import { ComparisonVersus } from './components/landing/ComparisonVersus';
import { StackSection } from './components/landing/StackSection';
import { PricingSection } from './components/landing/PricingSection';
import { FaqSection } from './components/landing/FaqSection';
import { FinalCtaSection } from './components/landing/FinalCtaSection';
import { LandingFooter } from './components/landing/LandingFooter';
import { StructuredData } from './components/landing/StructuredData';

/* Sprint 10 · B34 — a landing deixou de ser UM client component de
   1.767 linhas: este page é um Server Component que compõe seções
   server (hero, metodologia, trilhas, stack, FAQ, CTA final, rodapé)
   com ilhas client mínimas onde há estado de verdade:
   - LandingChrome  → navbar, drawer, dropdown, command palette, UTM
   - HeroEvolution  → abas dos 4 estágios (dentro da HeroSection)
   - LumiMascotHero → corredor da tutora com retomada
   - SandboxDemo    → seletor de linguagem + demonstração ilustrativa
   - PricingSection → toggle mensal/anual
   - TcgCardsShowcase → showcase interativo dos cards
   Links com rastreio em seções server usam <TrackedLink/>. */
export default function HomePage() {
  return (
    <div className="bg-background text-ink-body antialiased selection:bg-brand-purple/30 selection:text-brand-purple-light relative overflow-x-hidden font-sans">
      {/* AURAS & AMBIENT MESH DE FUNDO DARK OBSIDIAN LUXURY */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Glow Spheres Suaves em GPU — Sprint 7 (dieta de ambiente do
            Designer): de 5 esferas fixas para 2, só a cor da marca */}
        <div className="pointer-events-none fixed top-[-10%] left-[12%] w-[700px] h-[700px] bg-brand-purple/15 rounded-full blur-[160px]"></div>
        <div className="pointer-events-none fixed bottom-[-10%] right-[10%] w-[750px] h-[750px] bg-brand-purple/12 rounded-full blur-[180px]"></div>

        {/* Cyber Mesh Grid Micro-Matrix */}
        <div
          className="pointer-events-none fixed inset-0 opacity-[0.28]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.12) 1px, transparent 0)`,
            backgroundSize: '36px 36px',
          }}
        />

        {/* Sprint 9 — o wash ciano radial do topo (estilo inline) foi
            aposentado: era o último "ambiente" fora da cor da marca
            competindo com o conteúdo (referência: ambiente zero). */}
      </div>

      <LandingChrome />

      {/* B44 (Sprint 15) — JSON-LD real da home (Organization + FAQPage) */}
      <StructuredData />

      {/* MAIN CONTAINER */}
      <div id="main-content">
        <HeroSection />
        <MethodologySection />
  {/* DEMONSTRAÇÃO DA TUTORA DE IA COM MÉTODO SOCRÁTICO — Sprint 7: a
      seção da mascote desceu: sai do caminho hero → metodologia e entra
      DEPOIS da Metodologia (ordem: Hero → Metodologia → Mascote →
      Trilhas → Sandbox → Pilares → TCG → Versus → Stack → Preços → FAQ) */}
  <LumiMascotHero />
        <TracksSection />
  {/* 5. TERMINAL INTERATIVO COM AS CORES DA PÁGINA PRINCIPAL */}
  <section id="sandbox" className="relative z-10 py-24 px-6 sm:px-8 max-w-7xl mx-auto border-t border-border-2/70">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
      <div className="max-w-2xl text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan-neon/30 text-brand-cyan-neon text-xs font-mono font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-brand-cyan-neon"></span>
          <span>DEMONSTRAÇÃO DO AMBIENTE REAL // ZERO SETUP</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-ink-heading tracking-tight mb-4">
          Um Gostinho do Terminal Real
        </h2>
        <p className="text-base sm:text-lg text-ink-body leading-relaxed font-sans">
          Isto é uma demonstração ilustrativa do ambiente da plataforma, com exemplos de código e saídas de exemplo. A execução de verdade acontece dentro da Nexus Code, em containers Linux isolados via Piston, com correção por testes reais a cada desafio.
        </p>
      </div>

      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-2 border border-border-1 text-xs font-mono text-ink-body shrink-0">
        <span className="w-2 h-2 rounded-full bg-brand-green-neon" />
        <span>DEMONSTRAÇÃO ILUSTRATIVA</span>
      </div>
    </div>

    {/* TELAS REAIS DO PRODUTO — Sprint 7 trouxe a primeira (Missão 1);
        Sprint 9 (item 1 do Designer: proeminência) o par de telas reais
        abre a seção, ANTES da demonstração ilustrativa, em escala
        protagonista. As duas capturadas com Playwright do app rodando
        local, rotuladas como o que são: telas de verdade */}
    <div className="flex flex-col gap-6 mb-6">
      {/* B52/P5 (Sprint 16) — a captura da Missão 1 é REAL, mas tem
          768×500 px e era exibida esticada a ~1.216px (upscale visível
          justamente na seção de prova). Sem captura nova em resolução
          maior, a exibição fica no TAMANHO NATIVO da imagem (768px,
          centralizada) — nítida e honesta, nunca arte fabricada nem
          upscale. A captura da IDE (1600×1000) segue em largura cheia. */}
      <figure className="rounded-2xl bg-surface-1 border border-border-2 overflow-hidden w-full max-w-[768px] mx-auto">
        <Image
          src="/landing/produto-missao-1.webp"
          alt="Tela real da Nexus Code: batalha da Missão 1 contra o SyntaxBug número 404, com o starter Pythox, barras de HP, registro da batalha e os botões de habilidade que pedem código"
          width={768}
          height={500}
          className="w-full h-auto"
          loading="lazy"
        />
        <figcaption className="px-5 py-3.5 border-t border-border-2 text-body-sm font-mono text-ink-span">
          Tela real da plataforma: a Missão 1 do prólogo — você batalha escrevendo código, antes mesmo de criar a conta.
        </figcaption>
      </figure>

      <figure className="rounded-2xl bg-surface-1 border border-border-2 overflow-hidden">
        <Image
          src="/landing/produto-ide.webp"
          alt="Tela real da Nexus Code: a IDE com a primeira atividade do curso de Python aberta, com o enunciado, as dicas, o editor de código com a função inicial e o terminal do sandbox"
          width={1600}
          height={1000}
          className="w-full h-auto"
          loading="lazy"
        />
        <figcaption className="px-5 py-3.5 border-t border-border-2 text-body-sm font-mono text-ink-span">
          Tela real da plataforma: a IDE onde o estudo acontece — enunciado, editor e terminal, direto no navegador.
        </figcaption>
      </figure>
    </div>
          <SandboxDemo />
        </section>
        {/* OS 4 PILARES DA NEXUS CODE (GRID BENTO) */}
        <NexusPillarsGrid />
        {/* SHOWCASE DOS CARDS TCG HOLOGRÁFICOS 3D */}
        <TcgCardsShowcase />
        {/* O COMPARATIVO BRUTAL: VELHO MUNDO VS ARENA NEXUS */}
        <ComparisonVersus />
        <StackSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
        <LandingFooter />
      </div>
    </div>
  );
}
