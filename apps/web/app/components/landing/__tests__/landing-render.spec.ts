import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import HomePage from '../../../(public)/page';

// B76 (Sprint 18 · Volta 3 · TL M3) — testes de RENDERIZAÇÃO dos
// claims estruturais da landing: até a Volta 2, as voltas travavam
// os dados por specs de módulo, mas nenhum teste renderizava a
// página — foi assim que claims quebrados no destino (starter do
// TCG) passaram. Aqui a landing é renderizada de verdade (SSR,
// react-dom/server) e os claims são contados NO HTML.
// Central 218 (D1) — a TracksSection voltou a ser síncrona (só os
// 3 cards estruturados) e a PlatformStatsSection saiu da home:
// nenhum stub é necessário aqui; a página renderiza de verdade.

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

  // Central 218 (D1) — sem FAQ e sem seção de fundador na home, o
  // JSON-LD tem 2 blocos (Organization e Product do Pro); Offer com
  // PreOrder e sem AggregateRating.
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

  // Central 218 (D1) — CTAs de preço do protótipo, sem toggle e sem
  // captura de e-mail nos cards.
  it('CTAs de preço do protótipo + sem toggle mensal/anual nem lista de interessados', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Escolha seu plano e comece hoje');
    expect(html).toContain('Criar conta grátis');
    expect(html).toContain('Assinar Pro por R$ 39,90');
    expect(html).toContain('Garantir Plano Carreira');
    expect(html).toContain('Preço a definir');
    expect(html).not.toContain('Mensal');
    expect(html).not.toContain('ECONOMIZE 25%');
    expect(html).not.toContain('economize');
    expect(html).not.toContain('plan-interest-email');
    expect(html).not.toContain('lista de interessados');
  });

  // Central 218 (D1) — hero Stitch v2 em 2 colunas: código + terminal
  // à esquerda, painel da tutora à direita. Sem dado inventado de
  // aluno (liga/XP/nível) e sem os extras (2º parágrafo, lista de
  // interessados, captura da Missão 1).
  it('hero: H1 do protótipo + card do editor em 2 colunas com o painel da tutora', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Aprenda a programar de verdade,');
    expect(html).toContain('jogando.');
    expect(html).toContain('Código real no navegador, sem videoaulas passivas');
    expect(html).toContain('Ver prévia do jogo');
    expect(html).toContain('fase-03_desafio-arrays.js');
    expect(html).toContain('Demonstração');
    expect(html).toContain('Testes unitários: 3/3 aprovados');
    expect(html).toContain('DESAFIO VENCIDO!');
    expect(html).toContain('Tutora de IA');
    expect(html).toContain('ao vivo');
    expect(html).toContain('Avançar no Mapa');
    expect(html).not.toContain('780 / 1.000 XP');
    expect(html).not.toContain('42ms');
    expect(html).not.toContain('Nível 04');
    expect(html).not.toContain('+150 XP em jogo');
    expect(html).not.toContain('0 pessoas na lista');
    expect(html).not.toContain('Missão 1');
    expect(html).not.toContain('produto-missao-1.webp');
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

  // Central 218 (D1) — a home tem os 7 blocos do protótipo, nesta
  // ordem, e nenhum dos extras: 6 H2s (um por bloco de seção).
  it('estrutura D1: 7 blocos do protótipo, 6 H2s, nenhuma seção extra', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    const ids = ['id="hero"', 'id="como-funciona"', 'id="trilhas"', 'id="o-jogo"', 'id="recursos"', 'id="planos"'];
    const positions = ids.map((id) => html.indexOf(id));
    positions.forEach((pos) => expect(pos).toBeGreaterThan(-1));
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
    expect(html).toContain('Pronto para escrever seu primeiro código hoje?');
    expect((html.match(/<h2/g) ?? []).length).toBe(6);
    for (const extra of [
      'Mentoria Socrática',
      'Aprendizado ativo com feedback imediato',
      'NÚMEROS REAIS',
      'Um Gostinho do Terminal Real',
      'Três apoios de verdade',
      'Cards colecionáveis',
      'Assistir aula x aprender fazendo',
      'tecnologias que o mercado usa',
      'Quem criou a Nexus Code',
      'Perguntas Frequentes',
      'Comece hoje. O resto está no radar.',
      'NO RADAR',
      'ARENA DE PRODUÇÃO',
      'Escolha seu Companion Inicial',
    ]) {
      expect(html).not.toContain(extra);
    }
  });

  // Central 218 (D1) — nav com os 5 itens do protótipo.
  it('nav: 5 itens do protótipo, O jogo com selo XP, sem Terminal/IDE/Dúvidas/Jogo', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('href="#como-funciona"');
    expect(html).toContain('href="#trilhas"');
    expect(html).toContain('href="#o-jogo"');
    expect(html).toContain('href="#recursos"');
    expect(html).toContain('href="#planos"');
    expect(html).toContain('O jogo');
    expect(html).toContain('>XP<');
    expect(html).not.toContain('Terminal Prático');
    expect(html).not.toContain('Dúvidas');
    expect(html).not.toContain('Modo RPG 2D');
    expect(html).not.toContain('Cards TCG');
    expect(html).not.toContain('href="#faq"');
    expect(html).not.toContain('href="#sandbox"');
    expect(html).not.toContain('href="#precos"');
  });

  // Central 218 (D1) — RPG com mapa e ranking honesto.
  it('RPG: mapa da trilha com fases 01-04 e ligas reais, sem ranking inventado', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Mapa da Trilha: Reino dos Algoritmos');
    expect(html).toContain('O Desafio das Variáveis Mágicas');
    expect(html).toContain('O Guardião dos Loops e Arrays');
    expect(html).toContain('Recursão e Árvores de Decisão');
    expect(html).toContain('Ligas Bronze, Prata e Ouro');
    expect(html).not.toContain('Lucas F.');
    expect(html).not.toContain('Liga Diamante');
    expect(html).not.toContain('4.820 XP');
  });

  // Central 218 (D1) — recursos com os detalhes do protótipo, sem
  // número inventado (Clean Code Score sem nota fixa).
  it('recursos: detalhes do protótipo sem número inventado', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Exemplo de mentoria');
    expect(html).toContain('Clean Code Score');
    expect(html).toContain('Simulações de Live Coding');
    expect(html).toContain('Perfil com portfólio de desafios validados');
    expect(html).not.toContain('96/100');
  });

  // Central 218 (D1) — rodapé do protótipo.
  it('rodapé: links do protótipo e copyright do protótipo', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Gamificação');
    expect(html).toContain('Tutora de IA');
    expect(html).toContain('Planos &amp; Preços');
    expect(html).toContain('© 2026 Nexus Code. Aprenda a programar de verdade, jogando.');
    expect(html).not.toContain('Trilhas no radar');
    expect(html).not.toContain('Todos os direitos reservados');
  });

  // Central 218 (D1) — Q-8: selo das trilhas sem quebra de linha.
  it('Q-8: selo das trilhas com whitespace-nowrap', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Todas com projetos práticos inclusos');
    expect(html).toContain('whitespace-nowrap');
  });
});
