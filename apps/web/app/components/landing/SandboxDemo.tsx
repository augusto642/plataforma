'use client';

import React, { useState } from 'react';
import Link from 'next/link';
// B08 — eventos do funil da landing
import { track } from '../../lib/analytics';
// Frente 3 — ícones SVG únicos da landing
import { IconBolt, IconPlay } from './icons';

/* Sprint 10 · B34 — ilha client do sandbox: seletor de linguagem +
   "execução" da demonstração ilustrativa + banner pós-terminal.
   Os CODE_SNIPPETS moram aqui (saíram do page.tsx). O cabeçalho da
   seção e as telas reais do produto são Server Components no page.
   B57 (Sprint 17 · Volta 2) — as amostras agora são das linguagens
   REAIS do catálogo e em nível iniciante: saíram o rate limiter em
   Rust ("Sistemas Distribuídos & Baixa Latência") e o worker pool
   em Go ("Microsserviços & Concorrência") — linguagens que não são
   cursos hoje e temas que nenhum iniciante encontra no produto —
   e o two_sum O(N) com 10.000 elementos. Entram JavaScript, Python
   e Java (enum real da plataforma) com exemplos do tamanho das
   primeiras lições dos cursos introdutórios que estão no ar. */

type LangKey = 'javascript' | 'python' | 'java';

const CODE_SNIPPETS: Record<LangKey, {
  fileName: string;
  level: string;
  output: string;
  lines: string[];
}> = {
  javascript: {
    fileName: 'pontos.js',
    level: 'Nível: Iniciante',
    output: `✔ Execução concluída com sucesso.
Total de pontos: 100
✔ Correção por testes reais: 3 de 3 testes aprovados.`,
    lines: [
    "<span class=\"text-ink-span italic\">// Soma os pontos de cada missão concluída</span>",
    "<span class=\"text-syntax-keyword font-semibold\">function</span> <span class=\"text-syntax-fn font-bold\">totalDePontos</span>(<span class=\"text-syntax-base\">pontos</span>) {",
    "  <span class=\"text-syntax-keyword font-semibold\">let</span> <span class=\"text-syntax-base\">total</span> = <span class=\"text-syntax-number\">0</span>;",
    "  <span class=\"text-syntax-keyword font-semibold\">for</span> (<span class=\"text-syntax-keyword font-semibold\">const</span> <span class=\"text-syntax-base\">p</span> <span class=\"text-syntax-keyword font-semibold\">of</span> <span class=\"text-syntax-base\">pontos</span>) {",
    "    <span class=\"text-syntax-base\">total</span> += <span class=\"text-syntax-base\">p</span>;",
    "  }",
    "  <span class=\"text-syntax-keyword font-semibold\">return</span> <span class=\"text-syntax-base\">total</span>;",
    "}",
    "",
    "<span class=\"text-syntax-keyword font-semibold\">const</span> <span class=\"text-syntax-base\">missoes</span> = [<span class=\"text-syntax-number\">50</span>, <span class=\"text-syntax-number\">30</span>, <span class=\"text-syntax-number\">20</span>];",
    "<span class=\"text-syntax-base\">console</span>.<span class=\"text-syntax-fn\">log</span>(<span class=\"text-syntax-string\">\"Total de pontos:\"</span>, <span class=\"text-syntax-fn\">totalDePontos</span>(<span class=\"text-syntax-base\">missoes</span>));"
]
  },
  python: {
    fileName: 'media.py',
    level: 'Nível: Iniciante',
    output: `✔ Execução concluída com sucesso.
Média final: 8.0
✔ Correção por testes reais: 3 de 3 testes aprovados.`,
    lines: [
    "<span class=\"text-ink-span italic\"># Calcula a média das notas de um aluno</span>",
    "<span class=\"text-syntax-keyword font-semibold\">def</span> <span class=\"text-syntax-fn font-bold\">media</span>(<span class=\"text-syntax-base\">notas</span>):",
    "    <span class=\"text-syntax-base\">soma</span> = <span class=\"text-syntax-number\">0</span>",
    "    <span class=\"text-syntax-keyword font-semibold\">for</span> <span class=\"text-syntax-base\">nota</span> <span class=\"text-syntax-keyword font-semibold\">in</span> <span class=\"text-syntax-base\">notas</span>:",
    "        <span class=\"text-syntax-base\">soma</span> += <span class=\"text-syntax-base\">nota</span>",
    "    <span class=\"text-syntax-keyword font-semibold\">return</span> <span class=\"text-syntax-base\">soma</span> / <span class=\"text-syntax-fn\">len</span>(<span class=\"text-syntax-base\">notas</span>)",
    "",
    "<span class=\"text-syntax-base\">notas</span> = [<span class=\"text-syntax-number\">8</span>, <span class=\"text-syntax-number\">7</span>, <span class=\"text-syntax-number\">9</span>]",
    "<span class=\"text-syntax-fn\">print</span>(<span class=\"text-syntax-string\">\"Média final:\"</span>, <span class=\"text-syntax-fn\">media</span>(<span class=\"text-syntax-base\">notas</span>))"
]
  },
  java: {
    fileName: 'Main.java',
    level: 'Nível: Iniciante',
    output: `✔ Compilação e execução concluídas com sucesso.
Contagem: 1
Contagem: 2
Contagem: 3
Contagem: 4
Contagem: 5
Largada!
✔ Correção por testes reais: 3 de 3 testes aprovados.`,
    lines: [
    "<span class=\"text-ink-span italic\">// Conta de 1 a 5 e anuncia a largada</span>",
    "<span class=\"text-syntax-keyword font-semibold\">public class</span> <span class=\"text-syntax-type font-bold\">Main</span> {",
    "    <span class=\"text-syntax-keyword font-semibold\">public static void</span> <span class=\"text-syntax-fn font-bold\">main</span>(<span class=\"text-syntax-type\">String</span>[] <span class=\"text-syntax-base\">args</span>) {",
    "        <span class=\"text-syntax-keyword font-semibold\">for</span> (<span class=\"text-syntax-type\">int</span> <span class=\"text-syntax-base\">i</span> = <span class=\"text-syntax-number\">1</span>; <span class=\"text-syntax-base\">i</span> &lt;= <span class=\"text-syntax-number\">5</span>; <span class=\"text-syntax-base\">i</span>++) {",
    "            <span class=\"text-syntax-base\">System</span>.<span class=\"text-syntax-base\">out</span>.<span class=\"text-syntax-fn\">println</span>(<span class=\"text-syntax-string\">\"Contagem: \"</span> + <span class=\"text-syntax-base\">i</span>);",
    "        }",
    "        <span class=\"text-syntax-base\">System</span>.<span class=\"text-syntax-base\">out</span>.<span class=\"text-syntax-fn\">println</span>(<span class=\"text-syntax-string\">\"Largada!\"</span>);",
    "    }",
    "}"
]
  }
};

export const SandboxDemo: React.FC = () => {
  const [activeLang, setActiveLang] = useState<LangKey>('javascript');
  const [isExecuting, setIsExecuting] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState(CODE_SNIPPETS.javascript.output);

  const handleRun = () => {
    // B50/P3 (Sprint 16) — a demo ganhou funil próprio no catálogo de
    // eventos: demo_started ao rodar, demo_completed quando a saída
    // de exemplo termina de aparecer. (Substitui o sandbox_cta/
    // sandbox_run genérico do B08 para esta interação.)
    track('demo_started', 'sandbox_run', { lang: activeLang });
    setIsExecuting(true);
    setTerminalOutput('Preparando a demonstração com a saída de exemplo...');
    setTimeout(() => {
      setTerminalOutput(CODE_SNIPPETS[activeLang].output);
      setIsExecuting(false);
      track('demo_completed', 'sandbox_run', { lang: activeLang });
    }, 400);
  };

  const handleSelectLang = (lang: LangKey) => {
    setActiveLang(lang);
    setTerminalOutput(CODE_SNIPPETS[lang].output);
  };

  return (
    <>
    {/* MOCKUP DO SANDBOX */}
    <div className="rounded-2xl bg-surface-1 border border-border-2 shadow-2xl overflow-hidden">
      {/* Top Bar do Terminal */}
      <div className="bg-surface-1 px-5 py-3.5 border-b border-border-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-brand-rose/80" />
          <div className="w-3 h-3 rounded-full bg-brand-amber/80" />
          <div className="w-3 h-3 rounded-full bg-brand-green-neon" />
          <span className="ml-3 text-body-sm font-mono text-ink-span font-semibold">demonstração do sandbox da plataforma</span>
          <span className="text-body-sm font-mono font-bold px-2 py-0.5 rounded bg-brand-purple/15 text-brand-purple-light border border-brand-purple/30">ILUSTRATIVO</span>
        </div>

        {/* Seletor de Linguagens com as cores da plataforma */}
        <div className="flex items-center gap-1.5 bg-background p-1 rounded-xl border border-border-2">
          <button
            type="button"
            onClick={() => handleSelectLang('javascript')}
            className={`px-3.5 py-1.5 rounded-lg text-body-sm font-mono font-bold transition-all ${
              activeLang === 'javascript'
                ? 'bg-brand-amber-solar text-black shadow-sm'
                : 'text-ink-span hover:text-ink-heading'
            }`}
          >
            JavaScript
          </button>
          <button
            type="button"
            onClick={() => handleSelectLang('python')}
            className={`px-3.5 py-1.5 rounded-lg text-body-sm font-mono font-bold transition-all ${
              activeLang === 'python'
                ? 'bg-brand-purple text-white shadow-sm'
                : 'text-ink-span hover:text-ink-heading'
            }`}
          >
            Python
          </button>
          <button
            type="button"
            onClick={() => handleSelectLang('java')}
            className={`px-3.5 py-1.5 rounded-lg text-body-sm font-mono font-bold transition-all ${
              activeLang === 'java'
                ? 'bg-brand-cyan-neon text-black shadow-sm'
                : 'text-ink-span hover:text-ink-heading'
            }`}
          >
            Java
          </button>
        </div>

        {/* Botão de Execução da demonstração — Sprint 5: ação secundária
            (não é cadastro nem jogo); o gradiente verde com glow saiu de
            todos os botões da landing */}
        <button
          type="button"
          onClick={handleRun}
          disabled={isExecuting}
          className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink-heading font-heading font-extrabold text-body-sm transition-all active:scale-95 border border-border-2 disabled:opacity-50"
        >
          {isExecuting ? (
            <span className="w-3.5 h-3.5 border-2 border-ink-heading border-t-transparent rounded-full animate-spin" />
          ) : (
            <IconPlay className="w-3.5 h-3.5" />
          )}
          <span>{isExecuting ? 'Preparando...' : 'Ver a Demonstração'}</span>
        </button>
      </div>

      {/* Editor & Console de Saída */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
                {/* Painel do Código com Sintaxe Colorida Estilo IDE & Numeração de Linhas */}
        <div className="lg:col-span-7 p-5 sm:p-6 font-mono text-body-sm sm:text-sm bg-background overflow-x-auto border-b lg:border-b-0 lg:border-r border-border-2/80">
          <div className="flex items-center justify-between text-xs text-ink-span mb-3.5 pb-2.5 border-b border-border-1/70 select-none">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-green-neon" />
              <span className="text-ink-heading font-semibold">{CODE_SNIPPETS[activeLang].fileName}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-brand-cyan-neon font-semibold">{CODE_SNIPPETS[activeLang].level}</span>
              <span className="hidden sm:inline text-ink-span">•</span>
              <span className="hidden sm:inline text-ink-span">kernel-linux-v6.8</span>
            </div>
          </div>

          <div className="flex font-mono leading-relaxed select-text">
            {/* Gutter / Numeração de Linhas */}
            <div className="select-none text-right pr-3.5 sm:pr-4 text-ink-span border-r border-border-1/80 space-y-0.5 shrink-0">
              {CODE_SNIPPETS[activeLang].lines.map((_, i) => (
                <div key={i} className="text-body-sm sm:text-sm leading-relaxed">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Código com Syntax Highlighting Colorido */}
            <div className="pl-3.5 sm:pl-4 space-y-0.5 whitespace-pre overflow-x-auto w-full text-ink-heading">
              {CODE_SNIPPETS[activeLang].lines.map((lineHtml, i) => (
                <div
                  key={i}
                  className="text-body-sm sm:text-sm leading-relaxed hover:bg-surface-3/30 px-1.5 -mx-1.5 rounded transition-colors"
                  dangerouslySetInnerHTML={{ __html: lineHtml || '&nbsp;' }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Painel da Telemetria */}
        <div className="lg:col-span-5 p-6 bg-surface-1 flex flex-col justify-between font-mono text-body-sm">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border-2 text-ink-span">
              <span className="flex items-center gap-2 font-bold text-ink-heading">
                <span className="w-2 h-2 rounded-full bg-brand-green-neon" />
                SAÍDA DA DEMONSTRAÇÃO
              </span>
              <span className="text-body-sm bg-surface-3/80 px-2 py-0.5 rounded text-ink-body">EXEMPLO ILUSTRATIVO</span>
            </div>
            <pre className="text-brand-green-neon whitespace-pre-wrap leading-relaxed font-mono">
              <code>{terminalOutput}</code>
            </pre>
          </div>

          <div className="mt-6 pt-4 border-t border-border-2 text-body-sm text-ink-span flex items-center justify-between">
            <span>Ambiente real: containers Linux isolados (Piston)</span>
            <span className="text-brand-green-neon font-semibold">Correção por testes reais</span>
          </div>
        </div>
      </div>
    </div>

    {/* BANNER PÓS-TERMINAL — B50/P3 (Sprint 16): a demo ilustrativa
        deixou de empurrar para o cadastro e passou a levar à
        PRIMEIRA LIÇÃO REAL do produto: a Missão 1 do prólogo
        (/onboarding), jogável no navegador ANTES de qualquer conta —
        a conta, no fim do prólogo, é o que salva a vitória, o
        starter e o XP. A prova é usar o produto, não assistir a ele. */}
    <div className="mt-6 p-5 rounded-2xl bg-surface-1 border border-brand-green-neon/35 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl shadow-brand-green-neon/5">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-brand-green-neon/15 border border-brand-green-neon/40 flex items-center justify-center text-brand-green-neon shrink-0">
          <IconBolt className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm sm:text-base font-heading font-bold text-ink-heading flex items-center gap-2">
            <span>Isto é só uma amostra. A primeira missão de verdade está aberta:</span>
          </div>
          <p className="text-body-sm text-ink-body font-sans mt-0.5">
            A Missão 1 do prólogo roda de verdade no seu navegador — você batalha escrevendo
            código, sem cadastro e sem cartão. Jogou e venceu? A conta grátis, no fim do
            prólogo, salva sua vitória, seu starter e seu XP.
          </p>
        </div>
      </div>
      <Link href="/onboarding" data-cta-id="demo_mission1" onClick={() => track('demo_cta', 'demo_mission1')} className="whitespace-nowrap inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white font-heading font-extrabold text-xs sm:text-sm shadow-lg shadow-brand-purple/30 active:scale-95 transition-all">
        <span>Jogar a Missão 1 de verdade</span>
        <span>→</span>
      </Link>
    </div>
    </>
  );
};
