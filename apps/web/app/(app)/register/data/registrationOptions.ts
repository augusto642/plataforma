import {
  CAREER_GOALS as SHARED_CAREER_GOALS,
  CAREER_GOAL_LABELS,
  EXPERIENCE_LEVELS,
  WEEKLY_TIME_COMMITMENTS,
  type CareerGoal,
  type ExperienceLevel,
  type WeeklyTimeCommitment,
} from '@plataforma/contracts';

export type { CareerGoal };

export type CareerGoalGroupId =
  | 'dev_web'
  | 'ai_data'
  | 'cloud_infra'
  | 'specialties'
  | 'career_product';

export interface CareerGoalGroupOption {
  id: CareerGoalGroupId;
  label: string;
}

export interface CareerGoalOption {
  id: CareerGoal;
  title: string;
  desc: string;
  icon: string;
  category: string;
  group: CareerGoalGroupId;
}

const GROUP_LABELS: Record<CareerGoalGroupId, string> = {
  dev_web: 'Desenvolvimento',
  ai_data: 'IA & Dados',
  cloud_infra: 'Cloud & Infra',
  specialties: 'Especialidades',
  career_product: 'Carreira & Produto',
};

export const CAREER_GOAL_GROUPS: CareerGoalGroupOption[] = (
  Object.entries(GROUP_LABELS) as [CareerGoalGroupId, string][]
).map(([id, label]) => ({ id, label }));

const CAREER_GOAL_CONTENT: Record<
  CareerGoal,
  Pick<CareerGoalOption, 'desc' | 'icon' | 'category' | 'group'>
> = {
  frontend: {
    desc: 'Crie interfaces web acessíveis, rápidas e agradáveis de usar.',
    icon: '🎨',
    category: GROUP_LABELS.dev_web,
    group: 'dev_web',
  },
  backend: {
    desc: 'Construa APIs, regras de negócio e serviços confiáveis.',
    icon: '⚙️',
    category: GROUP_LABELS.dev_web,
    group: 'dev_web',
  },
  ai: {
    desc: 'Desenvolva soluções com inteligência artificial e modelos de linguagem.',
    icon: '🤖',
    category: GROUP_LABELS.ai_data,
    group: 'ai_data',
  },
  fullstack: {
    desc: 'Aprenda a conectar interfaces, APIs e bancos de dados.',
    icon: '🧩',
    category: GROUP_LABELS.dev_web,
    group: 'dev_web',
  },
  architect: {
    desc: 'Projete sistemas escaláveis, seguros e fáceis de evoluir.',
    icon: '🏗️',
    category: GROUP_LABELS.cloud_infra,
    group: 'cloud_infra',
  },
  devops: {
    desc: 'Automatize integração, entrega e operação de aplicações.',
    icon: '🚀',
    category: GROUP_LABELS.cloud_infra,
    group: 'cloud_infra',
  },
  data_science: {
    desc: 'Explore dados para encontrar padrões e gerar previsões.',
    icon: '📊',
    category: GROUP_LABELS.ai_data,
    group: 'ai_data',
  },
  data_engineering: {
    desc: 'Projete pipelines e plataformas para dados em escala.',
    icon: '🗄️',
    category: GROUP_LABELS.ai_data,
    group: 'ai_data',
  },
  design: {
    desc: 'Una design de produto, prototipação e implementação.',
    icon: '✏️',
    category: GROUP_LABELS.career_product,
    group: 'career_product',
  },
  freelancer: {
    desc: 'Construa projetos e habilidades para trabalhar por conta própria.',
    icon: '💼',
    category: GROUP_LABELS.career_product,
    group: 'career_product',
  },
  mobile: {
    desc: 'Desenvolva aplicativos para celulares e tablets.',
    icon: '📱',
    category: GROUP_LABELS.dev_web,
    group: 'dev_web',
  },
  security: {
    desc: 'Proteja aplicações, infraestrutura e dados contra ameaças.',
    icon: '🛡️',
    category: GROUP_LABELS.specialties,
    group: 'specialties',
  },
  qa: {
    desc: 'Garanta a qualidade com testes, automação e prevenção de defeitos.',
    icon: '🧪',
    category: GROUP_LABELS.specialties,
    group: 'specialties',
  },
  global: {
    desc: 'Prepare-se para colaborar com equipes e empresas internacionais.',
    icon: '🌎',
    category: GROUP_LABELS.career_product,
    group: 'career_product',
  },
  lead: {
    desc: 'Desenvolva habilidades para orientar pessoas e decisões técnicas.',
    icon: '🧭',
    category: GROUP_LABELS.career_product,
    group: 'career_product',
  },
  startup: {
    desc: 'Transforme ideias em produtos digitais e valide soluções rapidamente.',
    icon: '💡',
    category: GROUP_LABELS.career_product,
    group: 'career_product',
  },
  hackathons: {
    desc: 'Pratique prototipação rápida e colaboração em desafios de tecnologia.',
    icon: '🏆',
    category: GROUP_LABELS.specialties,
    group: 'specialties',
  },
  mlops: {
    desc: 'Coloque modelos de machine learning em produção com confiabilidade.',
    icon: '🔬',
    category: GROUP_LABELS.ai_data,
    group: 'ai_data',
  },
  platform_engineering: {
    desc: 'Crie plataformas internas que simplificam o trabalho de desenvolvimento.',
    icon: '🧰',
    category: GROUP_LABELS.cloud_infra,
    group: 'cloud_infra',
  },
  cloud_architect: {
    desc: 'Projete ambientes de nuvem seguros, resilientes e eficientes.',
    icon: '☁️',
    category: GROUP_LABELS.cloud_infra,
    group: 'cloud_infra',
  },
  gamedev: {
    desc: 'Crie jogos, mecânicas interativas e experiências em tempo real.',
    icon: '🎮',
    category: GROUP_LABELS.specialties,
    group: 'specialties',
  },
  blockchain: {
    desc: 'Explore contratos inteligentes e aplicações descentralizadas.',
    icon: '🔗',
    category: GROUP_LABELS.specialties,
    group: 'specialties',
  },
  embedded_iot: {
    desc: 'Programe dispositivos, sensores e sistemas conectados.',
    icon: '📡',
    category: GROUP_LABELS.specialties,
    group: 'specialties',
  },
  automation_rpa: {
    desc: 'Automatize tarefas e processos com software, bots e RPA.',
    icon: '🔄',
    category: GROUP_LABELS.ai_data,
    group: 'ai_data',
  },
  product_manager: {
    desc: 'Conecte necessidades de usuários, estratégia e entrega de produto.',
    icon: '🗺️',
    category: GROUP_LABELS.career_product,
    group: 'career_product',
  },
};

export const CAREER_GOALS: CareerGoalOption[] = SHARED_CAREER_GOALS.map((id) => ({
  id,
  title: CAREER_GOAL_LABELS[id],
  ...CAREER_GOAL_CONTENT[id],
}));

export const CAREER_GOAL_MAP = CAREER_GOALS.reduce(
  (map, goal) => {
    map[goal.id] = goal;
    return map;
  },
  {} as Record<CareerGoal, CareerGoalOption>,
);

export type TimeCommitment = WeeklyTimeCommitment;

export interface TimeCommitmentOption {
  id: TimeCommitment;
  title: string;
  desc: string;
  icon: string;
}

const TIME_COMMITMENT_CONTENT: Record<
  TimeCommitment,
  Omit<TimeCommitmentOption, 'id'>
> = {
  '5h': { title: '5 horas', desc: 'Um ritmo leve para começar.', icon: '🌱' },
  '10h': { title: '10 horas', desc: 'Um ritmo equilibrado e consistente.', icon: '⚡' },
  '20h': { title: '20 horas', desc: 'Dedicação intensiva para avançar mais rápido.', icon: '🔥' },
};

export const TIME_COMMITMENTS: TimeCommitmentOption[] = WEEKLY_TIME_COMMITMENTS.map((id) => ({
  id,
  ...TIME_COMMITMENT_CONTENT[id],
}));

export const TIME_COMMITMENT_MAP = TIME_COMMITMENTS.reduce(
  (map, item) => {
    map[item.id] = item;
    return map;
  },
  {} as Record<TimeCommitment, TimeCommitmentOption>,
);

export const PRIMARY_TECHNOLOGY_IDS = [
  'javascript',
  'typescript',
  'python',
  'react-nextjs',
  'nodejs',
  'java',
  'csharp',
  'go',
  'sql-data',
  'docker-cloud',
  'mobile-rn-flutter',
  'rust',
  'php',
  'undecided',
] as const;

export type PrimaryTechId = (typeof PRIMARY_TECHNOLOGY_IDS)[number];

export interface PrimaryTechOption {
  id: PrimaryTechId;
  title: string;
  desc: string;
  badge: string;
  category: string;
  recommendedGoals: CareerGoal[];
}

const ALL_CAREER_GOALS: CareerGoal[] = [...SHARED_CAREER_GOALS];

const PRIMARY_TECH_CONTENT: Record<
  PrimaryTechId,
  Omit<PrimaryTechOption, 'id'>
> = {
  javascript: {
    title: 'JavaScript',
    desc: 'Uma linguagem versátil para criar experiências web interativas.',
    badge: 'JS',
    category: 'Web',
    recommendedGoals: ['frontend', 'fullstack', 'gamedev', 'hackathons'],
  },
  typescript: {
    title: 'TypeScript',
    desc: 'JavaScript com tipos para construir aplicações mais previsíveis.',
    badge: 'TS',
    category: 'Web',
    recommendedGoals: ['frontend', 'backend', 'fullstack', 'global'],
  },
  python: {
    title: 'Python',
    desc: 'Uma linguagem acessível para automação, dados e inteligência artificial.',
    badge: 'Py',
    category: 'IA & Dados',
    recommendedGoals: ['ai', 'data_science', 'data_engineering', 'mlops', 'automation_rpa'],
  },
  'react-nextjs': {
    title: 'React / Next.js',
    desc: 'Crie interfaces e aplicações web modernas com componentes.',
    badge: 'R',
    category: 'Web',
    recommendedGoals: ['frontend', 'fullstack', 'design', 'freelancer'],
  },
  nodejs: {
    title: 'Node.js',
    desc: 'Construa APIs e serviços usando JavaScript no servidor.',
    badge: 'N',
    category: 'Backend',
    recommendedGoals: ['backend', 'fullstack', 'startup', 'devops'],
  },
  java: {
    title: 'Java',
    desc: 'Desenvolva aplicações robustas para serviços e sistemas corporativos.',
    badge: 'J',
    category: 'Backend',
    recommendedGoals: ['backend', 'architect', 'global'],
  },
  csharp: {
    title: 'C# / .NET',
    desc: 'Crie serviços, aplicações corporativas e jogos com .NET.',
    badge: 'C#',
    category: 'Backend',
    recommendedGoals: ['backend', 'architect', 'gamedev'],
  },
  go: {
    title: 'Go',
    desc: 'Construa serviços eficientes, ferramentas e sistemas distribuídos.',
    badge: 'Go',
    category: 'Cloud & Backend',
    recommendedGoals: ['backend', 'devops', 'platform_engineering', 'cloud_architect'],
  },
  'sql-data': {
    title: 'SQL & Dados',
    desc: 'Consulte, modele e organize dados relacionais.',
    badge: 'SQL',
    category: 'Dados',
    recommendedGoals: ['data_science', 'data_engineering', 'backend', 'ai'],
  },
  'docker-cloud': {
    title: 'Docker & Cloud',
    desc: 'Empacote aplicações e aprenda fundamentos de infraestrutura em nuvem.',
    badge: '☁',
    category: 'Cloud & Infra',
    recommendedGoals: ['devops', 'platform_engineering', 'cloud_architect', 'architect'],
  },
  'mobile-rn-flutter': {
    title: 'React Native / Flutter',
    desc: 'Desenvolva aplicativos móveis para Android e iOS.',
    badge: 'M',
    category: 'Mobile',
    recommendedGoals: ['mobile', 'freelancer', 'startup'],
  },
  rust: {
    title: 'Rust',
    desc: 'Explore sistemas de alto desempenho e controle seguro de memória.',
    badge: 'Rs',
    category: 'Sistemas',
    recommendedGoals: ['embedded_iot', 'blockchain', 'security'],
  },
  php: {
    title: 'PHP',
    desc: 'Crie aplicações web e APIs com uma linguagem amplamente usada na web.',
    badge: 'PHP',
    category: 'Web',
    recommendedGoals: ['backend', 'freelancer', 'fullstack'],
  },
  undecided: {
    title: 'Deixe a Lumi decidir',
    desc: 'A plataforma sugere uma tecnologia inicial a partir dos seus objetivos.',
    badge: '✨',
    category: 'Recomendado',
    recommendedGoals: ALL_CAREER_GOALS,
  },
};

export const PRIMARY_TECHNOLOGIES: PrimaryTechOption[] = PRIMARY_TECHNOLOGY_IDS.map((id) => ({
  id,
  ...PRIMARY_TECH_CONTENT[id],
}));

export const PRIMARY_TECH_MAP = PRIMARY_TECHNOLOGIES.reduce(
  (map, tech) => {
    map[tech.id] = tech;
    return map;
  },
  {} as Record<PrimaryTechId, PrimaryTechOption>,
);

export function isTechRecommendedForGoals(
  tech: PrimaryTechOption,
  goals: CareerGoal[],
): boolean {
  return tech.id === 'undecided' || goals.some((goal) => tech.recommendedGoals.includes(goal));
}

export type PriorLanguageId =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'csharp'
  | 'go'
  | 'php'
  | 'sql'
  | 'rust';

export interface PriorLanguageOption {
  id: PriorLanguageId;
  label: string;
  tag: string;
  hint: string;
}

export const PRIOR_LANGUAGES: PriorLanguageOption[] = [
  { id: 'javascript', label: 'JavaScript', tag: 'JS', hint: 'Web e aplicações interativas' },
  { id: 'typescript', label: 'TypeScript', tag: 'TS', hint: 'JavaScript com tipagem' },
  { id: 'python', label: 'Python', tag: 'Py', hint: 'Automação, dados e IA' },
  { id: 'java', label: 'Java', tag: 'J', hint: 'Aplicações e serviços' },
  { id: 'csharp', label: 'C#', tag: 'C#', hint: '.NET e desenvolvimento de jogos' },
  { id: 'go', label: 'Go', tag: 'Go', hint: 'Serviços e infraestrutura' },
  { id: 'php', label: 'PHP', tag: 'PHP', hint: 'Aplicações web' },
  { id: 'sql', label: 'SQL', tag: 'SQL', hint: 'Consultas e modelagem de dados' },
  { id: 'rust', label: 'Rust', tag: 'Rs', hint: 'Sistemas e alto desempenho' },
];

export type AssessedLevel = 'Iniciante' | 'Júnior' | 'Pleno' | 'Sênior';

const LEVEL_LABELS: Record<ExperienceLevel, AssessedLevel> = {
  beginner: 'Iniciante',
  junior: 'Júnior',
  mid: 'Pleno',
  senior: 'Sênior',
};

export interface RegistrationChallenge {
  id: string;
  language: string;
  languageLabel: string;
  title: string;
  prompt: string;
  code: string;
  hint: string;
  difficultyLabel: string;
}

export interface LevelEvaluationResult {
  level: AssessedLevel;
  experienceLevel: ExperienceLevel;
  identifiedConcepts: string[];
  feedback: string;
  source: 'llm' | 'heuristic';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isExperienceLevel(value: unknown): value is ExperienceLevel {
  return (
    typeof value === 'string' &&
    EXPERIENCE_LEVELS.some((experienceLevel) => experienceLevel === value)
  );
}

export function normalizeApiChallenge(
  value: unknown,
  hasProgrammedBefore: boolean,
  fallbackLanguage?: PriorLanguageId | '',
): RegistrationChallenge | null {
  if (!isRecord(value)) return null;

  const { id, language, title, prompt, hint } = value;
  const code = typeof value.codeSnippet === 'string' ? value.codeSnippet : value.code;
  if (
    typeof id !== 'string' ||
    typeof language !== 'string' ||
    typeof title !== 'string' ||
    typeof prompt !== 'string' ||
    typeof code !== 'string' ||
    typeof hint !== 'string'
  ) {
    return null;
  }

  const selectedLanguage = PRIOR_LANGUAGES.find((item) => item.id === fallbackLanguage);
  const languageLabel =
    typeof value.languageLabel === 'string'
      ? value.languageLabel
      : language === 'logic'
        ? 'Lógica de Programação'
        : selectedLanguage?.label ?? language;

  return {
    id,
    language,
    languageLabel,
    title,
    prompt,
    code,
    hint,
    difficultyLabel:
      typeof value.difficultyLabel === 'string'
        ? value.difficultyLabel
        : hasProgrammedBefore
          ? 'Leitura de código'
          : 'Lógica de programação',
  };
}

const LOGIC_FALLBACK: RegistrationChallenge = {
  id: 'reg-logic-v1',
  language: 'logic',
  languageLabel: 'Lógica de Programação',
  title: 'Leitura de lógica passo a passo',
  prompt:
    'Não precisa conhecer nenhuma linguagem! Leia os passos abaixo como uma receita e conte, com suas palavras, o que acontece no final.',
  code: [
    'lista_de_compras = [15, 40, 25, 10]',
    'total = 0',
    '',
    'para cada preco na lista_de_compras:',
    '    se preco >= 20:',
    '        total = total + preco',
    '',
    'se total > 50:',
    '    total = total - 10',
    '',
    'mostrar total',
  ].join('\n'),
  hint: 'Acompanhe os 4 preços: quais entram na soma e se o desconto final se aplica.',
  difficultyLabel: 'Lógica de programação',
};

const JAVASCRIPT_FALLBACK: RegistrationChallenge = {
  id: 'reg-javascript-v1',
  language: 'javascript',
  languageLabel: 'JavaScript',
  title: 'Leitura de código em JavaScript',
  prompt:
    'Explique com suas próprias palavras o que esta função faz, como ela transforma os dados e o que aconteceria em casos extremos.',
  code: [
    'function ativosPorEmail(usuarios) {',
    '  const vistos = new Set();',
    '  return usuarios.filter((u) => {',
    '    if (!u?.ativo || !u.email) return false;',
    '    const chave = u.email.trim().toLowerCase();',
    '    if (vistos.has(chave)) return false;',
    '    vistos.add(chave);',
    '    return true;',
    '  });',
    '}',
  ].join('\n'),
  hint: 'Observe o papel do Set e a normalização do e-mail antes de manter cada item.',
  difficultyLabel: 'Leitura de código',
};

export function getFallbackChallenge(
  hasProgrammedBefore: boolean,
  priorLanguage?: PriorLanguageId | '',
): RegistrationChallenge {
  return hasProgrammedBefore && priorLanguage === 'javascript'
    ? JAVASCRIPT_FALLBACK
    : LOGIC_FALLBACK;
}

const CONCEPT_SIGNALS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'Condições e decisões', pattern: /se\b|caso\b|condi[cç][aã]o|maior que|menor que/i },
  { label: 'Repetição e laços', pattern: /para cada|enquanto|repet|la[cç]o|loop|itera/i },
  { label: 'Variáveis e acumulação', pattern: /vari[aá]vel|total|acumul|armazen|guardar/i },
  { label: 'Listas e coleções', pattern: /lista|array|item|elemento|cole[cç][aã]o/i },
  { label: 'Funções e resultados', pattern: /fun[cç][aã]o|par[aâ]metro|retorna|retorno/i },
  { label: 'Casos de borda e testes', pattern: /limite|caso extremo|erro|teste|lista vazia/i },
];

export function evaluateChallengeLocally(input: {
  hasProgrammedBefore: boolean;
  priorLanguage?: PriorLanguageId;
  explanation: string;
}): LevelEvaluationResult {
  const explanation = input.explanation.trim();
  const identifiedConcepts = CONCEPT_SIGNALS.filter(({ pattern }) => pattern.test(explanation)).map(
    ({ label }) => label,
  );
  const signalCount = identifiedConcepts.length;
  const experienceLevel: ExperienceLevel =
    signalCount >= 6 ? 'senior' : signalCount >= 4 ? 'mid' : signalCount >= 2 ? 'junior' : 'beginner';

  const feedback = !explanation
    ? 'Não recebemos uma explicação para avaliar. Você pode tentar novamente descrevendo seu raciocínio.'
    : signalCount >= 4
      ? 'Você identificou várias partes importantes do raciocínio. Essa estimativa foi feita localmente e não substitui uma avaliação detalhada.'
      : signalCount >= 2
        ? 'Você reconheceu conceitos importantes. Esta é uma estimativa local; continue praticando e explicando cada etapa.'
        : 'Obrigado por explicar seu raciocínio. A estimativa local é limitada; use o desafio como ponto de partida para aprender.';

  return {
    level: LEVEL_LABELS[experienceLevel],
    experienceLevel,
    identifiedConcepts,
    feedback,
    source: 'heuristic',
  };
}

export function normalizeApiEvaluation(
  value: unknown,
  hasProgrammedBefore: boolean,
  explanation: string,
): LevelEvaluationResult | null {
  if (!isRecord(value)) return null;

  const experienceLevel = value.detectedLevel;
  if (!isExperienceLevel(experienceLevel) || typeof value.feedback !== 'string') {
    return null;
  }

  const detectedConcepts = Array.isArray(value.detectedConcepts)
    ? value.detectedConcepts.filter((concept): concept is string => typeof concept === 'string')
    : [];
  const concepts =
    detectedConcepts.length > 0
      ? detectedConcepts
      : evaluateChallengeLocally({ hasProgrammedBefore, explanation }).identifiedConcepts;
  const source = value.source === 'llm' ? 'llm' : 'heuristic';

  return {
    level: LEVEL_LABELS[experienceLevel],
    experienceLevel,
    identifiedConcepts: concepts,
    feedback: value.feedback,
    source,
  };
}
