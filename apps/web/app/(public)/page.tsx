import React from 'react';
import { LandingChrome } from '../components/landing/LandingChrome';
import { HeroSection } from '../components/landing/HeroSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { TracksSection } from '../components/landing/TracksSection';
import { GamificationSection } from '../components/landing/GamificationSection';
import { ResourcesSection } from '../components/landing/ResourcesSection';
import { PricingSection } from '../components/landing/PricingSection';
import { FinalCtaSection } from '../components/landing/FinalCtaSection';
import { LandingFooter } from '../components/landing/LandingFooter';
import { StructuredData } from '../components/landing/StructuredData';

/* Central 218 (D1) — rebuild estrutural da home para o protótipo
   Stitch v2 (home-desktop.html / home-mobile.html): a home tem os 7
   blocos do protótipo, nesta ordem — Hero · Como você aprende (3
   passos) · Trilhas (3 cards) · RPG (mapa + ranking) · Recursos (4
   cards) · Planos (3 cards) · CTA final + rodapé. As ~13 seções
   extras que a produção servia foram removidas da home: battle card
   Missão 1, Aprendizado ativo (MethodologySection), Mentoria
   Socrática (LumiMascotHero), catálogo/radar "Comece hoje..."
   (parte da TracksSection), Números Reais (PlatformStatsSection),
   Terminal Real (seção #sandbox + SandboxDemo), Três apoios
   (NexusPillarsGrid), Cards colecionáveis (TcgCardsShowcase), tabela
   comparativa (ComparisonVersus), tecnologias (StackSection), Quem
   criou (FounderSection) e FAQ (FaqSection). Os arquivos dos
   componentes removidos seguem no repo (o catálogo real vive em
   /courses; FAQ/TCG/stack são módulos com specs próprias), mas
   nenhum é renderizado aqui. O JSON-LD acompanha: sem FAQPage (não
   há FAQ visível) e sem founder (não há seção de fundador visível).
   Regras vigentes: 23 correções + A1–A11; "Lumi" nunca visível;
   Portugol fora do hero; sem dado inventado (A3). */
export default function HomePage() {
  return (
    <div className="bg-background text-ink-body antialiased selection:bg-brand-purple/30 selection:text-brand-purple-light relative overflow-x-hidden font-sans">
      {/* B59 (Sprint 17 · Volta 2) — skip link: primeiro elemento
          focável da página; invisível até o foco, salta o chrome e
          cai direto no <main>. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-brand-purple focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:font-bold focus:text-white"
      >
        Pular para o conteúdo principal
      </a>
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
      </div>

      <LandingChrome />

      {/* B44 (Sprint 15) — JSON-LD real da home (Organization + Product
          do Pro). Sem FAQPage: a FAQ saiu da home no D1. */}
      <StructuredData />

      {/* MAIN CONTAINER — B59 (Sprint 17 · Volta 2): vira <main> de
          verdade (landmark para leitores de tela e alvo do skip link). */}
      <main id="main-content">
        <HeroSection />
        <HowItWorksSection />
        <TracksSection />
        <GamificationSection />
        <ResourcesSection />
        <PricingSection />
        <FinalCtaSection />
        <LandingFooter />
      </main>
    </div>
  );
}
