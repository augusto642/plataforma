import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../PlatformStatsSection', () => ({
  PlatformStatsSection: () => React.createElement('div', { id: 'platform-stats-mock' }),
}));

import HomePage from '../../../(public)/page';

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

function stripReactComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

describe('landing — renderização fiel ao design Stitch', () => {
  it('aviso de cobrança aparece 1× no card Pro, junto ao CTA', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(
      countOccurrences(html, 'Checkout em modo de testes — nenhuma cobrança real é feita.'),
    ).toBe(1);
  });

  it('skip link é o PRIMEIRO link da página e o <main> tem o id dele', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    const firstAnchor = html.indexOf('<a ');
    expect(html.slice(firstAnchor, firstAnchor + 60)).toContain('href="#main-content"');
    expect(html).toContain('<main id="main-content"');
  });

  it('JSON-LD: 2 blocos (Organization e Product do Pro); Offer com PreOrder e sem AggregateRating', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    const blocks = html.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) ?? [];
    expect(blocks.length).toBe(2);
    const all = blocks.join('\n');
    expect(all).toContain('"Organization"');
    expect(all).not.toContain('"FAQPage"');
    expect(all).not.toContain('"founder"');
    expect(all.split('"Product"').length - 1).toBe(1);
    expect(all).toContain('https://schema.org/PreOrder');
    expect(all).not.toContain('AggregateRating');
  });

  it('seção de planos com cards Iniciante, Pro e Carreira e links reais', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Escolha seu plano e comece hoje');
    expect(html).toContain('Criar conta grátis');
    expect(html).toContain('Assinar Pro por R$ 39,90');
    expect(html).toContain('Garantir Plano Carreira');
    expect(html).toContain('Preço a definir');
    expect(html).toContain('href="/register"');
    expect(html).toContain('href="/checkout/pro"');
    expect(html).toContain('href="/contato"');
  });

  it('hero Stitch: H1, prova social e card do editor em 2 colunas com Tutora de IA', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Aprenda a programar de verdade,');
    expect(html).toContain('jogando.');
    expect(html).toContain('Do zero absoluto até o nível pleno');
    expect(html).toContain('Ver prévia do jogo');
    expect(html).toContain('Linguagens no sandbox');
    expect(html).toContain('Prática no browser');
    expect(html).toContain('Instalação local');
    expect(html).toContain('fase-03_desafio-arrays.js');
    expect(html).toContain('+150 XP em jogo');
    expect(html).toContain('Nível 03');
    expect(html).toContain('execução: 38ms');
    expect(html).toContain('Testes unitários: 3/3 aprovados');
    expect(html).toContain('DESAFIO VENCIDO!');
    expect(html).toContain('Tutora de IA');
    expect(html).toContain('ao vivo');
    expect(html).toContain('780 / 1.000 XP');
    expect(html).toContain('Avançar no Mapa');
  });

  it('seção "Como funciona" com os 3 passos exatos do Stitch', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('id="como-funciona"');
    expect(html).toContain('Sua trilha, sugerida pela IA');
    expect(html).toContain(
      'Escolha entre as trilhas Iniciante, Júnior e Pleno, cada uma com conteúdo progressivo, projetos práticos e desafios em formato de jogo.',
    );
    expect(html).toContain('Aprenda jogando');
    expect(html).toContain('XP, streaks e ranking semanal');
    expect(html).toContain('Conquiste a vaga');
    expect(html).toContain(
      'Com projetos concretos no portfólio, treino no simulador de entrevista e seu certificado verificado, você se conecta a empresas no Talent Match.',
    );
  });

  it('estrutura dos 7 blocos Stitch em ordem com 6 H2s', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    const ids = [
      'id="hero"',
      'id="como-funciona"',
      'id="trilhas"',
      'id="o-jogo"',
      'id="recursos"',
      'id="planos"',
    ];
    const positions = ids.map((id) => html.indexOf(id));
    positions.forEach((pos) => expect(pos).toBeGreaterThan(-1));
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
    expect(html).toContain('Pronto para escrever seu primeiro código hoje?');
    expect((html.match(/<h2/g) ?? []).length).toBeGreaterThanOrEqual(6);
  });

  it('nav Stitch: Como funciona, Cursos avulsos, O jogo (XP), Tutora de IA, Planos', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('href="#como-funciona"');
    expect(html).toContain('href="/courses"');
    expect(html).toContain('Cursos avulsos');
    expect(html).toContain('href="#o-jogo"');
    expect(html).toContain('O jogo');
    expect(html).toContain('>XP<');
    expect(html).toContain('href="#recursos"');
    expect(html).toContain('Tutora de IA');
    expect(html).toContain('href="#planos"');
  });

  it('RPG Stitch: mapa da trilha com fases 01-04, ranking Liga Prata, Streak e Badges', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Mapa da Trilha: Reino dos Algoritmos');
    expect(html).toContain('2/4 Concluídos');
    expect(html).toContain('01. O Desafio das Variáveis Mágicas');
    expect(html).toContain('03. O Guardião dos Loops e Arrays');
    expect(html).toContain('04. Recursão e Árvores de Decisão');
    expect(html).toContain('Liga Prata #2');
    expect(html).toContain('Lucas F.');
    expect(html).toContain('4.820 XP');
    expect(html).toContain('14 Dias');
    expect(html).toContain('12 Conquistas');
  });

  it('recursos Stitch: Tutora, Revisão Clean Code Score, Simulador e Certificado', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Exemplo de mentoria:');
    expect(html).toContain('✓ Clean Code Score: 96/100');
    expect(html).toContain('Simulações de Live Coding &amp; Perguntas Comportamentais');
    expect(html).toContain('Perfil com portfólio de desafios validados');
  });

  it('rodapé Stitch: marca, 5 links e copyright', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Gamificação');
    expect(html).toContain('Tutora de IA');
    expect(html).toContain('Planos &amp; Preços');
    expect(html).toContain('© 2026 Nexus Code. Aprenda a programar de verdade, jogando.');
  });
});
