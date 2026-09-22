'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Logo from './components/Logo';
import { HeroBattlePreview } from './components/landing/HeroBattlePreview';
import { LumiMascotHero } from './components/landing/LumiMascotHero';
import { TcgCardsShowcase } from './components/landing/TcgCardsShowcase';
import { NexusPillarsGrid } from './components/landing/NexusPillarsGrid';
import { ComparisonVersus } from './components/landing/ComparisonVersus';


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
    "<span class=\"text-[#C084FC] font-semibold\">def</span> <span class=\"text-[#38BDF8] font-bold\">two_sum_optimal</span>(<span class=\"text-[#E2E8F0]\">nums</span>: <span class=\"text-[#FBBF24]\">list</span>[<span class=\"text-[#FBBF24]\">int</span>], <span class=\"text-[#E2E8F0]\">target</span>: <span class=\"text-[#FBBF24]\">int</span>) -&gt; <span class=\"text-[#FBBF24]\">list</span>[<span class=\"text-[#FBBF24]\">int</span>]:",
    "    <span class=\"text-[#86EFAC] italic\">&quot;&quot;&quot;</span>",
    "    <span class=\"text-[#86EFAC] italic\">Encontra os índices de dois números que somam o target.</span>",
    "    <span class=\"text-[#86EFAC] italic\">Complexidade: O(N) tempo e O(N) espaço residente.</span>",
    "    <span class=\"text-[#86EFAC] italic\">&quot;&quot;&quot;</span>",
    "    <span class=\"text-[#E2E8F0]\">seen</span> = {}",
    "    <span class=\"text-[#C084FC] font-semibold\">for</span> <span class=\"text-[#E2E8F0]\">i</span>, <span class=\"text-[#E2E8F0]\">num</span> <span class=\"text-[#C084FC] font-semibold\">in</span> <span class=\"text-[#38BDF8]\">enumerate</span>(<span class=\"text-[#E2E8F0]\">nums</span>):",
    "        <span class=\"text-[#E2E8F0]\">diff</span> = <span class=\"text-[#E2E8F0]\">target</span> - <span class=\"text-[#E2E8F0]\">num</span>",
    "        <span class=\"text-[#C084FC] font-semibold\">if</span> <span class=\"text-[#E2E8F0]\">diff</span> <span class=\"text-[#C084FC] font-semibold\">in</span> <span class=\"text-[#E2E8F0]\">seen</span>:",
    "            <span class=\"text-[#C084FC] font-semibold\">return</span> [<span class=\"text-[#E2E8F0]\">seen</span>[<span class=\"text-[#E2E8F0]\">diff</span>], <span class=\"text-[#E2E8F0]\">i</span>]",
    "        <span class=\"text-[#E2E8F0]\">seen</span>[<span class=\"text-[#E2E8F0]\">num</span>] = <span class=\"text-[#E2E8F0]\">i</span>",
    "    <span class=\"text-[#C084FC] font-semibold\">return</span> []",
    "",
    "<span class=\"text-zinc-500 italic\"># Caso de teste com 10.000 elementos</span>",
    "<span class=\"text-[#C084FC] font-semibold\">import</span> <span class=\"text-[#E2E8F0]\">time</span>",
    "<span class=\"text-[#E2E8F0]\">start</span> = <span class=\"text-[#E2E8F0]\">time</span>.<span class=\"text-[#38BDF8]\">perf_counter</span>()",
    "<span class=\"text-[#E2E8F0]\">res</span> = <span class=\"text-[#38BDF8]\">two_sum_optimal</span>(<span class=\"text-[#FBBF24]\">list</span>(<span class=\"text-[#38BDF8]\">range</span>(<span class=\"text-[#FB923C]\">10000</span>)), <span class=\"text-[#FB923C]\">19997</span>)",
    "<span class=\"text-[#E2E8F0]\">elapsed</span> = (<span class=\"text-[#E2E8F0]\">time</span>.<span class=\"text-[#38BDF8]\">perf_counter</span>() - <span class=\"text-[#E2E8F0]\">start</span>) * <span class=\"text-[#FB923C]\">1000</span>",
    "<span class=\"text-[#38BDF8]\">print</span>(<span class=\"text-[#86EFAC]\">f&quot;Resultado: {res} | Tempo: {elapsed:.3f}ms&quot;</span>)"
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
    "<span class=\"text-[#C084FC] font-semibold\">pub struct</span> <span class=\"text-[#FBBF24] font-bold\">SlidingWindowLimiter</span> {",
    "    <span class=\"text-[#E2E8F0]\">capacity</span>: <span class=\"text-[#FBBF24]\">usize</span>,",
    "    <span class=\"text-[#E2E8F0]\">window_duration</span>: <span class=\"text-[#E2E8F0]\">std</span>::<span class=\"text-[#E2E8F0]\">time</span>::<span class=\"text-[#FBBF24]\">Duration</span>,",
    "    <span class=\"text-[#E2E8F0]\">events</span>: <span class=\"text-[#E2E8F0]\">std</span>::<span class=\"text-[#E2E8F0]\">collections</span>::<span class=\"text-[#FBBF24]\">BTreeMap</span>&lt;<span class=\"text-[#E2E8F0]\">std</span>::<span class=\"text-[#E2E8F0]\">time</span>::<span class=\"text-[#FBBF24]\">Instant</span>, <span class=\"text-[#FBBF24]\">usize</span>&gt;,",
    "}",
    "",
    "<span class=\"text-[#C084FC] font-semibold\">impl</span> <span class=\"text-[#FBBF24]\">SlidingWindowLimiter</span> {",
    "    <span class=\"text-[#C084FC] font-semibold\">pub fn</span> <span class=\"text-[#38BDF8] font-bold\">new</span>(<span class=\"text-[#E2E8F0]\">capacity</span>: <span class=\"text-[#FBBF24]\">usize</span>, <span class=\"text-[#E2E8F0]\">window</span>: <span class=\"text-[#E2E8F0]\">std</span>::<span class=\"text-[#E2E8F0]\">time</span>::<span class=\"text-[#FBBF24]\">Duration</span>) -&gt; <span class=\"text-[#FBBF24]\">Self</span> {",
    "        <span class=\"text-[#FBBF24]\">Self</span> {",
    "            <span class=\"text-[#E2E8F0]\">capacity</span>,",
    "            <span class=\"text-[#E2E8F0]\">window_duration</span>: <span class=\"text-[#E2E8F0]\">window</span>,",
    "            <span class=\"text-[#E2E8F0]\">events</span>: <span class=\"text-[#E2E8F0]\">std</span>::<span class=\"text-[#E2E8F0]\">collections</span>::<span class=\"text-[#FBBF24]\">BTreeMap</span>::<span class=\"text-[#38BDF8]\">new</span>(),",
    "        }",
    "    }",
    "",
    "    <span class=\"text-[#C084FC] font-semibold\">pub fn</span> <span class=\"text-[#38BDF8] font-bold\">allow</span>(&amp;<span class=\"text-[#C084FC]\">mut</span> <span class=\"text-[#C084FC]\">self</span>, <span class=\"text-[#E2E8F0]\">now</span>: <span class=\"text-[#E2E8F0]\">std</span>::<span class=\"text-[#E2E8F0]\">time</span>::<span class=\"text-[#FBBF24]\">Instant</span>) -&gt; <span class=\"text-[#FBBF24]\">bool</span> {",
    "        <span class=\"text-[#C084FC] font-semibold\">let</span> <span class=\"text-[#E2E8F0]\">cutoff</span> = <span class=\"text-[#E2E8F0]\">now</span>.<span class=\"text-[#38BDF8]\">saturating_sub</span>(<span class=\"text-[#C084FC]\">self</span>.<span class=\"text-[#E2E8F0]\">window_duration</span>);",
    "        <span class=\"text-[#C084FC]\">self</span>.<span class=\"text-[#E2E8F0]\">events</span>.<span class=\"text-[#38BDF8]\">retain</span>(|&amp;<span class=\"text-[#E2E8F0]\">time</span>, _| <span class=\"text-[#E2E8F0]\">time</span> &gt;= <span class=\"text-[#E2E8F0]\">cutoff</span>);",
    "        <span class=\"text-[#C084FC] font-semibold\">let</span> <span class=\"text-[#E2E8F0]\">count</span>: <span class=\"text-[#FBBF24]\">usize</span> = <span class=\"text-[#C084FC]\">self</span>.<span class=\"text-[#E2E8F0]\">events</span>.<span class=\"text-[#38BDF8]\">values</span>().<span class=\"text-[#38BDF8]\">sum</span>();",
    "        <span class=\"text-[#C084FC] font-semibold\">if</span> <span class=\"text-[#E2E8F0]\">count</span> &lt; <span class=\"text-[#C084FC]\">self</span>.<span class=\"text-[#E2E8F0]\">capacity</span> {",
    "            *<span class=\"text-[#C084FC]\">self</span>.<span class=\"text-[#E2E8F0]\">events</span>.<span class=\"text-[#38BDF8]\">entry</span>(<span class=\"text-[#E2E8F0]\">now</span>).<span class=\"text-[#38BDF8]\">or_insert</span>(<span class=\"text-[#FB923C]\">0</span>) += <span class=\"text-[#FB923C]\">1</span>;",
    "            <span class=\"text-[#C084FC] font-semibold\">true</span>",
    "        } <span class=\"text-[#C084FC] font-semibold\">else</span> {",
    "            <span class=\"text-[#C084FC] font-semibold\">false</span>",
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
    "<span class=\"text-[#C084FC] font-semibold\">package</span> <span class=\"text-[#E2E8F0]\">main</span>",
    "",
    "<span class=\"text-[#C084FC] font-semibold\">import</span> (",
    "    <span class=\"text-[#86EFAC]\">&quot;fmt&quot;</span>",
    "    <span class=\"text-[#86EFAC]\">&quot;time&quot;</span>",
    ")",
    "",
    "<span class=\"text-zinc-500 italic\">// Dispatcher gerencia fila de tarefas concorrentes</span>",
    "<span class=\"text-[#C084FC] font-semibold\">func</span> <span class=\"text-[#38BDF8] font-bold\">processJobs</span>(<span class=\"text-[#E2E8F0]\">jobCount</span> <span class=\"text-[#FBBF24]\">int</span>) <span class=\"text-[#FBBF24]\">int</span> {",
    "    <span class=\"text-[#E2E8F0]\">jobs</span> := <span class=\"text-[#38BDF8]\">make</span>(<span class=\"text-[#C084FC]\">chan</span> <span class=\"text-[#FBBF24]\">int</span>, <span class=\"text-[#E2E8F0]\">jobCount</span>)",
    "    <span class=\"text-[#E2E8F0]\">results</span> := <span class=\"text-[#38BDF8]\">make</span>(<span class=\"text-[#C084FC]\">chan</span> <span class=\"text-[#FBBF24]\">int</span>, <span class=\"text-[#E2E8F0]\">jobCount</span>)",
    "",
    "    <span class=\"text-zinc-500 italic\">// Sobe 3 workers concorrentes</span>",
    "    <span class=\"text-[#C084FC] font-semibold\">for</span> <span class=\"text-[#E2E8F0]\">w</span> := <span class=\"text-[#FB923C]\">1</span>; <span class=\"text-[#E2E8F0]\">w</span> &lt;= <span class=\"text-[#FB923C]\">3</span>; <span class=\"text-[#E2E8F0]\">w</span>++ {",
    "        <span class=\"text-[#C084FC] font-semibold\">go func</span>() {",
    "            <span class=\"text-[#C084FC] font-semibold\">for</span> <span class=\"text-[#E2E8F0]\">j</span> := <span class=\"text-[#C084FC]\">range</span> <span class=\"text-[#E2E8F0]\">jobs</span> {",
    "                <span class=\"text-[#E2E8F0]\">results</span> &lt;- <span class=\"text-[#E2E8F0]\">j</span> * <span class=\"text-[#FB923C]\">2</span>",
    "            }",
    "        }()",
    "    }",
    "",
    "    <span class=\"text-[#C084FC] font-semibold\">for</span> <span class=\"text-[#E2E8F0]\">j</span> := <span class=\"text-[#FB923C]\">1</span>; <span class=\"text-[#E2E8F0]\">j</span> &lt;= <span class=\"text-[#E2E8F0]\">jobCount</span>; <span class=\"text-[#E2E8F0]\">j</span>++ {",
    "        <span class=\"text-[#E2E8F0]\">jobs</span> &lt;- <span class=\"text-[#E2E8F0]\">j</span>",
    "    }",
    "    <span class=\"text-[#38BDF8]\">close</span>(<span class=\"text-[#E2E8F0]\">jobs</span>)",
    "",
    "    <span class=\"text-[#E2E8F0]\">sum</span> := <span class=\"text-[#FB923C]\">0</span>",
    "    <span class=\"text-[#C084FC] font-semibold\">for</span> <span class=\"text-[#E2E8F0]\">a</span> := <span class=\"text-[#FB923C]\">1</span>; <span class=\"text-[#E2E8F0]\">a</span> &lt;= <span class=\"text-[#E2E8F0]\">jobCount</span>; <span class=\"text-[#E2E8F0]\">a</span>++ {",
    "        <span class=\"text-[#E2E8F0]\">sum</span> += &lt;-<span class=\"text-[#E2E8F0]\">results</span>",
    "    }",
    "    <span class=\"text-[#C084FC] font-semibold\">return</span> <span class=\"text-[#E2E8F0]\">sum</span>",
    "}",
    "",
    "<span class=\"text-[#C084FC] font-semibold\">func</span> <span class=\"text-[#38BDF8] font-bold\">main</span>() {",
    "    <span class=\"text-[#E2E8F0]\">start</span> := <span class=\"text-[#E2E8F0]\">time</span>.<span class=\"text-[#38BDF8]\">Now</span>()",
    "    <span class=\"text-[#E2E8F0]\">total</span> := <span class=\"text-[#38BDF8]\">processJobs</span>(<span class=\"text-[#FB923C]\">50000</span>)",
    "    <span class=\"text-[#E2E8F0]\">fmt</span>.<span class=\"text-[#38BDF8]\">Printf</span>(<span class=\"text-[#86EFAC]\">&quot;Processados: %d itens | Tempo: %v\\n&quot;</span>, <span class=\"text-[#E2E8F0]\">total</span>, <span class=\"text-[#E2E8F0]\">time</span>.<span class=\"text-[#38BDF8]\">Since</span>(<span class=\"text-[#E2E8F0]\">start</span>))",
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
    setIsExecuting(true);
    setTerminalOutput('⏳ Executando código em container Linux isolado...');
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
    { label: 'Iniciar Cadastro Gratuito', href: '/register', icon: '⚡', category: 'Ações Rápidas' },
    { label: 'Abrir Terminal & Playground de Código', href: '/ide', icon: '💻', category: 'Ações Rápidas' },
    { label: 'Acessar Dashboard do Aluno', href: '/dashboard', icon: '📊', category: 'Navegação' },
    { label: 'Entrar na Minha Conta', href: '/login', icon: '🔑', category: 'Navegação' },
    { label: 'Trilha 1: Lógica de Programação & Alta Performance em Rust', href: '/register', icon: '🦀', category: 'Trilhas' },
    { label: 'Trilha 2: Criação de APIs & Backend Moderno em Go', href: '/register', icon: '🐹', category: 'Trilhas' },
    { label: 'Trilha 3: Desenvolvimento Web Completo com React & Next.js', href: '/register', icon: '⚡', category: 'Trilhas' },
    { label: 'Trilha 4: Python & Inteligência Artificial na Prática', href: '/register', icon: '🐍', category: 'Trilhas' },
    { label: 'Ver Planos & Preços', href: '#precos', icon: '💳', category: 'Navegação' },
  ];

  const filteredCommands = commandItems.filter((cmd) =>
    cmd.label.toLowerCase().includes(commandSearchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#050505] text-[#EDEDED] antialiased selection:bg-[#8257E5]/30 selection:text-[#996DFF] relative overflow-x-hidden font-sans">
      {/* AURAS & AMBIENT MESH DE FUNDO DARK OBSIDIAN LUXURY */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Glow Spheres Suaves em GPU */}
        <div className="pointer-events-none fixed top-[-10%] left-[12%] w-[700px] h-[700px] bg-[#8257E5]/15 rounded-full blur-[160px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="pointer-events-none fixed top-[25%] right-[2%] w-[600px] h-[600px] bg-[#00E5FF]/10 rounded-full blur-[170px] animate-pulse" style={{ animationDuration: '10s' }}></div>
        <div className="pointer-events-none fixed top-[60%] left-[-5%] w-[650px] h-[650px] bg-[#04D361]/12 rounded-full blur-[180px]"></div>
        <div className="pointer-events-none fixed bottom-[-10%] right-[10%] w-[750px] h-[750px] bg-[#8257E5]/12 rounded-full blur-[180px]"></div>
        <div className="pointer-events-none fixed top-[45%] left-[25%] w-[500px] h-[500px] bg-[#FFA116]/06 rounded-full blur-[190px]"></div>

        {/* Cyber Mesh Grid Micro-Matrix */}
        <div
          className="pointer-events-none fixed inset-0 opacity-[0.28]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.12) 1px, transparent 0)`,
            backgroundSize: '36px 36px',
          }}
        />

        {/* Ambient Top Light Beam */}
        <div
          className="pointer-events-none fixed top-0 inset-x-0 h-96 opacity-40"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 229, 255, 0.2), transparent 70%)',
          }}
        />
      </div>

      {/* 1. NAVBAR DARK OBSIDIAN LUXURY GLASS */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-2xl bg-[#030712]/80 border-b border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00E5FF]/30 to-transparent pointer-events-none"></div>

        <div className="w-full px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between">
          {/* Logo Oficial na Esquerda com tema Dark */}
          <div className="flex items-center gap-4 shrink-0">
            <Logo size="lg" theme="dark" href="/" />
            <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#04D361] animate-pulse"></span>
              1.480 ONLINE
            </span>
          </div>

          {/* Navegação Central com maior espaçamento */}
          <nav className="hidden md:flex items-center justify-center gap-6 lg:gap-8 xl:gap-10 text-[15px] font-semibold text-zinc-300">
            <Link href="/game" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-[#00E5FF] font-bold">
              <span>🎮</span>
              <span>Modo RPG 2D</span>
            </Link>
            <Link href="/onboarding" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 text-emerald-400 font-bold">
              <span>✨</span>
              <span>Criar Avatar</span>
            </Link>
            <a href="#colecionaveis" className="hover:text-white transition-colors">Cards TCG</a>
            <a href="#trilhas" className="hover:text-white transition-colors">Trilhas</a>
            <a href="#sandbox" className="hover:text-white transition-colors flex items-center gap-2">
              <span>Terminal Prático</span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.05] text-[#00E5FF] border border-white/10 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#04D361] animate-pulse"></span>
                IDE
              </span>
            </a>
            <a href="#precos" className="hover:text-white transition-colors">Planos</a>
            <a href="#faq" className="hover:text-white transition-colors">Dúvidas</a>
          </nav>

          {/* Botões do Navbar na Direita */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/login" className="text-sm font-semibold text-zinc-300 hover:text-white px-3 py-2 transition-colors">
              Entrar
            </Link>

            <Link 
              href="/onboarding" 
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#04D361] to-[#00E58F] text-black text-xs sm:text-sm font-heading font-black tracking-tight transition-all duration-200 cursor-pointer active:scale-95 shadow-[0_0_25px_rgba(4,211,97,0.35)] hover:shadow-[0_0_35px_rgba(4,211,97,0.5)] group"
            >
              <span>Começar Grátis</span>
              <span className="group-hover:translate-x-1 transition-transform font-bold">→</span>
            </Link>


            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 rounded-xl text-zinc-400 hover:text-white bg-[#121217] border border-zinc-800 md:hidden transition-colors"
              aria-label="Menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isMobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800 px-6 py-5 bg-[#0E0E12]/95 backdrop-blur-xl shadow-2xl flex flex-col gap-3 animate-fadeIn">
            <a href="#trilhas" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-zinc-300 hover:text-white py-2">
              4 Trilhas Práticas
            </a>
            <a href="#metodologia" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-zinc-300 hover:text-white py-2">
              Como Funciona
            </a>
            <a href="#sandbox" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-zinc-300 hover:text-white py-2 flex items-center justify-between">
              <span>Terminal Interativo</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#8257E5]/15 text-[#996DFF] border border-[#8257E5]/30">IDE</span>
            </a>
            <a href="#precos" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-zinc-300 hover:text-white py-2">
              Planos & Preços
            </a>
            <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-zinc-300 hover:text-white py-2">
              Perguntas Frequentes
            </a>
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-xs font-semibold text-zinc-300 hover:text-white py-2">
                Entrar
              </Link>
              <Link href="/register" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-2 rounded-xl bg-[#8257E5] text-white text-xs font-bold shadow-md">
                Criar Conta Grátis
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
            className="w-full max-w-xl bg-[#0E0E12] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-800 flex items-center gap-3 bg-[#121217]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8257E5" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                autoFocus
                placeholder="Digite o que procura (ex: Python, Rust, Go, Terminal, Entrar)..."
                value={commandSearchQuery}
                onChange={(e) => setCommandSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none font-sans"
              />
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(false)}
                className="text-xs text-zinc-400 hover:text-white font-mono px-2 py-1 rounded bg-zinc-800/80 cursor-pointer"
              >
                ESC
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 divide-y divide-zinc-800/60">
              {filteredCommands.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500">
                  Nenhum resultado encontrado para "{commandSearchQuery}".
                </div>
              ) : (
                filteredCommands.map((cmd, i) => (
                  <Link
                    key={i}
                    href={cmd.href}
                    onClick={() => setIsCommandPaletteOpen(false)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-[#181820] text-xs text-zinc-300 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{cmd.icon}</span>
                      <div>
                        <div className="font-semibold text-white group-hover:text-[#996DFF] transition-colors">{cmd.label}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{cmd.category}</div>
                      </div>
                    </div>
                    <span className="text-zinc-500 group-hover:text-[#04D361] font-mono text-xs">
                      Ir →
                    </span>
                  </Link>
                ))
              )}
            </div>

            <div className="p-3 bg-[#0A0A0E] border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between font-mono">
              <span>Navegue com ↑ ↓ e pressione Enter</span>
              <span className="text-zinc-400">NEXUS CODE v2.4</span>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div id="main-content">
{/* 2. HERO SECTION: ASYMMETRIC DUAL-REALITY COCKPIT */}
  <section id="hero" className="relative z-10 pt-10 sm:pt-14 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
      
      {/* COLUNA ESQUERDA: NARRATIVA & AÇÃO (6 COLS) */}
      <div className="lg:col-span-6 text-left">
        {/* EYEBROW TAG */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B1021]/90 border border-[#00E5FF]/40 text-[#00E5FF] text-[11px] font-mono font-bold mb-6 shadow-[0_0_20px_rgba(0,229,255,0.2)] backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#04D361] animate-pulse"></span>
          <span>⚔️ O PRIMEIRO RPG TÁTICO DE ENGENHARIA DE SOFTWARE</span>
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <span className="text-purple-300 hidden sm:inline">DO ZERO A STAFF ARCHITECT</span>
        </div>

        {/* HEADLINE H1 ESCULPIDA DE ALTO IMPACTO */}
        <h1 className="font-heading text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight text-white leading-[1.08] mb-6">
          Domine Engenharia de Software
          <span className="bg-gradient-to-r from-white via-[#00E5FF] to-[#04D361] bg-clip-text text-transparent block mt-1.5">
            Jogando um RPG de Verdade.
          </span>
        </h1>

        {/* SUBHEADLINE NARRATIVA (CRO & PRODUCT POSITIONING) */}
        <p className="font-sans text-base sm:text-lg text-zinc-300 leading-relaxed mb-8 max-w-xl">
          Esqueça centenas de horas de videoaulas passivas para travar no primeiro terminal em branco.
          Na <strong className="text-white">NEXUS CODE</strong>, você aprende construindo: explore masmorras em Pixel Art,
          vença bugs de concorrência e memória em <strong className="text-[#00E5FF]">duelos de código real</strong> guiado pela mentora socrática <strong className="text-[#A78BFA]">Lumi</strong>,
          colecione cards holográficos 3D e gere um <strong className="text-[#04D361]">portfólio no Git com hash SHA-256</strong>.
        </p>

        {/* ACTION CLUSTER DE ALTA CONVERSÃO */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-7">
          <Link
            href="/onboarding"
            className="group inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl bg-gradient-to-r from-[#04D361] to-[#00E58F] hover:from-[#00E58F] hover:to-[#04D361] text-black text-sm sm:text-base font-heading font-black tracking-tight transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_35px_-5px_rgba(4,211,97,0.45)] cursor-pointer"
          >
            <span>⚡ Criar Personagem & Começar Grátis</span>
            <span className="group-hover:translate-x-1.5 transition-transform duration-200 font-bold">→</span>
          </Link>

          <a
            href="#batalha-demo"
            className="group inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#00E5FF]/60 text-white font-heading font-bold text-sm sm:text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>🎮 Testar Duelo ao Vivo</span>
          </a>
        </div>

        {/* MICRO-GATILHOS DE ALTA CONVERSÃO EM GRID */}
        <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs font-mono text-zinc-300 mb-8 max-w-lg">
          <div className="flex items-center gap-2">
            <span className="text-[#04D361] font-black">✔</span>
            <span>100% no navegador (zero setup)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#04D361] font-black">✔</span>
            <span>Duelos com compilador real</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#04D361] font-black">✔</span>
            <span>Sem cartão de crédito</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#04D361] font-black">✔</span>
            <span>Portfólio verificado no Git</span>
          </div>
        </div>

        {/* PROVA SOCIAL AO VIVO NA ESQUERDA */}
        <div className="inline-flex items-center gap-3.5 px-4 py-2.5 rounded-2xl bg-[#0E0E12]/90 border border-white/[0.08] shadow-2xl backdrop-blur-md">
          <div className="flex -space-x-2 overflow-hidden">
            <div className="inline-flex items-center justify-center h-7 w-7 rounded-full ring-2 ring-zinc-900 bg-[#8257E5] text-[9px] font-bold font-mono text-white">RS</div>
            <div className="inline-flex items-center justify-center h-7 w-7 rounded-full ring-2 ring-zinc-900 bg-[#00E5FF] text-[9px] font-black font-mono text-black">GO</div>
            <div className="inline-flex items-center justify-center h-7 w-7 rounded-full ring-2 ring-zinc-900 bg-[#04D361] text-[9px] font-black font-mono text-black">TS</div>
            <div className="inline-flex items-center justify-center h-7 w-7 rounded-full ring-2 ring-zinc-900 bg-[#FFA116] text-[9px] font-black font-mono text-black">PY</div>
          </div>
          <div className="text-left font-mono">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>+14.800 desenvolvedores na arena</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#04D361] animate-pulse"></span>
            </div>
            <div className="text-[10px] text-zinc-400">142k+ bugs expurgados em produção • 99.98% uptime</div>
          </div>
        </div>
      </div>

      {/* COLUNA DIREITA: O SIMULADOR INTERATIVO NO PRIMEIRO FOLD (6 COLS) */}
      <div id="batalha-demo" className="lg:col-span-6 w-full">
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-[11px] font-mono text-[#00E5FF] uppercase tracking-widest font-black flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-ping" />
            DUELO TÁTICO LIVE // TESTE EM 1 CLIQUE
          </span>
          <span className="text-[10px] font-mono text-zinc-400 font-semibold">ZERO CADASTRO NECESSÁRIO</span>
        </div>
        <HeroBattlePreview />
      </div>

    </div>

    {/* DEMONSTRAÇÃO DO MASCOTE LUMI COM TUTORIA SOCRÁTICA */}
    <LumiMascotHero />

  </section>


  {/* SHOWCASE DOS CARDS TCG HOLOGRÁFICOS 3D */}
  <TcgCardsShowcase />

  {/* OS 4 PILARES DA NEXUS CODE (GRID BENTO) */}
  <NexusPillarsGrid />

  {/* O COMPARATIVO BRUTAL: VELHO MUNDO VS ARENA NEXUS */}
  <ComparisonVersus />

  {/* TRUST BANNER: INFRAESTRUTURA DE MISSÃO CRÍTICA & PILHAS BIG TECH (ASYMMETRIC SPLIT) */}
  <section className="relative py-16 border-y border-white/[0.08] bg-white/[0.01]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Coluna Esquerda: Contexto de Engenharia */}
        <div className="lg:col-span-4 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-cyan-400 text-[11px] font-mono mb-3">
            <span>🛡️</span>
            <span>STACK DE ENGENHARIA</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight mb-3">
            Tecnologias de Missão Crítica
          </h3>
          <p className="text-xs sm:text-sm font-sans text-zinc-400 leading-relaxed">
            Sem simulações simplórias. Você constrói soluções nas mesmas linguagens compiladas e runtimes isolados que sustentam a infraestrutura moderna de Big Techs.
          </p>
        </div>

        {/* Coluna Direita: Grid de Tecnologias Distribuído */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          <div className="p-3.5 rounded-2xl bg-[#080D1F] border border-white/[0.08] hover:border-amber-500/50 flex items-center gap-3 transition-all group">
            <span className="text-2xl group-hover:scale-110 transition-transform">🦀</span>
            <div className="text-left font-mono">
              <div className="text-xs font-bold text-white">Rust 1.78</div>
              <div className="text-[10px] text-zinc-500">Zero-Cost Memory</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#080D1F] border border-white/[0.08] hover:border-cyan-500/50 flex items-center gap-3 transition-all group">
            <span className="text-2xl group-hover:scale-110 transition-transform">🐹</span>
            <div className="text-left font-mono">
              <div className="text-xs font-bold text-white">Go 1.22</div>
              <div className="text-[10px] text-zinc-500">Goroutines P99</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#080D1F] border border-white/[0.08] hover:border-blue-500/50 flex items-center gap-3 transition-all group">
            <span className="text-2xl group-hover:scale-110 transition-transform">⚡</span>
            <div className="text-left font-mono">
              <div className="text-xs font-bold text-white">TypeScript 5.4</div>
              <div className="text-[10px] text-zinc-500">Type Soundness</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#080D1F] border border-white/[0.08] hover:border-yellow-500/50 flex items-center gap-3 transition-all group">
            <span className="text-2xl group-hover:scale-110 transition-transform">🐍</span>
            <div className="text-left font-mono">
              <div className="text-xs font-bold text-white">Python 3.12</div>
              <div className="text-[10px] text-zinc-500">IA & RAG Pipelines</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#080D1F] border border-white/[0.08] hover:border-rose-500/50 flex items-center gap-3 transition-all group">
            <span className="text-2xl group-hover:scale-110 transition-transform">🐧</span>
            <div className="text-left font-mono">
              <div className="text-xs font-bold text-white">Linux cgroups-v2</div>
              <div className="text-[10px] text-zinc-500">Containers 512MB</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#080D1F] border border-white/[0.08] hover:border-emerald-500/50 flex items-center gap-3 transition-all group">
            <span className="text-2xl group-hover:scale-110 transition-transform">🐙</span>
            <div className="text-left font-mono">
              <div className="text-xs font-bold text-white">Gitea Git Real</div>
              <div className="text-[10px] text-zinc-500">Hash SHA-256</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>


  {/* 3. TRILHAS: DO ZERO AO AVANÇADO NA MESMA ORDEM DE CORES DE PAGE.TSX */}
  {/* 1: Rust (Âmbar) | 2: Go (Ciano) | 3: Next.js (Esmeralda) | 4: Python/IA (Roxo) */}
  <section id="trilhas" className="relative z-10 py-24 border-t border-[#27272A]/70">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14 px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto">
      <div className="max-w-2xl text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold mb-3">
          <span>🗺️</span>
          <span>CURRÍCULO & SKILL TREES PRÁTICAS</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-white tracking-tight mb-4">
          Trilhas do Zero ao Profissional
        </h2>
        <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-sans">
          Aprenda a programar resolvendo desafios práticos, do seu primeiro comando até a construção de sistemas distribuídos completos. Sem aulas maçantes — aqui você aprende codificando.
        </p>
      </div>

      <div className="hidden lg:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-zinc-300">
        <span>Arraste para explorar as 4 trilhas</span>
        <span className="text-[#00E5FF] font-bold">→</span>
      </div>
    </div>


    {/* CARROSSEL HORIZONTAL COM SCROLL SNAP (10% À ESQUERDA) */}
    <div className="relative">
      {/* Sombra fade esquerda */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-20 z-10 bg-gradient-to-r from-[#050505] to-transparent" />
      {/* Sombra fade direita */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-16 z-10 bg-gradient-to-l from-[#050505] to-transparent" />

      <div
        className="flex gap-6 overflow-x-auto scroll-smooth pb-6 pl-[10%] pr-12"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >

        {/* TRILHA 1: Rust — Lógica & Alta Performance */}
        <article
          className="group relative flex flex-col justify-between bg-[#121217] border border-[#262630] hover:border-amber-500/60 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-12px_rgba(245,158,11,0.25)] shrink-0 w-[338px]"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div>
            {/* Capa com Imagem Vetorial Rust */}
            <div className="relative h-36 w-full rounded-xl overflow-hidden bg-[#150D0A] border border-white/5 mb-4 flex items-center justify-center select-none group-hover:border-amber-500/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute -top-8 -right-8 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/30 transition-all duration-500" />
              <div className="relative z-10 w-20 h-20 rounded-xl bg-[#121217]/90 border border-amber-500/30 flex items-center justify-center p-2 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <svg viewBox="0 0 80 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="4" width="72" height="72" rx="14" fill="#120A07" stroke="#27272A" strokeWidth="1.5" />
                  <g transform="translate(40, 40)">
                    <path d="M-5 -20H5L3 -16H-3L-5 -20Z" fill="#FFA116" />
                    <path d="M-5 20H5L3 16H-3L-5 20Z" fill="#FFA116" />
                    <path d="M-20 -5V5L-16 3V-3L-20 -5Z" fill="#FFA116" />
                    <path d="M20 -5V5L16 3V-3L20 -5Z" fill="#FFA116" />
                    <circle cx="0" cy="0" r="16" fill="#181820" stroke="#FFA116" strokeWidth="1.8" />
                    <circle cx="0" cy="0" r="12" fill="#121217" stroke="#27272A" strokeWidth="1" />
                    <path d="M0 -9L9 -4V2C9 7 4.5 11 0 13C-4.5 11 -9 7 -9 2V-4L0 -9Z" fill="#8257E5" />
                    <text x="0" y="4" fontFamily="'JetBrains Mono', monospace" fontSize="10" fontWeight="900" fill="#FFFFFF" textAnchor="middle">R</text>
                  </g>
                  <circle cx="20" cy="20" r="2.5" fill="#FFA116" />
                  <circle cx="60" cy="60" r="2.5" fill="#8257E5" />
                </svg>
              </div>
            </div>

            {/* Título & Especialidade */}
            <h3 className="text-base font-heading font-bold text-white tracking-tight group-hover:text-amber-400 transition-colors mb-1">
              Programação do Zero com Rust
            </h3>
            <p className="text-xs text-amber-400/80 font-mono mb-2">Lógica • Algoritmos • Alta Performance</p>

            {/* Informações Relevantes (Horas, Desafios, Avaliação e Alunos) */}
            <div className="flex items-center gap-2.5 text-[11px] font-mono text-zinc-400 mb-3">
              <span className="flex items-center gap-1"><span className="text-amber-400">★</span> 4.9</span>
              <span>•</span>
              <span>3.200 alunos</span>
              <span>•</span>
              <span>48h</span>
              <span>•</span>
              <span>32 desafios</span>
            </div>

            {/* Resumo do Curso */}
            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-4 font-sans">
              Do primeiro <code className="text-amber-400 bg-amber-500/10 px-1 rounded">println!</code> à resolução de problemas reais. Aprenda a pensar como programador e a escrever códigos rápidos e sem erros de memória.
            </p>

            {/* Tecnologias & Conteúdos-Chave */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="bg-[#181820] border border-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded-md">Lógica do Zero</span>
              <span className="bg-[#181820] border border-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded-md">Algoritmos</span>
              <span className="bg-[#181820] border border-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded-md">Rust 2024</span>
              <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded-md">Memory Safety</span>
            </div>
          </div>

          {/* Rodapé: Nível e CTA */}
          <div className="pt-3.5 border-t border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-xs font-mono text-zinc-400">Do Zero ao Avançado</span>
            </div>
            <Link href="/register" className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#181820] hover:bg-amber-500 hover:text-black text-zinc-200 text-xs font-mono font-bold transition-all duration-200 active:scale-95 border border-[#27272A] hover:border-amber-400">
              <span>Começar →</span>
            </Link>
          </div>
        </article>

        {/* TRILHA 2: Go — APIs & Backend Moderno */}
        <article
          className="group relative flex flex-col justify-between bg-[#121217] border border-[#262630] hover:border-[#00E5FF]/60 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-12px_rgba(0,229,255,0.25)] shrink-0 w-[338px]"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div>
            {/* Capa com Imagem Vetorial Go */}
            <div className="relative h-36 w-full rounded-xl overflow-hidden bg-[#0A1118] border border-white/5 mb-4 flex items-center justify-center select-none group-hover:border-[#00E5FF]/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-[#00E5FF]/10 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute -top-8 -right-8 w-36 h-36 bg-[#00E5FF]/20 rounded-full blur-2xl pointer-events-none group-hover:bg-[#00E5FF]/30 transition-all duration-500" />
              <div className="relative z-10 w-20 h-20 rounded-xl bg-[#121217]/90 border border-[#00E5FF]/30 flex items-center justify-center p-2 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <svg viewBox="0 0 80 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="4" width="72" height="72" rx="14" fill="#081017" stroke="#27272A" strokeWidth="1.5" />
                  <g stroke="#00E5FF" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 26H36L44 34H62" strokeDasharray="4 2" stroke="#00E5FF" strokeOpacity="0.7" />
                    <path d="M18 40H62" strokeWidth="3" stroke="#00E5FF" />
                    <path d="M18 54H36L44 46H62" strokeDasharray="4 2" stroke="#00ADD8" strokeOpacity="0.7" />
                  </g>
                  <circle cx="24" cy="40" r="4.5" fill="#00E5FF" />
                  <circle cx="24" cy="40" r="2" fill="#FFFFFF" />
                  <circle cx="40" cy="40" r="5" fill="#0070F3" stroke="#00E5FF" strokeWidth="1.5" />
                  <circle cx="56" cy="40" r="4.5" fill="#04D361" />
                  <circle cx="56" cy="40" r="2" fill="#FFFFFF" />
                  <path d="M46 22L52 26L46 30" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M46 50L52 54L46 58" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Título & Especialidade */}
            <h3 className="text-base font-heading font-bold text-white tracking-tight group-hover:text-[#00E5FF] transition-colors mb-1">
              APIs & Servidores Web com Go
            </h3>
            <p className="text-xs text-[#00E5FF]/80 font-mono mb-2">REST • Banco de Dados • Microsserviços</p>

            {/* Informações Relevantes */}
            <div className="flex items-center gap-2.5 text-[11px] font-mono text-zinc-400 mb-3">
              <span className="flex items-center gap-1"><span className="text-[#00E5FF]">★</span> 4.8</span>
              <span>•</span>
              <span>2.800 alunos</span>
              <span>•</span>
              <span>42h</span>
              <span>•</span>
              <span>28 desafios</span>
            </div>

            {/* Resumo do Curso */}
            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-4 font-sans">
              Construa o backend que move gigantes da tecnologia. Crie rotas HTTP ultra rápidas, conecte bancos de dados PostgreSQL e faça deploys reais de microsserviços.
            </p>

            {/* Tecnologias & Conteúdos-Chave */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="bg-[#181820] border border-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded-md">REST APIs</span>
              <span className="bg-[#181820] border border-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded-md">PostgreSQL</span>
              <span className="bg-[#181820] border border-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded-md">Docker</span>
              <span className="bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-[10px] font-mono px-2 py-0.5 rounded-md">Go 1.22</span>
            </div>
          </div>

          {/* Rodapé: Nível e CTA */}
          <div className="pt-3.5 border-t border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF]"></span>
              <span className="text-xs font-mono text-zinc-400">Intermediário</span>
            </div>
            <Link href="/register" className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#181820] hover:bg-[#00E5FF] hover:text-black text-zinc-200 text-xs font-mono font-bold transition-all duration-200 active:scale-95 border border-[#27272A] hover:border-[#00E5FF]">
              <span>Começar →</span>
            </Link>
          </div>
        </article>

        {/* TRILHA 3: React & Next.js — Desenvolvimento Web */}
        <article
          className="group relative flex flex-col justify-between bg-[#121217] border border-[#262630] hover:border-emerald-500/60 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-12px_rgba(4,211,97,0.25)] shrink-0 w-[338px]"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div>
            {/* Capa com Imagem Vetorial Next.js */}
            <div className="relative h-36 w-full rounded-xl overflow-hidden bg-[#0B120E] border border-white/5 mb-4 flex items-center justify-center select-none group-hover:border-emerald-500/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute -top-8 -right-8 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/30 transition-all duration-500" />
              <div className="relative z-10 w-20 h-20 rounded-xl bg-[#121217]/90 border border-emerald-500/30 flex items-center justify-center p-2 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <svg viewBox="0 0 80 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="4" width="72" height="72" rx="14" fill="#10101A" stroke="#27272A" strokeWidth="1.5" />
                  <rect x="16" y="18" width="48" height="30" rx="6" fill="#12121A" stroke="#04D361" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.7" />
                  <rect x="18" y="21" width="16" height="15" rx="3" fill="#04D361" fillOpacity="0.25" stroke="#04D361" strokeWidth="1" />
                  <text x="26" y="32" fontFamily="'JetBrains Mono', monospace" fontSize="8" fontWeight="800" fill="#04D361" textAnchor="middle">TS</text>
                  <ellipse cx="49" cy="29" rx="11" ry="4.5" transform="rotate(30 49 29)" stroke="#04D361" strokeWidth="1.2" strokeOpacity="0.8" />
                  <ellipse cx="49" cy="29" rx="11" ry="4.5" transform="rotate(-30 49 29)" stroke="#00E5FF" strokeWidth="1.2" strokeOpacity="0.8" />
                  <circle cx="49" cy="29" r="2.5" fill="#04D361" />
                  <path d="M28 48L40 55L52 48" stroke="#04D361" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="40" cy="55" r="3" fill="#04D361" stroke="#FFFFFF" strokeWidth="1" />
                  <path d="M40 55V61" stroke="#04D361" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Título & Especialidade */}
            <h3 className="text-base font-heading font-bold text-white tracking-tight group-hover:text-emerald-400 transition-colors mb-1">
              Desenvolvimento Web com React & Next.js
            </h3>
            <p className="text-xs text-emerald-400/80 font-mono mb-2">Frontend • TypeScript • Interfaces Modernas</p>

            {/* Informações Relevantes */}
            <div className="flex items-center gap-2.5 text-[11px] font-mono text-zinc-400 mb-3">
              <span className="flex items-center gap-1"><span className="text-emerald-400">★</span> 4.9</span>
              <span>•</span>
              <span>4.100 alunos</span>
              <span>•</span>
              <span>36h</span>
              <span>•</span>
              <span>24 desafios</span>
            </div>

            {/* Resumo do Curso */}
            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-4 font-sans">
              Crie sites modernos, interativos e rápidos com as ferramentas usadas por startups unicórnio. Aprenda TypeScript, Tailwind e Next.js criando produtos reais.
            </p>

            {/* Tecnologias & Conteúdos-Chave */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="bg-[#181820] border border-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded-md">React 18</span>
              <span className="bg-[#181820] border border-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded-md">Next.js 14</span>
              <span className="bg-[#181820] border border-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded-md">TypeScript</span>
              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-md">Tailwind CSS</span>
            </div>
          </div>

          {/* Rodapé: Nível e CTA */}
          <div className="pt-3.5 border-t border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-xs font-mono text-zinc-400">Do Zero ao Deploy</span>
            </div>
            <Link href="/register" className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#181820] hover:bg-emerald-500 hover:text-black text-zinc-200 text-xs font-mono font-bold transition-all duration-200 active:scale-95 border border-[#27272A] hover:border-emerald-400">
              <span>Começar →</span>
            </Link>
          </div>
        </article>

        {/* TRILHA 4: Python & Inteligência Artificial */}
        <article
          className="group relative flex flex-col justify-between bg-[#121217] border border-[#262630] hover:border-[#8257E5]/60 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-12px_rgba(130,87,229,0.25)] shrink-0 w-[338px]"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div>
            {/* Capa com Imagem Vetorial Python IA */}
            <div className="relative h-36 w-full rounded-xl overflow-hidden bg-[#120E18] border border-white/5 mb-4 flex items-center justify-center select-none group-hover:border-[#8257E5]/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-[#8257E5]/10 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute -top-8 -right-8 w-36 h-36 bg-[#8257E5]/20 rounded-full blur-2xl pointer-events-none group-hover:bg-[#8257E5]/30 transition-all duration-500" />
              <div className="relative z-10 w-20 h-20 rounded-xl bg-[#121217]/90 border border-[#8257E5]/30 flex items-center justify-center p-2 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <svg viewBox="0 0 80 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="4" width="72" height="72" rx="14" fill="#0B120E" stroke="#27272A" strokeWidth="1.5" />
                  <g stroke="#8257E5" strokeWidth="1.2" strokeOpacity="0.5">
                    <line x1="24" y1="28" x2="40" y2="20" />
                    <line x1="24" y1="28" x2="40" y2="38" />
                    <line x1="24" y1="52" x2="40" y2="38" />
                    <line x1="24" y1="52" x2="40" y2="58" />
                    <line x1="40" y1="20" x2="56" y2="36" />
                    <line x1="40" y1="38" x2="56" y2="36" />
                    <line x1="40" y1="58" x2="56" y2="44" />
                  </g>
                  <circle cx="24" cy="28" r="4" fill="#121217" stroke="#996DFF" strokeWidth="2" />
                  <circle cx="24" cy="52" r="4" fill="#121217" stroke="#996DFF" strokeWidth="2" />
                  <circle cx="40" cy="20" r="4.5" fill="#121217" stroke="#8257E5" strokeWidth="2" />
                  <circle cx="40" cy="38" r="5" fill="#8257E5" />
                  <circle cx="40" cy="58" r="4.5" fill="#121217" stroke="#8257E5" strokeWidth="2" />
                  <circle cx="56" cy="40" r="5.5" fill="#FFA116" />
                  <circle cx="56" cy="40" r="2" fill="#FFFFFF" />
                  <path d="M22 64C28 60 34 68 40 64C46 60 52 68 58 64" stroke="#8257E5" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Título & Especialidade */}
            <h3 className="text-base font-heading font-bold text-white tracking-tight group-hover:text-[#996DFF] transition-colors mb-1">
              Python & IA — Do Zero ao Agente Inteligente
            </h3>
            <p className="text-xs text-[#996DFF]/80 font-mono mb-2">Python • Machine Learning • Automações</p>

            {/* Informações Relevantes */}
            <div className="flex items-center gap-2.5 text-[11px] font-mono text-zinc-400 mb-3">
              <span className="flex items-center gap-1"><span className="text-[#996DFF]">★</span> 4.8</span>
              <span>•</span>
              <span>3.600 alunos</span>
              <span>•</span>
              <span>40h</span>
              <span>•</span>
              <span>30 desafios</span>
            </div>

            {/* Resumo do Curso */}
            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-4 font-sans">
              Comece com scripts básicos em Python e avance até criar agentes autônomos com LLMs que leem arquivos, resolvem tarefas e integram APIs inteligentes.
            </p>

            {/* Tecnologias & Conteúdos-Chave */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="bg-[#181820] border border-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded-md">Python 3.12</span>
              <span className="bg-[#181820] border border-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded-md">OpenAI API</span>
              <span className="bg-[#181820] border border-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded-md">LangChain</span>
              <span className="bg-[#8257E5]/10 border border-[#8257E5]/30 text-[#996DFF] text-[10px] font-mono px-2 py-0.5 rounded-md">Automações</span>
            </div>
          </div>

          {/* Rodapé: Nível e CTA */}
          <div className="pt-3.5 border-t border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#8257E5]"></span>
              <span className="text-xs font-mono text-zinc-400">Do Zero ao Avançado</span>
            </div>
            <Link href="/register" className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#8257E5] text-white text-xs font-bold transition-all duration-200 active:scale-95 shadow-sm">
              <span>Começar →</span>
            </Link>
          </div>
        </article>

      </div>

      {/* Indicadores de navegação (dots) */}
      <div className="flex items-center justify-center gap-2 mt-6">
        <span className="w-6 h-1.5 rounded-full bg-amber-400"></span>
        <span className="w-2 h-1.5 rounded-full bg-zinc-600"></span>
        <span className="w-2 h-1.5 rounded-full bg-zinc-600"></span>
        <span className="w-2 h-1.5 rounded-full bg-zinc-600"></span>
      </div>
    </div>
  </section>



  {/* 4. METODOLOGIA COM LASER BEAMS NA ORDEM EXATA (#8257E5, #00E5FF, #04D361) */}
  <section id="metodologia" className="relative z-10 py-24 px-6 sm:px-8 max-w-7xl mx-auto border-t border-[#27272A]/70">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16">
      <div className="max-w-2xl text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold mb-3">
          <span>🧠</span>
          <span>CIÊNCIA COGNITIVA // APRENDIZADO ATIVO</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-white tracking-tight mb-4">
          Como Você Aprende de Verdade
        </h2>
        <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-sans">
          O cérebro humano retém até 84% a mais quando é forçado a depurar código real em vez de assistir aulas passivas. Combinamos feedback determinístico de testes com tutoria socrática.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2 text-xs font-mono">
        <div className="px-4 py-2 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-300 font-bold flex items-center gap-2">
          <span>🎯</span>
          <span>TAXONOMIA DE BLOOM: NÍVEIS 1 A 5</span>
        </div>
        <span className="text-[11px] text-zinc-400">RETENÇÃO BASEADA EM FEEDBACK IMEDIATO</span>
      </div>
    </div>

    {/* 3 ETAPAS DA JORNADA NAS CORES (#8257E5 -> #00E5FF -> #04D361) */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* 01: Roxo (#8257E5) */}
      <div className="p-7 rounded-2xl bg-[#121217] border border-[#262630] relative flex flex-col justify-between">
        <div className="top-laser-beam" style={{ background: '#8257E5' }}></div>
        <div>
          <div className="w-12 h-12 rounded-xl bg-[#09090C] border border-[#27272A] flex items-center justify-center font-mono font-bold text-lg text-[#996DFF] mb-5">
            01
          </div>
          <h3 className="text-lg font-heading font-bold text-white mb-2.5">Desafios Práticos do Mundo Real</h3>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
            Você recebe objetivos práticos com explicações simples e claras, entendendo exatamente o que precisa construir e o porquê de cada linha de código.
          </p>
        </div>
        <div className="mt-5 pt-3 border-t border-[#27272A] text-xs font-mono text-[#996DFF]">
          ✔ Aprendizado com propósito
        </div>
      </div>

      {/* 02: Ciano (#00E5FF) */}
      <div className="p-7 rounded-2xl bg-[#121217] border border-[#262630] relative flex flex-col justify-between">
        <div className="top-laser-beam" style={{ background: '#00E5FF' }}></div>
        <div>
          <div className="w-12 h-12 rounded-xl bg-[#09090C] border border-[#27272A] flex items-center justify-center font-mono font-bold text-lg text-[#00E5FF] mb-5">
            02
          </div>
          <h3 className="text-lg font-heading font-bold text-white mb-2.5">Código Direto no Navegador</h3>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
            Nada de perder horas configurando ferramentas complexas no seu computador. Escreva, teste e execute seu código direto pelo navegador, sem travar.
          </p>
        </div>
        <div className="mt-5 pt-3 border-t border-[#27272A] text-xs font-mono text-[#00E5FF]">
          ✔ Zero instalação ou dores de cabeça
        </div>
      </div>

      {/* 03: Verde Neon (#04D361) */}
      <div className="p-7 rounded-2xl bg-[#121217] border border-[#262630] relative flex flex-col justify-between">
        <div className="top-laser-beam" style={{ background: '#04D361' }}></div>
        <div>
          <div className="w-12 h-12 rounded-xl bg-[#09090C] border border-[#27272A] flex items-center justify-center font-mono font-bold text-lg text-[#04D361] mb-5">
            03
          </div>
          <h3 className="text-lg font-heading font-bold text-white mb-2.5">Correção na Hora & Dicas Amigáveis</h3>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
            Seu código é corrigido imediatamente. Se você travar ou esquecer um comando, nosso tutor inteligente te dá dicas amigáveis passo a passo para achar a solução.
          </p>
        </div>
        <div className="mt-5 pt-3 border-t border-[#27272A] text-xs font-mono text-[#04D361]">
          ✔ Evolução sem frustração
        </div>
      </div>

    </div>
  </section>

  {/* 5. TERMINAL INTERATIVO COM AS CORES DA PÁGINA PRINCIPAL */}
  <section id="sandbox" className="relative z-10 py-24 px-6 sm:px-8 max-w-7xl mx-auto border-t border-[#27272A]/70">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
      <div className="max-w-2xl text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-[#00E5FF] text-xs font-mono font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse"></span>
          <span>PISTON LINUX ENGINE // ZERO SETUP</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-white tracking-tight mb-4">
          Experimente no Terminal Real
        </h2>
        <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-sans">
          Escolha uma linguagem e execute o código abaixo. Zero simulações — containers Linux reais com telemetria instantânea e latência P99 sub-30ms.
        </p>
      </div>

      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-zinc-300 shrink-0">
        <span className="w-2 h-2 rounded-full bg-[#04D361] animate-ping" />
        <span>KERNEL ISOLATION // CGROUPS V2</span>
      </div>
    </div>

    {/* MOCKUP DO SANDBOX */}
    <div className="rounded-2xl bg-[#0E0E12] border border-[#27272A] shadow-2xl overflow-hidden">
      {/* Top Bar do Terminal */}
      <div className="bg-[#121217] px-5 py-3.5 border-b border-[#27272A] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-[#04D361]" />
          <span className="ml-3 text-xs font-mono text-zinc-400 font-semibold">sandbox-isolated-cgroups-v2</span>
        </div>

        {/* Seletor de Linguagens com as cores da plataforma */}
        <div className="flex items-center gap-1.5 bg-[#09090C] p-1 rounded-xl border border-[#27272A]">
          <button
            type="button"
            onClick={() => handleSelectLang('rust')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeLang === 'rust'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Rust
          </button>
          <button
            type="button"
            onClick={() => handleSelectLang('go')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeLang === 'go'
                ? 'bg-[#00E5FF] text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Go
          </button>
          <button
            type="button"
            onClick={() => handleSelectLang('python')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeLang === 'python'
                ? 'bg-[#8257E5] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Python
          </button>
        </div>

        {/* Botão de Execução em Verde Neon */}
        <button
          type="button"
          onClick={handleRun}
          disabled={isExecuting}
          className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#04D361] to-[#00B37E] hover:from-[#00E58F] hover:to-[#04D361] text-black font-heading font-extrabold text-xs shadow-lg shadow-[#04D361]/30 transition-all active:scale-95 border border-white/20 disabled:opacity-50"
        >
          {isExecuting ? (
            <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>▶</span>
          )}
          <span>{isExecuting ? 'Compilando...' : 'Executar no Sandbox'}</span>
        </button>
      </div>

      {/* Editor & Console de Saída */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
                {/* Painel do Código com Sintaxe Colorida Estilo IDE & Numeração de Linhas */}
        <div className="lg:col-span-7 p-5 sm:p-6 font-mono text-xs sm:text-sm bg-[#09090D] overflow-x-auto border-b lg:border-b-0 lg:border-r border-[#27272A]/80">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-3.5 pb-2.5 border-b border-zinc-800/70 select-none">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#04D361]" />
              <span className="text-zinc-200 font-semibold">{CODE_SNIPPETS[activeLang].fileName}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#00E5FF] font-semibold">{CODE_SNIPPETS[activeLang].level}</span>
              <span className="hidden sm:inline text-zinc-600">•</span>
              <span className="hidden sm:inline text-zinc-500">kernel-linux-v6.8</span>
            </div>
          </div>
          
          <div className="flex font-mono leading-relaxed select-text">
            {/* Gutter / Numeração de Linhas */}
            <div className="select-none text-right pr-3.5 sm:pr-4 text-zinc-600 border-r border-zinc-800/80 space-y-0.5 shrink-0">
              {CODE_SNIPPETS[activeLang].lines.map((_, i) => (
                <div key={i} className="text-xs sm:text-sm leading-relaxed">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Código com Syntax Highlighting Colorido */}
            <div className="pl-3.5 sm:pl-4 space-y-0.5 whitespace-pre overflow-x-auto w-full text-zinc-200">
              {CODE_SNIPPETS[activeLang].lines.map((lineHtml, i) => (
                <div
                  key={i}
                  className="text-xs sm:text-sm leading-relaxed hover:bg-zinc-800/30 px-1.5 -mx-1.5 rounded transition-colors"
                  dangerouslySetInnerHTML={{ __html: lineHtml || '&nbsp;' }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Painel da Telemetria */}
        <div className="lg:col-span-5 p-6 bg-[#0E0E12] flex flex-col justify-between font-mono text-xs">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#27272A] text-zinc-400">
              <span className="flex items-center gap-2 font-bold text-white">
                <span className="w-2 h-2 rounded-full bg-[#04D361] animate-pulse" />
                STDOUT / TELEMETRIA
              </span>
              <span className="text-[10px] bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">P99: 14.8ms</span>
            </div>
            <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed font-mono">
              <code>{terminalOutput}</code>
            </pre>
          </div>

          <div className="mt-6 pt-4 border-t border-[#27272A] text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Isolamento: 512MB RAM</span>
            <span className="text-[#04D361] font-semibold">100% Determinístico</span>
          </div>
        </div>
      </div>
    </div>

    {/* BANNER DE ALTA CONVERSÃO PÓS-TERMINAL */}
    <div className="mt-6 p-5 rounded-2xl bg-[#08120B] border border-[#04D361]/35 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl shadow-[#04D361]/5">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-[#04D361]/15 border border-[#04D361]/40 flex items-center justify-center text-[#04D361] font-bold text-lg shrink-0">
          ⚡
        </div>
        <div>
          <div className="text-sm sm:text-base font-heading font-bold text-white flex items-center gap-2">
            <span>Gostou da velocidade de resposta?</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#04D361]/20 text-[#04D361] font-bold">SUB-30MS</span>
          </div>
          <p className="text-xs text-zinc-300 font-sans mt-0.5">
            Cadastre-se gratuitamente para salvar seu histórico, acumular XP e liberar 30+ desafios reais no terminal.
          </p>
        </div>
      </div>
      <Link href="/register" className="whitespace-nowrap inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#04D361] hover:bg-[#00E58F] text-black font-heading font-extrabold text-xs sm:text-sm shadow-lg shadow-[#04D361]/30 active:scale-95 transition-all">
        <span>Criar Conta Grátis & Salvar</span>
        <span>→</span>
      </Link>
    </div>
</section>

  {/* 6. PLANOS E PREÇOS: DESTAQUE NO PLANO PRO EM ROXO (#8257E5) */}
  <section id="precos" className="relative z-10 py-24 px-6 sm:px-8 max-w-7xl mx-auto border-t border-[#27272A]/70">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16">
      <div className="max-w-2xl text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold mb-3">
          <span>💳</span>
          <span>PLANOS ACESSÍVEIS & TRANSPARENTES</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-white tracking-tight mb-4">
          Acesso Total à Engenharia
        </h2>
        <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-sans">
          Investimento direto na sua independência técnica. Sem contratos amarrados, cancele a qualquer momento com 1 clique.
        </p>
      </div>

      {/* SELETOR MENSAL / ANUAL ALINHADO À DIREITA */}
      <div className="inline-flex items-center p-1.5 rounded-full bg-[#121217] border border-[#27272A] shrink-0 self-start lg:self-end">
        <button
          type="button"
          onClick={() => setBillingCycle('monthly')}
          className={`px-6 py-2 rounded-full text-xs sm:text-sm transition-all cursor-pointer ${
            billingCycle === 'monthly'
              ? 'font-bold bg-[#8257E5] text-white shadow-md'
              : 'font-medium text-zinc-400 hover:text-white'
          }`}
        >
          Mensal
        </button>
        <button
          type="button"
          onClick={() => setBillingCycle('annual')}
          className={`px-6 py-2 rounded-full text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            billingCycle === 'annual'
              ? 'font-bold bg-[#8257E5] text-white shadow-md'
              : 'font-medium text-zinc-400 hover:text-white'
          }`}
        >
          <span>Anual</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#996DFF]/20 text-[#996DFF] font-bold">
            ECONOMIZE 27%
          </span>
        </button>
      </div>
    </div>
{/* CARDS DE PREÇO */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      
      {/* Card Gratuito (Explorer) */}
      <div className="p-7 rounded-2xl bg-[#121217] border border-[#262630] flex flex-col justify-between">
        <div>
          <div className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">Explorer</div>
          <h3 className="text-xl font-heading font-bold text-white mb-2">Comunitário</h3>
          <p className="text-xs text-zinc-400 leading-relaxed mb-6 font-sans">
            Para experimentar os primeiros módulos e o terminal interativo.
          </p>
          <div className="mb-6">
            <span className="text-3xl sm:text-4xl font-heading font-black text-white">R$ 0</span>
            <span className="text-xs font-mono text-zinc-400 ml-1">/ para sempre</span>
          </div>
          <ul className="space-y-3 text-xs font-mono text-zinc-300 mb-8">
            <li className="flex items-center gap-2"><span className="text-[#04D361] font-bold">✔</span> +30 Desafios Fundamentais</li>
            <li className="flex items-center gap-2"><span className="text-[#04D361] font-bold">✔</span> Sandbox Linux Piston</li>
            <li className="flex items-center gap-2"><span className="text-[#04D361] font-bold">✔</span> Acesso à Liga Bronze</li>
            <li className="flex items-center gap-2 text-zinc-500">✕ Sem tutor dialético socrático</li>
            <li className="flex items-center gap-2 text-zinc-500">✕ Portfólio SHA-256 Auditável</li>
          </ul>
        </div>
        <Link href="/register" className="w-full py-3 rounded-xl bg-[#18181B] hover:bg-[#202024] text-white text-xs font-mono font-bold text-center border border-[#27272A] transition-colors">
          Criar Conta Grátis
        </Link>
      </div>

      {/* Card Pro Engineer (Featured - Roxo #8257E5 com Shadow Difusa) */}
      <div className="p-8 rounded-2xl bg-[#121217] border-2 border-[#8257E5] relative flex flex-col justify-between shadow-xl shadow-[#8257E5]/20">
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#8257E5] text-white text-[10px] font-mono font-bold uppercase tracking-wider shadow-md">
          RECOMENDADO
        </div>
        <div>
          <div className="text-xs font-mono font-bold text-[#8257E5] uppercase tracking-wider mb-2">PRO ENGINEER</div>
          <h3 className="text-2xl font-heading font-bold text-white mb-2">Plano Pro</h3>
          <p className="text-xs text-zinc-300 leading-relaxed mb-6 font-sans">
            Para quem busca autonomia técnica e preparação para vagas de alto nível.
          </p>
          <div className="mb-6">
            <span id="price-pro" className="text-4xl sm:text-5xl font-heading font-black text-white">
              {billingCycle === 'annual' ? 'R$ 65' : 'R$ 89'}
            </span>
            <span id="cycle-pro" className="text-xs font-mono text-zinc-400 ml-1">
              {billingCycle === 'annual' ? '/ mês (R$ 790/ano)' : '/ mês'}
            </span>
          </div>
          <ul className="space-y-3 text-xs font-mono text-zinc-200 mb-8">
            <li className="flex items-center gap-2"><span className="text-[#04D361] font-bold">✔</span> Acesso total a todas as 4 Trilhas Master</li>
            <li className="flex items-center gap-2"><span className="text-[#04D361] font-bold">✔</span> Tutor IA Socrático Ilimitado 24/7</li>
            <li className="flex items-center gap-2"><span className="text-[#04D361] font-bold">✔</span> Portfólio de Evidências com Hash SHA-256</li>
            <li className="flex items-center gap-2"><span className="text-[#04D361] font-bold">✔</span> Suporte a Concorrência & Stress Tests</li>
            <li className="flex items-center gap-2"><span className="text-[#8257E5] font-bold">✔</span> Destaque nas Ligas Semanais</li>
          </ul>
        </div>
        <a href="#sandbox" className="w-full py-3.5 rounded-xl bg-[#8257E5] hover:bg-[#7146D4] text-white text-xs font-heading font-extrabold text-center shadow-lg shadow-[#8257E5]/30 hover:shadow-xl hover:shadow-[#8257E5]/40 transition-all active:scale-95 border border-white/20">
          Começar Agora ⚡
        </a>
      </div>

      {/* Card Staff / Enterprise */}
      <div className="p-7 rounded-2xl bg-[#121217] border border-[#262630] flex flex-col justify-between">
        <div>
          <div className="text-xs font-mono font-bold text-[#996DFF] uppercase tracking-wider mb-2">ENTERPRISE & TIMES</div>
          <h3 className="text-xl font-heading font-bold text-white mb-2">Plano Staff</h3>
          <p className="text-xs text-zinc-400 leading-relaxed mb-6 font-sans">
            Para times de engenharia, tech academies e posições seniores.
          </p>
          <div className="mb-6">
            <span id="price-staff" className="text-3xl sm:text-4xl font-heading font-black text-white">
              {billingCycle === 'annual' ? 'R$ 115' : 'R$ 149'}
            </span>
            <span id="cycle-staff" className="text-xs font-mono text-zinc-400 ml-1">
              {billingCycle === 'annual' ? '/ mês (R$ 1.390/ano)' : '/ mês'}
            </span>
          </div>
          <ul className="space-y-3 text-xs font-mono text-zinc-300 mb-8">
            <li className="flex items-center gap-2"><span className="text-[#8257E5] font-bold">✔</span> Painel de Gestão de Equipes</li>
            <li className="flex items-center gap-2"><span className="text-[#8257E5] font-bold">✔</span> Desafios Customizados de Empresa</li>
            <li className="flex items-center gap-2"><span className="text-[#8257E5] font-bold">✔</span> SSO / SAML & Segurança SOC-2</li>
            <li className="flex items-center gap-2"><span className="text-[#8257E5] font-bold">✔</span> Relatórios de Performance de Engenharia</li>
          </ul>
        </div>
        <Link href="/register" className="w-full py-3 rounded-xl bg-[#18181B] hover:bg-[#202024] text-white text-xs font-mono font-bold text-center border border-[#27272A] transition-colors">
          Falar com Engenharia
        </Link>
      </div>

    </div>
  </section>

    {/* 7. FAQ: PERGUNTAS FREQUENTES */}
  <section id="faq" className="relative z-10 py-28 px-6 sm:px-8 max-w-6xl mx-auto border-t border-[#27272A]/70 overflow-hidden">
    {/* Auras de iluminação colorida de fundo */}
    <div className="pointer-events-none absolute -top-32 left-10 w-96 h-96 bg-[#8257E5]/15 rounded-full blur-3xl"></div>
    <div className="pointer-events-none absolute top-1/2 right-0 w-96 h-96 bg-[#00E5FF]/10 rounded-full blur-3xl"></div>
    <div className="pointer-events-none absolute -bottom-20 left-1/3 w-80 h-80 bg-[#04D361]/10 rounded-full blur-3xl"></div>

    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16 relative z-10">
      <div className="max-w-2xl text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold border border-[#8257E5]/40 bg-[#8257E5]/10 text-[#A78BFA] mb-4">
          <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse"></span>
          <span>TIRE SUAS DÚVIDAS</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-white tracking-tight mb-4">
          Perguntas <span className="bg-gradient-to-r from-[#8257E5] via-[#00E5FF] to-[#04D361] bg-clip-text text-transparent">Frequentes</span>
        </h2>
        <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-sans">
          Respostas diretas sobre a metodologia prática, o ambiente em containers Linux e como seu código gera autoridade técnica.
        </p>
      </div>

      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-zinc-400 shrink-0 self-start lg:self-end">
        <span className="w-2 h-2 rounded-full bg-[#04D361] animate-pulse"></span>
        <span>COMMUNITY & ENG TEAM ONLINE</span>
      </div>
    </div>

    {/* Grid de Perguntas em 2 Colunas com Cores Semânticas */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
      
      {/* 1. Ciano: Zero Instalação */}
      <div className="group relative p-7 rounded-2xl bg-[#121217] border border-[#262630] hover:border-[#00E5FF]/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_-10px_rgba(0,229,255,0.2)]">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-[#00E5FF]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-[#00E5FF]/40 bg-[#00E5FF]/10 text-[#00E5FF]">
            ZERO INSTALAÇÃO
          </span>
        </div>
        <h3 className="font-heading font-bold text-white text-base sm:text-lg mb-2.5 group-hover:text-[#00E5FF] transition-colors">
          Preciso instalar algo na minha máquina para começar?
        </h3>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
          Não. Todo o ambiente roda em <span className="text-white font-medium">containers Linux isolados</span> diretamente no seu navegador. Você só precisa de uma conexão à internet para escrever, compilar e rodar testes de estresse em Python, Go e Rust.
        </p>
      </div>

      {/* 2. Rosa: Metodologia vs Cursos em Vídeo */}
      <div className="group relative p-7 rounded-2xl bg-[#121217] border border-[#262630] hover:border-pink-500/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_-10px_rgba(236,72,153,0.2)]">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-pink-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-pink-500/40 bg-pink-500/10 text-pink-400">
            METODOLOGIA ATIVA
          </span>
        </div>
        <h3 className="font-heading font-bold text-white text-base sm:text-lg mb-2.5 group-hover:text-pink-400 transition-colors">
          Qual a diferença entre a NEXUS CODE e cursos em vídeo?
        </h3>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
          Nas plataformas tradicionais você passa 90% do tempo assistindo passivamente a vídeos longos. Na NEXUS CODE você passa <span className="text-white font-medium">90% do tempo escrevendo código e corrigindo testes</span>, exatamente o que molda o programador contratado pelo mercado.
        </p>
      </div>

      {/* 3. Verde: Iniciantes Absolutos */}
      <div className="group relative p-7 rounded-2xl bg-[#121217] border border-[#262630] hover:border-[#04D361]/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_-10px_rgba(4,211,97,0.2)]">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-[#04D361]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#04D361]/10 border border-[#04D361]/30 text-[#04D361] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v8"></path>
              <path d="M4.93 10.93l1.41 1.41"></path>
              <path d="M2 18h2"></path>
              <path d="M20 18h2"></path>
              <path d="M17.66 12.34l1.41-1.41"></path>
              <path d="M16 18a4 4 0 0 1-8 0"></path>
              <path d="M12 14v4"></path>
            </svg>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-[#04D361]/40 bg-[#04D361]/10 text-[#04D361]">
            DO ZERO AO CÓDIGO
          </span>
        </div>
        <h3 className="font-heading font-bold text-white text-base sm:text-lg mb-2.5 group-hover:text-[#04D361] transition-colors">
          Sou iniciante absoluto. Vou conseguir acompanhar?
        </h3>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
          Sim, com certeza! A plataforma foi desenhada para quem nunca escreveu uma linha de código. Você começa aprendendo <span className="text-white font-medium">lógica básica e sintaxe elementar</span>, com feedback passo a passo até construir projetos completos.
        </p>
      </div>

      {/* 4. Âmbar: Pré-requisitos & Faculdade */}
      <div className="group relative p-7 rounded-2xl bg-[#121217] border border-[#262630] hover:border-amber-500/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_-10px_rgba(245,158,11,0.2)]">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400">
            SEM PRÉ-REQUISITOS
          </span>
        </div>
        <h3 className="font-heading font-bold text-white text-base sm:text-lg mb-2.5 group-hover:text-amber-400 transition-colors">
          Preciso ter faculdade ou saber matemática avançada?
        </h3>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
          Não! Você não precisa de diploma na área nem de fórmulas complexas. O raciocínio lógico é construído de forma <span className="text-white font-medium">prática, visual e gradual</span>, resolvendo problemas reais no terminal desde o primeiro dia.
        </p>
      </div>

      {/* 5. Roxo: Tutor Socrático & Feedback */}
      <div className="group relative p-7 rounded-2xl bg-[#121217] border border-[#262630] hover:border-[#8257E5]/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_-10px_rgba(130,87,229,0.2)]">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-[#8257E5]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#8257E5]/10 border border-[#8257E5]/30 text-[#A78BFA] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a8 8 0 0 0-8 8c0 3.31 2.01 6.16 4.9 7.37L8 22l4-2 4 2-.9-4.63C17.99 16.16 20 13.31 20 10a8 8 0 0 0-8-8z"></path>
            </svg>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-[#8257E5]/40 bg-[#8257E5]/10 text-[#A78BFA]">
            TUTOR SOCRÁTICO
          </span>
        </div>
        <h3 className="font-heading font-bold text-white text-base sm:text-lg mb-2.5 group-hover:text-[#A78BFA] transition-colors">
          Como funciona o feedback quando meu código dá erro?
        </h3>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
          Nossa tutoria socrática analisa a <span className="text-white font-medium">Árvore Sintática Abstrata (AST)</span> da sua solução e aponta pistas e perguntas reflexivas, em vez de dar a resposta pronta. Isso desenvolve seu raciocínio real de debugging.
        </p>
      </div>

      {/* 6. Esmeralda: Certificados & Mercado */}
      <div className="group relative p-7 rounded-2xl bg-[#121217] border border-[#262630] hover:border-emerald-500/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_-10px_rgba(16,185,129,0.2)]">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <polyline points="9 12 11 14 15 10"></polyline>
            </svg>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
            COMPROVAÇÃO REAL
          </span>
        </div>
        <h3 className="font-heading font-bold text-white text-base sm:text-lg mb-2.5 group-hover:text-emerald-400 transition-colors">
          Como os projetos e certificados me ajudam a conseguir vagas?
        </h3>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
          Cada projeto gera repositórios Git reais com commits assinados e certificados com <span className="text-white font-medium">verificação criptográfica SHA-256</span>. Você prova sua capacidade técnica para recrutadores mostrando código executável em produção.
        </p>
      </div>

    </div>

    {/* Banner inferior de suporte / contato */}
    <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#121217] via-[#161320] to-[#121217] border border-[#8257E5]/30 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
      <div className="flex items-center gap-4 text-center sm:text-left">
        <div className="w-12 h-12 rounded-xl bg-[#8257E5]/20 border border-[#8257E5]/40 text-[#A78BFA] flex items-center justify-center text-2xl shrink-0">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </div>
        <div>
          <h4 className="font-heading font-bold text-white text-base sm:text-lg">Ainda tem alguma dúvida sobre a plataforma?</h4>
          <p className="text-xs sm:text-sm text-zinc-400 font-sans">Nossa comunidade e time de engenharia estão online para te apoiar em cada etapa.</p>
        </div>
      </div>
      <a href="#hero" className="shrink-0 px-6 py-3 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white font-mono font-bold text-xs sm:text-sm transition-all duration-200 active:scale-95 shadow-lg shadow-[#8257E5]/25 border border-[#996DFF]/50">
        Começar Agora Gratuitamente →
      </a>
    </div>
  </section>

  {/* 8. CTA FINAL EM SPLIT ASSIMÉTRICO */}
  <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    <div className="relative rounded-3xl bg-gradient-to-br from-[#0D1226] via-[#080B18] to-[#04060E] border border-white/[0.1] p-8 sm:p-14 overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
      {/* Laser beam na ordem exata da marca: Roxo -> Ciano -> Verde */}
      <div className="top-laser-beam" style={{ background: 'linear-gradient(90deg, #8257E5 0%, #00E5FF 50%, #04D361 100%)', left: '2%', right: '2%' }}></div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
        {/* Esquerda: 7 cols */}
        <div className="lg:col-span-7 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#04D361]/10 border border-[#04D361]/30 text-[#04D361] text-xs font-mono font-bold mb-5">
            <span className="w-2 h-2 rounded-full bg-[#04D361] animate-pulse"></span>
            <span>COMECE EM MENOS DE 60 SEGUNDOS</span>
          </div>

          <h2 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight mb-5 leading-[1.08]">
            Pare de apenas assistir código.<br />
            <span className="bg-gradient-to-r from-white via-[#A78BFA] to-[#00E5FF] bg-clip-text text-transparent">
              Construa sistemas reais e destrave sua carreira.
            </span>
          </h2>

          <p className="font-sans text-sm sm:text-base text-zinc-300 leading-relaxed mb-8 max-w-xl">
            Crie sua conta em menos de 30 segundos e envie seu primeiro commit hoje mesmo. O mercado não contrata certificados de vídeo — ele contrata quem resolve problemas no código.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm font-mono text-zinc-300">
            <div className="flex items-center gap-2.5">
              <span className="text-[#04D361] font-black text-base">✔</span>
              <span>Acesso imediato ao terminal</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[#04D361] font-black text-base">✔</span>
              <span>30+ Desafios gratuitos</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[#04D361] font-black text-base">✔</span>
              <span>Sem necessidade de cartão</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[#04D361] font-black text-base">✔</span>
              <span>Git Real & Hash SHA-256</span>
            </div>
          </div>
        </div>

        {/* Direita: 5 cols (Cockpit Card de Ação) */}
        <div className="lg:col-span-5 w-full">
          <div className="p-8 rounded-2xl bg-[#060814]/95 border border-white/[0.1] shadow-2xl backdrop-blur-xl flex flex-col gap-5 text-center sm:text-left">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#04D361] animate-pulse"></span>
                <span className="text-xs font-mono font-bold text-white uppercase">ARENA DE PRODUÇÃO</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                ONLINE
              </span>
            </div>

            <div>
              <div className="text-xs font-mono text-zinc-400 mb-1">PASSO INICIAL:</div>
              <div className="text-lg font-heading font-black text-white">Escolha seu Companion Inicial</div>
              <div className="text-xs text-zinc-400 font-sans mt-1">
                Pythox (Python), Scripty (TypeScript), Gopherus (Go) ou Rustor (Rust).
              </div>
            </div>

            <Link
              href="/onboarding"
              className="w-full inline-flex items-center justify-center gap-3 px-8 py-4.5 rounded-2xl bg-gradient-to-r from-[#04D361] via-[#00E58F] to-[#04D361] hover:from-[#00E58F] hover:to-[#04D361] text-[#050505] font-heading font-black text-base transition-all duration-200 cursor-pointer active:scale-95 shadow-[0_0_35px_rgba(4,211,97,0.45)] group"
            >
              <span>Começar Grátis Agora</span>
              <span className="group-hover:translate-x-1.5 transition-transform duration-200 text-lg font-black">→</span>
            </Link>

            <Link
              href="/game"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-400/40 text-xs font-mono text-zinc-300 hover:text-white transition-all"
            >
              <span>🎮 Ou jogue o Overworld 2D no navegador</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  </section>

      {/* FOOTER CLEAN, ESPAÇOSO E MINIMALISTA */}
  <footer className="relative z-10 border-t border-[#262630] bg-[#070709] py-20 px-6 sm:px-12 overflow-hidden">
    {/* Linha laser superior minimalista */}
    <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-[#8257E5]/40 to-transparent"></div>

    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row justify-between gap-16 lg:gap-24">
        
        {/* Bloco da Marca & Proposta */}
        <div className="max-w-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#121217] border border-[#27272A] flex items-center justify-center p-1.5 shadow-lg">
                <svg viewBox="0 0 84 64" className="w-full h-full" fill="none">
                  <path d="M 14 46 L 14 18 L 20 18 L 32 36 L 32 18 L 38 18 L 38 46 L 32 46 L 20 28 L 20 46 Z" fill="#FFFFFF"/>
                  <path d="M 44 22 L 54 32 L 44 42" stroke="#8257E5" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M 66 22 L 56 32 L 66 42" stroke="#00E5FF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-xl tracking-wider text-white">NEXUS</span>
                <span className="text-[10px] font-mono font-bold bg-[#8257E5]/20 text-[#A78BFA] px-2 py-0.5 rounded border border-[#8257E5]/40 tracking-wider">
                  CODE
                </span>
              </div>
            </div>

            <p className="text-sm text-zinc-400 font-sans leading-relaxed mb-6">
              A plataforma definitiva para aprender programação na prática, escrevendo código real diretamente no navegador.
            </p>

            <div className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-[#04D361] animate-pulse"></span>
              <span>Sandbox Linux Online • 99.98% Uptime</span>
            </div>
          </div>

          {/* Redes Sociais Limpas */}
          <div className="flex items-center gap-4 mt-8">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors" aria-label="GitHub">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            </a>
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-[#5865F2] transition-colors" aria-label="Discord">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors" aria-label="X (Twitter)">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Colunas Curadas de Navegação */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 sm:gap-16 flex-1 max-w-2xl">
          
          {/* Trilhas */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-4">
              Trilhas
            </h4>
            <ul className="space-y-3 text-sm font-sans">
              <li>
                <a href="#trilhas" className="text-zinc-400 hover:text-white transition-colors">
                  Lógica & Rust
                </a>
              </li>
              <li>
                <a href="#trilhas" className="text-zinc-400 hover:text-white transition-colors">
                  APIs com Go
                </a>
              </li>
              <li>
                <a href="#trilhas" className="text-zinc-400 hover:text-white transition-colors">
                  React & Next.js
                </a>
              </li>
              <li>
                <a href="#trilhas" className="text-zinc-400 hover:text-white transition-colors">
                  Python & IA
                </a>
              </li>
            </ul>
          </div>

          {/* Plataforma */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-4">
              Plataforma
            </h4>
            <ul className="space-y-3 text-sm font-sans">
              <li>
                <a href="/ide" className="text-zinc-400 hover:text-white transition-colors">
                  Web IDE
                </a>
              </li>
              <li>
                <a href="#sandbox" className="text-zinc-400 hover:text-white transition-colors">
                  Sandbox Linux
                </a>
              </li>
              <li>
                <a href="/leaderboard" className="text-zinc-400 hover:text-white transition-colors">
                  Leaderboard
                </a>
              </li>
              <li>
                <a href="/verify/check" className="text-zinc-400 hover:text-white transition-colors">
                  Certificados
                </a>
              </li>
            </ul>
          </div>

          {/* Acesso */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-4">
              Acesso
            </h4>
            <ul className="space-y-3 text-sm font-sans">
              <li>
                <a href="/register" className="text-zinc-400 hover:text-white transition-colors">
                  Começar Grátis
                </a>
              </li>
              <li>
                <a href="/login" className="text-zinc-400 hover:text-white transition-colors">
                  Login
                </a>
              </li>
              <li>
                <a href="#precos" className="text-zinc-400 hover:text-white transition-colors">
                  Planos
                </a>
              </li>
              <li>
                <a href="#faq" className="text-zinc-400 hover:text-white transition-colors">
                  Dúvidas (FAQ)
                </a>
              </li>
            </ul>
          </div>

        </div>

      </div>

      {/* Faixa Inferior / Sub-footer */}
      <div className="pt-10 mt-16 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-400">
        <div>
          © 2026 NEXUS CODE. Todos os direitos reservados.
        </div>

        <div className="flex items-center gap-6">
          <a href="#trilhas" className="hover:text-white transition-colors">Termos</a>
          <a href="#faq" className="hover:text-white transition-colors">Privacidade</a>
          <a href="#hero" className="text-zinc-300 hover:text-white transition-colors flex items-center gap-1">
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
