{/* Sprint 10 · B34 — fatiado do antigo page.tsx monolítico ('use client' integral, 1.767 linhas): esta seção é Server Component; o estado interativo vive nas ilhas client. */}
{/* B49/P2 (Sprint 16) — a seção foi reestruturada em duas partes
    honestas: DISPONÍVEL AGORA (os cursos reais do catálogo) e NO
    RADAR (as trilhas da ementa, rotuladas como roadmap — roteiro
    planejado, sem datas — com lista de espera por trilha e contador
    público real vindo da API). A vitrine não vende mais como curso
    o que ainda é plano.
    B74 (Sprint 18 · Volta 3 · TL M1) — o DISPONÍVEL AGORA deixou de
    ser o espelho hardcoded do seed (AVAILABLE_COURSES): consome o
    catálogo público da API com ISR e FALLBACK HONESTO (sem resposta,
    mostra a indisponibilidade e o caminho para /courses — nunca uma
    lista velha). B69 (Designer M2 · PM M1) — os cards disponíveis
    ganham o acabamento dos cards do radar (capa, sombra de acento) e
    o merchandising real do catálogo: contagem de atividades e a
    ementa (títulos reais), com CTA para a página do curso. */}
import React from 'react';
import { MaterialIcon } from '../MaterialIcon';
import { TrackedLink } from './TrackedLink';
import { TracksCarousel } from './TracksCarousel';
import { TrackWaitlistForm } from './TrackWaitlistForm';
import { IconMap, TrackCoverGo, TrackCoverPython, TrackCoverRust, TrackCoverWeb } from './icons';
import {
  courseLanguage,
  fetchPublicCatalog,
  languageLabel,
  type CatalogCourse,
} from '../../lib/catalog';

/* Acabamento por linguagem dos cards DISPONÍVEIS — o mesmo repertório
   visual dos cards do radar (capa com gradiente + arte vetorial +
   sombra de acento no hover). Classes completas e estáticas: o JIT do
   Tailwind não enxerga classes montadas por interpolação. */
interface CourseVisual {
  hoverBorder: string;
  hoverShadow: string;
  gradient: string;
  blob: string;
  coverBorder: string;
  titleHover: string;
  Cover: React.ComponentType;
}

const COURSE_VISUALS: Record<string, CourseVisual> = {
  javascript: {
    hoverBorder: 'hover:border-brand-green/60',
    hoverShadow: 'hover:shadow-accent-green',
    gradient: 'from-brand-green/10',
    blob: 'bg-brand-green-neon/20 group-hover:bg-brand-green-neon/30',
    coverBorder: 'border-brand-green/30 group-hover:border-brand-green/40',
    titleHover: 'group-hover:text-brand-green-neon',
    Cover: TrackCoverWeb,
  },
  python: {
    hoverBorder: 'hover:border-brand-purple/60',
    hoverShadow: 'hover:shadow-accent-purple',
    gradient: 'from-brand-purple/10',
    blob: 'bg-brand-purple/20 group-hover:bg-brand-purple/30',
    coverBorder: 'border-brand-purple/30 group-hover:border-brand-purple/40',
    titleHover: 'group-hover:text-brand-purple-light',
    Cover: TrackCoverPython,
  },
};

const DEFAULT_COURSE_VISUAL = COURSE_VISUALS.python;

const AvailableCourseCard: React.FC<{ course: CatalogCourse }> = ({ course }) => {
  const language = courseLanguage(course);
  const visual = (language && COURSE_VISUALS[language]) || DEFAULT_COURSE_VISUAL;
  const { Cover } = visual;
  return (
    <article
      className={`group relative flex flex-col justify-between bg-surface-1 border border-border-2 ${visual.hoverBorder} rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 ${visual.hoverShadow}`}
    >
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full border border-brand-green/40 bg-brand-green/10 text-brand-green-neon">
            DISPONÍVEL
          </span>
          <span className="text-xs font-mono text-ink-span">
            {languageLabel(language)} · {course.activityCount}{' '}
            {course.activityCount === 1 ? 'atividade prática' : 'atividades práticas'}
          </span>
        </div>
        {/* Capa — o mesmo acabamento dos cards do radar (B69). */}
        <div className="relative h-36 w-full rounded-xl overflow-hidden bg-surface-1 border border-border-1 mb-4 flex items-center justify-center select-none transition-colors">
          <div className={`absolute inset-0 bg-gradient-to-br ${visual.gradient} via-transparent to-black/30 pointer-events-none`} />
          <div className={`absolute -top-8 -right-8 w-36 h-36 ${visual.blob} rounded-full blur-2xl pointer-events-none transition-all duration-500`} />
          <div className={`relative z-10 w-20 h-20 rounded-xl bg-surface-1/90 border ${visual.coverBorder} flex items-center justify-center p-2 shadow-xl group-hover:scale-110 transition-transform duration-300`}>
            <Cover />
          </div>
        </div>
        <h3 className={`text-base font-heading font-bold text-ink-heading tracking-tight ${visual.titleHover} transition-colors mb-1`}>
          {course.title}
        </h3>
        <p className="text-body-sm text-ink-span leading-relaxed font-sans mb-4">
          {course.description}
        </p>
        {/* Merchandising REAL do catálogo (B69): a ementa é a lista de
            atividades que a API devolve — nada de número estimado. */}
        {course.activities.length > 0 && (
          <div className="mb-4 space-y-1 border-t border-border-1/60 pt-3 font-mono text-body-sm text-ink-span">
            <div className="text-ink-body font-bold">Você vai praticar:</div>
            {course.activities.map((activity) => (
              <div key={activity.title}>{activity.title}</div>
            ))}
          </div>
        )}
      </div>
      <TrackedLink
        href={`/courses/${course.slug}`}
        ctaId={`curso_disponivel_${course.slug}`}
        event="trilha_cta"
        eventProps={{ course: course.slug }}
        className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm font-mono font-bold whitespace-nowrap transition-all duration-200 active:scale-95 border border-transparent shadow-md shadow-brand-purple/25"
      >
        <span>Ver o curso e começar</span>
      </TrackedLink>
    </article>
  );
};

/* Central 216 r3 (Q-3) — "Trilhas estruturadas para cada momento" do
   protótipo Stitch v2 (home-desktop.html §3): os 3 níveis Iniciante
   (100% Grátis) / Júnior / Pleno com "O que você aprende". Sem
   números inventados: só níveis, planos e os tópicos do protótipo —
   nada de carga horária, nº de alunos ou datas. CTAs: Iniciante →
   /register (começar grátis); Júnior/Pleno → #precos (a seção de
   planos da home; o protótipo aponta #planos, âncora que não existe
   no app). */
interface StructuredTrack {
  level: string;
  plan: string;
  name: string;
  description: string;
  items: string[];
  ctaLabel: string;
  ctaHref: string;
  ctaId: string;
  featured?: boolean;
}

const STRUCTURED_TRACKS: StructuredTrack[] = [
  {
    level: 'Nível 1',
    plan: '100% Grátis',
    name: 'Iniciante',
    description:
      'Para quem nunca escreveu uma única linha de código e quer entender a lógica dos computadores de forma intuitiva.',
    items: [
      'Fundamentos de lógica de programação',
      'Variáveis, condicionais e estruturas de repetição',
      'Resolução de problemas em formato de jogo',
      'Construção dos primeiros pequenos programas',
    ],
    ctaLabel: 'Começar trilha grátis',
    ctaHref: '/register',
    ctaId: 'trilha_estruturada_iniciante',
  },
  {
    level: 'Nível 2',
    plan: 'Plano Pro',
    name: 'Júnior',
    description:
      'Construa sua base para ingressar no mercado profissional desenvolvendo aplicações web completas e APIs.',
    items: [
      'JavaScript moderno, TypeScript e manipulação do DOM',
      'Criação de APIs REST com Node.js e banco de dados',
      'Controle de versão com Git e fluxo de trabalho em equipe',
      'Simulações de entrevistas técnicas e revisão de código por IA',
    ],
    ctaLabel: 'Desbloquear trilha Júnior',
    ctaHref: '#precos',
    ctaId: 'trilha_estruturada_junior',
    featured: true,
  },
  {
    level: 'Nível 3',
    plan: 'Plano Pro / Carreira',
    name: 'Pleno',
    description:
      'Para quem já coda e busca domínio de arquitetura, testes avançados, padrões de projeto e performance de alta escala.',
    items: [
      'Clean Architecture, SOLID e Design Patterns',
      'Testes automatizados avançados (Unitários, Integração e E2E)',
      'Microserviços, filas assíncronas e mensageria',
      'Otimização de performance e segurança em produção',
    ],
    ctaLabel: 'Explorar trilha Pleno',
    ctaHref: '#precos',
    ctaId: 'trilha_estruturada_pleno',
  },
];

const StructuredTrackCard: React.FC<{ track: StructuredTrack }> = ({ track }) => (
  <article
    className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-300 ${
      track.featured
        ? 'bg-surface-1 border-2 border-brand-purple/60 shadow-accent-purple'
        : 'bg-surface-1 border border-border-2 hover:border-brand-purple/40'
    }`}
  >
    {track.featured && (
      <span className="absolute -top-3 left-6 px-3 py-0.5 bg-brand-purple text-white font-mono text-xs font-bold rounded-full uppercase tracking-wider">
        Mais procurada
      </span>
    )}
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <span
          className={`px-3 py-1 rounded font-mono text-xs border ${
            track.featured
              ? 'bg-brand-purple/10 text-brand-purple-light border-brand-purple/20'
              : 'bg-surface-2 text-ink-body border-border-1'
          }`}
        >
          {track.level}
        </span>
        <span
          className={`font-mono text-xs font-bold ${
            track.plan === '100% Grátis' ? 'text-brand-green-neon' : 'text-ink-span'
          }`}
        >
          {track.plan}
        </span>
      </div>
      <h3 className="text-xl font-heading font-bold text-ink-heading tracking-tight mb-3">
        {track.name}
      </h3>
      <p className="text-body-sm text-ink-span leading-relaxed font-sans mb-6">
        {track.description}
      </p>
      <div className="space-y-3 mb-8">
        <div className="text-[11px] font-mono font-bold text-ink-span uppercase tracking-wider">
          O que você aprende:
        </div>
        {track.items.map((item) => (
          <div key={item} className="flex items-start gap-2.5 text-body-sm text-ink-body">
            <MaterialIcon name="check" className="text-[18px] text-brand-green-neon shrink-0 mt-0.5" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
    <TrackedLink
      href={track.ctaHref}
      ctaId={track.ctaId}
      event="trilha_cta"
      className={`cursor-pointer inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-body-sm font-mono font-bold whitespace-nowrap transition-all duration-200 active:scale-95 border ${
        track.featured
          ? 'bg-brand-purple hover:bg-brand-purple-dark text-white border-transparent shadow-md shadow-brand-purple/25'
          : 'bg-surface-2 hover:bg-surface-2/80 border-border-strong text-white'
      }`}
    >
      <span>{track.ctaLabel}</span>
    </TrackedLink>
  </article>
);

export async function TracksSection() {
  const catalog = await fetchPublicCatalog();
  return (
  <>
  {/* 4. TRILHAS & ROADMAP — ordem dos cards do radar:
      1: Rust (Âmbar) | 2: Go (Ciano) | 3: Next.js (Esmeralda) | 4: Python/IA (Roxo) */}
  <section id="trilhas" className="relative z-10 py-24 border-t border-border-2/70">
    {/* Central 216 r3 (Q-3) — TRILHAS ESTRUTURADAS (protótipo §3),
        antes do catálogo/roadmap, que segue abaixo intacto. */}
    <div className="px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto mb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <span className="font-mono text-xs text-brand-green-neon uppercase tracking-widest font-bold block mb-2">
            Da base ao código profissional
          </span>
          <h2 className="text-3xl sm:text-5xl font-heading font-black text-ink-heading tracking-tight mb-2">
            Trilhas estruturadas para cada momento
          </h2>
          <p className="text-base sm:text-lg text-ink-body leading-relaxed font-sans max-w-xl">
            Conteúdo progressivo desenhado para construir maturidade técnica sem lacunas de lógica.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-ink-span">
          <span className="w-2 h-2 rounded-full bg-brand-green-neon" />
          Todas com projetos práticos inclusos
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {STRUCTURED_TRACKS.map((track) => (
          <StructuredTrackCard key={track.name} track={track} />
        ))}
      </div>
    </div>

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

    {/* DISPONÍVEL AGORA — catálogo real via API (B74), com fallback
        honesto: sem resposta da API, a seção diz que não carregou e
        aponta /courses; nunca exibe um espelho desatualizado. */}
    <div className="px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto mb-20">
      <div className="flex items-center gap-2.5 mb-6">
        <span className="w-2 h-2 rounded-full bg-brand-green-neon" />
        <span className="text-xs font-mono font-black tracking-widest text-brand-green-neon uppercase">
          Disponível agora — no catálogo, de verdade
        </span>
      </div>
      {catalog === null ? (
        <div className="rounded-2xl bg-surface-1 border border-border-2 p-6 max-w-2xl">
          <p className="text-body-sm text-ink-body leading-relaxed font-sans mb-4">
            Não foi possível carregar o catálogo de cursos agora — e a gente prefere
            mostrar esse aviso a uma lista desatualizada. A lista completa e atual
            está na página de cursos:
          </p>
          <TrackedLink
            href="/courses"
            ctaId="curso_disponivel_fallback"
            event="trilha_cta"
            className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm font-mono font-bold whitespace-nowrap transition-all duration-200 active:scale-95 border border-transparent shadow-md shadow-brand-purple/25"
          >
            <span>Ver os cursos</span>
          </TrackedLink>
        </div>
      ) : catalog.length === 0 ? (
        <p className="text-body-sm text-ink-span font-sans leading-relaxed max-w-2xl">
          Nenhum curso aberto neste momento. As trilhas no radar, logo abaixo, são o
          próximo passo — entre na lista da que você quer e te avisamos quando abrir.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {catalog.map((course) => (
            <AvailableCourseCard key={course.slug} course={course} />
          ))}
        </div>
      )}
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
}
