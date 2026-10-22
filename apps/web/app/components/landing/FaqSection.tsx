{/* Sprint 10 · B34 — fatiado do antigo page.tsx monolítico ('use client' integral, 1.767 linhas): esta seção é Server Component; o estado interativo vive nas ilhas client. */}
{/* B60 (Sprint 17 · Volta 2) — FONTE ÚNICA: as perguntas e respostas
    saíram dos 8 cards hardcoded em JSX e passaram a ser renderizadas
    de faq-data.ts — a mesma fonte do JSON-LD (FAQPage) em
    StructuredData.tsx. Acabou a duplicação JSX × dados (e o risco de
    o dado estruturado divergir do visível). O que fica aqui é só
    APRESENTAÇÃO: ícone, tag e tema de cor de cada card, por índice.
    As ênfases (trechos em destaque) são substrings exatas da resposta
    declaradas no próprio faq-data.ts. */}
import React from 'react';
import { TrackedLink } from './TrackedLink';
import { FAQ_ITEMS } from './faq-data';
import {
  IconBolt, IconBox, IconCard, IconChat, IconMonitor, IconShield, IconShieldCheck, IconSpeech, IconSun,
} from './icons';

interface FaqDecoration {
  tag: string;
  Icon: React.FC<{ className?: string }>;
  cardHover: string;
  lineVia: string;
  iconBox: string;
  tagCls: string;
  titleHover: string;
}

/* Decoração por índice de FAQ_ITEMS — a ordem acompanha faq-data.ts:
   1 zero instalação · 2 metodologia · 3 iniciantes · 4 pré-requisitos
   · 5 tutora · 6 certificados · 7 dinheiro · 8 garantia. */
const FAQ_DECORATIONS: FaqDecoration[] = [
  {
    tag: 'ZERO INSTALAÇÃO',
    Icon: IconMonitor,
    cardHover: 'hover:border-brand-cyan-neon/60 hover:shadow-accent-sm-cyan',
    lineVia: 'via-brand-cyan-neon/60',
    iconBox: 'bg-brand-cyan-neon/10 border-brand-cyan-neon/30 text-brand-cyan-neon',
    tagCls: 'border-brand-cyan-neon/40 bg-brand-cyan-neon/10 text-brand-cyan-neon',
    titleHover: 'group-hover:text-brand-cyan-neon',
  },
  {
    tag: 'METODOLOGIA ATIVA',
    Icon: IconBolt,
    cardHover: 'hover:border-brand-rose/60 hover:shadow-accent-sm-pink',
    lineVia: 'via-brand-rose/60',
    iconBox: 'bg-brand-rose/10 border-brand-rose/30 text-brand-rose',
    tagCls: 'border-brand-rose/40 bg-brand-rose/10 text-brand-rose',
    titleHover: 'group-hover:text-brand-rose',
  },
  {
    tag: 'DO ZERO AO CÓDIGO',
    Icon: IconSun,
    cardHover: 'hover:border-brand-green-neon/60 hover:shadow-accent-sm-green',
    lineVia: 'via-brand-green-neon/60',
    iconBox: 'bg-brand-green-neon/10 border-brand-green-neon/30 text-brand-green-neon',
    tagCls: 'border-brand-green-neon/40 bg-brand-green-neon/10 text-brand-green-neon',
    titleHover: 'group-hover:text-brand-green-neon',
  },
  {
    tag: 'SEM PRÉ-REQUISITOS',
    Icon: IconBox,
    cardHover: 'hover:border-brand-amber/60 hover:shadow-accent-sm-amber',
    lineVia: 'via-brand-amber/60',
    iconBox: 'bg-brand-amber/10 border-brand-amber/30 text-brand-amber',
    tagCls: 'border-brand-amber/40 bg-brand-amber/10 text-brand-amber',
    titleHover: 'group-hover:text-brand-amber',
  },
  {
    tag: 'TUTOR SOCRÁTICO',
    Icon: IconSpeech,
    cardHover: 'hover:border-brand-purple/60 hover:shadow-accent-sm-purple',
    lineVia: 'via-brand-purple/60',
    iconBox: 'bg-brand-purple/10 border-brand-purple/30 text-brand-purple-light',
    tagCls: 'border-brand-purple/40 bg-brand-purple/10 text-brand-purple-light',
    titleHover: 'group-hover:text-brand-purple-light',
  },
  {
    tag: 'COMPROVAÇÃO REAL',
    Icon: IconShieldCheck,
    cardHover: 'hover:border-brand-green/60 hover:shadow-accent-sm-emerald',
    lineVia: 'via-brand-green-neon/60',
    iconBox: 'bg-brand-green/10 border-brand-green/30 text-brand-green-neon',
    tagCls: 'border-brand-green/40 bg-brand-green/10 text-brand-green-neon',
    titleHover: 'group-hover:text-brand-green-neon',
  },
  {
    tag: 'DINHEIRO',
    Icon: IconCard,
    cardHover: 'hover:border-brand-green-neon/60 hover:shadow-accent-sm-green',
    lineVia: 'via-brand-green-neon/60',
    iconBox: 'bg-brand-green-neon/10 border-brand-green-neon/30 text-brand-green-neon',
    tagCls: 'border-brand-green-neon/40 bg-brand-green-neon/10 text-brand-green-neon',
    titleHover: 'group-hover:text-brand-green-neon',
  },
  {
    tag: 'GARANTIA & CANCELAMENTO',
    Icon: IconShield,
    cardHover: 'hover:border-brand-cyan-neon/60 hover:shadow-accent-sm-cyan',
    lineVia: 'via-brand-cyan-neon/60',
    iconBox: 'bg-brand-cyan-neon/10 border-brand-cyan-neon/30 text-brand-cyan-neon',
    tagCls: 'border-brand-cyan-neon/40 bg-brand-cyan-neon/10 text-brand-cyan-neon',
    titleHover: 'group-hover:text-brand-cyan-neon',
  },
];

/* Renderiza a resposta em texto puro envolvendo em destaque cada
   substring declarada em `emphasis`. Ênfase não encontrada é ignorada
   (o conteúdo nunca muda — só a apresentação); um teste trava que
   todas as ênfases são substrings das respostas. */
function renderAnswer(answer: string, emphasis: string[] = []): React.ReactNode {
  let segments: { text: string; strong: boolean }[] = [{ text: answer, strong: false }];
  for (const phrase of emphasis) {
    const next: { text: string; strong: boolean }[] = [];
    for (const segment of segments) {
      if (segment.strong) {
        next.push(segment);
        continue;
      }
      const idx = segment.text.indexOf(phrase);
      if (idx === -1) {
        next.push(segment);
        continue;
      }
      if (idx > 0) next.push({ text: segment.text.slice(0, idx), strong: false });
      next.push({ text: phrase, strong: true });
      const rest = segment.text.slice(idx + phrase.length);
      if (rest) next.push({ text: rest, strong: false });
    }
    segments = next;
  }
  return segments.map((segment, i) =>
    segment.strong ? (
      <span key={i} className="text-ink-heading font-medium">
        {segment.text}
      </span>
    ) : (
      <React.Fragment key={i}>{segment.text}</React.Fragment>
    ),
  );
}

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

    {/* Grid de Perguntas em 2 Colunas com Cores Semânticas — conteúdo
        de faq-data.ts (fonte única), decoração por índice */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
      {FAQ_ITEMS.map((item, i) => {
        const deco = FAQ_DECORATIONS[i % FAQ_DECORATIONS.length];
        const DecoIcon = deco.Icon;
        return (
          <div
            key={item.question}
            className={`group relative p-7 rounded-2xl bg-surface-1 border border-border-2 transition-all duration-300 hover:-translate-y-1 ${deco.cardHover}`}
          >
            <div className={`absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${deco.lineVia}`}></div>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform ${deco.iconBox}`}>
                <DecoIcon className="w-5 h-5" />
              </div>
              <span className={`text-body-sm font-mono font-bold px-2.5 py-0.5 rounded-full border ${deco.tagCls}`}>
                {deco.tag}
              </span>
            </div>
            <h3 className={`font-heading font-bold text-ink-heading text-base sm:text-lg mb-2.5 transition-colors ${deco.titleHover}`}>
              {item.question}
            </h3>
            <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
              {renderAnswer(item.answer, item.emphasis)}
            </p>
          </div>
        );
      })}
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
