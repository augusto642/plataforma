import React from 'react';
import { FAQ_ITEMS } from './faq-data';

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
   mesmo exagero que as Sprints 10–14 removeram do HTML visível. */

const SITE_URL = 'https://nexuscode.dev';

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Nexus Code',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
};

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
  </>
);
