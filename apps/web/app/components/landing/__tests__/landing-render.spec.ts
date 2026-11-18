import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';

import HomePage from '../../../(public)/page';

/* Reescrita (fix/ci-pipeline, 18/11/2026): a home do Stitch (7 blocos,
   hero "Aprenda a programar de verdade, jogando.") foi substituída
   pela home nova no merge do PR #2 (b10d3a9) — hero "Aprenda
   programação. Escreva. Teste. Entenda." com o desafio interativo
   "Devolva o dobro." embutido na página, mais Tutoria, Trilha,
   Torre, Entrevistas, Planos e FAQ. As 11 asserções antigas do
   Stitch passaram a falhar (não era defeito da home nova, e sim
   spec desatualizado). Este spec agora afirma a home nova; nada
   aqui foi apenas pulado. */

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

describe('landing — renderização da home nova (desafio interativo)', () => {
  it('aviso de plano pago aparece 1× no card Pro, sem checkout', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(countOccurrences(html, 'Plano pago indisponível nesta fase')).toBe(1);
    expect(html).toContain('Esta página não inicia checkout.');
    expect(html).toContain('Preço a definir');
    expect(html).not.toContain('href="/checkout/pro"');
  });

  it('skip link é o PRIMEIRO link da página e o <main> tem o id dele', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    const firstAnchor = html.indexOf('<a ');
    expect(html.slice(firstAnchor, firstAnchor + 60)).toContain('href="#conteudo"');
    expect(html).toContain('Pular para o conteúdo');
    expect(html).toContain('<main id="conteudo"');
  });

  it('JSON-LD: 1 bloco (Organization); sem Product, FAQPage, founder ou AggregateRating', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    const blocks = html.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) ?? [];
    expect(blocks.length).toBe(1);
    const all = blocks.join('\n');
    expect(all).toContain('"Organization"');
    expect(all).not.toContain('"Product"');
    expect(all).not.toContain('"FAQPage"');
    expect(all).not.toContain('"founder"');
    expect(all).not.toContain('PreOrder');
    expect(all).not.toContain('AggregateRating');
  });

  it('seção de planos com cards Iniciante, Pro e Carreira e links reais', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Um caminho para cada etapa.');
    expect(html).toContain('Iniciante');
    expect(html).toContain('Pro');
    expect(html).toContain('Carreira');
    expect(html).toContain('R$ 0');
    expect(html).toContain('39,90');
    expect(html).toContain('/ mês');
    expect(html).toContain('Preço a definir');
    expect(html).toContain('href="/register"');
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/contato"');
  });

  it('hero: H1, desafio sem conta e passos Escreva/Teste/Ajuste', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Aprenda programação.');
    expect(html).toContain('Escreva. Teste. Entenda.');
    expect(html).toContain('Resolva um exercício de JavaScript, confira os testes e use as pistas se travar.');
    expect(html).toContain('Resolver meu primeiro desafio');
    expect(html).toContain('O primeiro desafio não precisa de conta.');
    expect(html).toContain('href="#sandbox-code"');
    expect(html).toContain('Escreva');
    expect(html).toContain('Teste');
    expect(html).toContain('Ajuste');
  });

  it('seção "Seu primeiro desafio": editor, 3 testes, pistas e jornada 01/02/03', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('id="sandbox"');
    expect(html).toContain('Seu primeiro desafio');
    expect(html).toContain('Devolva o dobro.');
    expect(html).toContain('solution.js');
    expect(html).toContain('4 → 8');
    expect(html).toContain('Esperado: 8');
    expect(html).toContain('Esperado: 0');
    expect(html).toContain('Esperado: -6');
    expect(html).toContain('3 testes');
    expect(html).toContain('Executar solução');
    expect(html).toContain('Pedir pista');
    expect(html).toContain('O seu cálculo também funciona quando a entrada é zero?');
    expect(html).toContain('Edite o trecho marcado.');
    expect(html).toContain('Teste a sua ideia.');
    expect(html).toContain('Abra uma pista.');
  });

  it('estrutura das seções da home nova em ordem com 9 H2s', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    const ids = [
      'id="inicio"',
      'id="sandbox"',
      'id="tutoria"',
      'id="trilha"',
      'id="torre"',
      'id="entrevistas"',
      'id="planos"',
      'id="duvidas"',
    ];
    const positions = ids.map((id) => html.indexOf(id));
    positions.forEach((pos) => expect(pos).toBeGreaterThan(-1));
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
    expect(html).toContain('Continue na');
    expect((html.match(/<h2/g) ?? []).length).toBe(9);
  });

  it('nav: Tutoria, Trilha de estudos, Planos, Torre, Dúvidas + Entrar', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('href="#tutoria"');
    expect(html).toContain('href="#trilha"');
    expect(html).toContain('href="#planos"');
    expect(html).toContain('href="#torre"');
    expect(html).toContain('href="#duvidas"');
    expect(html).toContain('Tutoria');
    expect(html).toContain('Trilha de estudos');
    expect(html).toContain('href="/login"');
    expect(html).toContain('Entrar');
    expect(html).toContain('Testar desafio');
  });

  it('Torre de Desafios: guardião na casa 30 e 3 passos', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Torre de Desafios');
    expect(html).toContain('Enfrente o guardião na casa 30');
    expect(html).toContain('Lance os dados');
    expect(html).toContain('Resolva dentro do tempo.');
    expect(html).toContain('Vença o guardião');
    expect(html).toContain('Abrir a Torre');
    expect(html).toContain('href="/conheca-a-torre"');
  });

  it('tutoria e treino de explicação: ajuda local por regras, sem IA', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Entenda o resultado dos testes');
    expect(html).toContain('Na plataforma, a tutora de IA usa o contexto do seu código');
    expect(html).toContain('Ajuda local por regras, sem IA.');
    expect(html).toContain('Explique a regra.');
    expect(html).toContain('Mostre os testes.');
    expect(html).toContain('Como você calcula o dobro? Explique sua escolha, os testes e uma alternativa.');
  });

  it('roteiro de prática, FAQ e rodapé', async () => {
    const html = await renderHtml(React.createElement(HomePage));
    expect(html).toContain('Qual desafio vem a seguir?');
    expect(html).toContain('De minutos a segundos.');
    expect(html).toContain('Já tem 18 anos?');
    expect(html).toContain('0 de 3 desafios com os testes corretos.');
    expect(html).toContain('Perguntas frequentes');
    expect(html).toContain('Preciso de conta para praticar?');
    expect(html).toContain('Não para os três exercícios desta página.');
    expect(html).toContain('Criar minha conta grátis');
    expect(html).toContain('Nexus Code · Aprenda programação na prática.');
    expect(html).toContain('href="/privacidade"');
    expect(html).toContain('href="/termos"');
    expect(html).toContain('href="/contato"');
    expect(html).toContain('Voltar ao início');
  });
});
