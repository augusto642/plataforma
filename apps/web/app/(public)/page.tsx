import React from 'react';
import { LandingChrome } from '../components/landing/LandingChrome';
import { HeroSection } from '../components/landing/HeroSection';
import { PlatformStatsSection } from '../components/landing/PlatformStatsSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { TracksSection } from '../components/landing/TracksSection';
import { TcgCardsShowcase } from '../components/landing/TcgCardsShowcase';
import { GamificationSection } from '../components/landing/GamificationSection';
import { ComparisonVersus } from '../components/landing/ComparisonVersus';
import { MethodologySection } from '../components/landing/MethodologySection';
import { ResourcesSection } from '../components/landing/ResourcesSection';
import { PricingSection } from '../components/landing/PricingSection';
import { FaqSection } from '../components/landing/FaqSection';
import { FinalCtaSection } from '../components/landing/FinalCtaSection';
import { LandingFooter } from '../components/landing/LandingFooter';
import { StructuredData } from '../components/landing/StructuredData';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-dark-surface text-dark-on-surface font-body antialiased selection:bg-primary selection:text-white overflow-x-hidden">
      {/* Skip link para acessibilidade */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:font-code focus:text-sm focus:font-bold focus:text-white"
      >
        Pular para o conteúdo principal
      </a>

      <LandingChrome />

      <StructuredData />

      <main id="main-content">
        <HeroSection />
        <PlatformStatsSection />
        <HowItWorksSection />
        <TracksSection />
        <TcgCardsShowcase />
        <GamificationSection />
        <ComparisonVersus />
        <MethodologySection />
        <ResourcesSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>

      <LandingFooter />
    </div>
  );
}
