import React from 'react';
import { FAQ_ITEMS } from './faq-data';
import { PLAN_PRICES, type PlanPrice } from './pricing-data';

/* B44 (Sprint 15) — dados estruturados (JSON-LD) da home.
   Até aqui a página não tinha NENHUM application/ld+json (grep = 0),
   abrindo mão de rich results mesmo com metadata/OG completos desde
   a Sprint 10 (B33). Entram só os dois tipos que a página sustenta
   sem inventar nada:
   - Organization: nome, URL canônica (a mesma de layout/robots/
     sitemap) e o logo real servido em /logo.svg.
   - FAQPage: gerado de faq-data.ts, espelho textual exato das
     perguntas e respostas REAIS exibidas na FaqSection.
   Course NÃO entra: as trilhas exibidas são a ementa do produto e
   não mapeiam 1:1 para entidades de curso com disponibilidade e
   preço conferíveis — prometer isso em dado estruturado seria o
   mesmo exagero que as Sprints 10–14 removeram do HTML visível.
   B52/P5 (Sprint 16) — reescopo conforme a pesquisa do ciclo: o
   Google aposentou os rich results de Course Info (jun/2025) e de
   FAQ (mai/2026); FAQPage fica como higiene de entidade, sem
   expectativa de snippet. O que entra de novo é Product/Offer dos
   planos pagos, com os preços REAIS exibidos na PricingSection —
   lidos da mesma fonte única (pricing-data.ts). NADA de
   AggregateRating/review: não existe avaliação real coletada. */

const SITE_URL = 'https://nexuscode.dev';

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Nexus Code',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  // B79 (Sprint 19 · destravamento B4) — o fundador nomeado também
  // no dado estruturado, espelho da FounderSection visível: nome e
  // cargo verdadeiros, sem foto (a foto dele entra depois).
  founder: {
    '@type': 'Person',
    name: 'Augusto Fortes',
    jobTitle: 'Professor de Informática',
  },
};

const productJsonLd = (plan: PlanPrice, description: string) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: plan.name,
  description,
  brand: { '@type': 'Organization', name: 'Nexus Code' },
  offers: {
    '@type': 'Offer',
    url: `${SITE_URL}/#precos`,
    priceCurrency: 'BRL',
    // Só chamado com plano com preço definido (Pro); o Carreira
    // (monthly null) não tem bloco Product — ver abaixo.
    price: plan.monthly!.toFixed(2),
    // B66 (Sprint 18 · Volta 3 · QA A8) — sem availability, o dado
    // estruturado lia os planos como compráveis hoje, um passo atrás
    // da página visível (que declara a cobrança inativa). PreOrder é
    // o estado honesto: pré-venda anunciada, cobrança ainda não ativa.
    availability: 'https://schema.org/PreOrder',
  },
});

const proProductJsonLd = productJsonLd(
  PLAN_PRICES.pro,
  // B66 — mesma formulação do card (B66/QA A6), atualizada na 216
  // (D1, correção #6): "acesso a todas as fases".
  'Plano Pro da Nexus Code: acesso a todas as fases, tutora de IA socrática em todos os níveis e certificados com verificação pública por código SHA-256.',
);

// Central 216 (D1) — o Carreira está com "Preço a definir": sem
// preço não há Offer honesta, então não há bloco Product dele. Só o
// Pro tem Product/Offer (PreOrder, cobrança ainda não ativa).

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export const StructuredData: React.FC = () => (
  <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(proProductJsonLd) }}
    />
  </>
);
