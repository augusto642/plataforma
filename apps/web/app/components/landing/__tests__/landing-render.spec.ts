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

// Pelo mesmo motivo, a faixa de números reais (B78, Sprint 19) é
// async (estatísticas via API): stubada aqui e coberta de verdade
// em stats-section.spec.ts.
vi.mock('../PlatformStatsSection', async () => {
  const ReactModule = await import('react');
  return {
    PlatformStatsSection: () =>
      ReactModule.createElement('section', { 'data-stats-stub': 'true' }),
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
  // Fase 1 premium (§2.4) — o CTA de plano pago passou da lista de
  // interessados para o checkout em modo de testes; o aviso honesto
  // (nenhuma cobrança real) segue 1× no card Pro, junto ao CTA.
  // Central 216 (D1): o Carreira não tem preço nem cobrança — sem
  // aviso de cobrança no card dele.
  it('aviso de cobrança aparece 1× no card Pro, junto ao CTA', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(countOccurrences(html, 'Checkout em modo de testes — nenhuma cobrança real é feita.')).toBe(1);
  });

  it('skip link é o PRIMEIRO link da página e o <main> tem o id dele', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    const firstAnchor = html.indexOf('<a ');
    expect(html.slice(firstAnchor, firstAnchor + 60)).toContain('href="#main-content"');
    expect(html).toContain('<main id="main-content"');
  });

  // Central 216 (D1): sem preço, o Carreira não tem bloco Product —
  // só o Pro tem Offer (PreOrder).
  it('JSON-LD: 3 blocos (Organization, FAQPage e Product do Pro); Offer com PreOrder e sem AggregateRating', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    const blocks = html.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) ?? [];
    expect(blocks.length).toBe(3);
    const all = blocks.join('\n');
    expect(all).toContain('"Organization"');
    expect(all).toContain('"FAQPage"');
    expect(all.split('"Product"').length - 1).toBe(1);
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
    expect(html).toContain('Assinar o Pro (modo de testes)');
    expect(html).toContain('Falar com a equipe');
    expect(html).toContain('id="plan-interest-email-pro"');
    expect(html).toContain('id="plan-interest-email-staff"');
  });

  // Central 216 (D1) — hero Stitch v2: H1 do protótipo + card do
  // editor de demonstração; a tela real fecha o primeiro bloco.
  it('hero: H1 do protótipo + card do editor e a tela real fecha o primeiro bloco', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    // next/image reescreve o src (/_next/image?url=%2Flanding%2F...):
    // o nome do arquivo é o que sobrevive verbatim no HTML.
    expect(html).toContain('produto-missao-1.webp');
    expect(html).toContain('Tela real da plataforma: a Missão 1 do prólogo');
    expect(html).toContain('Aprenda a programar de verdade,');
    expect(html).toContain('jogando.');
    expect(html).toContain('Código real no navegador, sem videoaulas passivas');
    expect(html).toContain('Ver prévia do jogo');
    expect(html).toContain('fase-03_desafio-arrays.js');
    expect(html).toContain('Demonstração');
  });

  // Redesign v2 (Central 213) — correções 1, 3, 4 e 6 do prompt v2:
  // hero com trilha de RPG sugerida pela IA, itens do Iniciante e Pro
  // sem "ilimitado". Retrabalho Central 213 (D1 + D4): a prova "4
  // linguagens no sandbox: JavaScript, Python, Java e Portugol" saiu
  // — o enum tem 5 valores e o hero nunca nomeia Portugol; sem
  // contagem defensável, o hero não afirma número nem nomeia língua.
  it('redesign v2: hero, prova social e planos sem os textos do mockup antigo', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('trilha de RPG sugerida pela IA para você');
    expect(html).toContain('Execução real do seu código em sandbox isolado');
    expect(html).not.toContain('4 linguagens no sandbox');
    expect(html).not.toContain('JavaScript, Python, Java e Portugol');
    expect(html).toContain('Acesso aos desafios iniciais de lógica');
    expect(html).toContain('Comunidade de alunos');
    expect(html).toContain('Acesso a todas as fases');
    expect(html).not.toContain('ilimitado');
    expect(html).not.toContain('Escolha sua trilha');
  });

  // Retrabalho Central 213 (D3) — a seção de passos do mockup v2
  // ("Como funciona") com os textos exatos do prompt (correções 2, 5
  // e 7) e do mockup desktop (passo 03).
  it('redesign v2 retrabalho (D3): seção de passos com os textos exatos do mockup', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('id="como-funciona"');
    expect(html).toContain('Sua trilha, sugerida pela IA');
    // Central 216 (A1) — o passo 01 descreve a investigação (até 2
    // dias) e o começo imediato; o texto da 213 foi substituído.
    expect(html).toContain(
      'Responda sobre seu nível e seus objetivos e a IA investiga seu perfil, o mercado e as vagas para sugerir a trilha ideal — em até 2 dias. E você já começa na hora: a trilha inicial e os desafios ficam liberados no cadastro.',
    );
    expect(html).toContain('Aprenda jogando');
    expect(html).toContain('Ligas competitivas e ranking semanal');
    expect(html).toContain('Conquiste a vaga');
    expect(html).toContain(
      'Com projetos concretos no portfólio, treino no simulador de entrevista e seu certificado verificado, você se conecta a empresas no Talent Match.',
    );
    expect(html).not.toContain('Escolha sua trilha');
    expect(html).not.toContain('ligas competitivas toda semana');
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

  // Central 216 (D1) — o Carreira não tem preço: a lista de
  // interessados é nomeada, sem prazo prometido.
  it('lista de interessados: o Carreira sem preço é nomeado, sem prazo prometido', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Seu e-mail para a lista de interessados do plano Carreira');
  });

  it('fundador (B79 · Sprint 19): nome e papel reais na página e no JSON-LD, sem foto de pessoa', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Quem criou a Nexus Code');
    expect(html).toContain('Augusto Fortes');
    expect(html).toContain('Professor de Informática');
    expect(html).toContain('curso técnico de Informática para Internet');
    // Sem foto por enquanto (decisão B4): o visual é o monograma
    // tipográfico — e nenhuma imagem de pessoa entra na seção.
    expect(html).toContain('>AF<');
    expect(html).not.toContain('user-profile-reference');
    // O dado estruturado espelha a seção visível (founder na
    // Organization), sem inventar campo novo de avaliação.
    expect(html).toContain('"founder"');
  });
});
