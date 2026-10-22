{/* Sprint 10 · B34 — fatiado do antigo page.tsx monolítico ('use client' integral, 1.767 linhas): esta seção é Server Component; o estado interativo vive nas ilhas client. */}
{/* B49/P2 (Sprint 16) — a seção foi reestruturada em duas partes
    honestas: DISPONÍVEL AGORA (os 2 cursos reais do catálogo, com os
    títulos/descrições do seed e entrada real para /courses) e NO
    RADAR (as trilhas da ementa, rotuladas como roadmap — roteiro
    planejado, sem datas — com lista de espera por trilha e contador
    público real vindo da API). A vitrine não vende mais como curso
    o que ainda é plano. */}
import React from 'react';
import { TrackedLink } from './TrackedLink';
import { TracksCarousel } from './TracksCarousel';
import { TrackWaitlistForm } from './TrackWaitlistForm';
import { IconMap, TrackCoverGo, TrackCoverPython, TrackCoverRust, TrackCoverWeb } from './icons';

/* Cursos REAIS do catálogo hoje — espelho do seed oficial
   (scripts/seed-data.mjs): título e descrição idênticos aos do
   banco; a listagem viva e a matrícula acontecem em /courses. */
const AVAILABLE_COURSES = [
  {
    slug: 'algoritmos-javascript',
    title: 'Algoritmos e Estruturas em JavaScript',
    description:
      'Aprenda os fundamentos de lógica e estruturas de dados essenciais através de exercícios práticos.',
    meta: 'JavaScript · Nível Iniciante',
    accent: 'bg-brand-green-neon',
  },
  {
    slug: 'introducao-python',
    title: 'Introdução à Programação com Python',
    description:
      'Domine a sintaxe limpa do Python, funções, laços e manipulação de listas.',
    meta: 'Python · Nível Iniciante',
    accent: 'bg-brand-purple',
  },
];

export const TracksSection: React.FC = () => (
  <>
  {/* 4. TRILHAS & ROADMAP — ordem dos cards do radar:
      1: Rust (Âmbar) | 2: Go (Ciano) | 3: Next.js (Esmeralda) | 4: Python/IA (Roxo) */}
  <section id="trilhas" className="relative z-10 py-24 border-t border-border-2/70">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14 px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto">
      <div className="max-w-2xl text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-amber/10 border border-brand-amber/30 text-brand-amber text-xs font-mono font-bold mb-3">
          <IconMap className="w-4 h-4" />
          <span>CATÁLOGO REAL & ROADMAP PÚBLICO</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-ink-heading tracking-tight mb-4">
          Comece hoje. O resto está no radar.
        </h2>
        <p className="text-base sm:text-lg text-ink-body leading-relaxed font-sans">
          A Nexus Code está em construção — e a gente mostra o canteiro. Abaixo estão os cursos
          que você já pode fazer agora e, separados com clareza, as trilhas que estão no nosso
          radar: roteiro planejado, sem datas prometidas. Quer uma delas? Entre na lista da
          trilha e te avisamos quando ela abrir — a demanda das listas decide a ordem de construção.
        </p>
      </div>

      <div className="hidden lg:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-surface-2 border border-border-1 text-body-sm font-mono text-ink-body">
        <span>Arraste para explorar o radar</span>
        <span className="text-brand-cyan-neon font-bold">→</span>
      </div>
    </div>

    {/* DISPONÍVEL AGORA — os 2 cursos reais do catálogo */}
    <div className="px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto mb-20">
      <div className="flex items-center gap-2.5 mb-6">
        <span className="w-2 h-2 rounded-full bg-brand-green-neon" />
        <span className="text-xs font-mono font-black tracking-widest text-brand-green-neon uppercase">
          Disponível agora — no catálogo, de verdade
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {AVAILABLE_COURSES.map((course) => (
          <article
            key={course.slug}
            className="relative flex flex-col justify-between bg-surface-1 border border-border-2 hover:border-brand-green/60 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full border border-brand-green/40 bg-brand-green/10 text-brand-green-neon">
                  DISPONÍVEL
                </span>
                <span className="text-xs font-mono text-ink-span">{course.meta}</span>
              </div>
              <h3 className="text-lg font-heading font-bold text-ink-heading tracking-tight mb-2">
                {course.title}
              </h3>
              <p className="text-body-sm text-ink-span leading-relaxed font-sans mb-6">
                {course.description}
              </p>
            </div>
            <TrackedLink
              href="/courses"
              ctaId={`curso_disponivel_${course.slug}`}
              event="trilha_cta"
              eventProps={{ course: course.slug }}
              className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm font-mono font-bold whitespace-nowrap transition-all duration-200 active:scale-95 border border-transparent shadow-md shadow-brand-purple/25"
            >
              <span>Ver no catálogo e começar</span>
            </TrackedLink>
          </article>
        ))}
      </div>
    </div>

    {/* NO RADAR — trilhas da ementa como roadmap rotulado */}
    <div className="px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto mb-10">
      <div className="flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-brand-amber" />
        <span className="text-xs font-mono font-black tracking-widest text-brand-amber uppercase">
          No radar — trilhas em estudo, sem datas
        </span>
      </div>
      <p className="text-body-sm text-ink-span font-sans leading-relaxed mt-3 max-w-2xl">
        Estes cards são o roteiro planejado de cada trilha (da ementa do produto), não cursos
        abertos. Nada aqui tem data de lançamento: o compromisso é avisar quem estiver na lista
        de cada trilha quando ela sair do radar.
      </p>
    </div>


    {/* CARROSSEL HORIZONTAL COM SCROLL SNAP (10% À ESQUERDA) —
        B47 (Sprint 15): contêiner de scroll, sombras e dots vivem na
        ilha client TracksCarousel; os cards seguem renderizados
        aqui, no servidor, e entram como filhos dela. */}
    <TracksCarousel labels={['Rust', 'Go', 'React & Next.js', 'Python & IA']}>

        {/* TRILHA 1: Rust — Lógica & Alta Performance */}
        <article
          className="group relative flex flex-col justify-between bg-surface-1 border border-border-2 hover:border-brand-amber/60 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-amber shrink-0 w-[338px]"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div>
            <span className="inline-block text-xs font-mono font-black px-2.5 py-0.5 rounded-full border border-brand-amber/40 bg-brand-amber/10 text-brand-amber mb-3">
              NO RADAR
            </span>
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
              O roteiro em estudo começa do primeiro <code className="text-brand-amber bg-brand-amber/10 px-1 rounded">println!</code> e avança até a resolução de problemas reais: pensar como programador e escrever código rápido e sem erros de memória.
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
                Carga horária não entra: a ementa não a declara.
                B49/P2 (Sprint 16) — sob o selo NO RADAR, os números são
                apresentados como o que são: ROTEIRO PLANEJADO da
                ementa em estudo, não o conteúdo de um curso aberto. */}
            <div className="mb-4 space-y-1 border-t border-border-1/60 pt-3 font-mono text-body-sm text-ink-span">
              <div className="text-ink-body font-bold">Roteiro planejado:</div>
              <div>4 módulos · 7 desafios práticos</div>
              {/* Sprint 7 — capstone em linguagem de resultado: o destaque
                  é o que o aluno constrói; o nome técnico vira subtítulo */}
              <div>Projeto final planejado: <span className="font-bold text-ink-heading">Banco de dados distribuído próprio</span></div>
              <div>NexusDB Distribuído</div>
            </div>
          </div>

          {/* Rodapé: nível planejado + lista de espera da trilha
              (B49/P2 — o CTA de cadastro que prometia trilha
              inexistente saiu; quem quer esta trilha entra na lista) */}
          <div className="pt-3.5 border-t border-border-1/80 flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-amber"></span>
              <span className="text-xs font-mono text-ink-span">Percurso planejado: Do Zero ao Avançado</span>
            </div>
            <TrackWaitlistForm track="rust" />
          </div>
        </article>

        {/* TRILHA 2: Go — APIs & Backend Moderno */}
        <article
          className="group relative flex flex-col justify-between bg-surface-1 border border-border-2 hover:border-brand-cyan-neon/60 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-cyan shrink-0 w-[338px]"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div>
            <span className="inline-block text-xs font-mono font-black px-2.5 py-0.5 rounded-full border border-brand-cyan-neon/40 bg-brand-cyan-neon/10 text-brand-cyan-neon mb-3">
              NO RADAR
            </span>
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
              O plano: construir backends em Go — rotas HTTP rápidas, conexão com bancos de dados PostgreSQL e deploy de microsserviços.
            </p>

            {/* Tecnologias & Conteúdos-Chave */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">REST APIs</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">PostgreSQL</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">Docker</span>
              <span className="bg-brand-cyan-neon/10 border border-brand-cyan-neon/30 text-brand-cyan-neon text-body-sm font-mono px-2 py-0.5 rounded-md">Go 1.22</span>
            </div>

            {/* Sprint 6 — números da ementa oficial do produto
                (CURRICULUM-AND-PEDAGOGY-SPEC.md, seção 3, Trilha 2).
                B49/P2 — apresentados como roteiro planejado (radar). */}
            <div className="mb-4 space-y-1 border-t border-border-1/60 pt-3 font-mono text-body-sm text-ink-span">
              <div className="text-ink-body font-bold">Roteiro planejado:</div>
              <div>4 módulos · 4 desafios práticos</div>
              <div>Projeto final planejado: <span className="font-bold text-ink-heading">Motor de pagamentos de alta vazão</span></div>
              <div>High-Throughput Payment Engine</div>
            </div>
          </div>

          {/* Rodapé: nível planejado + lista de espera (B49/P2) */}
          <div className="pt-3.5 border-t border-border-1/80 flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-cyan-neon"></span>
              <span className="text-xs font-mono text-ink-span">Nível planejado: Intermediário</span>
            </div>
            <TrackWaitlistForm track="go" />
          </div>
        </article>

        {/* TRILHA 3: React & Next.js — Desenvolvimento Web */}
        <article
          className="group relative flex flex-col justify-between bg-surface-1 border border-border-2 hover:border-brand-green/60 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-green shrink-0 w-[338px]"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div>
            <span className="inline-block text-xs font-mono font-black px-2.5 py-0.5 rounded-full border border-brand-green/40 bg-brand-green/10 text-brand-green-neon mb-3">
              NO RADAR
            </span>
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
              O roteiro prevê criar sites modernos e interativos com TypeScript, Tailwind e Next.js, em projetos práticos do início ao deploy.
            </p>

            {/* Tecnologias & Conteúdos-Chave */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">React 18</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">Next.js 14</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">TypeScript</span>
              <span className="bg-brand-green/10 border border-brand-green/30 text-brand-green-neon text-body-sm font-mono px-2 py-0.5 rounded-md">Tailwind CSS</span>
            </div>

            {/* Sprint 6 — números da ementa oficial do produto
                (CURRICULUM-AND-PEDAGOGY-SPEC.md, seção 3, Trilha 3).
                B49/P2 — apresentados como roteiro planejado (radar). */}
            <div className="mb-4 space-y-1 border-t border-border-1/60 pt-3 font-mono text-body-sm text-ink-span">
              <div className="text-ink-body font-bold">Roteiro planejado:</div>
              <div>3 módulos · 3 desafios práticos</div>
              <div>Projeto final planejado: <span className="font-bold text-ink-heading">IDE web colaborativa em tempo real</span></div>
              <div>Web IDE Colaborativa em Tempo Real</div>
            </div>
          </div>

          {/* Rodapé: nível planejado + lista de espera (B49/P2) */}
          <div className="pt-3.5 border-t border-border-1/80 flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-green-neon"></span>
              <span className="text-xs font-mono text-ink-span">Percurso planejado: Do Zero ao Deploy</span>
            </div>
            <TrackWaitlistForm track="web" />
          </div>
        </article>

        {/* TRILHA 4: Python & Inteligência Artificial */}
        <article
          className="group relative flex flex-col justify-between bg-surface-1 border border-border-2 hover:border-brand-purple/60 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-accent-purple shrink-0 w-[338px]"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div>
            <span className="inline-block text-xs font-mono font-black px-2.5 py-0.5 rounded-full border border-brand-purple/40 bg-brand-purple/10 text-brand-purple-light mb-3">
              NO RADAR
            </span>
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
              O plano parte de scripts básicos em Python e avança até agentes com LLMs que leem arquivos, resolvem tarefas e integram APIs.
            </p>

            {/* Tecnologias & Conteúdos-Chave */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">Python 3.12</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">OpenAI API</span>
              <span className="bg-surface-2 border border-border-1 text-ink-body text-body-sm font-mono px-2 py-0.5 rounded-md">LangChain</span>
              <span className="bg-brand-purple/10 border border-brand-purple/30 text-brand-purple-light text-body-sm font-mono px-2 py-0.5 rounded-md">Automações</span>
            </div>

            {/* Sprint 6 — números da ementa oficial do produto
                (CURRICULUM-AND-PEDAGOGY-SPEC.md, seção 3, Trilha 4).
                B49/P2 — apresentados como roteiro planejado (radar).
                Nota: esta é a trilha AVANÇADA de Python & IA da ementa;
                o curso de Python que já está no ar é o introdutório,
                no bloco Disponível Agora acima. */}
            <div className="mb-4 space-y-1 border-t border-border-1/60 pt-3 font-mono text-body-sm text-ink-span">
              <div className="text-ink-body font-bold">Roteiro planejado:</div>
              <div>3 módulos · 3 desafios práticos</div>
              <div>Projeto final planejado: <span className="font-bold text-ink-heading">Revisor de código autônomo com IA</span></div>
              <div>Autonomous Socratic Code Reviewer</div>
            </div>
          </div>

          {/* Rodapé: nível planejado + lista de espera (B49/P2) */}
          <div className="pt-3.5 border-t border-border-1/80 flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
              <span className="text-xs font-mono text-ink-span">Percurso planejado: Do Zero ao Avançado</span>
            </div>
            <TrackWaitlistForm track="python-ia" />
          </div>
        </article>

    </TracksCarousel>
  </section>
  </>
);
