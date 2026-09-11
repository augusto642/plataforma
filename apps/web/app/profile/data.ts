import { UserProfile, TrackProgress, ActivityTimelineItem, GitRepository, BadgeItem, DigitalCertificate, SkillAxis } from './types';

export const INITIAL_PROFILE_DATA: UserProfile = {
  id: 'usr_9f48a7b2e',
  name: 'Gabriel Lima',
  handle: 'gabriellima-arch',
  role: 'Principal Software Architect',
  specialty: 'Distributed Systems & Autonomous Agents',
  globalRank: 14,
  level: 48,
  currentXp: 34850,
  nextLevelXp: 36000,
  streakDays: 48,
  highestStreak: 120,
  totalContributions: 1482,
  completedChallenges: 284,
  verifiedCertificatesCount: 8,
  bio: 'Especialista em microsserviços de ultra-baixa latência em Rust, engenharia de compiladores WebAssembly e orquestração de enxames de agentes de IA autônomos. Aluno Elite NEXUS CODE desde 2024.',
  location: 'São Paulo, Brasil (UTC-3)',
  status: 'DISPONÍVEL PARA PROJETOS & MENTORIA',
  githubUrl: 'https://github.com/gabriellima-arch',
  linkedinUrl: 'https://linkedin.com/in/gabriellima',
  twitterUrl: 'https://x.com/glima_dev'
};

export const TRACKS_PROGRESS_DATA: TrackProgress[] = [
  {
    id: 'track-rust',
    title: 'Rust Mastery & Systems Architecture',
    icon: '🦀',
    moduleInfo: 'Módulo 8: Async Runtime, Tokio & Concorrência Extrema',
    progressPercent: 92,
    color: '#8257E5'
  },
  {
    id: 'track-ai',
    title: 'Autonomous AI Agents & Swarm Engineering',
    icon: '🤖',
    moduleInfo: 'Módulo 5: Protocolo MCP e RAG com Qdrant Vector DB',
    progressPercent: 78,
    color: '#00E5FF'
  },
  {
    id: 'track-wasm',
    title: 'High-Performance WebAssembly & Compilers',
    icon: '⚡',
    moduleInfo: 'Módulo 4: Compilação JIT e Otimizações SIMD no Browser',
    progressPercent: 64,
    color: '#FFA116'
  }
];

export const RECENT_ACTIVITIES_DATA: ActivityTimelineItem[] = [
  {
    id: 'act-1',
    title: 'Desafio Concluído em 100% de Eficiência',
    desc: 'Otimização de Lock-free Queue em Rust (1.2M ops/sec)',
    timeAgo: 'Há 2 horas',
    xpBonus: 150,
    type: 'challenge'
  },
  {
    id: 'act-2',
    title: 'Merge de Pull Request no Nexus Hub',
    desc: 'Implementação do driver de WebAssembly SIMD para WebAudio',
    timeAgo: 'Ontem às 21:40',
    xpBonus: 80,
    type: 'pr'
  },
  {
    id: 'act-3',
    title: 'Badge Lendária Conquistada',
    desc: 'Desbloqueou "Algorithmic Titan" (50 desafios Hard)',
    timeAgo: 'Há 3 dias',
    xpBonus: 500,
    type: 'badge'
  },
  {
    id: 'act-4',
    title: 'Certificado Emitido e Assinado',
    desc: 'Formação Distributed Systems Architect (120 Horas)',
    timeAgo: 'Há 5 dias',
    type: 'cert'
  }
];

export const GIT_REPOSITORIES_DATA: GitRepository[] = [
  {
    id: 'repo-1',
    name: 'nexus-hyper-raft',
    description: 'Implementação em Rust puro do algoritmo de consenso Raft distribuído com suporte a Zero-Copy network I/O e replicação de logs assíncrona ultra-rápida.',
    language: 'Rust',
    langColor: '#DEA584',
    stars: 412,
    forks: 58,
    isPinned: true,
    repoUrl: 'https://github.com/gabriellima-arch/nexus-hyper-raft'
  },
  {
    id: 'repo-2',
    name: 'agentic-swarm-orchestrator',
    description: 'Framework TypeScript/Node.js para orquestração de enxames de agentes de IA com governança de contexto, memória vetorial e execução de ferramentas sandboxed.',
    language: 'TypeScript',
    langColor: '#3178C6',
    stars: 689,
    forks: 94,
    isPinned: true,
    repoUrl: 'https://github.com/gabriellima-arch/agentic-swarm-orchestrator'
  },
  {
    id: 'repo-3',
    name: 'wasm-jit-audio-dsp',
    description: 'Motor de processamento digital de sinais e sintetizador em tempo real executando em WebAssembly SIMD direto na Web Audio API com latência sub-milissegundo.',
    language: 'Wasm',
    langColor: '#654FF0',
    stars: 245,
    forks: 31,
    isPinned: false,
    repoUrl: 'https://github.com/gabriellima-arch/wasm-jit-audio-dsp'
  },
  {
    id: 'repo-4',
    name: 'k8s-cost-sentinel',
    description: 'Daemon Go de alta precisão para telemetria de consumo de recursos, right-sizing automático e auto-scaling preditivo em clusters Kubernetes de larga escala.',
    language: 'Go',
    langColor: '#00ADD8',
    stars: 310,
    forks: 42,
    isPinned: false,
    repoUrl: 'https://github.com/gabriellima-arch/k8s-cost-sentinel'
  },
  {
    id: 'repo-5',
    name: 'vector-graph-index',
    description: 'Índice de proximidade vetorial HNSW implementado do zero em Rust com benchmarks de busca de vizinhos mais próximos para embeddings de 1536 dimensões.',
    language: 'Rust',
    langColor: '#DEA584',
    stars: 520,
    forks: 67,
    isPinned: false,
    repoUrl: 'https://github.com/gabriellima-arch/vector-graph-index'
  },
  {
    id: 'repo-6',
    name: 'nexus-flow-state',
    description: 'Extensão de telemetria cerebral e sincronização de foco com música ambiente procedural binaural para desenvolvedores em estado de hiperfoco.',
    language: 'TypeScript',
    langColor: '#3178C6',
    stars: 184,
    forks: 19,
    isPinned: false,
    repoUrl: 'https://github.com/gabriellima-arch/nexus-flow-state'
  }
];

export const BADGES_DATA: BadgeItem[] = [
  {
    id: 'b-1',
    name: 'Algorithmic Titan',
    description: 'Concluiu 50 desafios de nível Hard em tempo recorde com 100% de precisão.',
    icon: '🏆',
    tier: 'legendary',
    isUnlocked: true
  },
  {
    id: 'b-2',
    name: 'Solar Streak 100d',
    description: 'Manteve código ativo na plataforma por 100 dias consecutivos.',
    icon: '⚡',
    tier: 'epic',
    isUnlocked: true
  },
  {
    id: 'b-3',
    name: 'Rust Memory Master',
    description: 'Resolveu todos os desafios de Lifetimes, Concorrência e Zero-Cost Abstractions.',
    icon: '🦀',
    tier: 'epic',
    isUnlocked: true
  },
  {
    id: 'b-4',
    name: 'Swarm Architect',
    description: 'Orquestrou uma rede autônoma de 10+ agentes com protocolo MCP.',
    icon: '🤖',
    tier: 'legendary',
    isUnlocked: true
  },
  {
    id: 'b-5',
    name: 'Zero-Day Security Guardian',
    description: 'Identifique e corrija 25 vulnerabilidades de memória em código C/C++.',
    icon: '🛡️',
    tier: 'rare',
    isUnlocked: false,
    progressText: '18/25'
  },
  {
    id: 'b-6',
    name: '365 Days Godspeed',
    description: 'Complete 1 ano ininterrupto de atividade diária na NEXUS CODE.',
    icon: '🌌',
    tier: 'legendary',
    isUnlocked: false,
    progressText: '284/365'
  }
];

export const CERTIFICATES_DATA: DigitalCertificate[] = [
  {
    id: 'cert-1',
    title: 'Distributed Systems Architect',
    trackName: 'Distributed Systems Architect',
    issueDate: '15 de Agosto de 2026',
    hours: '120 Horas',
    hashSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    issuer: 'NEXUS CODE ACADEMY',
    skills: ['Raft Consensus', 'Zero-Copy I/O', 'Kafka Streaming', 'gRPC Microservices', 'Chaos Engineering']
  },
  {
    id: 'cert-2',
    title: 'Autonomous AI Swarms Master',
    trackName: 'Autonomous AI Swarms Master',
    issueDate: '02 de Julho de 2026',
    hours: '90 Horas',
    hashSha256: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    issuer: 'NEXUS CODE ACADEMY',
    skills: ['Model Context Protocol (MCP)', 'Vector Databases', 'Multi-Agent Tool Use', 'Autonomous Prompt Chains']
  },
  {
    id: 'cert-3',
    title: 'Advanced WebAssembly & JIT Engineering',
    trackName: 'High-Performance WebAssembly',
    issueDate: '10 de Maio de 2026',
    hours: '80 Horas',
    hashSha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    issuer: 'NEXUS CODE ACADEMY',
    skills: ['WASM SIMD', 'Memory Layout', 'JIT Compilers', 'Native FFI Interop']
  }
];

export const INITIAL_SKILLS_RADAR: SkillAxis[] = [
  {
    label: 'Backend Systems & Concurrency',
    score: 96,
    color: '#8257E5',
    description: 'Rust, Tokio, Go, Microservices, Zero-Copy I/O, Lock-Free Data Structures'
  },
  {
    label: 'AI Agents & Swarms',
    score: 94,
    color: '#00E5FF',
    description: 'MCP Protocol, Multi-Agent Orchestration, Vector Search (Qdrant), RAG Pipelines'
  },
  {
    label: 'Distributed Architecture',
    score: 92,
    color: '#04D361',
    description: 'Raft Consensus, Event Sourcing, gRPC, Apache Kafka, Distributed Caching'
  },
  {
    label: 'DevOps & Cloud Native',
    score: 88,
    color: '#FFA116',
    description: 'Kubernetes, Docker, CI/CD Pipelines, OpenTelemetry, Infrastructure as Code'
  },
  {
    label: 'Algorithmic Problem Solving',
    score: 95,
    color: '#F43F5E',
    description: 'Dynamic Programming, Graph Theory, Bit Manipulation, LeetCode Hard Mastery'
  },
  {
    label: 'Frontend Engineering',
    score: 89,
    color: '#3B82F6',
    description: 'Next.js, TypeScript, React Server Components, WebAssembly in Browser, WebGL'
  }
];
