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
   seção e as telas reais do produto são Server Components no page. */

type LangKey = 'python' | 'rust' | 'go';

const CODE_SNIPPETS: Record<LangKey, {
  fileName: string;
  level: string;
  output: string;
  lines: string[];
}> = {
  python: {
    fileName: 'two_sum.py',
    level: 'Nível: Fundamentos & Algoritmos',
    output: `✔ Compilação e execução concluídas com sucesso.
Resultado: [9998, 9999] | Tempo: 0.142ms
✔ Análise de Complexidade: O(N) Tempo Linear comprovado.
✔ Uso de Memória RSS: 4.1 MB (Sem vazamentos).`,
    lines: [
    "<span class=\"text-syntax-keyword font-semibold\">def</span> <span class=\"text-syntax-fn font-bold\">two_sum_optimal</span>(<span class=\"text-syntax-base\">nums</span>: <span class=\"text-syntax-type\">list</span>[<span class=\"text-syntax-type\">int</span>], <span class=\"text-syntax-base\">target</span>: <span class=\"text-syntax-type\">int</span>) -&gt; <span class=\"text-syntax-type\">list</span>[<span class=\"text-syntax-type\">int</span>]:",
    "    <span class=\"text-syntax-string italic\">&quot;&quot;&quot;</span>",
    "    <span class=\"text-syntax-string italic\">Encontra os índices de dois números que somam o target.</span>",
    "    <span class=\"text-syntax-string italic\">Complexidade: O(N) tempo e O(N) espaço residente.</span>",
    "    <span class=\"text-syntax-string italic\">&quot;&quot;&quot;</span>",
    "    <span class=\"text-syntax-base\">seen</span> = {}",
    "    <span class=\"text-syntax-keyword font-semibold\">for</span> <span class=\"text-syntax-base\">i</span>, <span class=\"text-syntax-base\">num</span> <span class=\"text-syntax-keyword font-semibold\">in</span> <span class=\"text-syntax-fn\">enumerate</span>(<span class=\"text-syntax-base\">nums</span>):",
    "        <span class=\"text-syntax-base\">diff</span> = <span class=\"text-syntax-base\">target</span> - <span class=\"text-syntax-base\">num</span>",
    "        <span class=\"text-syntax-keyword font-semibold\">if</span> <span class=\"text-syntax-base\">diff</span> <span class=\"text-syntax-keyword font-semibold\">in</span> <span class=\"text-syntax-base\">seen</span>:",
    "            <span class=\"text-syntax-keyword font-semibold\">return</span> [<span class=\"text-syntax-base\">seen</span>[<span class=\"text-syntax-base\">diff</span>], <span class=\"text-syntax-base\">i</span>]",
    "        <span class=\"text-syntax-base\">seen</span>[<span class=\"text-syntax-base\">num</span>] = <span class=\"text-syntax-base\">i</span>",
    "    <span class=\"text-syntax-keyword font-semibold\">return</span> []",
    "",
    "<span class=\"text-ink-span italic\"># Caso de teste com 10.000 elementos</span>",
    "<span class=\"text-syntax-keyword font-semibold\">import</span> <span class=\"text-syntax-base\">time</span>",
    "<span class=\"text-syntax-base\">start</span> = <span class=\"text-syntax-base\">time</span>.<span class=\"text-syntax-fn\">perf_counter</span>()",
    "<span class=\"text-syntax-base\">res</span> = <span class=\"text-syntax-fn\">two_sum_optimal</span>(<span class=\"text-syntax-type\">list</span>(<span class=\"text-syntax-fn\">range</span>(<span class=\"text-syntax-number\">10000</span>)), <span class=\"text-syntax-number\">19997</span>)",
    "<span class=\"text-syntax-base\">elapsed</span> = (<span class=\"text-syntax-base\">time</span>.<span class=\"text-syntax-fn\">perf_counter</span>() - <span class=\"text-syntax-base\">start</span>) * <span class=\"text-syntax-number\">1000</span>",
    "<span class=\"text-syntax-fn\">print</span>(<span class=\"text-syntax-string\">f&quot;Resultado: {res} | Tempo: {elapsed:.3f}ms&quot;</span>)"
]
  },
  rust: {
    fileName: 'rate_limiter.rs',
    level: 'Nível: Sistemas Distribuídos & Baixa Latência',
    output: `✔ Compilação rustc 1.78.0 (release mode): 0 warnings
✔ Test Suite: Concurrency Burst (50.000 req/s) -> PASSED (11.2ms)
✔ Memory RSS: 2.1 MB (Zero heap thrashing)
✔ Complexidade: O(log N) worst-case lookup verificado.`,
    lines: [
    "<span class=\"text-syntax-keyword font-semibold\">pub struct</span> <span class=\"text-syntax-type font-bold\">SlidingWindowLimiter</span> {",
    "    <span class=\"text-syntax-base\">capacity</span>: <span class=\"text-syntax-type\">usize</span>,",
    "    <span class=\"text-syntax-base\">window_duration</span>: <span class=\"text-syntax-base\">std</span>::<span class=\"text-syntax-base\">time</span>::<span class=\"text-syntax-type\">Duration</span>,",
    "    <span class=\"text-syntax-base\">events</span>: <span class=\"text-syntax-base\">std</span>::<span class=\"text-syntax-base\">collections</span>::<span class=\"text-syntax-type\">BTreeMap</span>&lt;<span class=\"text-syntax-base\">std</span>::<span class=\"text-syntax-base\">time</span>::<span class=\"text-syntax-type\">Instant</span>, <span class=\"text-syntax-type\">usize</span>&gt;,",
    "}",
    "",
    "<span class=\"text-syntax-keyword font-semibold\">impl</span> <span class=\"text-syntax-type\">SlidingWindowLimiter</span> {",
    "    <span class=\"text-syntax-keyword font-semibold\">pub fn</span> <span class=\"text-syntax-fn font-bold\">new</span>(<span class=\"text-syntax-base\">capacity</span>: <span class=\"text-syntax-type\">usize</span>, <span class=\"text-syntax-base\">window</span>: <span class=\"text-syntax-base\">std</span>::<span class=\"text-syntax-base\">time</span>::<span class=\"text-syntax-type\">Duration</span>) -&gt; <span class=\"text-syntax-type\">Self</span> {",
    "        <span class=\"text-syntax-type\">Self</span> {",
    "            <span class=\"text-syntax-base\">capacity</span>,",
    "            <span class=\"text-syntax-base\">window_duration</span>: <span class=\"text-syntax-base\">window</span>,",
    "            <span class=\"text-syntax-base\">events</span>: <span class=\"text-syntax-base\">std</span>::<span class=\"text-syntax-base\">collections</span>::<span class=\"text-syntax-type\">BTreeMap</span>::<span class=\"text-syntax-fn\">new</span>(),",
    "        }",
    "    }",
    "",
    "    <span class=\"text-syntax-keyword font-semibold\">pub fn</span> <span class=\"text-syntax-fn font-bold\">allow</span>(&amp;<span class=\"text-syntax-keyword\">mut</span> <span class=\"text-syntax-keyword\">self</span>, <span class=\"text-syntax-base\">now</span>: <span class=\"text-syntax-base\">std</span>::<span class=\"text-syntax-base\">time</span>::<span class=\"text-syntax-type\">Instant</span>) -&gt; <span class=\"text-syntax-type\">bool</span> {",
    "        <span class=\"text-syntax-keyword font-semibold\">let</span> <span class=\"text-syntax-base\">cutoff</span> = <span class=\"text-syntax-base\">now</span>.<span class=\"text-syntax-fn\">saturating_sub</span>(<span class=\"text-syntax-keyword\">self</span>.<span class=\"text-syntax-base\">window_duration</span>);",
    "        <span class=\"text-syntax-keyword\">self</span>.<span class=\"text-syntax-base\">events</span>.<span class=\"text-syntax-fn\">retain</span>(|&amp;<span class=\"text-syntax-base\">time</span>, _| <span class=\"text-syntax-base\">time</span> &gt;= <span class=\"text-syntax-base\">cutoff</span>);",
    "        <span class=\"text-syntax-keyword font-semibold\">let</span> <span class=\"text-syntax-base\">count</span>: <span class=\"text-syntax-type\">usize</span> = <span class=\"text-syntax-keyword\">self</span>.<span class=\"text-syntax-base\">events</span>.<span class=\"text-syntax-fn\">values</span>().<span class=\"text-syntax-fn\">sum</span>();",
    "        <span class=\"text-syntax-keyword font-semibold\">if</span> <span class=\"text-syntax-base\">count</span> &lt; <span class=\"text-syntax-keyword\">self</span>.<span class=\"text-syntax-base\">capacity</span> {",
    "            *<span class=\"text-syntax-keyword\">self</span>.<span class=\"text-syntax-base\">events</span>.<span class=\"text-syntax-fn\">entry</span>(<span class=\"text-syntax-base\">now</span>).<span class=\"text-syntax-fn\">or_insert</span>(<span class=\"text-syntax-number\">0</span>) += <span class=\"text-syntax-number\">1</span>;",
    "            <span class=\"text-syntax-keyword font-semibold\">true</span>",
    "        } <span class=\"text-syntax-keyword font-semibold\">else</span> {",
    "            <span class=\"text-syntax-keyword font-semibold\">false</span>",
    "        }",
    "    }",
    "}"
]
  },
  go: {
    fileName: 'worker_pool.go',
    level: 'Nível: Microsserviços & Concorrência',
    output: `✔ Compilação go build: 0 race conditions (-race flag)
Processados: 2500050000 itens | Tempo: 14.8ms
✔ Test Suite: 50.000 tarefas processadas concorrentemente
✔ Throughput: 128.000 ops/segundo.`,
    lines: [
    "<span class=\"text-syntax-keyword font-semibold\">package</span> <span class=\"text-syntax-base\">main</span>",
    "",
    "<span class=\"text-syntax-keyword font-semibold\">import</span> (",
    "    <span class=\"text-syntax-string\">&quot;fmt&quot;</span>",
    "    <span class=\"text-syntax-string\">&quot;time&quot;</span>",
    ")",
    "",
    "<span class=\"text-ink-span italic\">// Dispatcher gerencia fila de tarefas concorrentes</span>",
    "<span class=\"text-syntax-keyword font-semibold\">func</span> <span class=\"text-syntax-fn font-bold\">processJobs</span>(<span class=\"text-syntax-base\">jobCount</span> <span class=\"text-syntax-type\">int</span>) <span class=\"text-syntax-type\">int</span> {",
    "    <span class=\"text-syntax-base\">jobs</span> := <span class=\"text-syntax-fn\">make</span>(<span class=\"text-syntax-keyword\">chan</span> <span class=\"text-syntax-type\">int</span>, <span class=\"text-syntax-base\">jobCount</span>)",
    "    <span class=\"text-syntax-base\">results</span> := <span class=\"text-syntax-fn\">make</span>(<span class=\"text-syntax-keyword\">chan</span> <span class=\"text-syntax-type\">int</span>, <span class=\"text-syntax-base\">jobCount</span>)",
    "",
    "    <span class=\"text-ink-span italic\">// Sobe 3 workers concorrentes</span>",
    "    <span class=\"text-syntax-keyword font-semibold\">for</span> <span class=\"text-syntax-base\">w</span> := <span class=\"text-syntax-number\">1</span>; <span class=\"text-syntax-base\">w</span> &lt;= <span class=\"text-syntax-number\">3</span>; <span class=\"text-syntax-base\">w</span>++ {",
    "        <span class=\"text-syntax-keyword font-semibold\">go func</span>() {",
    "            <span class=\"text-syntax-keyword font-semibold\">for</span> <span class=\"text-syntax-base\">j</span> := <span class=\"text-syntax-keyword\">range</span> <span class=\"text-syntax-base\">jobs</span> {",
    "                <span class=\"text-syntax-base\">results</span> &lt;- <span class=\"text-syntax-base\">j</span> * <span class=\"text-syntax-number\">2</span>",
    "            }",
    "        }()",
    "    }",
    "",
    "    <span class=\"text-syntax-keyword font-semibold\">for</span> <span class=\"text-syntax-base\">j</span> := <span class=\"text-syntax-number\">1</span>; <span class=\"text-syntax-base\">j</span> &lt;= <span class=\"text-syntax-base\">jobCount</span>; <span class=\"text-syntax-base\">j</span>++ {",
    "        <span class=\"text-syntax-base\">jobs</span> &lt;- <span class=\"text-syntax-base\">j</span>",
    "    }",
    "    <span class=\"text-syntax-fn\">close</span>(<span class=\"text-syntax-base\">jobs</span>)",
    "",
    "    <span class=\"text-syntax-base\">sum</span> := <span class=\"text-syntax-number\">0</span>",
    "    <span class=\"text-syntax-keyword font-semibold\">for</span> <span class=\"text-syntax-base\">a</span> := <span class=\"text-syntax-number\">1</span>; <span class=\"text-syntax-base\">a</span> &lt;= <span class=\"text-syntax-base\">jobCount</span>; <span class=\"text-syntax-base\">a</span>++ {",
    "        <span class=\"text-syntax-base\">sum</span> += &lt;-<span class=\"text-syntax-base\">results</span>",
    "    }",
    "    <span class=\"text-syntax-keyword font-semibold\">return</span> <span class=\"text-syntax-base\">sum</span>",
    "}",
    "",
    "<span class=\"text-syntax-keyword font-semibold\">func</span> <span class=\"text-syntax-fn font-bold\">main</span>() {",
    "    <span class=\"text-syntax-base\">start</span> := <span class=\"text-syntax-base\">time</span>.<span class=\"text-syntax-fn\">Now</span>()",
    "    <span class=\"text-syntax-base\">total</span> := <span class=\"text-syntax-fn\">processJobs</span>(<span class=\"text-syntax-number\">50000</span>)",
    "    <span class=\"text-syntax-base\">fmt</span>.<span class=\"text-syntax-fn\">Printf</span>(<span class=\"text-syntax-string\">&quot;Processados: %d itens | Tempo: %v\\n&quot;</span>, <span class=\"text-syntax-base\">total</span>, <span class=\"text-syntax-base\">time</span>.<span class=\"text-syntax-fn\">Since</span>(<span class=\"text-syntax-base\">start</span>))",
    "}"
]
  }
};

export const SandboxDemo: React.FC = () => {
  const [activeLang, setActiveLang] = useState<LangKey>('python');
  const [isExecuting, setIsExecuting] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState(CODE_SNIPPETS.python.output);

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
            onClick={() => handleSelectLang('rust')}
            className={`px-3.5 py-1.5 rounded-lg text-body-sm font-mono font-bold transition-all ${
              activeLang === 'rust'
                ? 'bg-brand-amber-solar text-black shadow-sm'
                : 'text-ink-span hover:text-ink-heading'
            }`}
          >
            Rust
          </button>
          <button
            type="button"
            onClick={() => handleSelectLang('go')}
            className={`px-3.5 py-1.5 rounded-lg text-body-sm font-mono font-bold transition-all ${
              activeLang === 'go'
                ? 'bg-brand-cyan-neon text-black shadow-sm'
                : 'text-ink-span hover:text-ink-heading'
            }`}
          >
            Go
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
