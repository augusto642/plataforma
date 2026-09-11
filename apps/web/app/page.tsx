'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Logo from './components/Logo';

// Language snippets for the Hero Interactive Sandbox
const HERO_SNIPPETS = {
  rust: {
    lang: 'Rust',
    file: 'rate_limiter.rs',
    code: `pub struct SlidingWindowLimiter {
    capacity: usize,
    window_duration: Duration,
    events: BTreeMap<Instant, usize>,
}

impl SlidingWindowLimiter {
    pub fn check_rate(&mut self, now: Instant) -> Result<RateDecision, MemoryError> {
        let cutoff = now.saturating_sub(self.window_duration);
        self.events.retain(|&time, _| time >= cutoff);
        
        let current_count: usize = self.events.values().sum();
        if current_count < self.capacity {
            *self.events.entry(now).or_insert(0) += 1;
            Ok(RateDecision::Allow { remaining: self.capacity - current_count - 1 })
        } else {
            Ok(RateDecision::Drop { retry_after: self.window_duration })
        }
    }
}`,
    output: `✔ Compilação rustc 1.78.0 (release mode): 0 warnings
✔ Test Suite: Concurrency Burst (100k req/s) -> PASSED (14.2ms)
✔ Memory RSS: 2.4 MB (Zero heap thrashing detected)
✔ Complexity: O(log N) lookup validado`,
    socraticHint: 'Sua janela deslizante passou nos testes de carga. Porém, se o tráfego for ininterrupto por 72h sem limpezas ativas, a árvore BTreeMap acumulará nós inativos. Como você evitaria essa fragmentação sem bloquear a thread de escrita?'
  },
  go: {
    lang: 'Go',
    file: 'worker_pool.go',
    code: `package main

type Job func() error

type Dispatcher struct {
    workerPool chan chan Job
    maxWorkers int
    jobQueue   chan Job
}

func (d *Dispatcher) Run(ctx context.Context) {
    for i := 0; i < d.maxWorkers; i++ {
        worker := NewWorker(d.workerPool)
        worker.Start(ctx)
    }
    go d.dispatch(ctx)
}

func (d *Dispatcher) dispatch(ctx context.Context) {
    for {
        select {
        case job := <-d.jobQueue:
            jobChannel := <-d.workerPool
            jobChannel <- job
        case <-ctx.Done():
            return
        }
    }
}`,
    output: `✔ Compilação go build: 0 race conditions detectadas (-race flag)
✔ Test Suite: 50.000 Goroutines sob carga -> PASSED (18.6ms)
✔ Memory RSS: 4.1 MB (Lock-free memory allocation)
✔ Throughput: 124.000 ops/sec`,
    socraticHint: 'Se o canal jobQueue saturar enquanto todos os workers estiverem bloqueados em I/O externo, sua aplicação consumirá memória até o OOM. Qual padrão de Circuit Breaker você aplicaria para descartar requisições graciosamente?'
  },
  typescript: {
    lang: 'TypeScript',
    file: 'event_bus.ts',
    code: `type EventHandler<T> = (event: T) => Promise<void>;

export class ResilientEventBus {
  private handlers = new Map<string, Set<EventHandler<unknown>>>();
  private deadLetterQueue: Array<{ event: string; payload: unknown; error: Error }> = [];

  public subscribe<T>(eventName: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    const set = this.handlers.get(eventName)!;
    set.add(handler as EventHandler<unknown>);
    return () => set.delete(handler as EventHandler<unknown>);
  }

  public async publish<T>(eventName: string, payload: T): Promise<void> {
    const list = Array.from(this.handlers.get(eventName) || []);
    await Promise.allSettled(list.map(fn => fn(payload)));
  }
}`,
    output: `✔ TypeScript 5.4 TypeCheck: 0 erros de tipagem estrita
✔ Test Suite: Async Deadlock Simulation -> PASSED (9.4ms)
✔ Memory Leak Test: 100.000 subscriptions & cleanups -> PASSED
✔ Zero dependências externas de runtime`,
    socraticHint: 'Usar Promise.allSettled previne falhas em cadeia, mas executa todos os handlers concorrentemente sem controle de vazão. Como implementar um limite de concorrência máxima (concurrency pool) usando apenas closures?'
  }
};

// Architecture Pipeline Stages
const PIPELINE_STAGES = [
  {
    step: '01',
    title: 'AST Parser & Linting',
    desc: 'Análise léxica estática com Babel e Tree-sitter em < 2ms para validar contratos e integridade de tipos.',
    badge: 'AST Validator',
  },
  {
    step: '02',
    title: 'Sandbox Linux Piston',
    desc: 'Execução isolada em containers Docker com cgroups v2 e limites estritos de CPU (1 core) e RSS Memory (64MB).',
    badge: 'Docker & cgroups',
  },
  {
    step: '03',
    title: 'Profiler Big-O & Stress',
    desc: 'Baterias de testes ocultos que injetam 100k requisições e detectam gargalos assintóticos O(N²) em runtime.',
    badge: 'Latency < 48ms',
  },
  {
    step: '04',
    title: 'Tutor Socrático por IA',
    desc: 'Guardrails anti-spoiler formulam perguntas dialéticas que orientam a correção sem entregar respostas prontas.',
    badge: 'Scaffolding Dialético',
  },
  {
    step: '05',
    title: 'Dossiê SHA-256 no Git',
    desc: 'Geração de hash criptográfico imutável atestando aprovação em testes de produção para Tech Recruiters.',
    badge: 'Auditável no Git',
  },
];

export default function LandingPage() {
  const [selectedLang, setSelectedLang] = useState<'rust' | 'go' | 'typescript'>('rust');
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [codeExecutionStep, setCodeExecutionStep] = useState<'idle' | 'running' | 'success'>('idle');
  const [activePipelineStep, setActivePipelineStep] = useState<number>(1);
  const [activeTrackTab, setActiveTrackTab] = useState<'distributed' | 'microservices' | 'frontend' | 'ai'>('distributed');
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandSearchQuery, setCommandSearchQuery] = useState('');

  const activeSnippet = HERO_SNIPPETS[selectedLang];

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

  const handleRunCode = () => {
    if (isRunningCode) return;
    setIsRunningCode(true);
    setCodeExecutionStep('running');
    setTimeout(() => {
      setIsRunningCode(false);
      setCodeExecutionStep('success');
    }, 650);
  };

  const commandItems = [
    { label: 'Iniciar Cadastro & Escolher Trilha', href: '/register', icon: '⚡', category: 'Ações Rápidas' },
    { label: 'Abrir Playground de Código & Exercícios', href: '/ide', icon: '💻', category: 'Ações Rápidas' },
    { label: 'Acessar Dashboard do Aluno', href: '/dashboard', icon: '📊', category: 'Navegação' },
    { label: 'Entrar na Minha Conta', href: '/login', icon: '🔑', category: 'Navegação' },
    { label: 'Trilha: Sistemas Distribuídos em Rust', href: '/register', icon: '🦀', category: 'Trilhas de Especialização' },
    { label: 'Trilha: Microsserviços de Alta Vazão em Go', href: '/register', icon: '🐹', category: 'Trilhas de Especialização' },
    { label: 'Trilha: Arquitetura Frontend em Next.js', href: '/register', icon: '⚡', category: 'Trilhas de Especialização' },
    { label: 'Trilha: Engenharia de IA & LLMs', href: '/register', icon: '🧠', category: 'Trilhas de Especialização' },
  ];

  const filteredCommands = commandItems.filter((cmd) =>
    cmd.label.toLowerCase().includes(commandSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#09090B] text-[#EDEDED] font-sans antialiased selection:bg-[#8257E5]/30 selection:text-white relative overflow-hidden">
      
      {/* Background Subtle Ambient Glows & Dot Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-[#8257E5]/10 rounded-full blur-[130px]" />
        <div className="absolute top-[40%] right-[10%] w-[500px] h-[500px] bg-[#00E5FF]/05 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[10%] w-[600px] h-[600px] bg-[#04D361]/05 rounded-full blur-[140px]" />
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ backgroundImage: 'radial-gradient(#FFF 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
        />
      </div>

      {/* ========================================================================= */}
      {/* 1. NAVBAR WITH ⌘K COMMAND TRIGGER                                         */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#09090B]/80 border-b border-[#27272A]/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Logo size="md" href="/" />
            
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#121214] border border-[#27272A] text-[11px] font-mono text-[#A1A1AA]">
              <span className="w-2 h-2 rounded-full bg-[#04D361] animate-pulse" />
              <span>Piston Sandbox (18ms avg)</span>
            </div>
          </div>

          {/* Quick Search / Command Palette Button */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden md:flex items-center justify-between gap-4 px-3.5 py-1.5 rounded-lg bg-[#121214] border border-[#27272A] hover:border-[#3F3F46] text-xs text-[#71717A] hover:text-[#A1A1AA] transition-all w-64 shadow-inner"
          >
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Buscar trilha ou comando...</span>
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#18181B] border border-[#27272A] text-[10px] font-mono font-bold text-[#A1A1AA]">
              ⌘K
            </kbd>
          </button>

          {/* Nav Links */}
          <nav className="hidden xl:flex items-center gap-7 text-xs uppercase tracking-wider font-medium text-[#A1A1AA]">
            <a href="#arquitetura" className="hover:text-white transition-colors">Arquitetura</a>
            <a href="#trilhas" className="hover:text-white transition-colors">Trilhas</a>
            <a href="#pilares" className="hover:text-white transition-colors">Pilares</a>
            <a href="#projetos" className="hover:text-white transition-colors">Projetos</a>
            <a href="#precos" className="hover:text-white transition-colors">Planos</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-[#A1A1AA] hover:text-white px-3.5 py-2 rounded-lg transition-colors"
            >
              Entrar
            </Link>
            
            <Link
              href="/register"
              className="bg-white hover:bg-neutral-200 text-[#09090B] text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Iniciar no Terminal</span>
              <span>→</span>
            </Link>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. COMMAND PALETTE MODAL (⌘K)                                             */}
      {/* ========================================================================= */}
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-xl bg-[#121214] border border-[#27272A] rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input Header */}
            <div className="p-4 border-b border-[#27272A] flex items-center gap-3 bg-[#18181B]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8257E5" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                autoFocus
                placeholder="Digite o que procura (ex: Rust, Raft, Sandbox, Login)..."
                value={commandSearchQuery}
                onChange={(e) => setCommandSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-[#71717A] outline-none"
              />
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(false)}
                className="text-xs text-[#71717A] hover:text-white font-mono px-2 py-1 rounded bg-[#27272A]"
              >
                ESC
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[#27272A]/40">
              {filteredCommands.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#71717A]">
                  Nenhum comando encontrado para "{commandSearchQuery}".
                </div>
              ) : (
                filteredCommands.map((cmd, i) => (
                  <Link
                    key={i}
                    href={cmd.href}
                    onClick={() => setIsCommandPaletteOpen(false)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-[#18181B] text-xs text-[#E1E1E6] hover:text-white transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{cmd.icon}</span>
                      <div>
                        <div className="font-semibold text-white">{cmd.label}</div>
                        <div className="text-[10px] text-[#71717A]">{cmd.category}</div>
                      </div>
                    </div>
                    <span className="text-[#71717A] group-hover:text-[#8257E5] font-mono text-xs">
                      Ir →
                    </span>
                  </Link>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-[#09090B] border-t border-[#27272A] text-[11px] text-[#71717A] flex items-center justify-between font-mono">
              <span>Navegue com ↑ ↓ e pressione Enter</span>
              <span>NEXUS CODE v2.4</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. HERO SECTION                                                           */}
      {/* ========================================================================= */}
      <section className="relative pt-16 pb-24 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-6xl mx-auto">
          
          {/* Eyebrow Badge */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#18181B] border border-[#8257E5]/40 text-[#C4B5FD] text-[11px] font-mono font-bold tracking-wide uppercase shadow-[0_0_20px_rgba(130,87,229,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#04D361]" />
              <span>Sem Vídeos Passivos • Código Real no Navegador</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-center tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
            Você não precisa de mais 60 horas de vídeo. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#996DFF] via-[#00E5FF] to-[#04D361] bg-clip-text text-transparent">
              Você precisa de código real no terminal.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-sm sm:text-base text-[#A1A1AA] text-center max-w-2xl mx-auto leading-relaxed">
            Abandone a ilusão de competência dos tutoriais prontos. No NEXUS CODE você projeta microsserviços tolerantes a falhas, depura gargalos assintóticos e recebe orientações socráticas que exigem o seu melhor raciocínio de engenharia.
          </p>

          {/* Primary CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="bg-gradient-to-r from-[#8257E5] to-[#996DFF] hover:brightness-110 text-white font-bold text-sm px-7 py-3.5 rounded-xl shadow-[0_4px_24px_rgba(130,87,229,0.35)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <span>Abrir Terminal Gratuito</span>
              <span>→</span>
            </Link>

            <Link
              href="/ide"
              className="bg-[#18181B] hover:bg-[#202024] text-white border border-[#27272A] hover:border-[#3F3F46] font-semibold text-sm px-6 py-3.5 rounded-xl transition-all flex items-center gap-2"
            >
              <span>Ver Playground Interativo</span>
              <span>⚡</span>
            </Link>
          </div>

          {/* Micro Trust Proof */}
          <div className="mt-4 text-center text-xs text-[#71717A]">
            TypeScript, Go, Rust e Python • Sem necessidade de instalar Docker localmente
          </div>

          {/* ========================================================================= */}
          {/* HERO CODE RUNNER (INTERACTIVE MOCKUP)                                      */}
          {/* ========================================================================= */}
          <div className="mt-14 max-w-5xl mx-auto bg-[#121214] border border-[#27272A] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
            
            {/* Top Editor Bar */}
            <div className="bg-[#18181B] px-4 py-3 border-b border-[#27272A] flex flex-wrap items-center justify-between gap-3">
              
              {/* Tabs */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-3">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
                  <div className="w-3 h-3 rounded-full bg-[#10B981]/60" />
                </div>

                {(['rust', 'go', 'typescript'] as const).map((langKey) => (
                  <button
                    key={langKey}
                    onClick={() => {
                      setSelectedLang(langKey);
                      setCodeExecutionStep('idle');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                      selectedLang === langKey
                        ? 'bg-[#27272A] text-white'
                        : 'text-[#71717A] hover:text-[#A1A1AA]'
                    }`}
                  >
                    {HERO_SNIPPETS[langKey].file}
                  </button>
                ))}
              </div>

              {/* Run Action */}
              <button
                onClick={handleRunCode}
                disabled={isRunningCode}
                className="bg-[#04D361] hover:bg-[#04D361]/90 text-[#09090B] font-mono font-bold text-xs px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(4,211,97,0.3)]"
              >
                {isRunningCode ? (
                  <>
                    <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Executando...</span>
                  </>
                ) : (
                  <>
                    <span>▶ Executar Testes</span>
                    <span className="opacity-60 text-[10px]">⌘↵</span>
                  </>
                )}
              </button>

            </div>

            {/* Code Body & Socratic Panel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#27272A]">
              
              {/* Code Editor Viewport */}
              <div className="lg:col-span-7 p-5 bg-[#0D0D10] overflow-x-auto">
                <pre className="font-mono text-xs text-[#E1E1E6] leading-relaxed">
                  <code>{activeSnippet.code}</code>
                </pre>
              </div>

              {/* Output & Socratic AI Feedback */}
              <div className="lg:col-span-5 p-5 bg-[#121214] flex flex-col justify-between gap-4">
                
                {/* Terminal Output */}
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#71717A] mb-2 flex items-center justify-between">
                    <span>Console de Execução Piston</span>
                    <span className="text-[#04D361]">Kernel 6.8</span>
                  </div>
                  <div className="bg-[#09090B] p-3 rounded-lg border border-[#27272A] font-mono text-[11px] text-[#A1A1AA] whitespace-pre-line leading-relaxed">
                    {codeExecutionStep === 'idle' && (
                      <span className="text-[#71717A]">
                        Pressione "Executar Testes" para compilar na sandbox isolada...
                      </span>
                    )}
                    {codeExecutionStep === 'running' && (
                      <span className="text-[#00E5FF] animate-pulse">
                        [SANDBOX] Alocando container cgroups... Compilando suite de testes...
                      </span>
                    )}
                    {codeExecutionStep === 'success' && (
                      <span className="text-[#04D361]">{activeSnippet.output}</span>
                    )}
                  </div>
                </div>

                {/* Socratic Feedback Box */}
                <div className="bg-[#18181B] p-4 rounded-xl border border-[#8257E5]/30 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-2 text-[#996DFF] text-xs font-bold font-mono">
                    <span>⚡ TUTOR SOCRÁTICO (AI ENGINE)</span>
                  </div>
                  <p className="text-xs text-[#D4D4D8] leading-relaxed">
                    {activeSnippet.socraticHint}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-[#71717A] border-t border-[#27272A] pt-2">
                    <span>Nível: Senior System Design</span>
                    <span className="text-[#996DFF] font-mono">Anti-Spoiler Guardrail: Ativo</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Social Proof Tech Bar */}
          <div className="mt-14 text-center">
            <p className="text-xs uppercase tracking-widest font-mono text-[#71717A] mb-6">
              Praticado por engenheiros de software que constroem em empresas como
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-60 text-sm font-mono font-bold text-[#A1A1AA]">
              <span>NUBANK</span>
              <span>MERCADO LIVRE</span>
              <span>STONE</span>
              <span>IFOOD</span>
              <span>BREX</span>
              <span>CLOUDFLARE</span>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. ARQUITETURA DO MOTOR DE EXECUÇÃO (PIPELINE INTERATIVO)                  */}
      {/* ========================================================================= */}
      <section id="arquitetura" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-[#27272A]/80 relative z-10 bg-[#0C0C0E]">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="text-xs font-mono font-bold text-[#00E5FF] uppercase tracking-wider mb-2">
              Infraestrutura de Execução
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              O Pipeline de Engenharia em Tempo Real
            </h2>
            <p className="mt-3 text-sm text-[#A1A1AA]">
              Cada caractere digitado é analisado e executado por uma infraestrutura distribuída projetada para latência sub-50ms.
            </p>
          </div>

          {/* Pipeline Stepper Navigation */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
            {PIPELINE_STAGES.map((s, idx) => (
              <button
                key={s.step}
                type="button"
                onClick={() => setActivePipelineStep(idx)}
                className={`p-4 rounded-xl text-left border transition-all ${
                  activePipelineStep === idx
                    ? 'bg-[#18181B] border-[#8257E5] shadow-[0_0_20px_rgba(130,87,229,0.2)]'
                    : 'bg-[#121214] border-[#27272A] hover:border-[#3F3F46]'
                }`}
              >
                <div className="text-[11px] font-mono text-[#8257E5] font-bold mb-1">
                  ETAPA {s.step}
                </div>
                <div className="text-xs font-bold text-white truncate">{s.title}</div>
              </button>
            ))}
          </div>

          {/* Active Stage Detailed Card */}
          <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-8 max-w-3xl mx-auto relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-bold text-[#00E5FF] uppercase bg-[#00E5FF]/10 px-2.5 py-1 rounded-full border border-[#00E5FF]/20">
                {PIPELINE_STAGES[activePipelineStep].badge}
              </span>
              <span className="text-xs font-mono text-[#71717A]">
                Fase {PIPELINE_STAGES[activePipelineStep].step} de 05
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {PIPELINE_STAGES[activePipelineStep].title}
            </h3>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">
              {PIPELINE_STAGES[activePipelineStep].desc}
            </p>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. OS 4 PILARES DO MOTOR (BENTO GRID)                                     */}
      {/* ========================================================================= */}
      <section id="pilares" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-[#27272A]/80 relative z-10">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="text-xs font-mono font-bold text-[#8257E5] uppercase tracking-wider mb-2">
              Capacidades da Plataforma
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Construído para Engenharia de Alta Precisão
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Card 1: Sandbox Kernel (7 cols) */}
            <div className="md:col-span-7 bg-[#121214] border border-[#27272A] rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-[#00E5FF] mb-2 uppercase">
                  Motor de Execução Isolado
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Sandbox Linux com Containers cgroups v2
                </h3>
                <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed mb-6">
                  Nada de JavaScript simulando linguagens. Seus códigos em Rust, Go e Python rodam em instâncias Linux reais, com restrições rígidas de memória RSS e CPU para reproduzir o comportamento exato de servidores de produção.
                </p>
              </div>
              <div className="bg-[#0D0D10] p-3.5 rounded-xl border border-[#27272A] font-mono text-[11px] text-[#A1A1AA]">
                <div className="text-[#04D361]">✓ Isolamento OCI com seccomp profiles ativos</div>
                <div className="text-[#04D361]">✓ Zero cold-starts: Pools pré-aquecidas em &lt; 18ms</div>
              </div>
            </div>

            {/* Card 2: AI Socrática (5 cols) */}
            <div className="md:col-span-5 bg-[#121214] border border-[#27272A] rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-[#996DFF] mb-2 uppercase">
                  Mentoria Dialética
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Tutor Socrático Anti-Spoiler
                </h3>
                <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed mb-6">
                  O assistente não gera o código para você. Ele inspeciona a AST do seu código, identifica o gargalo lógico ou assintótico e faz perguntas reflexivas para você deduzir a solução.
                </p>
              </div>
              <div className="bg-[#18181B] p-3.5 rounded-xl border border-[#8257E5]/30 text-xs text-[#C4B5FD] font-mono">
                "Qual estrutura garante O(1) médio para lookups concorrentes sem mutex global?"
              </div>
            </div>

            {/* Card 3: Gamificação Técnica (5 cols) */}
            <div className="md:col-span-5 bg-[#121214] border border-[#27272A] rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-[#FFA116] mb-2 uppercase">
                  Progressão & Streaks
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Ligas Semanais & Heatmap Anual
                </h3>
                <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed mb-6">
                  Suba de divisão (Bronze a Challenger) resolvendo desafios com menos tentativas e menor pegada de memória. Acompanhe sua consistência de commits com o Heatmap anual de 52 semanas.
                </p>
              </div>
              <div className="flex items-center justify-between bg-[#0D0D10] p-3.5 rounded-xl border border-[#27272A] text-xs font-mono">
                <span className="text-[#FFA116]">⚡ Liga Diamante • Top 3</span>
                <span className="text-[#04D361]">+450 XP Hoje</span>
              </div>
            </div>

            {/* Card 4: Dossiê Criptográfico (7 cols) */}
            <div className="md:col-span-7 bg-[#121214] border border-[#27272A] rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-[#04D361] mb-2 uppercase">
                  Evidência de Empregabilidade
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Portfólio com Validação Criptográfica SHA-256
                </h3>
                <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed mb-6">
                  Substitua certificados em PDF por um dossiê público auditável. Recrutadores e Tech Leads podem inspecionar a complexidade assintótica, integridade referencial e o log dos testes de cada projeto que você finalizou.
                </p>
              </div>
              <div className="bg-[#0D0D10] p-3.5 rounded-xl border border-[#27272A] font-mono text-[11px] text-[#A1A1AA] flex items-center justify-between">
                <span>HASH: 8f9a2b...c4e1</span>
                <span className="text-[#04D361]">AUTENTICADO NA BLOCKCHAIN NEXUS</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. TRILHAS TÉCNICAS MASTER                                                */}
      {/* ========================================================================= */}
      <section id="trilhas" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-[#27272A]/80 relative z-10 bg-[#0C0C0E]">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="text-xs font-mono font-bold text-[#00E5FF] uppercase tracking-wider mb-2">
              Curriculum de Alto Nível
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              4 Trilhas de Engenharia de Produção
            </h2>
            <p className="mt-3 text-sm text-[#A1A1AA]">
              Projetadas a partir de desafios reais enfrentados por times de engenharia em escala.
            </p>
          </div>

          {/* Track Selector Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {[
              { id: 'distributed', label: 'Sistemas Distribuídos (Rust)', icon: '🦀' },
              { id: 'microservices', label: 'Microsserviços de Alta Vazão (Go)', icon: '🐹' },
              { id: 'frontend', label: 'Arquitetura Frontend (Next.js)', icon: '⚡' },
              { id: 'ai', label: 'Engenharia de IA & LLMs', icon: '🧠' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTrackTab(t.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border ${
                  activeTrackTab === t.id
                    ? 'bg-[#8257E5] border-[#996DFF] text-white shadow-[0_4px_16px_rgba(130,87,229,0.3)]'
                    : 'bg-[#121214] border-[#27272A] text-[#A1A1AA] hover:text-white hover:border-[#3F3F46]'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Active Track Details Box */}
          <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-8 max-w-4xl mx-auto">
            {activeTrackTab === 'distributed' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono text-[#FFA116] uppercase font-bold">Trilha Avançada • 48 Horas de Prática</span>
                  <span className="text-xs text-[#71717A]">4 Módulos • 32 Desafios</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Sistemas Distribuídos & Concorrência com Rust</h3>
                <p className="text-sm text-[#A1A1AA] mb-6">
                  Construa um banco de dados chave-valor distribuído com protocolo de consenso Raft, replicação de logs e recuperação de partição de rede.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-xs text-[#D4D4D8]">
                  <div className="bg-[#18181B] p-3 rounded-lg border border-[#27272A]">✓ Implementação do Algoritmo Raft do zero</div>
                  <div className="bg-[#18181B] p-3 rounded-lg border border-[#27272A]">✓ Memory Safety e Concorrência Lock-Free</div>
                  <div className="bg-[#18181B] p-3 rounded-lg border border-[#27272A]">✓ Armazenamento LSM-Tree com Write-Ahead Log</div>
                  <div className="bg-[#18181B] p-3 rounded-lg border border-[#27272A]">✓ Simulação de Partições de Rede com Jepsen</div>
                </div>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#8257E5] hover:text-[#996DFF] transition-colors"
                >
                  <span>Iniciar Trilha de Rust Gratuitamente</span>
                  <span>→</span>
                </Link>
              </div>
            )}

            {activeTrackTab === 'microservices' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono text-[#00E5FF] uppercase font-bold">Trilha Especializada • 42 Horas de Prática</span>
                  <span className="text-xs text-[#71717A]">4 Módulos • 28 Desafios</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Microsserviços de Alta Vazão & Resiliência em Go</h3>
                <p className="text-sm text-[#A1A1AA] mb-6">
                  Projete um Payment Engine capaz de processar 100.000 requisições por segundo com circuit breaking, rate limiting e tolerância a falhas.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-xs text-[#D4D4D8]">
                  <div className="bg-[#18181B] p-3 rounded-lg border border-[#27272A]">✓ Goroutines e Canais sem vazamento de memória</div>
                  <div className="bg-[#18181B] p-3 rounded-lg border border-[#27272A]">✓ Token Bucket Rate Limiter atômico</div>
                  <div className="bg-[#18181B] p-3 rounded-lg border border-[#27272A]">✓ Event-Driven Architecture com Kafka</div>
                  <div className="bg-[#18181B] p-3 rounded-lg border border-[#27272A]">✓ Observabilidade com OpenTelemetry & Tracing</div>
                </div>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#00E5FF] hover:brightness-125 transition-all"
                >
                  <span>Iniciar Trilha de Go Gratuitamente</span>
                  <span>→</span>
                </Link>
              </div>
            )}

            {activeTrackTab === 'frontend' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono text-[#04D361] uppercase font-bold">Trilha Master • 36 Horas de Prática</span>
                  <span className="text-xs text-[#71717A]">3 Módulos • 24 Desafios</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Arquitetura Frontend de Próxima Geração & Next.js</h3>
                <p className="text-sm text-[#A1A1AA] mb-6">
                  Desenvolva aplicações web de alta fidelidade com Server Components, Streaming SSR, State Machines e performance 100/100 no Lighthouse.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-xs text-[#D4D4D8]">
                  <div className="bg-[#18181B] p-3 rounded-lg border border-[#27272A]">✓ Hydration Boundaries & React Server Actions</div>
                  <div className="bg-[#18181B] p-3 rounded-lg border border-[#27272A]">✓ Renderização Canvas 2D/WebGL de alta taxa de quadros</div>
                  <div className="bg-[#18181B] p-3 rounded-lg border border-[#27272A]">✓ Arquitetura de Estado com Finite State Machines</div>
                  <div className="bg-[#18181B] p-3 rounded-lg border border-[#27272A]">✓ Web IDE colaborativa em tempo real com WebSockets</div>
                </div>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#04D361] hover:brightness-125 transition-all"
                >
                  <span>Iniciar Trilha de Next.js Gratuitamente</span>
                  <span>→</span>
                </Link>
              </div>
            )}

            {activeTrackTab === 'ai' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono text-[#996DFF] uppercase font-bold">Trilha de Vanguarda • 40 Horas de Prática</span>
                  <span className="text-xs text-[#71717A]">4 Módulos • 26 Desafios</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Engenharia de IA & Sistemas Socráticos</h3>
                <p className="text-sm text-[#A1A1AA] mb-6">
                  Construa agentes autônomos de code review com AST parsers, RAG vetorial determinístico e guardrails estritos anti-alucinação.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-xs text-[#D4D4D8]">
                  <div className="bg-[#18181B] p-3 rounded-lg border border-[#27272A]">✓ Análise Estática de Código com Babel & Tree-sitter</div>
                  <div className="bg-[#18181B] p-3 rounded-lg border border-[#27272A]">✓ RAG Semântico com Qdrant / pgvector</div>
                  <div className="bg-[#18181B] p-3 rounded-lg border border-[#27272A]">✓ Saídas JSON estritas com Pydantic & Instructor</div>
                  <div className="bg-[#18181B] p-3 rounded-lg border border-[#27272A]">✓ Streaming SSE de Tokens com baixa latência</div>
                </div>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#996DFF] hover:brightness-125 transition-all"
                >
                  <span>Iniciar Trilha de IA Gratuitamente</span>
                  <span>→</span>
                </Link>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. PROJETOS CAPSTONE MASTER (O QUE VOCÊ CONSTRÓI)                          */}
      {/* ========================================================================= */}
      <section id="projetos" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-[#27272A]/80 relative z-10">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="text-xs font-mono font-bold text-[#04D361] uppercase tracking-wider mb-2">
              Portfólio de Engenharia
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Projetos Reais que Validam sua Senioridade
            </h2>
            <p className="mt-3 text-sm text-[#A1A1AA]">
              Sistemas de produção completos que você desenvolve, testa sob carga e publica com assinatura digital.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-7 hover:border-[#8257E5]/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-[#FFA116] font-bold">Rust • Distributed Systems</span>
                <span className="text-[11px] text-[#71717A]">Projeto Capstone 01</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">NexusDB: Distributed Raft KV Store</h3>
              <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed mb-4">
                Implementação de consenso Raft em Rust com eleição de líder, replicação contínua de logs em disco via WAL e tolerância a partições de rede com teste Jepsen.
              </p>
              <div className="text-[11px] font-mono text-[#8257E5]">
                Complexidade: Líder Eleito em &lt; 150ms • Zero Perda de Dados
              </div>
            </div>

            <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-7 hover:border-[#00E5FF]/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-[#00E5FF] font-bold">Go • High-Concurrency</span>
                <span className="text-[11px] text-[#71717A]">Projeto Capstone 02</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">NexusPay: 100k req/s Payment Engine</h3>
              <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed mb-4">
                Motor de processamento financeiro em Go com atomic ring buffers, rate limiting determinístico, dead-letter queues Kafka e persistência concorrente sem deadlocks.
              </p>
              <div className="text-[11px] font-mono text-[#00E5FF]">
                Throughput: 124.000 req/s • P99 Latency &lt; 2.1ms
              </div>
            </div>

            <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-7 hover:border-[#04D361]/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-[#04D361] font-bold">Next.js 14 • Realtime Web</span>
                <span className="text-[11px] text-[#71717A]">Projeto Capstone 03</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">NexusStudio: Collaborative Web IDE</h3>
              <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed mb-4">
                Ambiente de desenvolvimento completo no browser com Monaco Editor, sincronização de cursores multi-usuário via CRDTs (Yjs) e streaming de logs via WebSockets.
              </p>
              <div className="text-[11px] font-mono text-[#04D361]">
                Web Vitals: 100/100 • 60 FPS Canvas Rendering
              </div>
            </div>

            <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-7 hover:border-[#996DFF]/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-[#996DFF] font-bold">Python • AI Systems</span>
                <span className="text-[11px] text-[#71717A]">Projeto Capstone 04</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">SocraticReview: Autonomous Code Reviewer</h3>
              <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed mb-4">
                Agente de auditoria de código que analisa diffs no Git, extrai ASTs para detectar falhas de concorrência e gera apontamentos socráticos estruturados em JSON estrito.
              </p>
              <div className="text-[11px] font-mono text-[#996DFF]">
                Zero Alucinações • AST Parsers + Vector RAG
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. DEPOIMENTOS DE ENGENHEIROS                                             */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-[#27272A]/80 relative z-10 bg-[#0C0C0E]">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="text-xs font-mono font-bold text-[#996DFF] uppercase tracking-wider mb-2">
              Resultados de Carreira
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              O que dizem os desenvolvedores que praticam diariamente
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-6 flex flex-col justify-between">
              <p className="text-xs sm:text-sm text-[#D4D4D8] leading-relaxed mb-6">
                "Eu já tinha assistido a vários cursos de Go e ainda travava em race conditions sob concorrência real. Na trilha de microsserviços do NEXUS CODE, o teste de stress quebrou meu código em 10 segundos e o tutor socrático me fez entender channels de verdade."
              </p>
              <div className="flex items-center gap-3 border-t border-[#27272A] pt-4">
                <div className="w-10 h-10 rounded-full bg-[#8257E5]/20 border border-[#8257E5] flex items-center justify-center text-xs font-bold text-white">
                  RL
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Rodrigo Lima</div>
                  <div className="text-[11px] text-[#71717A]">Software Engineer @ Stone</div>
                </div>
              </div>
            </div>

            <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-6 flex flex-col justify-between">
              <p className="text-xs sm:text-sm text-[#D4D4D8] leading-relaxed mb-6">
                "A diferença do tutor socrático para assistentes comuns é que ele não entrega a resposta pronta. Ele aponta o gargalo assintótico da busca e força você a deduzir a estrutura de dados correta. Foi fundamental para minhas entrevistas técnicas."
              </p>
              <div className="flex items-center gap-3 border-t border-[#27272A] pt-4">
                <div className="w-10 h-10 rounded-full bg-[#00E5FF]/20 border border-[#00E5FF] flex items-center justify-center text-xs font-bold text-white">
                  CM
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Camila Mendes</div>
                  <div className="text-[11px] text-[#71717A]">Backend Lead @ Nubank</div>
                </div>
              </div>
            </div>

            <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-6 flex flex-col justify-between">
              <p className="text-xs sm:text-sm text-[#D4D4D8] leading-relaxed mb-6">
                "O portfólio auditável com hash SHA-256 e commits no Git foi o diferencial na minha contratação internacional. O Tech Lead pôde inspecionar a complexidade dos testes de Raft e o código de concorrência diretamente."
              </p>
              <div className="flex items-center gap-3 border-t border-[#27272A] pt-4">
                <div className="w-10 h-10 rounded-full bg-[#04D361]/20 border border-[#04D361] flex items-center justify-center text-xs font-bold text-white">
                  GS
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Gabriel Santoro</div>
                  <div className="text-[11px] text-[#71717A]">Systems Engineer @ Brex</div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. PRICING & PLANOS                                                       */}
      {/* ========================================================================= */}
      <section id="precos" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-[#27272A]/80 relative z-10">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="text-xs font-mono font-bold text-[#8257E5] uppercase tracking-wider mb-2">
              Investimento Transparente
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Planos simples para acelerar sua carreira
            </h2>
            <p className="mt-3 text-sm text-[#A1A1AA]">
              Comece gratuitamente no navegador. Cancele a qualquer momento com 1 clique.
            </p>

            {/* Toggle Anual / Mensal */}
            <div className="mt-6 inline-flex items-center gap-3 bg-[#18181B] p-1 rounded-xl border border-[#27272A]">
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  billingCycle === 'annual'
                    ? 'bg-[#8257E5] text-white shadow-sm'
                    : 'text-[#71717A] hover:text-white'
                }`}
              >
                Anual (2 meses grátis)
              </button>
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-[#8257E5] text-white shadow-sm'
                    : 'text-[#71717A] hover:text-white'
                }`}
              >
                Mensal
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Free */}
            <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-[#71717A]">EXPLORER</div>
                <div className="text-3xl font-extrabold text-white mt-2">R$ 0</div>
                <p className="text-xs text-[#A1A1AA] mt-2">Para experimentar os primeiros módulos e o terminal interativo.</p>
                <div className="mt-6 space-y-2.5 text-xs text-[#EDEDED]">
                  <div>✓ +30 Desafios Fundamentais</div>
                  <div>✓ Sandbox Linux Piston</div>
                  <div>✓ Acesso à Liga Bronze</div>
                  <div className="text-[#71717A]">✕ Tutor IA Socrático Ilimitado</div>
                  <div className="text-[#71717A]">✕ Portfólio SHA-256 Auditável</div>
                </div>
              </div>
              <Link
                href="/register"
                className="mt-8 w-full bg-[#18181B] hover:bg-[#202024] text-white border border-[#27272A] font-semibold text-xs py-3 rounded-xl transition-all text-center block"
              >
                Criar Conta Gratuita
              </Link>
            </div>

            {/* Pro Engineer (Featured) */}
            <div className="bg-[#18181B] border-2 border-[#8257E5] rounded-2xl p-7 flex flex-col justify-between shadow-[0_0_40px_rgba(130,87,229,0.25)] relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#8257E5] to-[#04D361] text-white text-[10px] font-mono font-black px-3 py-0.5 rounded-full uppercase">
                RECOMENDADO
              </div>
              <div>
                <div className="text-xs font-mono font-bold text-[#996DFF]">PRO ENGINEER</div>
                <div className="text-4xl font-extrabold text-white mt-2">
                  {billingCycle === 'annual' ? 'R$ 39' : 'R$ 49'}
                  <span className="text-xs font-normal text-[#71717A]"> / mês</span>
                </div>
                <p className="text-xs text-[#A1A1AA] mt-2">Para quem busca autonomia técnica e preparação para vagas de alto nível.</p>
                <div className="mt-6 space-y-2.5 text-xs">
                  <div className="font-semibold text-white">✓ Acesso total a todas as 4 Trilhas Master</div>
                  <div className="font-semibold text-[#04D361]">✓ Tutor IA Socrático Ilimitado 24/7</div>
                  <div className="font-semibold text-[#04D361]">✓ Portfólio de Evidências com Hash SHA-256</div>
                  <div className="font-semibold text-[#04D361]">✓ Suporte a Concorrência & Stress Tests</div>
                  <div className="font-semibold text-[#00E5FF]">✓ Destaque nas Ligas Semanais</div>
                </div>
              </div>
              <Link
                href="/register"
                className="mt-8 w-full bg-gradient-to-r from-[#8257E5] to-[#996DFF] hover:brightness-110 text-white font-bold text-sm py-3.5 rounded-xl transition-all text-center block shadow-[0_4px_20px_rgba(130,87,229,0.4)]"
              >
                Começar Agora ⚡
              </Link>
            </div>

            {/* Enterprise */}
            <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-[#71717A]">ENTERPRISE & TIMES</div>
                <div className="text-3xl font-extrabold text-white mt-2">Custom</div>
                <p className="text-xs text-[#A1A1AA] mt-2">Para times de engenharia, tech academies e bootcamps corporativos.</p>
                <div className="mt-6 space-y-2.5 text-xs text-[#EDEDED]">
                  <div>✓ Painel de Gestão de Equipes</div>
                  <div>✓ Desafios Customizados da Empresa</div>
                  <div>✓ SSO / SAML & Segurança SOC-2</div>
                  <div>✓ Relatórios de Performance de Engenharia</div>
                </div>
              </div>
              <a
                href="mailto:enterprise@nexuscode.dev"
                className="mt-8 w-full bg-[#18181B] hover:bg-[#202024] text-white border border-[#27272A] font-semibold text-xs py-3 rounded-xl transition-all text-center block"
              >
                Falar com Engenharia
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. FAQ                                                                   */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-[#27272A]/80 relative z-10 bg-[#0C0C0E]">
        <div className="max-w-3xl mx-auto">
          
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'Preciso instalar Docker, compiladores ou ferramentas pesadas na minha máquina?',
                a: 'Não. Todo o código que você escreve é enviado via WebSocket e executado em containers Linux isolados com cgroups em nossos servidores. Você tem a experiência completa de um terminal Linux sem precisar configurar nada localmente.'
              },
              {
                q: 'Como funciona o Tutor Socrático e por que ele não me dá a resposta pronta?',
                a: 'Diferente de assistentes genéricos que escrevem o código por você (o que impede o aprendizado real), nosso modelo é calibrado para agir como um Tech Lead sênior: ele diagnostica o erro conceitual, analisa a complexidade Big-O e formula perguntas que conduzem você à solução por dedução própria.'
              },
              {
                q: 'A plataforma é indicada para quem está no nível Júnior ou Pleno?',
                a: 'Sim. A plataforma possui desafios que cobrem desde estruturas de dados fundamentais até arquiteturas avançadas de concorrência. Se você já programa em qualquer linguagem e quer atingir autonomia técnica de nível pleno/sênior, o NEXUS CODE foi feito para você.'
              },
              {
                q: 'Como o portfólio criptográfico SHA-256 é verificado por recrutadores?',
                a: 'Cada módulo concluído gera uma página pública de auditoria criptográfica. O recrutador pode inspecionar seu histórico de submissões, tempo de execução dos testes e competências validadas diretamente em uma URL pública de verificação.'
              }
            ].map((faq, idx) => (
              <div
                key={idx}
                className="bg-[#121214] border border-[#27272A] rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between text-xs sm:text-sm font-semibold text-white hover:text-[#996DFF] transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className="text-base text-[#71717A] ml-2">
                    {openFaq === idx ? '−' : '+'}
                  </span>
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-4 text-xs text-[#A1A1AA] leading-relaxed border-t border-[#27272A] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11. FOOTER                                                                */}
      {/* ========================================================================= */}
      <footer className="border-t border-[#27272A] bg-[#09090B] py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-3">
            <Logo size="sm" href="/" />
            <div className="text-xs text-[#71717A] hidden md:block">
              © 2026 NEXUS CODE. Código se aprende executando. Maestria se constrói pensando.
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#71717A]">
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <Link href="/ide" className="hover:text-white transition-colors">Playground</Link>
            <Link href="/login" className="hover:text-white transition-colors">Entrar</Link>
            <Link href="/register" className="hover:text-white transition-colors">Cadastrar</Link>
            <a href="mailto:contato@nexuscode.dev" className="hover:text-white transition-colors">Suporte</a>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-[#04D361] bg-[#121214] px-3 py-1.5 rounded-full border border-[#27272A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#04D361] animate-pulse" />
            <span>Piston Engine: 18ms (Operational)</span>
          </div>

        </div>
      </footer>

    </div>
  );
}
