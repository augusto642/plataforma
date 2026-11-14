import {
  UserProfile,
  TrackProgress,
  ActivityTimelineItem,
  GitRepository,
  BadgeItem,
  DigitalCertificate,
  SkillAxis,
  DeveloperPerk,
  SkillMeasurementTelemetry
} from './types';

export interface AvatarPreset {
  id: string;
  name: string;
  tag: string;
  avatarUrl: string;
  accentColor: string;
}

export interface BannerPreset {
  id: string;
  name: string;
  gradient: string;
  previewColor: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'cyber-samurai',
    name: 'Cyber Samurai',
    tag: 'Combat & Speed',
    avatarUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80',
    accentColor: '#8257E5'
  },
  {
    id: 'netrunner',
    name: 'Netrunner Prime',
    tag: 'Systems Infiltrator',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    accentColor: '#00E5FF'
  },
  {
    id: 'void-mage',
    name: 'Void Architect',
    tag: 'Quantum & Cloud',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    accentColor: '#04D361'
  },
  {
    id: 'rust-titan',
    name: 'Rustacean Mech',
    tag: 'Zero-Cost Memory',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
    accentColor: '#FFA116'
  },
  {
    id: 'synth-pilot',
    name: 'Synthwave Pilot',
    tag: 'Fullstack & UI',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
    accentColor: '#F43F5E'
  }
];

export const BANNER_PRESETS: BannerPreset[] = [
  {
    id: 'deep-obsidian',
    name: 'Deep Obsidian Cyber',
    gradient: 'linear-gradient(135deg, #0b0c14 0%, #17112e 50%, #09211d 100%)',
    previewColor: '#8257E5'
  },
  {
    id: 'cyber-synthwave',
    name: 'Synthwave Neon Grid',
    gradient: 'linear-gradient(135deg, #230836 0%, #0d1e38 50%, #063334 100%)',
    previewColor: '#00E5FF'
  },
  {
    id: 'matrix-core',
    name: 'Terminal Matrix Rain',
    gradient: 'linear-gradient(135deg, #031207 0%, #09261a 50%, #04140b 100%)',
    previewColor: '#04D361'
  },
  {
    id: 'solar-plasma',
    name: 'Solar Flare Gold',
    gradient: 'linear-gradient(135deg, #2b1803 0%, #3d2306 50%, #1c0e01 100%)',
    previewColor: '#FFA116'
  },
  {
    id: 'quantum-rift',
    name: 'Quantum Void Rift',
    gradient: 'linear-gradient(135deg, #15032b 0%, #1b0a3d 50%, #09031c 100%)',
    previewColor: '#A855F7'
  }
];

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
  avatarUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80',
  avatarPresetId: 'cyber-samurai',
  bannerUrl: '',
  bannerTheme: 'deep-obsidian',
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

export const HARD_SKILLS_RADAR: SkillAxis[] = [
  {
    label: 'Backend & Concorrência',
    score: 96,
    color: '#8257E5',
    category: 'hard',
    benchmark: 85,
    metricOrigin: '38 projetos no Piston: zero race conditions e latência p99 < 8ms',
    description: 'Rust Tokio, Go routines, Lock-Free structures, Zero-Copy streaming e alta taxa de transferência.'
  },
  {
    label: 'IA & Agentes Autônomos',
    score: 94,
    color: '#00E5FF',
    category: 'hard',
    benchmark: 80,
    metricOrigin: '14 integrações MCP, pipelines RAG vetoriais e enxames com guardrails',
    description: 'Model Context Protocol, Qdrant/Milvus, orquestração multi-agente e prompt engineering determinístico.'
  },
  {
    label: 'Sistemas Distribuídos',
    score: 92,
    color: '#04D361',
    category: 'hard',
    benchmark: 82,
    metricOrigin: 'Implementação de Raft Consensus com 64/64 testes de partição aprovados',
    description: 'Replicação de logs assíncrona, tolerância a falhas bizantinas, Event Sourcing e gRPC bi-direcional.'
  },
  {
    label: 'DevOps & Cloud Native',
    score: 88,
    color: '#FFA116',
    category: 'hard',
    benchmark: 78,
    metricOrigin: 'Imagens Docker multi-stage < 35MB, auditoria Trivy zero CVEs e K8s manifests',
    description: 'Kubernetes operators, cgroups/seccomp security profiles, OpenTelemetry spans e automação CI/CD.'
  },
  {
    label: 'Algoritmos & Complexidade',
    score: 95,
    color: '#F43F5E',
    category: 'hard',
    benchmark: 86,
    metricOrigin: '284 desafios resolvidos no Sandbox com complexidade assintótica ótima O(N log N)',
    description: 'Grafos avançados, programação dinâmica, bit manipulation, árvores balanceadas e Big-O rigoroso.'
  },
  {
    label: 'Frontend Architecture',
    score: 89,
    color: '#3B82F6',
    category: 'hard',
    benchmark: 80,
    metricOrigin: 'Lighthouse 99+, Next.js Server Components, WebAssembly SIMD e WCAG AA',
    description: 'Next.js App Router, reatividade granular, visualização SVG matemática e acessibilidade técnica.'
  }
];

export const SOFT_SKILLS_RADAR: SkillAxis[] = [
  {
    label: 'Pensamento Socrático',
    score: 95,
    color: '#8257E5',
    category: 'soft',
    benchmark: 80,
    metricOrigin: '94% dos desafios superados sem spoilers diretos, apenas por questionamentos ao Lumi',
    description: 'Capacidade de decompor hipóteses, formular perguntas investigativas e evitar soluções prontas por impulso.'
  },
  {
    label: 'Resiliência & Debugging',
    score: 91,
    color: '#00E5FF',
    category: 'soft',
    benchmark: 75,
    metricOrigin: 'Média de 3.4 ciclos erro-correção até o sucesso, taxa de abandono de sessão: 0%',
    description: 'Tolerância ao erro em bugs complexos, leitura metódica de stack traces e persistência calma sob falhas.'
  },
  {
    label: 'Clean Code & Rigor',
    score: 94,
    color: '#04D361',
    category: 'soft',
    benchmark: 82,
    metricOrigin: 'Índice de linting estático 98.7%, zero code smells e nomenclatura semântica estrita',
    description: 'Princípios SOLID, arquitetura limpa, clareza tipográfica de código e facilidade de manutenção para terceiros.'
  },
  {
    label: 'Autonomia & Velocidade',
    score: 93,
    color: '#FFA116',
    category: 'soft',
    benchmark: 78,
    metricOrigin: 'Tempo médio de adaptação a novos frameworks/linguagens: 42% mais rápido que a média',
    description: 'Capacidade de assimilar novas documentações técnicas, RFCs e bibliotecas sem necessidade de tutoria passiva.'
  },
  {
    label: 'Comunicação Técnica',
    score: 88,
    color: '#F43F5E',
    category: 'soft',
    benchmark: 76,
    metricOrigin: 'Qualidade dos commits semânticos (Conventional Commits) e documentações de README no Git',
    description: 'Clareza na escrita de justificativas arquiteturais, notas de lançamento e documentação de APIs.'
  },
  {
    label: 'Consistência & Flow State',
    score: 96,
    color: '#3B82F6',
    category: 'soft',
    benchmark: 85,
    metricOrigin: 'Sequência ininterrupta de 48 dias com picos de imersão de 1.8h sem quebra de contexto',
    description: 'Disciplina diária inabalável, entrada veloz em estado de fluxo hiperfocado e regularidade de entrega.'
  }
];

export const DEVELOPER_PERKS: DeveloperPerk[] = [
  {
    id: 'perk-1',
    name: 'Zero Spoilers Eureka',
    type: 'passive',
    rarity: 'legendary',
    icon: '💡',
    description: 'Resolve desafios sem solicitar resposta direta à IA, guiado puramente pelo método socrático.',
    buffEffect: '+25% XP bônus em desafios Hard e aumento permanente de Pensamento Socrático.'
  },
  {
    id: 'perk-2',
    name: 'Compiler Whispering',
    type: 'trait',
    rarity: 'epic',
    icon: '⚡',
    description: 'Compreende instantaneamente mensagens de erro do compilador e de borrow checker em Rust.',
    buffEffect: 'Reduz em 40% o tempo entre compilação e teste unitário verde no Piston.'
  },
  {
    id: 'perk-3',
    name: 'Solar Hyperfocus Aura',
    type: 'aura',
    rarity: 'legendary',
    icon: '🔥',
    description: 'Emite aura radiante ao manter streak superior a 30 dias contínuos.',
    buffEffect: 'Multiplicador 1.5x em todas as conquistas de consistência e destaque na vitrine do Talent Pool.'
  },
  {
    id: 'perk-4',
    name: 'Architectural Shield',
    type: 'passive',
    rarity: 'rare',
    icon: '🛡️',
    description: 'Estruturação imune a deadlocks e vazamentos de memória em ambientes concorrentes.',
    buffEffect: 'Gera relatórios de validação formal prontos para auditoria de Tech Leads parceiros.'
  }
];

export const INITIAL_SKILLS_RADAR: SkillAxis[] = HARD_SKILLS_RADAR;
