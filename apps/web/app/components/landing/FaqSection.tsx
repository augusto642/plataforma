{/* Sprint 10 · B34 — fatiado do antigo page.tsx monolítico ('use client' integral, 1.767 linhas): esta seção é Server Component; o estado interativo vive nas ilhas client. */}
{/* B44 (Sprint 15) — as perguntas/respostas desta seção têm um espelho
    em texto puro em faq-data.ts, usado no JSON-LD (FAQPage) da home.
    Editou uma pergunta ou resposta aqui? Edite lá também. */}
import React from 'react';
import { TrackedLink } from './TrackedLink';
import {
  IconBolt, IconBox, IconChat, IconMonitor, IconShieldCheck, IconSpeech, IconSun,
} from './icons';

export const FaqSection: React.FC = () => (
  <>
  {/* 11. FAQ: PERGUNTAS FREQUENTES */}
  <section id="faq" className="relative z-10 py-28 px-6 sm:px-8 max-w-6xl mx-auto border-t border-border-2/70 overflow-hidden">
    {/* Aura de iluminação de fundo — Sprint 7 (dieta de ambiente):
        de 3 auras coloridas para 1, só a cor da marca */}
    <div className="pointer-events-none absolute -top-32 left-10 w-96 h-96 bg-brand-purple/15 rounded-full blur-3xl"></div>

    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16 relative z-10">
      <div className="max-w-2xl text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold border border-brand-purple/40 bg-brand-purple/10 text-brand-purple-light mb-4">
          <span className="w-2 h-2 rounded-full bg-brand-cyan-neon"></span>
          <span>TIRE SUAS DÚVIDAS</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-ink-heading tracking-tight mb-4">
          Perguntas <span className="bg-gradient-to-r from-brand-purple via-brand-cyan-neon to-brand-green-neon bg-clip-text text-transparent">Frequentes</span>
        </h2>
        <p className="text-base sm:text-lg text-ink-body leading-relaxed font-sans">
          Respostas diretas sobre a metodologia prática, o ambiente em containers Linux e como seu código gera autoridade técnica.
        </p>
      </div>

      {/* Sprint 7 (honestidade, régua do PM) — o selo de status ao
          vivo da comunidade saiu daqui: claim sem fonte */}
    </div>

    {/* Grid de Perguntas em 2 Colunas com Cores Semânticas */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
      
      {/* 1. Ciano: Zero Instalação */}
      <div className="group relative p-7 rounded-2xl bg-surface-1 border border-border-2 hover:border-brand-cyan-neon/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-sm-cyan">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-brand-cyan-neon/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-cyan-neon/10 border border-brand-cyan-neon/30 text-brand-cyan-neon flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <IconMonitor className="w-5 h-5" />
          </div>
          <span className="text-body-sm font-mono font-bold px-2.5 py-0.5 rounded-full border border-brand-cyan-neon/40 bg-brand-cyan-neon/10 text-brand-cyan-neon">
            ZERO INSTALAÇÃO
          </span>
        </div>
        <h3 className="font-heading font-bold text-ink-heading text-base sm:text-lg mb-2.5 group-hover:text-brand-cyan-neon transition-colors">
          Preciso instalar algo na minha máquina para começar?
        </h3>
        <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
          Não. Todo o ambiente roda em <span className="text-ink-heading font-medium">containers Linux isolados</span> diretamente no seu navegador. Você só precisa de uma conexão à internet para escrever, compilar e rodar testes em Python, Go e Rust.
        </p>
      </div>

      {/* 2. Rosa: Metodologia vs Cursos em Vídeo */}
      <div className="group relative p-7 rounded-2xl bg-surface-1 border border-border-2 hover:border-brand-rose/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-sm-pink">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-brand-rose/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-rose/10 border border-brand-rose/30 text-brand-rose flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <IconBolt className="w-5 h-5" />
          </div>
          <span className="text-body-sm font-mono font-bold px-2.5 py-0.5 rounded-full border border-brand-rose/40 bg-brand-rose/10 text-brand-rose">
            METODOLOGIA ATIVA
          </span>
        </div>
        <h3 className="font-heading font-bold text-ink-heading text-base sm:text-lg mb-2.5 group-hover:text-brand-rose transition-colors">
          Qual a diferença entre a NEXUS CODE e cursos em vídeo?
        </h3>
        <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
          Nas plataformas tradicionais você passa a maior parte do tempo assistindo passivamente a vídeos longos. Na NEXUS CODE você passa <span className="text-ink-heading font-medium">a maior parte do tempo escrevendo código e corrigindo testes</span>, exatamente o que molda o programador contratado pelo mercado.
        </p>
      </div>

      {/* 3. Verde: Iniciantes Absolutos */}
      <div className="group relative p-7 rounded-2xl bg-surface-1 border border-border-2 hover:border-brand-green-neon/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-sm-green">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-brand-green-neon/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-green-neon/10 border border-brand-green-neon/30 text-brand-green-neon flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <IconSun className="w-5 h-5" />
          </div>
          <span className="text-body-sm font-mono font-bold px-2.5 py-0.5 rounded-full border border-brand-green-neon/40 bg-brand-green-neon/10 text-brand-green-neon">
            DO ZERO AO CÓDIGO
          </span>
        </div>
        <h3 className="font-heading font-bold text-ink-heading text-base sm:text-lg mb-2.5 group-hover:text-brand-green-neon transition-colors">
          Sou iniciante absoluto. Vou conseguir acompanhar?
        </h3>
        <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
          Sim, com certeza! A plataforma foi desenhada para quem nunca escreveu uma linha de código. Você começa aprendendo <span className="text-ink-heading font-medium">lógica básica e sintaxe elementar</span>, com feedback passo a passo até construir projetos completos.
        </p>
      </div>

      {/* 4. Âmbar: Pré-requisitos & Faculdade */}
      <div className="group relative p-7 rounded-2xl bg-surface-1 border border-border-2 hover:border-brand-amber/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-sm-amber">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-brand-amber/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-amber/10 border border-brand-amber/30 text-brand-amber flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <IconBox className="w-5 h-5" />
          </div>
          <span className="text-body-sm font-mono font-bold px-2.5 py-0.5 rounded-full border border-brand-amber/40 bg-brand-amber/10 text-brand-amber">
            SEM PRÉ-REQUISITOS
          </span>
        </div>
        <h3 className="font-heading font-bold text-ink-heading text-base sm:text-lg mb-2.5 group-hover:text-brand-amber transition-colors">
          Preciso ter faculdade ou saber matemática avançada?
        </h3>
        <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
          Não! Você não precisa de diploma na área nem de fórmulas complexas. O raciocínio lógico é construído de forma <span className="text-ink-heading font-medium">prática, visual e gradual</span>, resolvendo problemas reais no terminal desde o primeiro dia.
        </p>
      </div>

      {/* 5. Roxo: Tutor Socrático & Feedback */}
      <div className="group relative p-7 rounded-2xl bg-surface-1 border border-border-2 hover:border-brand-purple/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-sm-purple">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-brand-purple/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-purple/10 border border-brand-purple/30 text-brand-purple-light flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <IconSpeech className="w-5 h-5" />
          </div>
          <span className="text-body-sm font-mono font-bold px-2.5 py-0.5 rounded-full border border-brand-purple/40 bg-brand-purple/10 text-brand-purple-light">
            TUTOR SOCRÁTICO
          </span>
        </div>
        <h3 className="font-heading font-bold text-ink-heading text-base sm:text-lg mb-2.5 group-hover:text-brand-purple-light transition-colors">
          Como funciona o feedback quando meu código dá erro?
        </h3>
        <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
          Nossa tutoria socrática lê a <span className="text-ink-heading font-medium">mensagem de erro e o seu código</span>, reconhece o padrão do problema e aponta pistas e perguntas reflexivas, em vez de dar a resposta pronta. Isso desenvolve seu raciocínio real de debugging.
        </p>
      </div>

      {/* 6. Esmeralda: Certificados & Mercado */}
      <div className="group relative p-7 rounded-2xl bg-surface-1 border border-border-2 hover:border-brand-green/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-sm-emerald">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-brand-green-neon/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/30 text-brand-green-neon flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <IconShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-body-sm font-mono font-bold px-2.5 py-0.5 rounded-full border border-brand-green/40 bg-brand-green/10 text-brand-green-neon">
            COMPROVAÇÃO REAL
          </span>
        </div>
        <h3 className="font-heading font-bold text-ink-heading text-base sm:text-lg mb-2.5 group-hover:text-brand-green-neon transition-colors">
          Como os projetos e certificados me ajudam a conseguir vagas?
        </h3>
        <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
          Cada projeto gera repositórios Git reais com histórico de commits e certificados com <span className="text-ink-heading font-medium">código de verificação SHA-256</span> que qualquer pessoa pode conferir. Você prova sua capacidade técnica para recrutadores mostrando código executável em produção.
        </p>
      </div>

    </div>

    {/* Banner inferior de suporte / contato */}
    <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-surface-1 via-surface-2 to-surface-1 border border-brand-purple/30 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
      <div className="flex items-center gap-4 text-center sm:text-left">
        <div className="w-12 h-12 rounded-xl bg-brand-purple/20 border border-brand-purple/40 text-brand-purple-light flex items-center justify-center text-2xl shrink-0">
          <IconChat className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-heading font-bold text-ink-heading text-base sm:text-lg">Ainda tem alguma dúvida sobre a plataforma?</h4>
          <p className="text-body-sm sm:text-sm text-ink-span font-sans">Nossa comunidade e time de engenharia apoiam você em cada etapa.</p>
        </div>
      </div>
      <TrackedLink href="/onboarding" ctaId="faq_banner" event="final_cta" className="shrink-0 px-6 py-3 rounded-xl bg-brand-purple hover:bg-brand-purple-light text-white font-mono font-bold text-body-sm sm:text-sm transition-all duration-200 active:scale-95 shadow-lg shadow-brand-purple/25 border border-brand-purple-light/50">
        Começar grátis agora →
      </TrackedLink>
    </div>
  </section>
  </>
);
