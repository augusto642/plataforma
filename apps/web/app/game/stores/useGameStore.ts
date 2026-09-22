/**
 * useGameStore.ts
 * NEXUS CODE - Canvas 2D Game Engine State Management
 * 
 * Store global Zustand gerenciando:
 * - Estado do jogador (posição, nível, XP, bits/créditos, passos)
 * - Starter selecionado (stats, skills, tipo)
 * - HP do jogador / companion
 * - Inventário e consumíveis
 * - Modo de jogo ('exploring' | 'battle' | 'dialogue' | 'menu')
 * - Áudio e modo de depuração
 */

import { create } from 'zustand';

export type GameMode = 'exploring' | 'battle' | 'dialogue' | 'menu';

export type BiomeType = 'circuit_valley' | 'network_matrix' | 'algorithm_coliseum';

export type CreatureType = 'COMPILER' | 'NETWORK' | 'LOGIC' | 'DATABASE';

export type CareerTier = 'beginner' | 'junior' | 'mid' | 'senior';

export interface Skill {
  id: string;
  name: string;
  type: CreatureType;
  power: number;
  accuracy: number;
  pp: number;
  maxPp: number;
  description: string;
}

export interface StarterCreature {
  id: string;
  name: string;
  codeName: string;
  type: CreatureType;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  icon: string;
  color: string;
  accentColor: string;
  description: string;
  skills: Skill[];
  // Novos campos de Companion Pet & Trilha de Curso
  nickname?: string;
  languageTrack?: string;
  stage?: 1 | 2 | 3;
  stageTitle?: string;
  lore?: string;
  passiveName?: string;
  passiveDescription?: string;
}

export interface GameItem {
  id: string;
  name: string;
  category: 'potion' | 'buff' | 'utility' | 'key';
  quantity: number;
  description: string;
  effectValue: number;
  icon: string;
}

export interface EnemyCreature {
  id: string;
  name: string;
  type: CreatureType;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  xpReward: number;
  bitsReward: number;
  skills: Skill[];
}

export interface BattleState {
  enemy: EnemyCreature;
  turn: 'player' | 'enemy';
  log: string[];
  isFinished: boolean;
  winner?: 'player' | 'enemy';
}

export interface AvatarConfig {
  skinColor: string;
  hairStyle: string;
  hairColor: string;
  outfit: string;
  outfitColor: string;
  accessory: string;
  backdropColor?: string;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  skinColor: '#FFDFBA',
  hairStyle: 'spikes',
  hairColor: '#00E5FF',
  outfit: 'hoodie',
  outfitColor: '#0B1021',
  accessory: 'visor',
  backdropColor: '#00E5FF',
};

export interface LumiQuota {
  date: string;
  remaining: number;
  maxDaily: number;
}

export interface StudentGitRepo {
  repoName: string;
  repoUrl: string;
  cloneUrl: string;
  branch: string;
  status: 'provisioning' | 'active' | 'synced';
}

export interface PlayerState {
  name: string;
  title: string;
  level: number;
  xp: number;
  maxXp: number;
  bits: number;
  steps: number;
  position: { x: number; y: number };
  direction: 'up' | 'down' | 'left' | 'right';
  avatar: AvatarConfig;
}

export interface GameStoreState {
  // Modo de jogo
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;

  // Jogador
  player: PlayerState;
  setPlayerName: (name: string) => void;
  updatePlayerAvatar: (avatar: Partial<AvatarConfig>) => void;
  setPlayerPosition: (pos: { x: number; y: number }) => void;
  setPlayerDirection: (dir: 'up' | 'down' | 'left' | 'right') => void;
  incrementSteps: () => void;
  addXp: (amount: number) => void;
  addBits: (amount: number) => void;

  // Starter selecionado & HP
  startersCatalog: StarterCreature[];
  selectedStarter: StarterCreature;
  setStarter: (starterId: string) => void;
  currentHp: number;
  maxHp: number;
  updateHp: (amount: number) => void;
  restoreHpFull: () => void;

  // Inventário
  inventory: GameItem[];
  addItem: (item: Omit<GameItem, 'quantity'>, qty?: number) => void;
  removeItem: (itemId: string, qty?: number) => void;
  useItem: (itemId: string) => boolean;

  // Batalha
  currentBattle: BattleState | null;
  startBattle: (enemy?: Partial<EnemyCreature>) => void;
  attackEnemy: (skillId?: string) => void;
  fleeBattle: () => void;

  // Configurações de som e ambiente
  isMuted: boolean;
  volume: number;
  debugMode: boolean;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  toggleDebug: () => void;

  // Lumi Socratic AI Tutor Quota (PR #04)
  lumiQuota: LumiQuota;
  useLumiPrompt: () => boolean;

  // Economia de Bits & Quotas (PR #07)
  streakFreezes: number;
  rechargeLumiQuota: (costInBits?: number) => boolean;
  buyStreakFreeze: (costInBits?: number) => boolean;
  useStreakFreeze: () => boolean;

  // Gitea Real Git Automation (PR #04)
  gitRepo: StudentGitRepo | null;
  provisionGitRepo: (repoName: string) => void;

  // Multi-Biomas e Portais (PR #08)
  currentBiome: BiomeType;
  setBiome: (biome: BiomeType) => void;

  // Matriz de Níveis de Carreira
  careerTier: CareerTier;
  setCareerTier: (tier: CareerTier) => void;

  // Sistema de Pet Companion e Evolução
  petLevel: number;
  petXp: number;
  petMaxXp: number;
  petStage: 1 | 2 | 3;
  petStageTitle: string;
  addPetXp: (amount: number) => { leveledUp: boolean; evolved: boolean; newLevel: number; newStage: number };
  evolutionModalOpen: boolean;
  evolutionDetails: { oldStage: number; newStage: number; title: string; skillUnlocked: string; petName: string } | null;
  closeEvolutionModal: () => void;

  // Mascote Gato Preto
  catMood: 'idle' | 'paws_clean' | 'sleeping' | 'alert' | 'celebrate';
  setCatMood: (mood: 'idle' | 'paws_clean' | 'sleeping' | 'alert' | 'celebrate') => void;
  catMessage: string | null;
  setCatMessage: (msg: string | null) => void;

  // Visual Lesson Modal (Zen Mode)
  activeLessonId: string | null;
  openVisualLesson: (lessonId: string) => void;
  closeVisualLesson: () => void;

  // Reset
  resetGame: () => void;
}

export const INITIAL_STARTERS: StarterCreature[] = [
  {
    id: 'pythox',
    name: 'Pythox',
    codeName: 'PYTHOX.py',
    languageTrack: 'Python & Lógica do Zero',
    type: 'LOGIC',
    level: 1,
    hp: 100,
    maxHp: 100,
    attack: 28,
    defense: 22,
    speed: 24,
    icon: '🐍',
    color: '#38BDF8',
    accentColor: '#0284C7',
    stage: 1,
    stageTitle: 'Filhote',
    lore: 'Nascido nos vales de indentação limpa. Enxerga soluções algorítmicas com clareza cristalina e converte lógica pura em feitiços de dados.',
    passiveName: 'Clean Syntax',
    passiveDescription: '+15% de precisão e bônus de XP em desafios de loops, condicionais e listas.',
    description: 'Guardião elemental da trilha de Python. Aprenda lógica de programação do zero resolvendo problemas algorítmicos.',
    skills: [
      {
        id: 'skill_syntax_strike',
        name: 'Syntax Strike',
        type: 'LOGIC',
        power: 40,
        accuracy: 100,
        pp: 30,
        maxPp: 30,
        description: 'Dispara uma rajada precisa de caracteres válidos sem erros de compilação.',
      },
      {
        id: 'skill_list_comp',
        name: 'List Comprehension',
        type: 'LOGIC',
        power: 65,
        accuracy: 90,
        pp: 15,
        maxPp: 15,
        description: 'Processa coleções inteiras em uma única linha causando dano contínuo.',
      },
      {
        id: 'skill_algo_surge',
        name: 'Algorithmic Surge',
        type: 'LOGIC',
        power: 90,
        accuracy: 80,
        pp: 5,
        maxPp: 5,
        description: 'Resolve a complexidade no caso médio e atinge o ponto fraco do bug.',
      },
    ],
  },
  {
    id: 'scripty',
    name: 'Scripty',
    codeName: 'SCRIPTY.ts',
    languageTrack: 'TypeScript & Frontend Reativo',
    type: 'NETWORK',
    level: 1,
    hp: 95,
    maxHp: 95,
    attack: 30,
    defense: 20,
    speed: 32,
    icon: '⚡',
    color: '#FACC15',
    accentColor: '#EAB308',
    stage: 1,
    stageTitle: 'Filhote',
    lore: 'Um feixe elétrico veloz gerado a partir de componentes reativos. Reage instantaneamente a eventos do usuário e renderiza interfaces fluidas.',
    passiveName: 'Strict Typing',
    passiveDescription: 'Reduz danos de runtime em 30% e previne falhas de variáveis indefinidas.',
    description: 'Guardião elemental de TypeScript & React. Domine o frontend moderno construindo interfaces interativas e reativas.',
    skills: [
      {
        id: 'skill_reactive_pulse',
        name: 'Reactive Pulse',
        type: 'NETWORK',
        power: 42,
        accuracy: 95,
        pp: 28,
        maxPp: 28,
        description: 'Dispara um pulso elétrico sincronizado com o Virtual DOM.',
      },
      {
        id: 'skill_type_guard',
        name: 'Type Guard Shield',
        type: 'NETWORK',
        power: 0,
        accuracy: 100,
        pp: 20,
        maxPp: 20,
        description: 'Blinda o companion contra efeitos de estado nulo ou indefinido.',
      },
      {
        id: 'skill_vdom_burst',
        name: 'VDOM Reconciler Burst',
        type: 'NETWORK',
        power: 85,
        accuracy: 85,
        pp: 8,
        maxPp: 8,
        description: 'Recalcula as diferenças e desfere dano crítico em nós corrompidos.',
      },
    ],
  },
  {
    id: 'javagon',
    name: 'Javagon',
    codeName: 'JAVAGON.java',
    languageTrack: 'Java & Arquitetura Orientada a Objetos',
    type: 'COMPILER',
    level: 1,
    hp: 115,
    maxHp: 115,
    attack: 26,
    defense: 30,
    speed: 22,
    icon: '☕',
    color: '#FB923C',
    accentColor: '#EA580C',
    stage: 1,
    stageTitle: 'Draconete',
    lore: 'Nascido nos reinos da tipagem estrita e máquinas virtuais. Forjado em café fumegante, possui armadura de herança e polimorfismo contra falhas de runtime.',
    passiveName: 'Bytecode Armor',
    passiveDescription: 'Neutraliza falhas de tipagem e concede +20% de defesa em desafios de estruturas e classes.',
    description: 'Guardião elemental de Java. Domine Programação Orientada a Objetos, classes, coleções e código tolerante a falhas.',
    skills: [
      {
        id: 'skill_jvm_strike',
        name: 'JVM Blast',
        type: 'COMPILER',
        power: 45,
        accuracy: 100,
        pp: 30,
        maxPp: 30,
        description: 'Compila o código em bytecode e desfere um ataque certeiro.',
      },
      {
        id: 'skill_polymorph_guard',
        name: 'Polymorphic Guard',
        type: 'COMPILER',
        power: 0,
        accuracy: 100,
        pp: 15,
        maxPp: 15,
        description: 'Assume a interface ideal para absorver qualquer dano de exceção.',
      },
      {
        id: 'skill_garbage_purge',
        name: 'Garbage Collector Purge',
        type: 'COMPILER',
        power: 90,
        accuracy: 85,
        pp: 5,
        maxPp: 5,
        description: 'Varre os objetos órfãos da memória causando dano devastador.',
      },
    ],
  },
  {
    id: 'gopherus',
    name: 'Gopherus',
    codeName: 'GOPHERUS.go',
    languageTrack: 'Go & APIs Concorrentes',
    type: 'COMPILER',
    level: 1,
    hp: 110,
    maxHp: 110,
    attack: 24,
    defense: 28,
    speed: 26,
    icon: '🦫',
    color: '#00E5FF',
    accentColor: '#00ADD8',
    stage: 1,
    stageTitle: 'Filhote',
    lore: 'Mestre anfíbio das correntes e canais concorrentes. Constrói servidores HTTP e APIs ultra-rápidas sem consumir memória desnecessária.',
    passiveName: 'Goroutine Channeling',
    passiveDescription: '+20% de throughput em batalhas contra bugs de alta concorrência.',
    description: 'Guardião elemental de Go. Aprenda a construir microsserviços e rotas HTTP escaláveis com concorrência nativa.',
    skills: [
      {
        id: 'skill_goroutine_spawn',
        name: 'Goroutine Dispatch',
        type: 'COMPILER',
        power: 45,
        accuracy: 100,
        pp: 30,
        maxPp: 30,
        description: 'Cria uma thread leve no pool de workers para atacar o alvo.',
      },
      {
        id: 'skill_channel_sync',
        name: 'Channel Sync',
        type: 'COMPILER',
        power: 65,
        accuracy: 95,
        pp: 15,
        maxPp: 15,
        description: 'Transmite dados através de um canal sem bloqueios ou deadlocks.',
      },
      {
        id: 'skill_p99_blast',
        name: 'Sub-10ms P99 Blast',
        type: 'COMPILER',
        power: 90,
        accuracy: 80,
        pp: 6,
        maxPp: 6,
        description: 'Atinge a meta de latência ultra-baixa com throughput devastador.',
      },
    ],
  },
  {
    id: 'rustor',
    name: 'Rustor',
    codeName: 'RUSTOR.rs',
    languageTrack: 'Rust & Alta Performance',
    type: 'COMPILER',
    level: 1,
    hp: 120,
    maxHp: 120,
    attack: 26,
    defense: 34,
    speed: 20,
    icon: '🦀',
    color: '#FB923C',
    accentColor: '#EA580C',
    stage: 1,
    stageTitle: 'Filhote',
    lore: 'Forjado no Pico de Aço e Memória. O Borrow Checker é sua couraça inquebrável, garantindo zero vazamento de memória e concorrência sem medo.',
    passiveName: 'Zero-Cost Safety',
    passiveDescription: 'Neutraliza 50% do dano de race conditions e contra-ataca com precisão estrita.',
    description: 'Guardião elemental de Rust. Domine segurança de memória, ponteiros e algoritmos de alto rendimento sem garbage collector.',
    skills: [
      {
        id: 'skill_borrow_check',
        name: 'Borrow Checker Strike',
        type: 'COMPILER',
        power: 45,
        accuracy: 100,
        pp: 28,
        maxPp: 28,
        description: 'Verifica ownership e ataca com precisão matemática em tempo de compilação.',
      },
      {
        id: 'skill_immutable_wall',
        name: 'Immutable Guard',
        type: 'COMPILER',
        power: 0,
        accuracy: 100,
        pp: 15,
        maxPp: 15,
        description: 'Bloqueia mutações indesejadas e absorve dano de bugs de memória.',
      },
      {
        id: 'skill_zero_cost_blast',
        name: 'Zero-Cost Abstraction',
        type: 'COMPILER',
        power: 95,
        accuracy: 80,
        pp: 5,
        maxPp: 5,
        description: 'Libera a fúria do metal com zero overhead de runtime.',
      },
    ],
  },
  {
    id: 'starter_pyro_bug',
    name: 'Byte-Drake',
    codeName: 'PYRO_BUG.exe',
    type: 'COMPILER',
    level: 5,
    hp: 45,
    maxHp: 45,
    attack: 52,
    defense: 43,
    speed: 65,
    icon: '🔥',
    color: '#FFA116',
    accentColor: '#FF6B00',
    description: 'Especialista em compilação instantânea e ataques térmicos de overclock.',
    skills: [
      {
        id: 'skill_syntax_strike',
        name: 'Syntax Strike',
        type: 'COMPILER',
        power: 40,
        accuracy: 100,
        pp: 35,
        maxPp: 35,
        description: 'Dispara uma rajada precisa de caracteres válidos.',
      },
      {
        id: 'skill_hot_reload',
        name: 'Hot Reload',
        type: 'COMPILER',
        power: 65,
        accuracy: 90,
        pp: 15,
        maxPp: 15,
        description: 'Reinjeta código dinâmico gerando calor de runtime.',
      },
      {
        id: 'skill_kernel_panic',
        name: 'Kernel Panic',
        type: 'COMPILER',
        power: 90,
        accuracy: 80,
        pp: 5,
        maxPp: 5,
        description: 'Causa colapso temporário no buffer de memória adversário.',
      },
    ],
  },
  {
    id: 'starter_cyber_turtle',
    name: 'Hydra-Shell',
    codeName: 'CYBER_TURTLE.ts',
    type: 'NETWORK',
    level: 5,
    hp: 55,
    maxHp: 55,
    attack: 48,
    defense: 65,
    speed: 43,
    icon: '🛡️',
    color: '#00E5FF',
    accentColor: '#0070F3',
    description: 'Tanque resiliente de pacotes de rede e blindagem criptográfica AES-256.',
    skills: [
      {
        id: 'skill_packet_blast',
        name: 'Packet Blast',
        type: 'NETWORK',
        power: 40,
        accuracy: 100,
        pp: 30,
        maxPp: 30,
        description: 'Envia um fluxo pesado de pacotes TCP syn.',
      },
      {
        id: 'skill_tls_shield',
        name: 'TLS Handshake',
        type: 'NETWORK',
        power: 0,
        accuracy: 100,
        pp: 20,
        maxPp: 20,
        description: 'Aumenta drasticamente a defesa com criptografia assimétrica.',
      },
      {
        id: 'skill_ddos_surge',
        name: 'DDoS Surge',
        type: 'NETWORK',
        power: 80,
        accuracy: 85,
        pp: 8,
        maxPp: 8,
        description: 'Satura os circuitos inimigos com requisições concorrentes.',
      },
    ],
  },
  {
    id: 'starter_volt_fox',
    name: 'Volt-Fox',
    codeName: 'NEON_SPARK.rs',
    type: 'LOGIC',
    level: 5,
    hp: 42,
    maxHp: 42,
    attack: 60,
    defense: 40,
    speed: 72,
    icon: '⚡',
    color: '#04D361',
    accentColor: '#00B37E',
    description: 'Velocidade de execução em Rust e paralelismo ultra-rápido de baixa latência.',
    skills: [
      {
        id: 'skill_fiber_pulse',
        name: 'Fiber Pulse',
        type: 'LOGIC',
        power: 45,
        accuracy: 95,
        pp: 25,
        maxPp: 25,
        description: 'Disparo de luz laser em fibra óptica com impacto imediato.',
      },
      {
        id: 'skill_borrow_checker',
        name: 'Borrow Checker',
        type: 'LOGIC',
        power: 70,
        accuracy: 90,
        pp: 12,
        maxPp: 12,
        description: 'Verifica mutabilidade proibida e contra-ataca bugs de concorrência.',
      },
      {
        id: 'skill_zero_cost',
        name: 'Zero-Cost Abstraction',
        type: 'LOGIC',
        power: 95,
        accuracy: 75,
        pp: 5,
        maxPp: 5,
        description: 'Dano massivo sem nenhum overhead de garbage collector.',
      },
    ],
  },
];

export const INITIAL_INVENTORY: GameItem[] = [
  {
    id: 'item_espresso_potion',
    name: 'Espresso Double Shot',
    category: 'potion',
    quantity: 3,
    description: 'Restaura 25 HP com aroma estimulante de café torrado.',
    effectValue: 25,
    icon: '☕',
  },
  {
    id: 'item_ram_booster',
    name: 'RAM Booster 32GB',
    category: 'buff',
    quantity: 2,
    description: 'Aumenta a velocidade de processamento e reduz lag em combate.',
    effectValue: 15,
    icon: '💾',
  },
  {
    id: 'item_git_revert',
    name: 'Git Revert Token',
    category: 'utility',
    quantity: 1,
    description: 'Desfaz o último estado corrompido e remove debuffs.',
    effectValue: 0,
    icon: '⏪',
  },
  {
    id: 'item_neural_patch',
    name: 'Neural Microchip',
    category: 'key',
    quantity: 1,
    description: 'Chave de acesso criptográfica para os setores de segurança NEXUS.',
    effectValue: 0,
    icon: '🔑',
  },
];

const DEFAULT_ENEMY: EnemyCreature = {
  id: 'enemy_syntax_bug_404',
  name: 'SyntaxBug #404',
  type: 'COMPILER',
  level: 4,
  hp: 35,
  maxHp: 35,
  attack: 42,
  defense: 35,
  speed: 45,
  xpReward: 35,
  bitsReward: 60,
  skills: [
    {
      id: 'skill_null_pointer',
      name: 'NullPointerException',
      type: 'COMPILER',
      power: 35,
      accuracy: 90,
      pp: 20,
      maxPp: 20,
      description: 'Acessa endereço de memória inexistente.',
    },
    {
      id: 'skill_infinite_loop',
      name: 'Infinite While Loop',
      type: 'LOGIC',
      power: 50,
      accuracy: 75,
      pp: 10,
      maxPp: 10,
      description: 'Trava a thread principal do navegador.',
    },
  ],
};

export const useGameStore = create<GameStoreState>((set, get) => ({
  // Modo de jogo inicial
  gameMode: 'exploring',
  setGameMode: (mode) => set({ gameMode: mode }),

  // Jogador
  player: {
    name: 'Nexus Runner',
    title: 'Fullstack Cyber Mage',
    level: 1,
    xp: 25,
    maxXp: 100,
    bits: 420,
    steps: 0,
    position: { x: 512, y: 288 },
    direction: 'down',
    avatar: DEFAULT_AVATAR,
  },

  setPlayerName: (name) =>
    set((state) => ({
      player: { ...state.player, name },
    })),

  updatePlayerAvatar: (avatarUpdates) =>
    set((state) => ({
      player: {
        ...state.player,
        avatar: { ...state.player.avatar, ...avatarUpdates },
      },
    })),

  setPlayerPosition: (position) =>
    set((state) => ({
      player: { ...state.player, position },
    })),

  setPlayerDirection: (direction) =>
    set((state) => ({
      player: { ...state.player, direction },
    })),

  incrementSteps: () =>
    set((state) => ({
      player: { ...state.player, steps: state.player.steps + 1 },
    })),

  addXp: (amount) =>
    set((state) => {
      let newXp = state.player.xp + amount;
      let newLevel = state.player.level;
      let newMaxXp = state.player.maxXp;

      while (newXp >= newMaxXp) {
        newXp -= newMaxXp;
        newLevel++;
        newMaxXp = Math.round(newMaxXp * 1.5);
      }

      return {
        player: {
          ...state.player,
          xp: newXp,
          level: newLevel,
          maxXp: newMaxXp,
        },
      };
    }),

  addBits: (amount) =>
    set((state) => ({
      player: { ...state.player, bits: Math.max(0, state.player.bits + amount) },
    })),

  // Matriz de Níveis de Carreira
  careerTier: 'beginner',
  setCareerTier: (tier) => set({ careerTier: tier }),

  // Sistema de Pet Companion e Evolução
  petLevel: 1,
  petXp: 0,
  petMaxXp: 100,
  petStage: 1,
  petStageTitle: 'Filhote',
  evolutionModalOpen: false,
  evolutionDetails: null,

  addPetXp: (amount) => {
    let leveledUp = false;
    let evolved = false;
    let nextLevel = get().petLevel;
    let nextXp = get().petXp + amount;
    let nextMaxXp = get().petMaxXp;
    let nextStage = get().petStage;
    let nextStageTitle = get().petStageTitle;
    let evoDetails = null;

    while (nextXp >= nextMaxXp) {
      nextXp -= nextMaxXp;
      nextLevel += 1;
      nextMaxXp = Math.round(nextMaxXp * 1.35);
      leveledUp = true;
    }

    // Checa evolução para Estágio 2 (Lv 10)
    if (nextLevel >= 10 && nextStage === 1) {
      nextStage = 2;
      nextStageTitle = 'Combatente';
      evolved = true;
      evoDetails = {
        oldStage: 1,
        newStage: 2,
        title: 'Combatente com Armadura Néon',
        skillUnlocked: 'Algorithmic Strike (Dano Crítico em complexidade O(N))',
        petName: get().selectedStarter.name,
      };
    } else if (nextLevel >= 25 && nextStage === 2) {
      nextStage = 3;
      nextStageTitle = 'Guardião Supremo';
      evolved = true;
      evoDetails = {
        oldStage: 2,
        newStage: 3,
        title: 'Guardião Supremo Primordial',
        skillUnlocked: 'Distributed Master (Imunidade total a memory leaks)',
        petName: get().selectedStarter.name,
      };
    }

    set((state) => ({
      petLevel: nextLevel,
      petXp: nextXp,
      petMaxXp: nextMaxXp,
      petStage: nextStage,
      petStageTitle: nextStageTitle,
      evolutionModalOpen: evolved ? true : state.evolutionModalOpen,
      evolutionDetails: evolved ? evoDetails : state.evolutionDetails,
      player: {
        ...state.player,
        xp: state.player.xp + amount,
      },
    }));

    return { leveledUp, evolved, newLevel: nextLevel, newStage: nextStage };
  },

  closeEvolutionModal: () => set({ evolutionModalOpen: false, evolutionDetails: null }),

  // Starters e HP
  startersCatalog: INITIAL_STARTERS,
  selectedStarter: INITIAL_STARTERS[0],
  currentHp: INITIAL_STARTERS[0].hp,
  maxHp: INITIAL_STARTERS[0].maxHp,

  setStarter: (starterId) => {
    const found = get().startersCatalog.find((s) => s.id === starterId);
    if (found) {
      set({
        selectedStarter: found,
        currentHp: found.hp,
        maxHp: found.maxHp,
      });
    }
  },

  updateHp: (amount) =>
    set((state) => {
      const nextHp = Math.max(0, Math.min(state.maxHp, state.currentHp + amount));
      return { currentHp: nextHp };
    }),

  restoreHpFull: () =>
    set((state) => ({
      currentHp: state.maxHp,
    })),

  // Inventário
  inventory: INITIAL_INVENTORY,

  addItem: (item, qty = 1) =>
    set((state) => {
      const existing = state.inventory.find((i) => i.id === item.id);
      if (existing) {
        return {
          inventory: state.inventory.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + qty } : i
          ),
        };
      }
      return {
        inventory: [...state.inventory, { ...item, quantity: qty }],
      };
    }),

  removeItem: (itemId, qty = 1) =>
    set((state) => ({
      inventory: state.inventory
        .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - qty } : i))
        .filter((i) => i.quantity > 0),
    })),

  useItem: (itemId) => {
    const state = get();
    const item = state.inventory.find((i) => i.id === itemId);
    if (!item || item.quantity <= 0) return false;

    if (item.category === 'potion' && item.effectValue > 0) {
      state.updateHp(item.effectValue);
      state.removeItem(itemId, 1);
      return true;
    }

    if (item.category === 'buff') {
      state.removeItem(itemId, 1);
      return true;
    }

    return false;
  },

  // Batalha
  currentBattle: null,

  startBattle: (customEnemy) => {
    const enemy: EnemyCreature = {
      ...DEFAULT_ENEMY,
      ...customEnemy,
    };
    set({
      gameMode: 'battle',
      currentBattle: {
        enemy,
        turn: 'player',
        log: [`Um selvagem [${enemy.name}] corrompeu o runtime!`, 'O que você vai fazer?'],
        isFinished: false,
      },
    });
  },

  attackEnemy: (skillId) => {
    const { currentBattle, selectedStarter, updateHp, addXp, addBits, setGameMode } = get();
    if (!currentBattle || currentBattle.isFinished) return;

    const skill =
      selectedStarter.skills.find((s) => s.id === skillId) || selectedStarter.skills[0];

    // 1. Dano do jogador no inimigo
    const baseDamage = Math.max(
      5,
      Math.round(
        ((2 * selectedStarter.level) / 5 + 2) *
          skill.power *
          (selectedStarter.attack / currentBattle.enemy.defense) *
          (0.85 + Math.random() * 0.3)
      )
    );

    const nextEnemyHp = Math.max(0, currentBattle.enemy.hp - baseDamage);
    const updatedLog = [
      ...currentBattle.log,
      `${selectedStarter.name} usou [${skill.name}]! Causou ${baseDamage} de dano.`,
    ];

    if (nextEnemyHp <= 0) {
      // Vitória do jogador
      updatedLog.push(`[${currentBattle.enemy.name}] foi neutralizado!`);
      updatedLog.push(`Você ganhou +${currentBattle.enemy.xpReward} XP e +${currentBattle.enemy.bitsReward} Bits!`);

      addXp(currentBattle.enemy.xpReward);
      addBits(currentBattle.enemy.bitsReward);

      set({
        currentBattle: {
          ...currentBattle,
          enemy: { ...currentBattle.enemy, hp: 0 },
          log: updatedLog,
          isFinished: true,
          winner: 'player',
        },
      });

      // Retorna ao modo de exploração após 2 segundos
      setTimeout(() => {
        setGameMode('exploring');
        set({ currentBattle: null });
      }, 2400);

      return;
    }

    // 2. Contra-ataque do inimigo
    const enemySkill =
      currentBattle.enemy.skills[
        Math.floor(Math.random() * currentBattle.enemy.skills.length)
      ] || currentBattle.enemy.skills[0];

    const enemyDamage = Math.max(
      4,
      Math.round(
        ((2 * currentBattle.enemy.level) / 5 + 2) *
          enemySkill.power *
          (currentBattle.enemy.attack / selectedStarter.defense) *
          (0.85 + Math.random() * 0.3)
      )
    );

    setTimeout(() => {
      updateHp(-enemyDamage);
      const postEnemyHp = get().currentHp;

      const counterLog = [
        ...updatedLog,
        `[${currentBattle.enemy.name}] contra-atacou com [${enemySkill.name}]! Causou ${enemyDamage} de dano.`,
      ];

      if (postEnemyHp <= 0) {
        counterLog.push(`Seu companheiro ${selectedStarter.name} desmaiou! Emergência de runtime.`);
        set({
          currentBattle: {
            ...currentBattle,
            enemy: { ...currentBattle.enemy, hp: nextEnemyHp },
            log: counterLog,
            isFinished: true,
            winner: 'enemy',
          },
        });
      } else {
        set({
          currentBattle: {
            ...currentBattle,
            enemy: { ...currentBattle.enemy, hp: nextEnemyHp },
            turn: 'player',
            log: counterLog,
          },
        });
      }
    }, 600);

    set({
      currentBattle: {
        ...currentBattle,
        enemy: { ...currentBattle.enemy, hp: nextEnemyHp },
        turn: 'enemy',
        log: updatedLog,
      },
    });
  },

  fleeBattle: () => {
    const { currentBattle, setGameMode } = get();
    if (!currentBattle) return;

    set({
      currentBattle: {
        ...currentBattle,
        log: [...currentBattle.log, 'Você escapou com sucesso do loop de combate!'],
        isFinished: true,
      },
    });

    setTimeout(() => {
      setGameMode('exploring');
      set({ currentBattle: null });
    }, 800);
  },

  // Configurações de som e visual
  isMuted: false,
  volume: 0.3,
  debugMode: false,

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  setVolume: (volume) =>
    set(() => ({ volume: Math.max(0, Math.min(1, volume)) })),

  toggleDebug: () => set((state) => ({ debugMode: !state.debugMode })),

  // Lumi Socratic AI Tutor Quota (PR #04)
  lumiQuota: {
    date: new Date().toISOString().slice(0, 10),
    remaining: 5,
    maxDaily: 5,
  },

  useLumiPrompt: () => {
    const today = new Date().toISOString().slice(0, 10);
    const { lumiQuota } = get();

    if (lumiQuota.date !== today) {
      set({
        lumiQuota: {
          date: today,
          remaining: 4,
          maxDaily: 5,
        },
      });
      return true;
    }

    if (lumiQuota.remaining > 0) {
      set({
        lumiQuota: {
          ...lumiQuota,
          remaining: lumiQuota.remaining - 1,
        },
      });
      return true;
    }

    return false;
  },

  // Economia de Bits & Quotas (PR #07)
  streakFreezes: 0,

  rechargeLumiQuota: (costInBits = 100) => {
    const { player, lumiQuota } = get();
    if (player.bits < costInBits) {
      return false;
    }
    set({
      player: {
        ...player,
        bits: player.bits - costInBits,
      },
      lumiQuota: {
        ...lumiQuota,
        remaining: lumiQuota.remaining + 3,
      },
    });
    return true;
  },

  buyStreakFreeze: (costInBits = 250) => {
    const { player, streakFreezes } = get();
    if (player.bits < costInBits) {
      return false;
    }
    set({
      player: {
        ...player,
        bits: player.bits - costInBits,
      },
      streakFreezes: streakFreezes + 1,
    });
    return true;
  },

  useStreakFreeze: () => {
    const { streakFreezes } = get();
    if (streakFreezes <= 0) {
      return false;
    }
    set({
      streakFreezes: streakFreezes - 1,
    });
    return true;
  },

  // Gitea Real Git Automation (PR #04)
  gitRepo: null,

  provisionGitRepo: (repoName: string) => {
    const username = get().player.name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'nexus-runner';
    const cleanRepo = repoName.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'quest-algorithm';
    const url = `http://localhost:3030/${username}/${cleanRepo}`;
    set({
      gitRepo: {
        repoName: cleanRepo,
        repoUrl: url,
        cloneUrl: `git clone ${url}.git`,
        branch: 'main',
        status: 'active',
      },
    });
  },

  // Multi-Biomas e Portais (PR #08)
  currentBiome: 'circuit_valley',
  setBiome: (biome: BiomeType) => set({ currentBiome: biome }),

  // Mascote Gato Preto
  catMood: 'idle',
  setCatMood: (mood) => set({ catMood: mood }),
  catMessage: null,
  setCatMessage: (catMessage) => set({ catMessage }),

  // Visual Lesson Modal (Zen Mode)
  activeLessonId: null,
  openVisualLesson: (activeLessonId) => set({ activeLessonId }),
  closeVisualLesson: () => set({ activeLessonId: null }),

  // Reset
  resetGame: () =>
    set(() => ({
      gameMode: 'exploring',
      player: {
        name: 'Nexus Runner',
        title: 'Fullstack Cyber Mage',
        level: 1,
        xp: 25,
        maxXp: 100,
        bits: 420,
        steps: 0,
        position: { x: 512, y: 288 },
        direction: 'down',
        avatar: DEFAULT_AVATAR,
      },
      currentHp: INITIAL_STARTERS[0].hp,
      maxHp: INITIAL_STARTERS[0].maxHp,
      selectedStarter: INITIAL_STARTERS[0],
      inventory: INITIAL_INVENTORY,
      currentBattle: null,
      isMuted: false,
      debugMode: false,
      lumiQuota: {
        date: new Date().toISOString().slice(0, 10),
        remaining: 5,
        maxDaily: 5,
      },
      streakFreezes: 0,
      gitRepo: null,
      currentBiome: 'circuit_valley',
    })),
}));
