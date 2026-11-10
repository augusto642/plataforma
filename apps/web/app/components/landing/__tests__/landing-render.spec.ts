import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import HomePage from '../../../(public)/page';

// B76 (Sprint 18 · Volta 3 · TL M3) — testes de RENDERIZAÇÃO dos
// claims estruturais da landing: até a Volta 2, as voltas travavam
// os dados por specs de módulo, mas nenhum teste renderizava a
// página — foi assim que claims quebrados no destino (starter do
// TCG) passaram. Aqui a landing é renderizada de verdade (SSR,
// react-dom/server) e os claims são contados NO HTML.
// A TracksSection é async (catálogo via API) e o renderer DOM do
// React 18 não resolve async components fora do Flight do Next —
// ela é stubada aqui e coberta de verdade em tracks-section.spec.ts.
vi.mock('../TracksSection', async () => {
  const ReactModule = await import('react');
  return {
    TracksSection: () =>
      ReactModule.createElement('section', { 'data-tracks-stub': 'true' }),
  };
});

async function renderHtml(element: React.ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = '';
    const sink = new PassThrough();
    sink.on('data', (chunk) => {
      html += chunk.toString();
    });
    sink.on('end', () => resolve(stripReactComments(html)));
    const { pipe } = renderToPipeableStream(element, {
      onAllReady() {
        pipe(sink);
      },
      onShellError(err) {
        reject(err);
      },
    });
  });
}

function countOccurrences(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

// O SSR do React separa nós de texto dinâmicos com comentários
// (<!-- -->) e marca fronteiras de Suspense (<!--$-->): sem removê-los,
// asserções de frases que cruzam expressões JSX quebram por formatação,
// não por conteúdo.
function stripReactComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

describe('landing — renderização e claims estruturais (B76)', () => {
  it('aviso de cobrança aparece 1× em cada card pago (Pro e Staff), junto ao CTA', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(countOccurrences(html, 'Cobrança ainda não ativa — hoje o cadastro é gratuito.')).toBe(2);
  });

  it('skip link é o PRIMEIRO link da página e o <main> tem o id dele', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    const firstAnchor = html.indexOf('<a ');
    expect(html.slice(firstAnchor, firstAnchor + 60)).toContain('href="#main-content"');
    expect(html).toContain('<main id="main-content"');
  });

  it('JSON-LD: 4 blocos (Organization, FAQPage e Product dos 2 planos); Offer com PreOrder e sem AggregateRating', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    const blocks = html.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) ?? [];
    expect(blocks.length).toBe(4);
    const all = blocks.join('\n');
    expect(all).toContain('"Organization"');
    expect(all).toContain('"FAQPage"');
    expect(all.split('"Product"').length - 1).toBe(2);
    expect(all).toContain('https://schema.org/PreOrder');
    expect(all).not.toContain('AggregateRating');
  });

  it('radar rotulado nas superfícies da página: selos NO RADAR da stack e rodapé', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('TECNOLOGIAS DE HOJE &amp; DO RADAR');
    expect(countOccurrences(html, 'NO RADAR')).toBeGreaterThanOrEqual(2);
    expect(html).toContain('Trilhas no radar');
  });

  it('CTAs de preço distintos e verdadeiros + captura só-e-mail nos cards pagos', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Começar grátis agora');
    expect(html).toContain('Entrar na lista de interessados');
    expect(html).toContain('Falar com a equipe');
    expect(html).toContain('id="plan-interest-email-pro"');
    expect(html).toContain('id="plan-interest-email-staff"');
  });

  it('hero: a tela real fecha o primeiro bloco e a jornada é rotulada como ilustrativa', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    // next/image reescreve o src (/_next/image?url=%2Flanding%2F...):
    // o nome do arquivo é o que sobrevive verbatim no HTML.
    expect(html).toContain('produto-missao-1.webp');
    expect(html).toContain('Tela real da plataforma: a Missão 1 do prólogo');
    expect(html).toContain('Visão ilustrativa da jornada');
  });

  it('tutora: H2 em escala de seção, fora do card', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toMatch(/<h2 class="[^"]*text-3xl[^"]*">\s*Mentoria Socrática\s*<\/h2>/);
    expect(html).toContain('Diálogo de exemplo');
  });

  it('TCG: cards operáveis por teclado no HTML e nenhum identificador de starter fantasma', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    // Os links do modal são estado client (card inspecionado) e não
    // aparecem no SSR: o destino de cada card é travado nos DADOS
    // (tcg-cards.spec.ts). Aqui: a grade renderizada e a ausência
    // dos starters que o onboarding não tem.
    expect(html).not.toContain('rustor');
    expect(html).not.toContain('gopherus');
    expect(html).toContain('aria-label="Inspecionar o card');
    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
  });

  it('lista de interessados: o processo do Staff é nomeado, sem prazo prometido', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('cadastra a sua empresa, falando com você por e-mail');
  });
});
