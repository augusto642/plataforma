import { DetailedCourse } from './types';

export const DETAILED_COURSES_MAP: Record<string, DetailedCourse> = {
  'distributed-systems-rust': {
    slug: 'distributed-systems-rust',
    title: 'Sistemas Distribuídos & Concorrência em Rust',
    badgeTitle: 'TRILHA HARDCORE DISTRIBUTED SYSTEMS',
    level: 'Avançado',
    hours: '64h Prática Git',
    challengesCount: 36,
    totalXp: 6200,
    rating: 4.98,
    studentsCount: 1420,
    instructor: {
      name: 'Dr. Henrik Vance',
      role: 'Principal Systems Architect @ Nexus Labs',
      avatarInitials: 'HV',
      bio: 'Ex-engenheiro de infraestrutura do Tokio Core. Especialista em concorrência sem alocação, memory safety e consenso Raft em Rust.',
    },
    overview:
      'Construa do zero uma infraestrutura distribuída de altíssima resiliência em Rust puro. Implemente o algoritmo de consenso Raft, canais MPSC lock-free, persistência WAL (Write-Ahead Logging) e streaming gRPC com Tokio.',
    tags: ['Rust', 'Tokio', 'Raft Consensus', 'WAL', 'Lock-free Concurrency', 'gRPC'],
    userProgressPercent: 42,
    currentLessonId: 'rust-m2-l2',
    socraticFocusAreas: [
      'Eliminação de alocações ocultas na heap com Zero-Copy Slices',
      'Prevenção estrita de Deadlocks e Starvation em Mutexes assíncronos',
      'Garantia de consistência linearizável nas eleições do Raft',
      'Tratamento de particionamento de rede (Split-Brain scenarios)',
    ],
    prerequisites: [
      {
        id: 'pre-1',
        title: 'Ownership & Borrow Checker Rust',
        level: 'fundamental',
        status: 'mastered',
        description: 'Lifetimes, referências mutáveis exclusivas e traits Send/Sync.',
      },
      {
        id: 'pre-2',
        title: 'Async Tokio & Future Internals',
        level: 'core',
        status: 'mastered',
        description: 'Event Loop, Wakers, Pinning e Tasks concorrentes.',
      },
      {
        id: 'pre-3',
        title: 'Consenso Distribuído & Protocolo Paxos/Raft',
        level: 'advanced',
        status: 'current',
        description: 'Eleição de líderes, replicação de logs e snapshots de estado.',
      },
    ],
    modules: [
      {
        id: 'rust-m1',
        moduleNumber: 1,
        title: 'Módulo 01: Concorrência de Baixo Nível & Canais Lock-free',
        description:
          'Implementação de primitivas de sincronização atômicas (CAS), canais MPSC e Ring Buffers sem Mutex.',
        xpTotal: 1200,
        estimatedHours: '12h',
        completedCount: 4,
        lessons: [
          {
            id: 'rust-m1-l1',
            title: 'Atomics, Memory Orderings (Acquire/Release) em Rust',
            type: 'git_challenge',
            duration: '45 min',
            xp: 250,
            status: 'completed',
            description: 'Implementar contador atômico seguro sem locks usando compare_exchange.',
            targetFile: 'src/atomics/counter.rs',
          },
          {
            id: 'rust-m1-l2',
            title: 'Ring Buffer Lock-Free Circular com AtomicPtr',
            type: 'git_challenge',
            duration: '60 min',
            xp: 350,
            status: 'completed',
            description: 'Desenvolver fila circular SPSC lock-free para pipelines de telemetria.',
            targetFile: 'src/queues/spsc_ring.rs',
          },
          {
            id: 'rust-m1-l3',
            title: 'Quiz: Hierarquia de Memória da CPU & False Sharing',
            type: 'quiz',
            duration: '20 min',
            xp: 150,
            status: 'completed',
            description: 'Avaliar penalidade de cache line bouncing e alinhamento com #[repr(align(64))].',
          },
          {
            id: 'rust-m1-l4',
            title: 'Lab: Thread Pool Customizada com Work Stealing',
            type: 'lab',
            duration: '90 min',
            xp: 450,
            status: 'completed',
            description: 'Criar scheduler com algoritmo de work stealing similar ao Go runtime.',
            targetFile: 'src/pool/work_stealing.rs',
          },
        ],
      },
      {
        id: 'rust-m2',
        moduleNumber: 2,
        title: 'Módulo 02: Storage Engine com Write-Ahead Log (WAL) & LSM-Tree',
        description:
          'Persistência em disco de alto desempenho com fsync seletivo, MemTable e SSTables imutáveis.',
        xpTotal: 1500,
        estimatedHours: '16h',
        completedCount: 1,
        lessons: [
          {
            id: 'rust-m2-l1',
            title: 'WAL Engine com CRC32 Checksums & Fsync Batching',
            type: 'git_challenge',
            duration: '75 min',
            xp: 400,
            status: 'completed',
            description: 'Criar append-only log binário com garantia de integridade em crash.',
            targetFile: 'src/storage/wal.rs',
          },
          {
            id: 'rust-m2-l2',
            title: 'MemTable com SkipList Concorrente',
            type: 'git_challenge',
            duration: '90 min',
            xp: 500,
            status: 'in_progress',
            description: 'Estrutura ordenada na memória RAM sem travar leituras simultâneas.',
            targetFile: 'src/storage/memtable.rs',
          },
          {
            id: 'rust-m2-l3',
            title: 'SSTable Format com Bloom Filters para Busca O(1)',
            type: 'git_challenge',
            duration: '60 min',
            xp: 350,
            status: 'locked',
            description: 'Serialização em blocos com filtro probabilístico de Bloom.',
            targetFile: 'src/storage/sstable.rs',
          },
          {
            id: 'rust-m2-l4',
            title: 'Quiz: Compaction Strategies (Size-Tiered vs Leveled)',
            type: 'quiz',
            duration: '25 min',
            xp: 250,
            status: 'locked',
            description: 'Entender taxa de amplificação de escrita (Write Amplification).',
          },
        ],
      },
      {
        id: 'rust-m3',
        moduleNumber: 3,
        title: 'Módulo 03: Algoritmo de Consenso Raft do Zero',
        description:
          'Máquina de estados replicada com eleição de líder com Randomized Heartbeats e Log Replication.',
        xpTotal: 2000,
        estimatedHours: '22h',
        completedCount: 0,
        lessons: [
          {
            id: 'rust-m3-l1',
            title: 'State Machine: Follower, Candidate & Leader Transitions',
            type: 'git_challenge',
            duration: '80 min',
            xp: 450,
            status: 'locked',
            description: 'Implementar a máquina de estados assíncrona do protocolo Raft.',
            targetFile: 'src/raft/state.rs',
          },
          {
            id: 'rust-m3-l2',
            title: 'RequestVote RPC & Quorum Election',
            type: 'git_challenge',
            duration: '90 min',
            xp: 550,
            status: 'locked',
            description: 'Lógica de votação com maioria estrita (N/2 + 1) e validação de Term.',
            targetFile: 'src/raft/rpc_vote.rs',
          },
          {
            id: 'rust-m3-l3',
            title: 'AppendEntries RPC & Log Matching Invariant',
            type: 'git_challenge',
            duration: '110 min',
            xp: 650,
            status: 'locked',
            description: 'Sincronização de logs de comandos entre o líder e os réplicas.',
            targetFile: 'src/raft/rpc_append.rs',
          },
          {
            id: 'rust-m3-l4',
            title: 'Simulação de Caos: Partição de Rede & Auto-Healing',
            type: 'lab',
            duration: '60 min',
            xp: 350,
            status: 'locked',
            description: 'Injetar atrasos de rede e testar recuperação sem perda de dados.',
          },
        ],
      },
      {
        id: 'rust-m4',
        moduleNumber: 4,
        title: 'Módulo 04: Servidor gRPC & Benchmark de Carga Massiva',
        description:
          'Interface cliente/servidor com Tonic gRPC, métricas Prometheus e profiling pprof com zero cópia.',
        xpTotal: 1500,
        estimatedHours: '14h',
        completedCount: 0,
        lessons: [
          {
            id: 'rust-m4-l1',
            title: 'Tonic gRPC Streaming Bidirecional para KV Store',
            type: 'git_challenge',
            duration: '60 min',
            xp: 400,
            status: 'locked',
            description: 'Contratos Protobuf com suporte a streaming de comandos.',
            targetFile: 'src/server/grpc.rs',
          },
          {
            id: 'rust-m4-l2',
            title: 'Benchmark Automatizado: 250k Ops/segundo no Piston',
            type: 'project',
            duration: '120 min',
            xp: 800,
            status: 'locked',
            description: 'Executar suíte de testes de stress e alcançar latência P99 sub-milissegundo.',
            targetFile: 'benches/throughput.rs',
          },
          {
            id: 'rust-m4-l3',
            title: 'Quiz Final de Auditoria Distribuída',
            type: 'quiz',
            duration: '30 min',
            xp: 300,
            status: 'locked',
            description: 'Validação teórica para emissão do diploma verificado em Blockchain.',
          },
        ],
      },
    ],
    capstone: {
      title: 'Projeto Capstone: NexusKV — Banco de Dados Distribuído Linearizável',
      description:
        'Um banco de dados chave-valor distribuído completo com replicação Raft, persistência LSM-Tree em disco e suporte a transações ACID atômicas.',
      deliverables: [
        'Repositório Git com 100% de cobertura em testes de particionamento Jepsen-like',
        'Binário otimizado compilado com LTO e zero warnings no Clippy',
        'Dashboard Grafana exportando métricas Prometheus de consenso',
      ],
      gitRepoTemplate: 'nexuscode-templates/rust-distributed-nexuskv',
      estimatedHours: '20 Horas',
      xpReward: 2500,
    },
  },

  'golang-microservices-mastery': {
    slug: 'golang-microservices-mastery',
    title: 'Microsserviços de Alta Vazão & gRPC em Go',
    badgeTitle: 'TRILHA BACKEND DISTRIBUÍDO GO',
    level: 'Avançado',
    hours: '56h Prática Git',
    challengesCount: 32,
    totalXp: 5200,
    rating: 4.96,
    studentsCount: 2310,
    instructor: {
      name: 'Camila Dornelles',
      role: 'Staff Backend Engineer',
      avatarInitials: 'CD',
      bio: 'Especialista em microsserviços de ultra-baixa latência em Go. Autora de bibliotecas open-source de mensageria com Apache Kafka.',
    },
    overview:
      'Aprenda arquitetura de microsserviços de padrão FAANG. Domine goroutines, channels, gRPC bidirecional, mensageria distribuída com Kafka e profiling pprof para eliminar alocações.',
    tags: ['Go', 'gRPC', 'Kafka', 'Docker', 'Tracing OpenTelemetry', 'PostgreSQL'],
    userProgressPercent: 25,
    currentLessonId: 'go-m2-l1',
    socraticFocusAreas: [
      'Controle de vazamentos de goroutines com context.Context',
      'Zero-allocation nos hot paths de decodificação JSON/Protobuf',
      'Idempotência em processamento de eventos Kafka com outbox pattern',
    ],
    prerequisites: [
      {
        id: 'go-pre-1',
        title: 'Sintaxe Go & Ponteiros',
        level: 'fundamental',
        status: 'mastered',
        description: 'Structs, interfaces implícitas e fatias de memória.',
      },
      {
        id: 'go-pre-2',
        title: 'Goroutines & Concorrência Go',
        level: 'core',
        status: 'mastered',
        description: 'Channels buffered/unbuffered, select e sync.WaitGroup.',
      },
      {
        id: 'go-pre-3',
        title: 'Protobuf & Contratos gRPC',
        level: 'advanced',
        status: 'current',
        description: 'Definição de schemas .proto e compilação protoc.',
      },
    ],
    modules: [
      {
        id: 'go-m1',
        moduleNumber: 1,
        title: 'Módulo 01: Concorrência Profunda & Runtime de Go',
        description: 'Memory model do Go, scheduler M:N e profiling com pprof.',
        xpTotal: 1000,
        estimatedHours: '10h',
        completedCount: 3,
        lessons: [
          {
            id: 'go-m1-l1',
            title: 'Worker Pool Resiliente com Channels Canceláveis',
            type: 'git_challenge',
            duration: '50 min',
            xp: 250,
            status: 'completed',
            description: 'Implementar pool de workers com graceful shutdown no context.Done().',
            targetFile: 'pkg/pool/worker.go',
          },
          {
            id: 'go-m1-l2',
            title: 'Benchmark & Detecção de Alocações com benchstat',
            type: 'git_challenge',
            duration: '45 min',
            xp: 250,
            status: 'completed',
            description: 'Otimizar struct para zero-alloc usando sync.Pool.',
            targetFile: 'pkg/alloc/optimizer.go',
          },
          {
            id: 'go-m1-l3',
            title: 'Quiz: Escape Analysis & Heap vs Stack no Go',
            type: 'quiz',
            duration: '20 min',
            xp: 150,
            status: 'completed',
            description: 'Identificar porque ponteiros escapam para a Heap.',
          },
        ],
      },
      {
        id: 'go-m2',
        moduleNumber: 2,
        title: 'Módulo 02: Microsserviços gRPC & Interceptors',
        description: 'Comunicação RPC rápida com interceptors de tracing, auth e rate-limiting.',
        xpTotal: 1400,
        estimatedHours: '14h',
        completedCount: 0,
        lessons: [
          {
            id: 'go-m2-l1',
            title: 'Streaming gRPC Bidirecional de Dados Financeiros',
            type: 'git_challenge',
            duration: '70 min',
            xp: 400,
            status: 'in_progress',
            description: 'Canal de cotações em tempo real com backpressure.',
            targetFile: 'services/ticker/grpc_server.go',
          },
          {
            id: 'go-m2-l2',
            title: 'Interceptors com OpenTelemetry Tracing Distribuído',
            type: 'git_challenge',
            duration: '60 min',
            xp: 350,
            status: 'locked',
            description: 'Propagação de TraceID entre múltiplos serviços.',
            targetFile: 'pkg/telemetry/interceptor.go',
          },
        ],
      },
    ],
    capstone: {
      title: 'Projeto Capstone: NexusPay — Gateway de Pagamentos em Microsserviços Go',
      description:
        'Engine de processamento de transações com alta vazão, outbox pattern em Kafka e resiliência a partições de rede.',
      deliverables: [
        'Microsserviços desacoplados orquestrados com Docker Compose',
        'Testes de carga com k6 comprovando 10k RPS',
      ],
      gitRepoTemplate: 'nexuscode-templates/go-microservices-nexuspay',
      estimatedHours: '16 Horas',
      xpReward: 2000,
    },
  },

  'frontend-architecture-nextjs': {
    slug: 'frontend-architecture-nextjs',
    title: 'Arquitetura Frontend Avançada & Next.js 14',
    badgeTitle: 'TRILHA FRONTEND ARCHITECTURE & NEXT.JS 14',
    level: 'Intermediário',
    hours: '48h Prática Git',
    challengesCount: 28,
    totalXp: 4500,
    rating: 4.95,
    studentsCount: 3890,
    instructor: {
      name: 'Lucas Brandão',
      role: 'Staff Frontend Architect',
      avatarInitials: 'LB',
      bio: 'Especialista em Next.js App Router, Server Components, Design Systems atômicos e Web Vitals sub-segundo.',
    },
    overview:
      'Domine o App Router do Next.js 14, React Server Components (RSC), streaming SSR com Suspense, Server Actions atômicas, interceptação de rotas e orquestração de estado escalável com TypeScript estrito.',
    tags: ['Next.js 14', 'React 18', 'TypeScript', 'Tailwind CSS', 'RSC', 'Web Vitals'],
    userProgressPercent: 68,
    currentLessonId: 'fe-m3-l1',
    socraticFocusAreas: [
      'Divisão correta entre Client Components e Server Components para zero bundle overhead',
      'Invalidação atômica de cache com revalidatePath e revalidateTag',
      'Proteção contra Server Action injection e CSRF',
    ],
    prerequisites: [
      {
        id: 'fe-pre-1',
        title: 'React Fundamentals & Virtual DOM',
        level: 'fundamental',
        status: 'mastered',
        description: 'Ciclo de renderização, reconciliation e closures em hooks.',
      },
      {
        id: 'fe-pre-2',
        title: 'TypeScript Estrito & Generics',
        level: 'core',
        status: 'mastered',
        description: 'Tipagem discriminada, type guards e inference profunda.',
      },
    ],
    modules: [
      {
        id: 'fe-m1',
        moduleNumber: 1,
        title: 'Módulo 01: Core App Router & Server Components',
        description: 'Renderização no servidor, streaming de chunks HTML e zero JS no cliente.',
        xpTotal: 1000,
        estimatedHours: '10h',
        completedCount: 3,
        lessons: [
          {
            id: 'fe-m1-l1',
            title: 'Server Components com Fetch Streaming & Suspense Boundaries',
            type: 'git_challenge',
            duration: '45 min',
            xp: 250,
            status: 'completed',
            description: 'Implementar carregamento progressivo com skeletons inteligentes.',
            targetFile: 'app/feed/page.tsx',
          },
        ],
      },
    ],
    capstone: {
      title: 'Projeto Capstone: NexusHub — Plataforma de Colaboração em Tempo Real',
      description:
        'Aplicação completa Next.js 14 com App Router, Monaco Editor integrado, WebSockets e streaming SSR.',
      deliverables: [
        'Aplicação completa com score 100 no Google Lighthouse Web Vitals',
        'Suíte de testes E2E com Playwright cobrindo autenticação e rotas paralelas',
      ],
      gitRepoTemplate: 'nexuscode-templates/nextjs-nexushub',
      estimatedHours: '14 Horas',
      xpReward: 1800,
    },
  },

  'fullstack-ai-engineering': {
    slug: 'fullstack-ai-engineering',
    title: 'Engenharia de IA, Agentes Autônomos & RAG',
    badgeTitle: 'TRILHA AI AGENTS & APPLIED LLMS',
    level: 'Avançado',
    hours: '50h Prática Git',
    challengesCount: 26,
    totalXp: 4800,
    rating: 4.97,
    studentsCount: 1950,
    instructor: {
      name: 'Dra. Beatriz Vasconcelos',
      role: 'Lead AI Engineer @ Nexus Intelligence',
      avatarInitials: 'BV',
      bio: 'Pioneira em arquiteturas RAG com grafos de conhecimento, function calling rigoroso e guardrails pedagógicos.',
    },
    overview:
      'Construa pipelines de inteligência artificial aplicados à engenharia de software. Aprenda embeddings, índices vetoriais hierárquicos (HNSW), agentes com tool calling e guardrails em Python e TypeScript.',
    tags: ['Python', 'LangChain', 'Vector DB', 'RAG', 'Function Calling', 'Embeddings'],
    userProgressPercent: 15,
    currentLessonId: 'ai-m1-l2',
    socraticFocusAreas: [
      'Eliminação de alucinações através de Re-ranking Semântico e fontes auditáveis',
      'Garantia de saídas JSON estritas com Pydantic e Instructor',
      'Implementação de memórias de curto e longo prazo para agentes',
    ],
    prerequisites: [
      {
        id: 'ai-pre-1',
        title: 'Python Assíncrono & Type Hints',
        level: 'fundamental',
        status: 'mastered',
        description: 'asyncio, Pydantic v2 e gerenciamento de contexto.',
      },
    ],
    modules: [
      {
        id: 'ai-m1',
        moduleNumber: 1,
        title: 'Módulo 01: Embeddings & Busca Vetorial',
        description: 'Indexação de documentações de código e similaridade de cosseno.',
        xpTotal: 1000,
        estimatedHours: '10h',
        completedCount: 1,
        lessons: [
          {
            id: 'ai-m1-l1',
            title: 'Chunking Inteligente de Arquivos de Código TypeScript/Rust',
            type: 'git_challenge',
            duration: '50 min',
            xp: 250,
            status: 'completed',
            description: 'Divisão de código respeitando AST e assinaturas de funções.',
            targetFile: 'engine/chunker.py',
          },
          {
            id: 'ai-m1-l2',
            title: 'Busca Híbrida (Dense Vector + BM25 Sparse Search)',
            type: 'git_challenge',
            duration: '60 min',
            xp: 350,
            status: 'in_progress',
            description: 'Combinação de embeddings neurais com busca léxica exata.',
            targetFile: 'engine/hybrid_retriever.py',
          },
        ],
      },
    ],
    capstone: {
      title: 'Projeto Capstone: SocraticCopilot — Agente de Mentoria de Código',
      description:
        'Agente autônomo completo capaz de ler repositórios Git inteiros, diagnosticar bugs e guiar o aluno socraticamente sem revelar a solução.',
      deliverables: [
        'API FastAPI com streaming SSE e guardrails de segurança',
        'Avaliação RAGAS comprovando fidelidade de contexto > 95%',
      ],
      gitRepoTemplate: 'nexuscode-templates/ai-socratic-copilot',
      estimatedHours: '18 Horas',
      xpReward: 2200,
    },
  },
};

// Aliases for short slugs from COURSES_DATA
DETAILED_COURSES_MAP['fullstack'] = DETAILED_COURSES_MAP['frontend-architecture-nextjs'];
DETAILED_COURSES_MAP['gobackend'] = DETAILED_COURSES_MAP['golang-microservices-mastery'];
DETAILED_COURSES_MAP['algorithms'] = {
  ...DETAILED_COURSES_MAP['distributed-systems-rust'],
  slug: 'algorithms',
  title: 'Algoritmos & Big-O Mastery (FAANG Prep)',
  badgeTitle: 'TRILHA DE ESTRUTURAS DE DADOS & BIG-O',
  hours: '60h Prática Git',
  challengesCount: 120,
  totalXp: 6000,
  overview:
    '120 desafios intensivos de estruturas de dados e algoritmos de elite: grafos, programação dinâmica, árvores balanceadas e complexidade Big-O.',
};
DETAILED_COURSES_MAP['devops'] = {
  ...DETAILED_COURSES_MAP['distributed-systems-rust'],
  slug: 'devops',
  title: 'DevOps & Linux Internals',
  badgeTitle: 'TRILHA DE INFRAESTRUTURA & LINUX INTERNALS',
  hours: '40h Prática Git',
  challengesCount: 18,
  totalXp: 4500,
  overview:
    'Construa seu próprio isolador de código Piston seguro com Linux Namespaces, Cgroups v2, Seccomp e GitHub Actions.',
};
DETAILED_COURSES_MAP['ai'] = DETAILED_COURSES_MAP['fullstack-ai-engineering'];
DETAILED_COURSES_MAP['fundamentals'] = {
  ...DETAILED_COURSES_MAP['frontend-architecture-nextjs'],
  slug: 'fundamentals',
  title: 'Fundamentos & Git Puro',
  badgeTitle: 'TRILHA DE FUNDAMENTOS DE ENGENHARIA',
  level: 'Iniciante',
  hours: '30h Prática Git',
  challengesCount: 50,
  totalXp: 2500,
  overview:
    'A base definitiva para quem quer dominar raciocínio lógico, terminal, controle de versão Git e testes unitários.',
};

export function getDetailedCourseBySlug(slug: string): DetailedCourse {
  const normalized = slug ? slug.toLowerCase().trim() : '';
  if (DETAILED_COURSES_MAP[normalized]) {
    return DETAILED_COURSES_MAP[normalized];
  }
  // Fallback to distributed systems rust
  return {
    ...DETAILED_COURSES_MAP['distributed-systems-rust'],
    slug: normalized || 'distributed-systems-rust',
    title: normalized
      ? normalized
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      : 'Sistemas Distribuídos & Concorrência',
  };
}
