'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Logo from './components/Logo';
import { HeroEvolution } from './components/landing/HeroEvolution';
import { LumiMascotHero } from './components/landing/LumiMascotHero';
import { TcgCardsShowcase } from './components/landing/TcgCardsShowcase';
import { NexusPillarsGrid } from './components/landing/NexusPillarsGrid';
import { ComparisonVersus } from './components/landing/ComparisonVersus';
// B11 — captura de atribuição na chegada (a porta de cadastro lê da lib)
// Sprint 5 — + intenção de plano: o clique nos preços persiste a escolha
import { captureUtmFromUrl, savePlanIntent } from './lib/attribution';
// B08 — eventos do funil da landing (+ pageview na Sprint 5)
import { track, trackPageview } from './lib/analytics';
// Frente 3 — ícones SVG únicos da landing (fim do emoji como sistema)
import {
  IconBolt, IconBox, IconCard, IconCards, IconChart, IconChat, IconClose, IconCode,
  IconChevronDown, IconCpu, IconGamepad, IconGear, IconGitBranch, IconGithub, IconKey, IconLogoMark,
  IconMap, IconMenu, IconMonitor, IconNodes, IconPlay, IconRocket,
  IconSearch, IconShield, IconShieldCheck, IconSparkle, IconSpeech,
  IconSun, IconTarget, IconTerminal,
  TrackCoverGo, TrackCoverPython, TrackCoverRust, TrackCoverWeb,
} from './components/landing/icons';


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

export default function HomePage() {
  const [activeLang, setActiveLang] = useState<LangKey>('python');
  const [isExecuting, setIsExecuting] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState(CODE_SNIPPETS.python.output);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  // Command Palette & Mobile State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandSearchQuery, setCommandSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Sprint 9 — dropdown "Jogo" da navbar enxuta (desktop)
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);

  // B11 — a atribuição nasce na chegada: UTMs da URL da landing são
  // persistidos aqui, para qualquer porta de cadastro (register ou
  // onboarding) herdá-los depois, mesmo sem UTM na URL final.
  // Sprint 5 — a landing também emite o pageview do funil (topo do funil).
  useEffect(() => {
    captureUtmFromUrl();
    trackPageview();
  }, []);

  // Global Command Palette Shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRun = () => {
    // B08 — interação com a demonstração do sandbox
    track('sandbox_cta', 'sandbox_run');
    setIsExecuting(true);
    setTerminalOutput('Preparando a demonstração com a saída de exemplo...');
    setTimeout(() => {
      setTerminalOutput(CODE_SNIPPETS[activeLang].output);
      setIsExecuting(false);
    }, 400);
  };

  const handleSelectLang = (lang: LangKey) => {
    setActiveLang(lang);
    setTerminalOutput(CODE_SNIPPETS[lang].output);
  };

  const commandItems = [
    { label: 'Iniciar Cadastro Gratuito', href: '/register', icon: <IconBolt className="w-5 h-5" />, category: 'Ações Rápidas' },
    { label: 'Abrir Terminal & Playground de Código', href: '/ide', icon: <IconTerminal className="w-5 h-5" />, category: 'Ações Rápidas' },
    { label: 'Acessar Dashboard do Aluno', href: '/dashboard', icon: <IconChart className="w-5 h-5" />, category: 'Navegação' },
    { label: 'Entrar na Minha Conta', href: '/login', icon: <IconKey className="w-5 h-5" />, category: 'Navegação' },
    { label: 'Trilha 1: Lógica de Programação & Alta Performance em Rust', href: '/register', icon: <IconGear className="w-5 h-5" />, category: 'Trilhas' },
    { label: 'Trilha 2: Criação de APIs & Backend Moderno em Go', href: '/register', icon: <IconNodes className="w-5 h-5" />, category: 'Trilhas' },
    { label: 'Trilha 3: Desenvolvimento Web Completo com React & Next.js', href: '/register', icon: <IconBolt className="w-5 h-5" />, category: 'Trilhas' },
    { label: 'Trilha 4: Python & Inteligência Artificial na Prática', href: '/register', icon: <IconCode className="w-5 h-5" />, category: 'Trilhas' },
    { label: 'Ver Planos & Preços', href: '#precos', icon: <IconCard className="w-5 h-5" />, category: 'Navegação' },
  ];

  const filteredCommands = commandItems.filter((cmd) =>
    cmd.label.toLowerCase().includes(commandSearchQuery.toLowerCase())
  );

  return (
    <div className="bg-background text-ink-body antialiased selection:bg-brand-purple/30 selection:text-brand-purple-light relative overflow-x-hidden font-sans">
      {/* AURAS & AMBIENT MESH DE FUNDO DARK OBSIDIAN LUXURY */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Glow Spheres Suaves em GPU — Sprint 7 (dieta de ambiente do
            Designer): de 5 esferas fixas para 2, só a cor da marca */}
        <div className="pointer-events-none fixed top-[-10%] left-[12%] w-[700px] h-[700px] bg-brand-purple/15 rounded-full blur-[160px]"></div>
        <div className="pointer-events-none fixed bottom-[-10%] right-[10%] w-[750px] h-[750px] bg-brand-purple/12 rounded-full blur-[180px]"></div>

        {/* Cyber Mesh Grid Micro-Matrix */}
        <div
          className="pointer-events-none fixed inset-0 opacity-[0.28]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.12) 1px, transparent 0)`,
            backgroundSize: '36px 36px',
          }}
        />

        {/* Sprint 9 — o wash ciano radial do topo (estilo inline) foi
            aposentado: era o último "ambiente" fora da cor da marca
            competindo com o conteúdo (referência: ambiente zero). */}
      </div>

      {/* 1. NAVBAR DARK OBSIDIAN LUXURY GLASS */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-2xl bg-background/80 border-b border-border-1 shadow-elev-sm">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-cyan-neon/30 to-transparent pointer-events-none"></div>

        <div className="w-full px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between">
          {/* Logo Oficial na Esquerda com tema Dark */}
          <div className="flex items-center gap-4 shrink-0">
            <Logo size="lg" theme="dark" href="/" />
          </div>

          {/* Navegação Central com maior espaçamento */}
          <nav className="hidden md:flex items-center justify-center gap-6 lg:gap-8 xl:gap-10 text-[15px] font-semibold text-ink-body">
            {/* Sprint 7 — a navbar segue a ORDEM DA OFERTA (a mesma das
                seções da página): Como Funciona → Trilhas → Terminal →
                Planos → Dúvidas.
                Sprint 9 — navbar enxuta: os 3 links do jogo (Modo RPG 2D,
                Criar Avatar, Cards TCG) saíram da barra principal e
                moram num único item "Jogo" (dropdown simples), pra barra
                ter 6 itens e a oferta liderar sozinha */}
            <a href="#metodologia" className="hover:text-ink-heading transition-colors">Como Funciona</a>
            <a href="#trilhas" className="hover:text-ink-heading transition-colors">Trilhas</a>
            <a href="#sandbox" className="hover:text-ink-heading transition-colors flex items-center gap-2">
              <span>Terminal Prático</span>
              <span className="inline-flex items-center gap-1.5 text-body-sm font-mono px-2 py-0.5 rounded-md bg-surface-2 text-brand-cyan-neon border border-border-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green-neon"></span>
                IDE
              </span>
            </a>
            <a href="#precos" className="hover:text-ink-heading transition-colors">Planos</a>
            <a href="#faq" className="hover:text-ink-heading transition-colors">Dúvidas</a>
            <div className="relative" onMouseLeave={() => setIsGameMenuOpen(false)}>
              <button
                type="button"
                onClick={() => setIsGameMenuOpen(!isGameMenuOpen)}
                aria-expanded={isGameMenuOpen}
                aria-haspopup="true"
                className="hover:text-ink-heading transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <IconGamepad className="w-5 h-5" />
                <span>Jogo</span>
                <IconChevronDown className={`w-4 h-4 transition-transform ${isGameMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isGameMenuOpen && (
                <div className="absolute right-0 top-full pt-3 z-50">
                  <div className="w-52 rounded-2xl bg-surface-1 border border-border-1 shadow-elev-sm p-2 flex flex-col">
                    <Link href="/game" onClick={() => setIsGameMenuOpen(false)} className="px-3 py-2.5 rounded-xl text-sm text-ink-body hover:text-ink-heading hover:bg-surface-2 transition-colors flex items-center gap-2">
                      <IconGamepad className="w-5 h-5 shrink-0" />
                      <span>Modo RPG 2D</span>
                    </Link>
                    <Link href="/onboarding" data-cta-id="nav_avatar" onClick={() => { track('nav_cta', 'nav_avatar'); setIsGameMenuOpen(false); }} className="px-3 py-2.5 rounded-xl text-sm text-ink-body hover:text-ink-heading hover:bg-surface-2 transition-colors flex items-center gap-2">
                      <IconSparkle className="w-5 h-5 shrink-0" />
                      <span>Criar Avatar</span>
                    </Link>
                    <a href="#colecionaveis" onClick={() => setIsGameMenuOpen(false)} className="px-3 py-2.5 rounded-xl text-sm text-ink-body hover:text-ink-heading hover:bg-surface-2 transition-colors flex items-center gap-2">
                      <IconCards className="w-5 h-5 shrink-0" />
                      <span>Cards TCG</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Botões do Navbar na Direita */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/login" className="text-sm font-semibold text-ink-body hover:text-ink-heading px-3 py-2 transition-colors">
              Entrar
            </Link>

            {/* Sprint 5 — primário unificado: roxo sólido + rótulo único (o
                gradiente verde com glow foi aposentado dos CTAs de conta) */}
            <Link
              href="/onboarding"
              data-cta-id="nav_primary"
              onClick={() => track('nav_cta', 'nav_primary')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm sm:text-sm font-heading font-black tracking-tight transition-all duration-200 cursor-pointer active:scale-95 shadow-lg shadow-brand-purple/30 group"
            >
              <span>Começar grátis agora</span>
              <span className="group-hover:translate-x-1 transition-transform font-bold">→</span>
            </Link>


            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 rounded-xl text-ink-span hover:text-ink-heading bg-surface-1 border border-border-1 md:hidden transition-colors"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? (
                <IconClose className="w-[22px] h-[22px]" />
              ) : (
                <IconMenu className="w-[22px] h-[22px]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border-1 px-6 py-5 bg-surface-1/95 backdrop-blur-xl shadow-2xl flex flex-col gap-3 animate-fadeIn">
            {/* Sprint 7 — drawer na mesma ordem da oferta do desktop */}
            <a href="#metodologia" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2">
              Como Funciona
            </a>
            <a href="#trilhas" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2">
              4 Trilhas Práticas
            </a>
            <a href="#sandbox" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2 flex items-center justify-between">
              <span>Terminal Interativo</span>
              <span className="text-body-sm font-mono px-2 py-0.5 rounded bg-brand-purple/15 text-brand-purple-light border border-brand-purple/30">IDE</span>
            </a>
            <a href="#precos" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2">
              Planos & Preços
            </a>
            <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2">
              Perguntas Frequentes
            </a>
            {/* Sprint 9 — no drawer, os links do jogo viram um grupo
                rotulado "Jogo" (mesma lógica do dropdown do desktop):
                a oferta lidera e o jogo fica a um nível de distância */}
            <div className="pt-2 mt-1 border-t border-border-1">
              <span className="block text-xs font-mono font-bold uppercase tracking-wider text-ink-span py-1.5">Jogo</span>
              <div className="flex flex-col pl-3">
                <Link href="/game" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2">
                  Modo RPG 2D
                </Link>
                <Link href="/onboarding" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2">
                  Criar Avatar
                </Link>
                <a href="#colecionaveis" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2">
                  Cards TCG
                </a>
              </div>
            </div>
            <div className="pt-3 border-t border-border-1 flex items-center justify-between gap-3">
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-body-sm font-semibold text-ink-body hover:text-ink-heading py-2">
                Entrar
              </Link>
              <Link href="/register" data-cta-id="nav_mobile_register" onClick={() => { track('nav_cta', 'nav_mobile_register'); setIsMobileMenuOpen(false); }} className="px-4 py-2 rounded-xl bg-brand-purple text-white text-body-sm font-bold shadow-md">
                Começar grátis agora
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* COMMAND PALETTE MODAL (⌘K) */}
      {isCommandPaletteOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsCommandPaletteOpen(false)}
        >
          <div 
            className="w-full max-w-xl bg-surface-1 border border-border-1 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border-1 flex items-center gap-3 bg-surface-1">
              <span className="text-brand-purple-light shrink-0">
                <IconSearch className="w-[18px] h-[18px]" />
              </span>
              <input
                type="text"
                autoFocus
                placeholder="Digite o que procura (ex: Python, Rust, Go, Terminal, Entrar)..."
                value={commandSearchQuery}
                onChange={(e) => setCommandSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-ink-heading placeholder-ink-span outline-none font-sans"
              />
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(false)}
                className="text-body-sm text-ink-span hover:text-ink-heading font-mono px-2 py-1 rounded bg-surface-3/80 cursor-pointer"
              >
                ESC
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border-1/60">
              {filteredCommands.length === 0 ? (
                <div className="p-6 text-center text-body-sm text-ink-span">
                  Nenhum resultado encontrado para "{commandSearchQuery}".
                </div>
              ) : (
                filteredCommands.map((cmd, i) => (
                  <Link
                    key={i}
                    href={cmd.href}
                    data-cta-id={cmd.href === '/register' ? 'palette_register' : undefined}
                    onClick={() => {
                      if (cmd.href === '/register') track('nav_cta', 'palette_register');
                      setIsCommandPaletteOpen(false);
                    }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-2 text-body-sm text-ink-body transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-brand-purple-light flex items-center shrink-0">{cmd.icon}</span>
                      <div>
                        <div className="font-semibold text-ink-heading group-hover:text-brand-purple-light transition-colors">{cmd.label}</div>
                        <div className="text-body-sm text-ink-span font-mono">{cmd.category}</div>
                      </div>
                    </div>
                    <span className="text-ink-span group-hover:text-brand-green-neon font-mono text-body-sm">
                      Ir →
                    </span>
                  </Link>
                ))
              )}
            </div>

            <div className="p-3 bg-background border-t border-border-1 text-body-sm text-ink-span flex items-center justify-between font-mono">
              <span>Navegue com ↑ ↓ e pressione Enter</span>
              <span className="text-ink-span">NEXUS CODE v2.4</span>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div id="main-content">
{/* 2. HERO SECTION: O ARCO DE EVOLUÇÃO — DO JOGO AO MERCADO */}
  <section id="hero" className="relative z-10 pt-10 sm:pt-14 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    {/* Animação de entrada única e orquestrada do bloco (escalonada via animation-delay inline) */}
    <style>{`
      @keyframes heroRise {
        from { opacity: 0; transform: translateY(18px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .hero-rise {
        opacity: 0;
        animation: heroRise 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      @media (prefers-reduced-motion: reduce) {
        .hero-rise { opacity: 1; animation: none; }
      }
    `}</style>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

      {/* COLUNA ESQUERDA: NARRATIVA & AÇÃO (5 COLS) */}
      <div className="lg:col-span-5 text-left">
        {/* EYEBROW: UMA MENSAGEM SÓ, NOMEANDO O PÚBLICO */}
        <div className="hero-rise inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-purple-low border border-border-brand text-brand-purple-light text-[11px] font-mono font-bold mb-6" style={{ animationDelay: '0ms' }}>
          <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
          <span>PARA QUEM ESTÁ COMEÇANDO DO ZERO</span>
        </div>

        {/* HEADLINE H1: A PROMESSA — APRENDER DE VERDADE, DO PRIMEIRO EXERCÍCIO AO MERCADO */}
        <h1 className="hero-rise font-heading text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight text-ink-heading leading-[1.08] mb-6" style={{ animationDelay: '90ms' }}>
          Aprenda a programar <span className="text-brand-purple">de verdade</span>.
          Do primeiro exercício ao <span className="text-brand-purple">mercado de tecnologia</span>.
        </h1>

        {/* SUBHEADLINE: O ARCO INTEIRO, EM FRASES VERIFICÁVEIS */}
        <p className="hero-rise font-sans text-base sm:text-lg text-ink-body leading-relaxed mb-4 max-w-xl" style={{ animationDelay: '180ms' }}>
          Sem horas de vídeo que não viram prática: aqui, <strong className="text-ink-heading">cada conceito vira um exercício</strong> — código escrito por você e corrigido na hora.
          Você começa em missões no formato de jogo e sobe de nível: projetos guiados, a IDE completa, até montar um portfólio que as empresas buscam.
          O destino não é um certificado. É você, <strong className="text-ink-heading">dev completo, pronto para o mercado</strong>.
        </p>

        {/* A GUIA PRESENTE EM TODOS OS ESTÁGIOS */}
        <p className="hero-rise text-sm text-ink-span font-sans mb-8" style={{ animationDelay: '240ms' }}>
          Nossa <strong className="text-brand-purple-light">tutora de IA</strong> acompanha você em cada exercício: em vez de entregar a resposta, ela faz a pergunta certa e libera dicas em 3 níveis. A resposta pronta, nunca — quem resolve é você.
        </p>

        {/* AÇÃO: UM CTA PRIMÁRIO (ROXO SÓLIDO) + O QUIZ COMO CAMINHO DE BAIXO COMPROMISSO */}
        <div className="hero-rise flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-4" style={{ animationDelay: '300ms' }}>
          <Link
            href="/onboarding"
            data-cta-id="hero_primary"
            onClick={() => track('hero_cta', 'hero_primary')}
            className="group inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl bg-brand-purple hover:bg-brand-purple-dark text-white text-sm sm:text-base font-heading font-black tracking-tight transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-brand-purple/30 cursor-pointer"
          >
            <span>Começar grátis agora</span>
            <span className="group-hover:translate-x-1.5 transition-transform duration-200 font-bold">→</span>
          </Link>

          <Link
            href="/diagnostico"
            data-cta-id="hero_quiz"
            onClick={() => track('quiz_cta', 'hero_quiz')}
            className="group inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-transparent hover:bg-surface-2 border border-border-2 hover:border-border-brand text-ink-heading font-heading font-bold text-sm sm:text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Descubra seu nível em 3 min</span>
          </Link>
        </div>

        {/* MICROCOPY DO LOTE FUNDADOR (HONESTA, SEM URGÊNCIA INVENTADA) */}
        <p className="hero-rise text-xs font-mono text-ink-span mb-8" style={{ animationDelay: '380ms' }}>
          Lote fundador aberto · Pro por R$ 39,90/mês · grátis para começar, sem cartão
        </p>

        {/* PROVAS DE MECANISMO (SUBSTITUEM AS MÉTRICAS FABRICADAS) */}
        <div className="hero-rise rounded-2xl bg-surface-1 border border-border-1 p-4 max-w-lg" style={{ animationDelay: '440ms' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4 text-sm font-sans text-ink-body">
            <div className="flex items-center gap-2">
              <span className="text-brand-green-neon font-black">✔</span>
              <span>100% em português</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-brand-green-neon font-black">✔</span>
              <span>Correção por testes reais, a cada exercício</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-brand-green-neon font-black">✔</span>
              <span>Comece no navegador, sem instalar nada</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-brand-green-neon font-black">✔</span>
              <span>Monte um portfólio profissional e de alto valor</span>
            </div>
          </div>
        </div>
      </div>

      {/* COLUNA DIREITA: O ARCO DE EVOLUÇÃO DO ALUNO (6 COLS) */}
      <div className="lg:col-span-6 w-full">
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-[11px] font-mono text-brand-purple-light uppercase tracking-widest font-black flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-purple" />
            A JORNADA · 4 ESTÁGIOS
          </span>
          <span className="text-[10px] font-mono text-ink-span font-semibold">DO JOGO AO MERCADO</span>
        </div>
        <HeroEvolution />
      </div>

    </div>

  </section>
  {/* 3. METODOLOGIA COM LASER BEAMS NA ORDEM EXATA DA MARCA (ROXO, CIANO, VERDE) */}
  <section id="metodologia" className="relative z-10 py-24 px-6 sm:px-8 max-w-7xl mx-auto border-t border-border-2/70">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16">
      <div className="max-w-2xl text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-purple-low border border-brand-purple/30 text-brand-purple-light text-xs font-mono font-bold mb-3">
          <IconCpu className="w-4 h-4" />
          <span>CIÊNCIA COGNITIVA // APRENDIZADO ATIVO</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-ink-heading tracking-tight mb-4">
          Como Você Aprende de Verdade
        </h2>
        <p className="text-base sm:text-lg text-ink-body leading-relaxed font-sans">
          Quem aprende depurando código real fixa o conteúdo de um jeito que aula passiva não fixa. Combinamos feedback determinístico de testes com tutoria socrática: você escreve, o sistema corrige na hora e a tutora guia o seu raciocínio.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2 text-xs font-mono">
        <div className="px-4 py-2 rounded-xl bg-brand-purple-low border border-brand-purple/30 text-brand-purple-light font-bold flex items-center gap-2">
          <IconTarget className="w-4 h-4" />
          <span>TAXONOMIA DE BLOOM: NÍVEIS 1 A 5</span>
        </div>
        <span className="text-body-sm text-ink-span">RETENÇÃO BASEADA EM FEEDBACK IMEDIATO</span>
      </div>
    </div>

    {/* 3 ETAPAS DA JORNADA NAS CORES DA MARCA (ROXO -> CIANO -> VERDE) */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* 01: Roxo */}
      <div className="p-7 rounded-2xl bg-surface-1 border border-border-2 relative flex flex-col justify-between">
        <div className="top-laser-beam bg-brand-purple"></div>
        <div>
          <div className="w-12 h-12 rounded-xl bg-background border border-border-2 flex items-center justify-center font-mono font-bold text-lg text-brand-purple-light mb-5">
            01
          </div>
          <h3 className="text-lg font-heading font-bold text-ink-heading mb-2.5">Desafios Práticos do Mundo Real</h3>
          <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
            Você recebe objetivos práticos com explicações simples e claras, entendendo exatamente o que precisa construir e o porquê de cada linha de código.
          </p>
        </div>
        <div className="mt-5 pt-3 border-t border-border-2 text-body-sm font-mono text-brand-purple-light">
          ✔ Aprendizado com propósito
        </div>
      </div>

      {/* 02: Ciano */}
      <div className="p-7 rounded-2xl bg-surface-1 border border-border-2 relative flex flex-col justify-between">
        <div className="top-laser-beam bg-brand-cyan-neon"></div>
        <div>
          <div className="w-12 h-12 rounded-xl bg-background border border-border-2 flex items-center justify-center font-mono font-bold text-lg text-brand-cyan-neon mb-5">
            02
          </div>
          <h3 className="text-lg font-heading font-bold text-ink-heading mb-2.5">Código Direto no Navegador</h3>
          <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
            Nada de perder horas configurando ferramentas complexas no seu computador. Escreva, teste e execute seu código direto pelo navegador, sem travar.
          </p>
        </div>
        <div className="mt-5 pt-3 border-t border-border-2 text-body-sm font-mono text-brand-cyan-neon">
          ✔ Zero instalação ou dores de cabeça
        </div>
      </div>

      {/* 03: Verde Neon */}
      <div className="p-7 rounded-2xl bg-surface-1 border border-border-2 relative flex flex-col justify-between">
        <div className="top-laser-beam bg-brand-green-neon"></div>
        <div>
          <div className="w-12 h-12 rounded-xl bg-background border border-border-2 flex items-center justify-center font-mono font-bold text-lg text-brand-green-neon mb-5">
            03
          </div>
          <h3 className="text-lg font-heading font-bold text-ink-heading mb-2.5">Correção na Hora & Dicas Amigáveis</h3>
          <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
            Seu código é corrigido imediatamente. Se você travar ou esquecer um comando, nosso tutor inteligente te dá dicas amigáveis passo a passo para achar a solução.
          </p>
        </div>
        <div className="mt-5 pt-3 border-t border-border-2 text-body-sm font-mono text-brand-green-neon">
          ✔ Evolução sem frustração
        </div>
      </div>

    </div>
  </section>
  {/* DEMONSTRAÇÃO DA TUTORA DE IA COM MÉTODO SOCRÁTICO — Sprint 7: a
      seção da mascote desceu: sai do caminho hero → metodologia e entra
      DEPOIS da Metodologia (ordem: Hero → Metodologia → Mascote →
      Trilhas → Sandbox → Pilares → TCG → Versus → Stack → Preços → FAQ) */}
  <LumiMascotHero />
  {/* 4. TRILHAS: DO ZERO AO AVANÇADO NA MESMA ORDEM DE CORES DE PAGE.TSX */}
  {/* 1: Rust (Âmbar) | 2: Go (Ciano) | 3: Next.js (Esmeralda) | 4: Python/IA (Roxo) */}
  <section id="trilhas" className="relative z-10 py-24 border-t border-border-2/70">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14 px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto">
      <div className="max-w-2xl text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-amber/10 border border-brand-amber/30 text-brand-amber text-xs font-mono font-bold mb-3">
          <IconMap className="w-4 h-4" />
          <span>CURRÍCULO & SKILL TREES PRÁTICAS</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-ink-heading tracking-tight mb-4">
          Trilhas do Zero ao Profissional
        </h2>
        <p className="text-base sm:text-lg text-ink-body leading-relaxed font-sans">
          Aprenda a programar resolvendo desafios práticos, do seu primeiro comando até a construção de sistemas distribuídos completos. Sem aulas maçantes — aqui você aprende codificando.
        </p>
      </div>

      <div className="hidden lg:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-surface-2 border border-border-1 text-body-sm font-mono text-ink-body">
        <span>Arraste para explorar as 4 trilhas</span>
        <span className="text-brand-cyan-neon font-bold">→</span>
      </div>
    </div>


    {/* CARROSSEL HORIZONTAL COM SCROLL SNAP (10% À ESQUERDA) */}
    <div className="relative">
      {/* Sombra fade esquerda */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-20 z-10 bg-gradient-to-r from-background to-transparent" />
      {/* Sombra fade direita */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-16 z-10 bg-gradient-to-l from-background to-transparent" />

      <div
        className="flex gap-6 overflow-x-auto scroll-smooth pb-6 pl-[10%] pr-12"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >

        {/* TRILHA 1: Rust — Lógica & Alta Performance */}
        <article
          className="group relative flex flex-col justify-between bg-surface-1 border border-border-2 hover:border-brand-amber/60 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-amber shrink-0 w-[338px]"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div>
            {/* Capa com Imagem Vetorial Rust */}
            <div className="relative h-36 w-full rounded-xl overflow-hidden bg-surface-1 border border-border-1 mb-4 flex items-center justify-center select-none group-hover:border-brand-amber/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-amber/10 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute -top-8 -right-8 w-36 h-36 bg-brand-amber/20 rounded-full blur-2xl pointer-events-none group-hover:bg-brand-amber/30 transition-all duration-500" />
              <div className="relative z-10 w-20 h-20 rounded-xl bg-surface-1/90 border border-brand-amber/30 flex items-center justify-center p-2 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <TrackCoverRust />
              </div>
            </div>

            {/* Título & Especialidade */}
            <h3 className="text-base font-heading font-bold text-ink-heading tracking-tight group-hover:text-brand-amber transition-colors mb-1">
              Programação do Zero com Rust
            </h3>
            <p className="text-body-sm text-brand-amber/80 font-mono mb-2">Lógica • Algoritmos • Alta Performance</p>

            {/* Resumo do Curso */}
            <p className="text-body-sm text-ink-span leading-relaxed line-clamp-2 mb-4 font-sans">
              Do primeiro <code className="text-brand-amber bg-brand-amber/10 px-1 rounded">println!</code> à resolução de problemas reais. Aprenda a pensar como programador e a escrever códigos rápidos e sem erros de memória.
            </p>

            {/* Tecnologias & Conteúdos-Chave */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">Lógica do Zero</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">Algoritmos</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">Rust 2024</span>
              <span className="bg-brand-amber/10 border border-brand-amber/30 text-brand-amber text-body-sm font-mono px-2 py-0.5 rounded-md">Memory Safety</span>
            </div>

            {/* Sprint 6 — números da ementa oficial do produto
                (CURRICULUM-AND-PEDAGOGY-SPEC.md, seção 3, Trilha 1).
                Carga horária não entra: a ementa não a declara. */}
            <div className="mb-4 space-y-1 border-t border-border-1/60 pt-3 font-mono text-body-sm text-ink-span">
              <div>4 módulos · 7 desafios práticos</div>
              {/* Sprint 7 — capstone em linguagem de resultado: o destaque
                  é o que o aluno constrói; o nome técnico vira subtítulo */}
              <div>Projeto final: <span className="font-bold text-ink-heading">Banco de dados distribuído próprio</span></div>
              <div>NexusDB Distribuído</div>
            </div>
          </div>

          {/* Rodapé: Nível e CTA */}
          <div className="pt-3.5 border-t border-border-1/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-amber"></span>
              <span className="text-xs font-mono text-ink-span">Do Zero ao Avançado</span>
            </div>
            <Link href="/register?track=rust" data-cta-id="trilha_rust" onClick={() => track('trilha_cta', 'trilha_rust', { track: 'rust' })} className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm font-mono font-bold transition-all duration-200 active:scale-95 border border-transparent shadow-md shadow-brand-purple/25">
              <span>Começar grátis agora</span>
            </Link>
          </div>
        </article>

        {/* TRILHA 2: Go — APIs & Backend Moderno */}
        <article
          className="group relative flex flex-col justify-between bg-surface-1 border border-border-2 hover:border-brand-cyan-neon/60 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-cyan shrink-0 w-[338px]"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div>
            {/* Capa com Imagem Vetorial Go */}
            <div className="relative h-36 w-full rounded-xl overflow-hidden bg-surface-1 border border-border-1 mb-4 flex items-center justify-center select-none group-hover:border-brand-cyan-neon/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan-neon/10 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute -top-8 -right-8 w-36 h-36 bg-brand-cyan-neon/20 rounded-full blur-2xl pointer-events-none group-hover:bg-brand-cyan-neon/30 transition-all duration-500" />
              <div className="relative z-10 w-20 h-20 rounded-xl bg-surface-1/90 border border-brand-cyan-neon/30 flex items-center justify-center p-2 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <TrackCoverGo />
              </div>
            </div>

            {/* Título & Especialidade */}
            <h3 className="text-base font-heading font-bold text-ink-heading tracking-tight group-hover:text-brand-cyan-neon transition-colors mb-1">
              APIs & Servidores Web com Go
            </h3>
            <p className="text-body-sm text-brand-cyan-neon/80 font-mono mb-2">REST • Banco de Dados • Microsserviços</p>

            {/* Resumo do Curso */}
            <p className="text-body-sm text-ink-span leading-relaxed line-clamp-2 mb-4 font-sans">
              Construa o backend que move gigantes da tecnologia. Crie rotas HTTP ultra rápidas, conecte bancos de dados PostgreSQL e faça deploys reais de microsserviços.
            </p>

            {/* Tecnologias & Conteúdos-Chave */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">REST APIs</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">PostgreSQL</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">Docker</span>
              <span className="bg-brand-cyan-neon/10 border border-brand-cyan-neon/30 text-brand-cyan-neon text-body-sm font-mono px-2 py-0.5 rounded-md">Go 1.22</span>
            </div>

            {/* Sprint 6 — números da ementa oficial do produto
                (CURRICULUM-AND-PEDAGOGY-SPEC.md, seção 3, Trilha 2) */}
            <div className="mb-4 space-y-1 border-t border-border-1/60 pt-3 font-mono text-body-sm text-ink-span">
              <div>4 módulos · 4 desafios práticos</div>
              <div>Projeto final: <span className="font-bold text-ink-heading">Motor de pagamentos de alta vazão</span></div>
              <div>High-Throughput Payment Engine</div>
            </div>
          </div>

          {/* Rodapé: Nível e CTA */}
          <div className="pt-3.5 border-t border-border-1/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-cyan-neon"></span>
              <span className="text-xs font-mono text-ink-span">Intermediário</span>
            </div>
            <Link href="/register?track=go" data-cta-id="trilha_go" onClick={() => track('trilha_cta', 'trilha_go', { track: 'go' })} className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm font-mono font-bold transition-all duration-200 active:scale-95 border border-transparent shadow-md shadow-brand-purple/25">
              <span>Começar grátis agora</span>
            </Link>
          </div>
        </article>

        {/* TRILHA 3: React & Next.js — Desenvolvimento Web */}
        <article
          className="group relative flex flex-col justify-between bg-surface-1 border border-border-2 hover:border-brand-green/60 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-green shrink-0 w-[338px]"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div>
            {/* Capa com Imagem Vetorial Next.js */}
            <div className="relative h-36 w-full rounded-xl overflow-hidden bg-surface-1 border border-border-1 mb-4 flex items-center justify-center select-none group-hover:border-brand-green/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-green/10 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute -top-8 -right-8 w-36 h-36 bg-brand-green-neon/20 rounded-full blur-2xl pointer-events-none group-hover:bg-brand-green-neon/30 transition-all duration-500" />
              <div className="relative z-10 w-20 h-20 rounded-xl bg-surface-1/90 border border-brand-green/30 flex items-center justify-center p-2 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <TrackCoverWeb />
              </div>
            </div>

            {/* Título & Especialidade */}
            <h3 className="text-base font-heading font-bold text-ink-heading tracking-tight group-hover:text-brand-green-neon transition-colors mb-1">
              Desenvolvimento Web com React & Next.js
            </h3>
            <p className="text-body-sm text-brand-green-neon/80 font-mono mb-2">Frontend • TypeScript • Interfaces Modernas</p>

            {/* Resumo do Curso */}
            <p className="text-body-sm text-ink-span leading-relaxed line-clamp-2 mb-4 font-sans">
              Crie sites modernos, interativos e rápidos com as ferramentas usadas por startups unicórnio. Aprenda TypeScript, Tailwind e Next.js criando produtos reais.
            </p>

            {/* Tecnologias & Conteúdos-Chave */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">React 18</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">Next.js 14</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">TypeScript</span>
              <span className="bg-brand-green/10 border border-brand-green/30 text-brand-green-neon text-body-sm font-mono px-2 py-0.5 rounded-md">Tailwind CSS</span>
            </div>

            {/* Sprint 6 — números da ementa oficial do produto
                (CURRICULUM-AND-PEDAGOGY-SPEC.md, seção 3, Trilha 3) */}
            <div className="mb-4 space-y-1 border-t border-border-1/60 pt-3 font-mono text-body-sm text-ink-span">
              <div>3 módulos · 3 desafios práticos</div>
              <div>Projeto final: <span className="font-bold text-ink-heading">IDE web colaborativa em tempo real</span></div>
              <div>Web IDE Colaborativa em Tempo Real</div>
            </div>
          </div>

          {/* Rodapé: Nível e CTA */}
          <div className="pt-3.5 border-t border-border-1/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-green-neon"></span>
              <span className="text-xs font-mono text-ink-span">Do Zero ao Deploy</span>
            </div>
            <Link href="/register?track=web" data-cta-id="trilha_web" onClick={() => track('trilha_cta', 'trilha_web', { track: 'web' })} className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm font-mono font-bold transition-all duration-200 active:scale-95 border border-transparent shadow-md shadow-brand-purple/25">
              <span>Começar grátis agora</span>
            </Link>
          </div>
        </article>

        {/* TRILHA 4: Python & Inteligência Artificial */}
        <article
          className="group relative flex flex-col justify-between bg-surface-1 border border-border-2 hover:border-brand-purple/60 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-purple shrink-0 w-[338px]"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div>
            {/* Capa com Imagem Vetorial Python IA */}
            <div className="relative h-36 w-full rounded-xl overflow-hidden bg-surface-1 border border-border-1 mb-4 flex items-center justify-center select-none group-hover:border-brand-purple/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/10 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute -top-8 -right-8 w-36 h-36 bg-brand-purple/20 rounded-full blur-2xl pointer-events-none group-hover:bg-brand-purple/30 transition-all duration-500" />
              <div className="relative z-10 w-20 h-20 rounded-xl bg-surface-1/90 border border-brand-purple/30 flex items-center justify-center p-2 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <TrackCoverPython />
              </div>
            </div>

            {/* Título & Especialidade */}
            <h3 className="text-base font-heading font-bold text-ink-heading tracking-tight group-hover:text-brand-purple-light transition-colors mb-1">
              Python & IA — Do Zero ao Agente Inteligente
            </h3>
            <p className="text-body-sm text-brand-purple-light/80 font-mono mb-2">Python • Machine Learning • Automações</p>

            {/* Resumo do Curso */}
            <p className="text-body-sm text-ink-span leading-relaxed line-clamp-2 mb-4 font-sans">
              Comece com scripts básicos em Python e avance até criar agentes autônomos com LLMs que leem arquivos, resolvem tarefas e integram APIs inteligentes.
            </p>

            {/* Tecnologias & Conteúdos-Chave */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">Python 3.12</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">OpenAI API</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">LangChain</span>
              <span className="bg-brand-purple/10 border border-brand-purple/30 text-brand-purple-light text-body-sm font-mono px-2 py-0.5 rounded-md">Automações</span>
            </div>

            {/* Sprint 6 — números da ementa oficial do produto
                (CURRICULUM-AND-PEDAGOGY-SPEC.md, seção 3, Trilha 4) */}
            <div className="mb-4 space-y-1 border-t border-border-1/60 pt-3 font-mono text-body-sm text-ink-span">
              <div>3 módulos · 3 desafios práticos</div>
              <div>Projeto final: <span className="font-bold text-ink-heading">Revisor de código autônomo com IA</span></div>
              <div>Autonomous Socratic Code Reviewer</div>
            </div>
          </div>

          {/* Rodapé: Nível e CTA */}
          <div className="pt-3.5 border-t border-border-1/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
              <span className="text-xs font-mono text-ink-span">Do Zero ao Avançado</span>
            </div>
            <Link href="/register?track=python" data-cta-id="trilha_python" onClick={() => track('trilha_cta', 'trilha_python', { track: 'python' })} className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm font-bold transition-all duration-200 active:scale-95 shadow-md shadow-brand-purple/25">
              <span>Começar grátis agora</span>
            </Link>
          </div>
        </article>

      </div>

      {/* Indicadores de navegação (dots) */}
      <div className="flex items-center justify-center gap-2 mt-6">
        <span className="w-6 h-1.5 rounded-full bg-brand-amber"></span>
        <span className="w-2 h-1.5 rounded-full bg-surface-3"></span>
        <span className="w-2 h-1.5 rounded-full bg-surface-3"></span>
        <span className="w-2 h-1.5 rounded-full bg-surface-3"></span>
      </div>
    </div>
  </section>
  {/* 5. TERMINAL INTERATIVO COM AS CORES DA PÁGINA PRINCIPAL */}
  <section id="sandbox" className="relative z-10 py-24 px-6 sm:px-8 max-w-7xl mx-auto border-t border-border-2/70">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
      <div className="max-w-2xl text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan-neon/30 text-brand-cyan-neon text-xs font-mono font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-brand-cyan-neon"></span>
          <span>DEMONSTRAÇÃO DO AMBIENTE REAL // ZERO SETUP</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-ink-heading tracking-tight mb-4">
          Um Gostinho do Terminal Real
        </h2>
        <p className="text-base sm:text-lg text-ink-body leading-relaxed font-sans">
          Isto é uma demonstração ilustrativa do ambiente da plataforma, com exemplos de código e saídas de exemplo. A execução de verdade acontece dentro da Nexus Code, em containers Linux isolados via Piston, com correção por testes reais a cada desafio.
        </p>
      </div>

      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-2 border border-border-1 text-xs font-mono text-ink-body shrink-0">
        <span className="w-2 h-2 rounded-full bg-brand-green-neon" />
        <span>DEMONSTRAÇÃO ILUSTRATIVA</span>
      </div>
    </div>

    {/* TELAS REAIS DO PRODUTO — Sprint 7 trouxe a primeira (Missão 1);
        Sprint 9 (item 1 do Designer: proeminência) o par de telas reais
        abre a seção, ANTES da demonstração ilustrativa, em escala
        protagonista. As duas capturadas com Playwright do app rodando
        local, rotuladas como o que são: telas de verdade */}
    <div className="flex flex-col gap-6 mb-6">
      <figure className="rounded-2xl bg-surface-1 border border-border-2 overflow-hidden">
        <Image
          src="/landing/produto-missao-1.webp"
          alt="Tela real da Nexus Code: batalha da Missão 1 contra o SyntaxBug número 404, com o starter Pythox, barras de HP, registro da batalha e os botões de habilidade que pedem código"
          width={768}
          height={500}
          className="w-full h-auto"
          loading="lazy"
        />
        <figcaption className="px-5 py-3.5 border-t border-border-2 text-body-sm font-mono text-ink-span">
          Tela real da plataforma: a Missão 1 do prólogo — você batalha escrevendo código, antes mesmo de criar a conta.
        </figcaption>
      </figure>

      <figure className="rounded-2xl bg-surface-1 border border-border-2 overflow-hidden">
        <Image
          src="/landing/produto-ide.webp"
          alt="Tela real da Nexus Code: a IDE com a primeira atividade do curso de Python aberta, com o enunciado, as dicas, o editor de código com a função inicial e o terminal do sandbox"
          width={1600}
          height={1000}
          className="w-full h-auto"
          loading="lazy"
        />
        <figcaption className="px-5 py-3.5 border-t border-border-2 text-body-sm font-mono text-ink-span">
          Tela real da plataforma: a IDE onde o estudo acontece — enunciado, editor e terminal, direto no navegador.
        </figcaption>
      </figure>
    </div>

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

    {/* BANNER DE ALTA CONVERSÃO PÓS-TERMINAL */}
    <div className="mt-6 p-5 rounded-2xl bg-surface-1 border border-brand-green-neon/35 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl shadow-brand-green-neon/5">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-brand-green-neon/15 border border-brand-green-neon/40 flex items-center justify-center text-brand-green-neon shrink-0">
          <IconBolt className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm sm:text-base font-heading font-bold text-ink-heading flex items-center gap-2">
            <span>Isto é só uma amostra do ambiente real</span>
          </div>
          <p className="text-body-sm text-ink-body font-sans mt-0.5">
            Cadastre-se gratuitamente para executar código de verdade no terminal, salvar seu histórico, acumular XP e liberar os desafios reais da plataforma.
          </p>
        </div>
      </div>
      <Link href="/register" data-cta-id="sandbox_banner" onClick={() => track('sandbox_cta', 'sandbox_banner')} className="whitespace-nowrap inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white font-heading font-extrabold text-xs sm:text-sm shadow-lg shadow-brand-purple/30 active:scale-95 transition-all">
        <span>Começar grátis agora</span>
        <span>→</span>
      </Link>
    </div>
</section>
  {/* OS 4 PILARES DA NEXUS CODE (GRID BENTO) */}
  <NexusPillarsGrid />
  {/* SHOWCASE DOS CARDS TCG HOLOGRÁFICOS 3D */}
  <TcgCardsShowcase />
  {/* O COMPARATIVO BRUTAL: VELHO MUNDO VS ARENA NEXUS */}
  <ComparisonVersus />
  {/* TRUST BANNER: INFRAESTRUTURA DE MISSÃO CRÍTICA & PILHAS BIG TECH (ASYMMETRIC SPLIT) */}
  <section className="relative py-16 border-y border-border-1 bg-surface-1">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Coluna Esquerda: Contexto de Engenharia */}
        <div className="lg:col-span-4 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-border-1 text-brand-cyan-neon text-xs font-mono mb-3">
            <IconShield className="w-4 h-4" />
            <span>TECNOLOGIAS DO CURSO</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-heading font-black text-ink-heading tracking-tight mb-3">
            As tecnologias que o mercado usa
          </h3>
          <p className="text-body-sm sm:text-sm font-sans text-ink-span leading-relaxed">
            Sem simulações simplórias. Você constrói soluções nas mesmas linguagens compiladas e runtimes isolados que sustentam a infraestrutura moderna de Big Techs.
          </p>
        </div>

        {/* Coluna Direita: Grid de Tecnologias Distribuído */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          <div className="p-3.5 rounded-2xl bg-surface-1 border border-border-1 hover:border-brand-amber/50 flex items-center gap-3 transition-all group">
            <span className="text-brand-amber group-hover:scale-110 transition-transform"><IconGear className="w-7 h-7" /></span>
            <div className="text-left font-mono">
              <div className="text-body-sm font-bold text-ink-heading">Rust 1.78</div>
              <div className="text-body-sm text-ink-span">Zero-Cost Memory</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-1 border border-border-1 hover:border-brand-cyan-neon/50 flex items-center gap-3 transition-all group">
            <span className="text-brand-cyan-neon group-hover:scale-110 transition-transform"><IconNodes className="w-7 h-7" /></span>
            <div className="text-left font-mono">
              <div className="text-body-sm font-bold text-ink-heading">Go 1.22</div>
              <div className="text-body-sm text-ink-span">Goroutines & Canais</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-1 border border-border-1 hover:border-brand-cyan/50 flex items-center gap-3 transition-all group">
            <span className="text-brand-cyan group-hover:scale-110 transition-transform"><IconBolt className="w-7 h-7" /></span>
            <div className="text-left font-mono">
              <div className="text-body-sm font-bold text-ink-heading">TypeScript 5.4</div>
              <div className="text-body-sm text-ink-span">Type Soundness</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-1 border border-border-1 hover:border-brand-amber-solar/50 flex items-center gap-3 transition-all group">
            <span className="text-brand-amber group-hover:scale-110 transition-transform"><IconCode className="w-7 h-7" /></span>
            <div className="text-left font-mono">
              <div className="text-body-sm font-bold text-ink-heading">Python 3.12</div>
              <div className="text-body-sm text-ink-span">IA & RAG Pipelines</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-1 border border-border-1 hover:border-brand-rose/50 flex items-center gap-3 transition-all group">
            <span className="text-brand-rose group-hover:scale-110 transition-transform"><IconTerminal className="w-7 h-7" /></span>
            <div className="text-left font-mono">
              <div className="text-body-sm font-bold text-ink-heading">Linux cgroups-v2</div>
              <div className="text-body-sm text-ink-span">Containers Isolados</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-1 border border-border-1 hover:border-brand-green/50 flex items-center gap-3 transition-all group">
            <span className="text-brand-green-neon group-hover:scale-110 transition-transform"><IconGitBranch className="w-7 h-7" /></span>
            <div className="text-left font-mono">
              <div className="text-body-sm font-bold text-ink-heading">Gitea Git Real</div>
              <div className="text-body-sm text-ink-span">Hash SHA-256</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  {/* 10. PLANOS E PREÇOS: DESTAQUE NO PLANO PRO EM ROXO */}
  <section id="precos" className="relative z-10 py-24 px-6 sm:px-8 max-w-7xl mx-auto border-t border-border-2/70">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16">
      <div className="max-w-2xl text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-green/10 border border-brand-green/30 text-brand-green-neon text-xs font-mono font-bold mb-3">
          <IconCard className="w-4 h-4" />
          <span>PLANOS ACESSÍVEIS & TRANSPARENTES</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-ink-heading tracking-tight mb-4">
          Comece grátis. Pague só quando avançar.
        </h2>
        <p className="text-base sm:text-lg text-ink-body leading-relaxed font-sans">
          Investimento direto na sua independência técnica. Sem contratos amarrados, cancele a qualquer momento com 1 clique.
        </p>
      </div>

      {/* SELETOR MENSAL / ANUAL ALINHADO À DIREITA */}
      <div className="inline-flex items-center p-1.5 rounded-full bg-surface-1 border border-border-2 shrink-0 self-start lg:self-end">
        <button
          type="button"
          onClick={() => setBillingCycle('monthly')}
          className={`px-6 py-2 rounded-full text-body-sm sm:text-sm transition-all cursor-pointer ${
            billingCycle === 'monthly'
              ? 'font-bold bg-brand-purple text-white shadow-md'
              : 'font-medium text-ink-span hover:text-ink-heading'
          }`}
        >
          Mensal
        </button>
        <button
          type="button"
          onClick={() => setBillingCycle('annual')}
          className={`px-6 py-2 rounded-full text-body-sm sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            billingCycle === 'annual'
              ? 'font-bold bg-brand-purple text-white shadow-md'
              : 'font-medium text-ink-span hover:text-ink-heading'
          }`}
        >
          <span>Anual</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-brand-purple-light/20 text-brand-purple-light font-bold">
            ECONOMIZE 25%
          </span>
        </button>
      </div>
    </div>
{/* CARDS DE PREÇO */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      
      {/* Card Gratuito (Explorer) */}
      <div className="p-7 rounded-2xl bg-surface-1 border border-border-2 flex flex-col justify-between">
        <div>
          <div className="text-xs font-mono font-bold text-ink-span uppercase tracking-wider mb-2">Explorer</div>
          <h3 className="text-xl font-heading font-bold text-ink-heading mb-2">Comunitário</h3>
          <p className="text-body-sm text-ink-span leading-relaxed mb-6 font-sans">
            Para experimentar os primeiros módulos e o terminal interativo.
          </p>
          <div className="mb-6">
            <span className="text-3xl sm:text-4xl font-heading font-black text-ink-heading">R$ 0</span>
            <span className="text-body-sm font-mono text-ink-span ml-1">/ para sempre</span>
          </div>
          <ul className="space-y-3 text-body-sm font-mono text-ink-body mb-8">
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Desafios fundamentais do nível Iniciante</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Sandbox Linux Piston</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Acesso à Liga Bronze</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Tutora de IA socrática no nível Iniciante</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Portfólio público com seus projetos</li>
          </ul>
        </div>
        <Link href="/register" data-cta-id="pricing_explorer" onClick={() => { track('pricing_cta', 'pricing_explorer', { plan: 'explorer', cycle: billingCycle }); savePlanIntent({ plan: 'explorer', billingCycle }); }} className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm font-mono font-bold text-center shadow-md shadow-brand-purple/25 transition-all active:scale-95">
          Começar grátis agora
        </Link>
      </div>

      {/* Card Pro Engineer (Featured - Roxo com Shadow Difusa) */}
      <div className="p-8 rounded-2xl bg-surface-1 border-2 border-brand-purple relative flex flex-col justify-between shadow-xl shadow-brand-purple/20">
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-brand-purple text-white text-xs font-mono font-bold uppercase tracking-wider shadow-md">
          RECOMENDADO
        </div>
        <div>
          <div className="text-xs font-mono font-bold text-brand-purple uppercase tracking-wider mb-2">PRO ENGINEER</div>
          <h3 className="text-2xl font-heading font-bold text-ink-heading mb-2">Plano Pro</h3>
          <p className="text-body-sm text-ink-body leading-relaxed mb-6 font-sans">
            Para quem busca autonomia técnica e preparação para vagas de alto nível.
          </p>
          <div className="mb-6">
            <span id="price-pro" className="text-4xl sm:text-5xl font-heading font-black text-ink-heading">
              {billingCycle === 'annual' ? 'R$ 29,90' : 'R$ 39,90'}
            </span>
            <span id="cycle-pro" className="text-body-sm font-mono text-ink-span ml-1">
              {billingCycle === 'annual' ? '/ mês (R$ 358,80/ano)' : '/ mês'}
            </span>
            <div className="mt-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-purple-low border border-border-brand text-brand-purple-light text-xs font-mono font-bold uppercase tracking-wider">
                <IconRocket className="w-3.5 h-3.5" />
                <span>Preço de lançamento · Lote fundador</span>
              </span>
            </div>
          </div>
          <ul className="space-y-3 text-body-sm font-mono text-ink-heading mb-8">
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Acesso total a todas as 4 Trilhas Master</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Tutor IA Socrático Ilimitado 24/7</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Portfólio de Evidências com Hash SHA-256</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Suporte a Concorrência & Stress Tests</li>
            <li className="flex items-center gap-2"><span className="text-brand-purple font-bold">✔</span> Destaque nas Ligas Semanais</li>
          </ul>
        </div>
        <Link href="/register" data-cta-id="pricing_pro" onClick={() => { track('pricing_cta', 'pricing_pro', { plan: 'pro', cycle: billingCycle }); savePlanIntent({ plan: 'pro', billingCycle }); }} className="w-full py-3.5 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm font-heading font-extrabold text-center shadow-lg shadow-brand-purple/30 hover:shadow-xl hover:shadow-brand-purple/40 transition-all active:scale-95 border border-border-2">
          <span className="inline-flex items-center gap-2">Começar grátis agora <IconBolt className="w-4 h-4" /></span>
        </Link>
      </div>

      {/* Card Staff / Enterprise */}
      <div className="p-7 rounded-2xl bg-surface-1 border border-border-2 flex flex-col justify-between">
        <div>
          <div className="text-xs font-mono font-bold text-brand-purple-light uppercase tracking-wider mb-2">ENTERPRISE & TIMES</div>
          <h3 className="text-xl font-heading font-bold text-ink-heading mb-2">Plano Staff</h3>
          <p className="text-body-sm text-ink-span leading-relaxed mb-6 font-sans">
            Para times de engenharia, tech academies e posições seniores.
          </p>
          <div className="mb-6">
            <span id="price-staff" className="text-3xl sm:text-4xl font-heading font-black text-ink-heading">
              {billingCycle === 'annual' ? 'R$ 59,90' : 'R$ 79,90'}
            </span>
            <span id="cycle-staff" className="text-body-sm font-mono text-ink-span ml-1">
              {billingCycle === 'annual' ? '/ mês (R$ 718,80/ano)' : '/ mês'}
            </span>
          </div>
          <ul className="space-y-3 text-body-sm font-mono text-ink-body mb-8">
            <li className="flex items-center gap-2"><span className="text-brand-purple font-bold">✔</span> Painel de Gestão de Equipes</li>
            <li className="flex items-center gap-2"><span className="text-brand-purple font-bold">✔</span> Desafios Customizados de Empresa</li>
            <li className="flex items-center gap-2"><span className="text-brand-purple font-bold">✔</span> SSO / SAML & Segurança SOC-2</li>
            <li className="flex items-center gap-2"><span className="text-brand-purple font-bold">✔</span> Relatórios de Performance de Engenharia</li>
          </ul>
        </div>
        {/* Staff é contato comercial (ação genuinamente outra): cta_id e
            intenção próprios, tratamento secundário em roxo — não divide o
            funil de cadastro genérico (Sprint 5).
            Sprint 6 — o rótulo agora tem destino REAL: a página /contato
            (formulário próprio com endpoint na API), não mais o /register
            disfarçado de contato. */}
        <Link href="/contato" data-cta-id="pricing_staff_contact" onClick={() => { track('pricing_cta', 'pricing_staff_contact', { plan: 'staff', intent: 'contact_sales', cycle: billingCycle }); savePlanIntent({ plan: 'staff', billingCycle, intent: 'contact_sales' }); }} className="w-full py-3 rounded-xl bg-transparent hover:bg-brand-purple text-brand-purple-light hover:text-white text-body-sm font-mono font-bold text-center border border-brand-purple/60 transition-colors">
          Falar com Engenharia
        </Link>
      </div>

    </div>
  </section>
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

    {/* Grid de Perguntas em 2 Colunas com Cores Semânticas */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
      
      {/* 1. Ciano: Zero Instalação */}
      <div className="group relative p-7 rounded-2xl bg-surface-1 border border-border-2 hover:border-brand-cyan-neon/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-sm-cyan">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-brand-cyan-neon/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-cyan-neon/10 border border-brand-cyan-neon/30 text-brand-cyan-neon flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <IconMonitor className="w-5 h-5" />
          </div>
          <span className="text-body-sm font-mono font-bold px-2.5 py-0.5 rounded-full border border-brand-cyan-neon/40 bg-brand-cyan-neon/10 text-brand-cyan-neon">
            ZERO INSTALAÇÃO
          </span>
        </div>
        <h3 className="font-heading font-bold text-ink-heading text-base sm:text-lg mb-2.5 group-hover:text-brand-cyan-neon transition-colors">
          Preciso instalar algo na minha máquina para começar?
        </h3>
        <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
          Não. Todo o ambiente roda em <span className="text-ink-heading font-medium">containers Linux isolados</span> diretamente no seu navegador. Você só precisa de uma conexão à internet para escrever, compilar e rodar testes de estresse em Python, Go e Rust.
        </p>
      </div>

      {/* 2. Rosa: Metodologia vs Cursos em Vídeo */}
      <div className="group relative p-7 rounded-2xl bg-surface-1 border border-border-2 hover:border-brand-rose/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-sm-pink">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-brand-rose/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-rose/10 border border-brand-rose/30 text-brand-rose flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <IconBolt className="w-5 h-5" />
          </div>
          <span className="text-body-sm font-mono font-bold px-2.5 py-0.5 rounded-full border border-brand-rose/40 bg-brand-rose/10 text-brand-rose">
            METODOLOGIA ATIVA
          </span>
        </div>
        <h3 className="font-heading font-bold text-ink-heading text-base sm:text-lg mb-2.5 group-hover:text-brand-rose transition-colors">
          Qual a diferença entre a NEXUS CODE e cursos em vídeo?
        </h3>
        <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
          Nas plataformas tradicionais você passa a maior parte do tempo assistindo passivamente a vídeos longos. Na NEXUS CODE você passa <span className="text-ink-heading font-medium">a maior parte do tempo escrevendo código e corrigindo testes</span>, exatamente o que molda o programador contratado pelo mercado.
        </p>
      </div>

      {/* 3. Verde: Iniciantes Absolutos */}
      <div className="group relative p-7 rounded-2xl bg-surface-1 border border-border-2 hover:border-brand-green-neon/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-sm-green">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-brand-green-neon/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-green-neon/10 border border-brand-green-neon/30 text-brand-green-neon flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <IconSun className="w-5 h-5" />
          </div>
          <span className="text-body-sm font-mono font-bold px-2.5 py-0.5 rounded-full border border-brand-green-neon/40 bg-brand-green-neon/10 text-brand-green-neon">
            DO ZERO AO CÓDIGO
          </span>
        </div>
        <h3 className="font-heading font-bold text-ink-heading text-base sm:text-lg mb-2.5 group-hover:text-brand-green-neon transition-colors">
          Sou iniciante absoluto. Vou conseguir acompanhar?
        </h3>
        <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
          Sim, com certeza! A plataforma foi desenhada para quem nunca escreveu uma linha de código. Você começa aprendendo <span className="text-ink-heading font-medium">lógica básica e sintaxe elementar</span>, com feedback passo a passo até construir projetos completos.
        </p>
      </div>

      {/* 4. Âmbar: Pré-requisitos & Faculdade */}
      <div className="group relative p-7 rounded-2xl bg-surface-1 border border-border-2 hover:border-brand-amber/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-sm-amber">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-brand-amber/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-amber/10 border border-brand-amber/30 text-brand-amber flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <IconBox className="w-5 h-5" />
          </div>
          <span className="text-body-sm font-mono font-bold px-2.5 py-0.5 rounded-full border border-brand-amber/40 bg-brand-amber/10 text-brand-amber">
            SEM PRÉ-REQUISITOS
          </span>
        </div>
        <h3 className="font-heading font-bold text-ink-heading text-base sm:text-lg mb-2.5 group-hover:text-brand-amber transition-colors">
          Preciso ter faculdade ou saber matemática avançada?
        </h3>
        <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
          Não! Você não precisa de diploma na área nem de fórmulas complexas. O raciocínio lógico é construído de forma <span className="text-ink-heading font-medium">prática, visual e gradual</span>, resolvendo problemas reais no terminal desde o primeiro dia.
        </p>
      </div>

      {/* 5. Roxo: Tutor Socrático & Feedback */}
      <div className="group relative p-7 rounded-2xl bg-surface-1 border border-border-2 hover:border-brand-purple/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-sm-purple">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-brand-purple/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-purple/10 border border-brand-purple/30 text-brand-purple-light flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <IconSpeech className="w-5 h-5" />
          </div>
          <span className="text-body-sm font-mono font-bold px-2.5 py-0.5 rounded-full border border-brand-purple/40 bg-brand-purple/10 text-brand-purple-light">
            TUTOR SOCRÁTICO
          </span>
        </div>
        <h3 className="font-heading font-bold text-ink-heading text-base sm:text-lg mb-2.5 group-hover:text-brand-purple-light transition-colors">
          Como funciona o feedback quando meu código dá erro?
        </h3>
        <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
          Nossa tutoria socrática analisa a <span className="text-ink-heading font-medium">Árvore Sintática Abstrata (AST)</span> da sua solução e aponta pistas e perguntas reflexivas, em vez de dar a resposta pronta. Isso desenvolve seu raciocínio real de debugging.
        </p>
      </div>

      {/* 6. Esmeralda: Certificados & Mercado */}
      <div className="group relative p-7 rounded-2xl bg-surface-1 border border-border-2 hover:border-brand-green/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-sm-emerald">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-brand-green-neon/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/30 text-brand-green-neon flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <IconShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-body-sm font-mono font-bold px-2.5 py-0.5 rounded-full border border-brand-green/40 bg-brand-green/10 text-brand-green-neon">
            COMPROVAÇÃO REAL
          </span>
        </div>
        <h3 className="font-heading font-bold text-ink-heading text-base sm:text-lg mb-2.5 group-hover:text-brand-green-neon transition-colors">
          Como os projetos e certificados me ajudam a conseguir vagas?
        </h3>
        <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
          Cada projeto gera repositórios Git reais com commits assinados e certificados com <span className="text-ink-heading font-medium">verificação criptográfica SHA-256</span>. Você prova sua capacidade técnica para recrutadores mostrando código executável em produção.
        </p>
      </div>

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
      <a href="/onboarding" data-cta-id="faq_banner" onClick={() => track('final_cta', 'faq_banner')} className="shrink-0 px-6 py-3 rounded-xl bg-brand-purple hover:bg-brand-purple-light text-white font-mono font-bold text-body-sm sm:text-sm transition-all duration-200 active:scale-95 shadow-lg shadow-brand-purple/25 border border-brand-purple-light/50">
        Começar grátis agora →
      </a>
    </div>
  </section>
  {/* 12. CTA FINAL EM SPLIT ASSIMÉTRICO */}
  <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    <div className="relative rounded-3xl bg-gradient-to-br from-surface-2 via-surface-1 to-background border border-white/[0.1] p-8 sm:p-14 overflow-hidden shadow-elev-2xl">
      {/* Laser beam na ordem exata da marca: Roxo -> Ciano -> Verde */}
      <div className="top-laser-beam bg-gradient-to-r from-brand-purple via-brand-cyan-neon to-brand-green-neon" style={{ left: '2%', right: '2%' }}></div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
        {/* Esquerda: 7 cols */}
        <div className="lg:col-span-7 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-green-neon/10 border border-brand-green-neon/30 text-brand-green-neon text-xs font-mono font-bold mb-5">
            <span className="w-2 h-2 rounded-full bg-brand-green-neon"></span>
            <span>COMECE GRÁTIS, SEM CARTÃO</span>
          </div>

          <h2 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-black text-ink-heading tracking-tight mb-5 leading-[1.08]">
            Pare de apenas assistir código.<br />
            <span className="bg-gradient-to-r from-ink-heading via-brand-purple-light to-brand-cyan-neon bg-clip-text text-transparent">
              Construa sistemas reais e destrave sua carreira.
            </span>
          </h2>

          <p className="font-sans text-sm sm:text-base text-ink-body leading-relaxed mb-8 max-w-xl">
            Crie sua conta gratuita e envie seu primeiro commit hoje mesmo. O mercado não contrata certificados de vídeo — ele contrata quem resolve problemas no código.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-sm sm:text-sm font-mono text-ink-body">
            <div className="flex items-center gap-2.5">
              <span className="text-brand-green-neon font-black text-base">✔</span>
              <span>Acesso imediato ao terminal</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-brand-green-neon font-black text-base">✔</span>
              <span>Desafios gratuitos do nível Iniciante</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-brand-green-neon font-black text-base">✔</span>
              <span>Sem necessidade de cartão</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-brand-green-neon font-black text-base">✔</span>
              <span>Git Real & Hash SHA-256</span>
            </div>
          </div>
        </div>

        {/* Direita: 5 cols (Cockpit Card de Ação) */}
        <div className="lg:col-span-5 w-full">
          <div className="p-8 rounded-2xl bg-background/95 border border-white/[0.1] shadow-2xl backdrop-blur-xl flex flex-col gap-5 text-center sm:text-left">
            <div className="flex items-center justify-between pb-4 border-b border-border-1">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-green-neon"></span>
                <span className="text-xs font-mono font-bold text-ink-heading uppercase">ARENA DE PRODUÇÃO</span>
              </div>
              {/* Sprint 7 (honestidade) — o badge de status ao vivo
                  saiu: claim sem fonte, igual ao selo removido do FAQ */}
            </div>

            <div>
              <div className="text-xs font-mono text-ink-span mb-1">PASSO INICIAL:</div>
              <div className="text-lg font-heading font-black text-ink-heading">Escolha seu Companion Inicial</div>
              <div className="text-body-sm text-ink-span font-sans mt-1">
                Pythox (Python), Scripty (TypeScript), Gopherus (Go) ou Rustor (Rust).
              </div>
            </div>

            <Link
              href="/onboarding"
              data-cta-id="final_primary"
              onClick={() => track('final_cta', 'final_primary')}
              className="w-full inline-flex items-center justify-center gap-3 px-8 py-4.5 rounded-2xl bg-brand-purple hover:bg-brand-purple-dark text-white font-heading font-black text-base transition-all duration-200 cursor-pointer active:scale-95 shadow-xl shadow-brand-purple/40 group"
            >
              <span>Começar grátis agora</span>
              <span className="group-hover:translate-x-1.5 transition-transform duration-200 text-lg font-black">→</span>
            </Link>

            <Link
              href="/game"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border-1 hover:border-brand-cyan-neon/40 text-body-sm font-mono text-ink-body hover:text-ink-heading transition-all"
            >
              <IconGamepad className="w-4 h-4" />
              <span>Ou jogue o Overworld 2D no navegador</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  </section>
      {/* FOOTER CLEAN, ESPAÇOSO E MINIMALISTA */}
  <footer className="relative z-10 border-t border-border-2 bg-background py-20 px-6 sm:px-12 overflow-hidden">
    {/* Linha laser superior minimalista */}
    <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-brand-purple/40 to-transparent"></div>

    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row justify-between gap-16 lg:gap-24">
        
        {/* Bloco da Marca & Proposta */}
        <div className="max-w-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-10 h-10 rounded-xl bg-surface-1 border border-border-2 flex items-center justify-center p-1.5 shadow-lg">
                <IconLogoMark />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-xl tracking-wider text-ink-heading">NEXUS</span>
                <span className="text-xs font-mono font-bold bg-brand-purple/20 text-brand-purple-light px-2 py-0.5 rounded border border-brand-purple/40 tracking-wider">
                  CODE
                </span>
              </div>
            </div>

            <p className="text-sm text-ink-span font-sans leading-relaxed mb-6">
              A plataforma definitiva para aprender programação na prática, escrevendo código real diretamente no navegador.
            </p>

            <div className="inline-flex items-center gap-2 text-xs font-mono text-ink-span">
              <span className="w-2 h-2 rounded-full bg-brand-green-neon"></span>
              <span>Sandbox Linux direto no navegador</span>
            </div>
          </div>

          {/* Redes Sociais — Sprint 7 (honestidade): só destinos reais.
              O GitHub aponta para o repositório real do produto; Discord
              e X saíram (não há comunidade nesses canais hoje) */}
          <div className="flex items-center gap-4 mt-8">
            <a href="https://github.com/augusto642/plataforma" target="_blank" rel="noopener noreferrer" className="text-ink-span hover:text-ink-heading transition-colors" aria-label="GitHub">
              <IconGithub className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Colunas Curadas de Navegação */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 sm:gap-16 flex-1 max-w-2xl">
          
          {/* Trilhas */}
          <div>
            <h4 className="text-body-sm font-mono font-bold uppercase tracking-wider text-ink-heading mb-4">
              Trilhas
            </h4>
            <ul className="space-y-3 text-sm font-sans">
              <li>
                <a href="#trilhas" className="text-ink-span hover:text-ink-heading transition-colors">
                  Lógica & Rust
                </a>
              </li>
              <li>
                <a href="#trilhas" className="text-ink-span hover:text-ink-heading transition-colors">
                  APIs com Go
                </a>
              </li>
              <li>
                <a href="#trilhas" className="text-ink-span hover:text-ink-heading transition-colors">
                  React & Next.js
                </a>
              </li>
              <li>
                <a href="#trilhas" className="text-ink-span hover:text-ink-heading transition-colors">
                  Python & IA
                </a>
              </li>
            </ul>
          </div>

          {/* Plataforma */}
          <div>
            <h4 className="text-body-sm font-mono font-bold uppercase tracking-wider text-ink-heading mb-4">
              Plataforma
            </h4>
            <ul className="space-y-3 text-sm font-sans">
              <li>
                <a href="/ide" className="text-ink-span hover:text-ink-heading transition-colors">
                  Web IDE
                </a>
              </li>
              <li>
                <a href="#sandbox" className="text-ink-span hover:text-ink-heading transition-colors">
                  Sandbox Linux
                </a>
              </li>
              <li>
                <a href="/leaderboard" className="text-ink-span hover:text-ink-heading transition-colors">
                  Leaderboard
                </a>
              </li>
              <li>
                <a href="/verify/check" className="text-ink-span hover:text-ink-heading transition-colors">
                  Certificados
                </a>
              </li>
            </ul>
          </div>

          {/* Acesso */}
          <div>
            <h4 className="text-body-sm font-mono font-bold uppercase tracking-wider text-ink-heading mb-4">
              Acesso
            </h4>
            <ul className="space-y-3 text-sm font-sans">
              <li>
                {/* Sprint 6 (D2 do QA) — o cadastro do rodapé ganha o
                    tratamento das demais superfícies de conta (botão com
                    borda da marca, como o secundário do Staff), não um
                    link de texto perdido entre os links comuns */}
                <a href="/register" data-cta-id="footer_register" onClick={() => track('nav_cta', 'footer_register')} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 -ml-3.5 rounded-lg border border-brand-purple/50 text-brand-purple-light hover:bg-brand-purple hover:text-white font-semibold transition-colors">
                  Começar grátis agora
                </a>
              </li>
              <li>
                <a href="/login" className="text-ink-span hover:text-ink-heading transition-colors">
                  Login
                </a>
              </li>
              <li>
                <a href="#precos" className="text-ink-span hover:text-ink-heading transition-colors">
                  Planos
                </a>
              </li>
              <li>
                <a href="#faq" className="text-ink-span hover:text-ink-heading transition-colors">
                  Dúvidas (FAQ)
                </a>
              </li>
            </ul>
          </div>

        </div>

      </div>

      {/* Faixa Inferior / Sub-footer */}
      <div className="pt-10 mt-16 border-t border-border-1/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-ink-span">
        <div>
          © 2026 NEXUS CODE. Todos os direitos reservados.
        </div>

        <div className="flex items-center gap-6">
          <a href="/termos" className="hover:text-ink-heading transition-colors">Termos</a>
          <a href="/privacidade" className="hover:text-ink-heading transition-colors">Privacidade</a>
          <a href="#hero" className="text-ink-body hover:text-ink-heading transition-colors flex items-center gap-1">
            Voltar ao topo ↑
          </a>
        </div>
      </div>
    </div>
  </footer>

      </div>
    </div>
  );
}
