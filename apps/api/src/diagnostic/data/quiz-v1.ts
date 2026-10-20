// Quiz diagnóstico v1 (B09) — dados versionados do questionário de entrada.
//
// Desenho:
// - 24 questões em PT-BR, tom acolhedor para quem nunca programou.
// - 12 de conhecimento (`knowledge`, com gabarito) e 12 de preferência
//   (`preference`, sem certa/errada: cada opção soma pesos nos eixos).
// - 6 eixos do radar: logica, codigo, web, dados, automacao, jogos.
//   Cada eixo tem 2 questões de conhecimento e aparece distribuído nas
//   opções de preferência (primário +6 / secundário +3).
// - Scoring determinístico no servidor (ver diagnostic.service.ts):
//   conhecimento certo +10 no eixo da questão, errado +3 (participar já
//   conta — ninguém sai zerado); preferência soma os pesos da opção.
//   Escores normalizados para 0–100 pelo máximo alcançável de cada eixo,
//   calculado a partir destes dados (sem constantes mágicas à mão).
//
// REGRA ANTI-HUMILHAÇÃO (herdada do "Mapa de Habilidades" da BuildRun):
// nenhum resultado é defeito. Escore baixo vira "ponto de partida" e todo
// arquétipo — inclusive o de perfil equilibrado — tem texto de pontos
// fortes que emoldura o resultado positivamente.
//
// O gabarito (`correctOptionId`) e os pesos vivem SÓ aqui, no servidor.
// O endpoint público do quiz serializa apenas id/axis/type/prompt/options
// (id+label) — ver DiagnosticService.getPublicQuiz().

export const QUIZ_VERSION = 'v1';

export type AxisId =
  | 'logica'
  | 'codigo'
  | 'web'
  | 'dados'
  | 'automacao'
  | 'jogos';

/** Ordem fixa dos eixos — também é a ordem de desempate final do arquétipo. */
export const AXES: AxisId[] = [
  'logica',
  'codigo',
  'web',
  'dados',
  'automacao',
  'jogos',
];

export type QuestionType = 'knowledge' | 'preference';

export interface QuizOptionDef {
  id: string;
  label: string;
  /** Pesos por eixo (só em questões de preferência). */
  weights?: Partial<Record<AxisId, number>>;
}

export interface QuizQuestionDef {
  id: string;
  axis: AxisId;
  type: QuestionType;
  prompt: string;
  options: QuizOptionDef[];
  /** Só em questões de conhecimento. Nunca sai da API. */
  correctOptionId?: string;
}

export const KNOWLEDGE_CORRECT_POINTS = 10;
export const KNOWLEDGE_WRONG_POINTS = 3;

export const QUESTIONS: QuizQuestionDef[] = [
  // ------------------------------------------------------------- logica
  {
    id: 'q01',
    axis: 'logica',
    type: 'knowledge',
    prompt: 'Observe a sequência: 3, 6, 12, 24... Qual é o próximo número?',
    options: [
      { id: 'a', label: '30' },
      { id: 'b', label: '36' },
      { id: 'c', label: '48' },
      { id: 'd', label: '42' },
    ],
    correctOptionId: 'c',
  },
  {
    id: 'q02',
    axis: 'logica',
    type: 'knowledge',
    prompt:
      'Se todos os gatos são mamíferos, e o Bento é um gato, o que podemos concluir?',
    options: [
      { id: 'a', label: 'O Bento é um mamífero' },
      { id: 'b', label: 'Todo mamífero é um gato' },
      { id: 'c', label: 'O Bento consegue voar' },
      { id: 'd', label: 'Não dá para concluir nada' },
    ],
    correctOptionId: 'a',
  },
  {
    id: 'q03',
    axis: 'logica',
    type: 'preference',
    prompt: 'Como você prefere aprender algo totalmente novo?',
    options: [
      {
        id: 'a',
        label: 'Entendendo a lógica por trás, passo a passo',
        weights: { logica: 6, codigo: 3 },
      },
      {
        id: 'b',
        label: 'Vendo exemplos prontos funcionando',
        weights: { web: 6, jogos: 3 },
      },
      {
        id: 'c',
        label: 'Testando na prática até dar certo',
        weights: { codigo: 6, automacao: 3 },
      },
      {
        id: 'd',
        label: 'Vendo gráficos e resumos do assunto',
        weights: { dados: 6, web: 3 },
      },
    ],
  },
  {
    id: 'q04',
    axis: 'logica',
    type: 'preference',
    prompt: 'Você travou num quebra-cabeça difícil. O que você faz?',
    options: [
      {
        id: 'a',
        label: 'Paro e analiso o padrão com calma',
        weights: { logica: 6, dados: 3 },
      },
      {
        id: 'b',
        label: 'Tento combinações diferentes até encaixar',
        weights: { codigo: 6, logica: 3 },
      },
      {
        id: 'c',
        label: 'Procuro uma ferramenta que me ajude',
        weights: { automacao: 6, web: 3 },
      },
      {
        id: 'd',
        label: 'Chamo alguém para resolver junto comigo',
        weights: { jogos: 6, web: 3 },
      },
    ],
  },
  // ------------------------------------------------------------- codigo
  {
    id: 'q05',
    axis: 'codigo',
    type: 'knowledge',
    prompt: 'Na programação, para que serve uma variável?',
    options: [
      { id: 'a', label: 'Para deixar o código mais bonito' },
      { id: 'b', label: 'Para ligar o computador' },
      { id: 'c', label: 'Para traduzir o código para português' },
      { id: 'd', label: 'Para guardar um valor e usar depois' },
    ],
    correctOptionId: 'd',
  },
  {
    id: 'q06',
    axis: 'codigo',
    type: 'knowledge',
    prompt: 'O que um comando como escreva("Olá!") — o print de outras linguagens — faz?',
    options: [
      { id: 'a', label: 'Guarda um número na memória' },
      { id: 'b', label: 'Apaga o programa' },
      { id: 'c', label: 'Mostra um texto na tela' },
      { id: 'd', label: 'Conecta o computador à internet' },
    ],
    correctOptionId: 'c',
  },
  {
    id: 'q07',
    axis: 'codigo',
    type: 'preference',
    prompt: 'Qual dessas atividades parece a mais divertida para você?',
    options: [
      {
        id: 'a',
        label: 'Montar um joguinho simples meu',
        weights: { jogos: 6, codigo: 3 },
      },
      {
        id: 'b',
        label: 'Criar uma página sobre o meu hobby',
        weights: { web: 6, codigo: 3 },
      },
      {
        id: 'c',
        label: 'Fazer uma planilha que calcula tudo sozinha',
        weights: { dados: 6, automacao: 3 },
      },
      {
        id: 'd',
        label: 'Escrever comandos e ver o computador obedecer',
        weights: { codigo: 6, logica: 3 },
      },
    ],
  },
  {
    id: 'q08',
    axis: 'codigo',
    type: 'preference',
    prompt: 'Se você ganhasse um superpoder digital, qual escolheria?',
    options: [
      {
        id: 'a',
        label: 'Um programa que resolve qualquer conta',
        weights: { logica: 6, codigo: 3 },
      },
      {
        id: 'b',
        label: 'Um robô que faz as tarefas chatas por mim',
        weights: { automacao: 6, codigo: 3 },
      },
      {
        id: 'c',
        label: 'Um site que todo mundo quer visitar',
        weights: { web: 6, jogos: 3 },
      },
      {
        id: 'd',
        label: 'Um painel que mostra tudo em gráficos',
        weights: { dados: 6, logica: 3 },
      },
    ],
  },
  // ---------------------------------------------------------------- web
  {
    id: 'q09',
    axis: 'web',
    type: 'knowledge',
    prompt: 'O que significa um site ser "responsivo"?',
    options: [
      { id: 'a', label: 'Ele responde e-mails sozinho' },
      { id: 'b', label: 'Ele se adapta a telas de celular e de computador' },
      { id: 'c', label: 'Ele é o site mais rápido da internet' },
      { id: 'd', label: 'Ele só funciona conectado no Wi-Fi' },
    ],
    correctOptionId: 'b',
  },
  {
    id: 'q10',
    axis: 'web',
    type: 'knowledge',
    prompt:
      'Qual parte de um site é aquela que você vê e toca — botões, textos e imagens?',
    options: [
      { id: 'a', label: 'O banco de dados' },
      { id: 'b', label: 'O servidor' },
      { id: 'c', label: 'A parte visual, chamada de front-end' },
      { id: 'd', label: 'O cabo de rede' },
    ],
    correctOptionId: 'c',
  },
  {
    id: 'q11',
    axis: 'web',
    type: 'preference',
    prompt: 'O que mais chama a sua atenção em um aplicativo?',
    options: [
      {
        id: 'a',
        label: 'Ser bonito e fácil de usar',
        weights: { web: 6, jogos: 3 },
      },
      {
        id: 'b',
        label: 'Ser rápido e nunca travar',
        weights: { codigo: 6, logica: 3 },
      },
      {
        id: 'c',
        label: 'Mostrar informações úteis para mim',
        weights: { dados: 6, web: 3 },
      },
      {
        id: 'd',
        label: 'Fazer coisas automaticamente, sem eu pedir',
        weights: { automacao: 6, web: 3 },
      },
    ],
  },
  {
    id: 'q12',
    axis: 'web',
    type: 'preference',
    prompt: 'Você vai montar a página do seu time na escola. Por onde começa?',
    options: [
      {
        id: 'a',
        label: 'Desenhando como a página vai ficar',
        weights: { web: 6, dados: 3 },
      },
      {
        id: 'b',
        label: 'Pensando nas informações que vão aparecer',
        weights: { dados: 6, web: 3 },
      },
      {
        id: 'c',
        label: 'Já montando e ajustando no caminho',
        weights: { codigo: 6, web: 3 },
      },
      {
        id: 'd',
        label: 'Pensando num joguinho para colocar na página',
        weights: { jogos: 6, web: 3 },
      },
    ],
  },
  // -------------------------------------------------------------- dados
  {
    id: 'q13',
    axis: 'dados',
    type: 'knowledge',
    prompt: 'Uma planilha tem 100 vendas registradas. Para saber a média de vendas, você...',
    options: [
      { id: 'a', label: 'Pega a maior venda' },
      { id: 'b', label: 'Conta quantos dias tiveram venda' },
      { id: 'c', label: 'Ordena os valores em ordem alfabética' },
      { id: 'd', label: 'Soma todas e divide por 100' },
    ],
    correctOptionId: 'd',
  },
  {
    id: 'q14',
    axis: 'dados',
    type: 'knowledge',
    prompt: 'Para que serve, principalmente, um gráfico de barras?',
    options: [
      { id: 'a', label: 'Para comparar valores de um jeito visual' },
      { id: 'b', label: 'Para enviar e-mails automaticamente' },
      { id: 'c', label: 'Para proteger senhas' },
      { id: 'd', label: 'Para criar senhas fortes' },
    ],
    correctOptionId: 'a',
  },
  {
    id: 'q15',
    axis: 'dados',
    type: 'preference',
    prompt: 'Qual pergunta você mais gostaria de responder usando dados?',
    options: [
      {
        id: 'a',
        label: 'Qual produto vende mais — e por quê?',
        weights: { dados: 6, logica: 3 },
      },
      {
        id: 'b',
        label: 'Como deixar um jogo mais divertido?',
        weights: { jogos: 6, dados: 3 },
      },
      {
        id: 'c',
        label: 'Como um programa pode economizar meu tempo?',
        weights: { automacao: 6, dados: 3 },
      },
      {
        id: 'd',
        label: 'Como organizar as informações de um site?',
        weights: { web: 6, dados: 3 },
      },
    ],
  },
  {
    id: 'q16',
    axis: 'dados',
    type: 'preference',
    prompt: 'Numa competição entre amigos, você quer acompanhar quem está ganhando. Você...',
    options: [
      {
        id: 'a',
        label: 'Monta uma tabela com os pontos de todo mundo',
        weights: { dados: 6, logica: 3 },
      },
      {
        id: 'b',
        label: 'Cria um placar que se atualiza sozinho',
        weights: { automacao: 6, dados: 3 },
      },
      {
        id: 'c',
        label: 'Desenha um gráfico bonito com a classificação',
        weights: { web: 6, dados: 3 },
      },
      {
        id: 'd',
        label: 'Analisa o desempenho de cada jogador',
        weights: { jogos: 6, dados: 3 },
      },
    ],
  },
  // ---------------------------------------------------------- automacao
  {
    id: 'q17',
    axis: 'automacao',
    type: 'knowledge',
    prompt:
      'Você precisa renomear 500 arquivos, um por um. Por que um script de automação ajudaria?',
    options: [
      { id: 'a', label: 'Ele deixa os arquivos mais bonitos' },
      { id: 'b', label: 'Ele repete a tarefa sozinho, sem você fazer na mão' },
      { id: 'c', label: 'Ele aumenta a velocidade da internet' },
      { id: 'd', label: 'Ele traduz os nomes dos arquivos' },
    ],
    correctOptionId: 'b',
  },
  {
    id: 'q18',
    axis: 'automacao',
    type: 'knowledge',
    prompt: 'O que é um "laço" (loop) na programação?',
    options: [
      { id: 'a', label: 'Um erro que trava o programa' },
      { id: 'b', label: 'Um tipo de cabo do computador' },
      { id: 'c', label: 'Uma senha bem comprida' },
      { id: 'd', label: 'Uma instrução que repete ações enquanto uma condição for verdadeira' },
    ],
    correctOptionId: 'd',
  },
  {
    id: 'q19',
    axis: 'automacao',
    type: 'preference',
    prompt: 'Qual tarefa você adoraria nunca mais fazer na mão?',
    options: [
      {
        id: 'a',
        label: 'Renomear e organizar arquivos',
        weights: { automacao: 6, codigo: 3 },
      },
      {
        id: 'b',
        label: 'Somar e conferir números toda semana',
        weights: { dados: 6, automacao: 3 },
      },
      {
        id: 'c',
        label: 'Responder sempre a mesma mensagem',
        weights: { automacao: 6, web: 3 },
      },
      {
        id: 'd',
        label: 'Montar o mesmo relatório todo mês',
        weights: { dados: 6, automacao: 3 },
      },
    ],
  },
  {
    id: 'q20',
    axis: 'automacao',
    type: 'preference',
    prompt: 'Se o seu celular pudesse fazer UMA coisa sozinho, seria...',
    options: [
      {
        id: 'a',
        label: 'Organizar minhas fotos automaticamente',
        weights: { automacao: 6, dados: 3 },
      },
      {
        id: 'b',
        label: 'Responder as mensagens repetidas por mim',
        weights: { automacao: 6, web: 3 },
      },
      {
        id: 'c',
        label: 'Jogar uma fase do meu jogo enquanto eu durmo',
        weights: { jogos: 6, automacao: 3 },
      },
      {
        id: 'd',
        label: 'Calcular e organizar minhas finanças',
        weights: { dados: 6, automacao: 3 },
      },
    ],
  },
  // -------------------------------------------------------------- jogos
  {
    id: 'q21',
    axis: 'jogos',
    type: 'knowledge',
    prompt: 'Em um jogo, o que faz o personagem pular quando você aperta o botão?',
    options: [
      { id: 'a', label: 'A sorte do jogador' },
      { id: 'b', label: 'O código do jogo, que responde ao comando e muda o personagem' },
      { id: 'c', label: 'O monitor da tela' },
      { id: 'd', label: 'A velocidade da internet' },
    ],
    correctOptionId: 'b',
  },
  {
    id: 'q22',
    axis: 'jogos',
    type: 'knowledge',
    prompt: 'Os pontos de vida (HP) de um personagem são, para o computador...',
    options: [
      { id: 'a', label: 'Um número guardado numa variável, que muda durante o jogo' },
      { id: 'b', label: 'Uma foto do personagem' },
      { id: 'c', label: 'Um som de fundo' },
      { id: 'd', label: 'Um cabo ligado no controle' },
    ],
    correctOptionId: 'a',
  },
  {
    id: 'q23',
    axis: 'jogos',
    type: 'preference',
    prompt: 'O que você mais curte em um jogo?',
    options: [
      {
        id: 'a',
        label: 'A história e os personagens',
        weights: { jogos: 6, web: 3 },
      },
      {
        id: 'b',
        label: 'Resolver os desafios e vencer os chefões',
        weights: { logica: 6, jogos: 3 },
      },
      {
        id: 'c',
        label: 'Subir de nível e ver meus números crescerem',
        weights: { dados: 6, jogos: 3 },
      },
      {
        id: 'd',
        label: 'Criar minhas próprias fases e personagens',
        weights: { jogos: 6, codigo: 3 },
      },
    ],
  },
  {
    id: 'q24',
    axis: 'jogos',
    type: 'preference',
    prompt: 'Se você criasse o seu próprio jogo, ele seria sobre...',
    options: [
      {
        id: 'a',
        label: 'Aventura e exploração de mundos',
        weights: { jogos: 6, web: 3 },
      },
      {
        id: 'b',
        label: 'Estratégia e raciocínio',
        weights: { logica: 6, jogos: 3 },
      },
      {
        id: 'c',
        label: 'Corridas e quebra de recordes',
        weights: { dados: 6, jogos: 3 },
      },
      {
        id: 'd',
        label: 'Construir e gerenciar coisas',
        weights: { automacao: 6, jogos: 3 },
      },
    ],
  },
];

// ------------------------------------------------------------ arquétipos

/**
 * Identificadores de trilha que já existem no projeto (os mesmos `TrackId`
 * do cadastro web: apps/web/app/register/components/StepTracks.tsx).
 *
 * LIMITAÇÃO CONHECIDA: hoje só existem 4 trilhas master, todas avançadas
 * (web3, backend, frontend, ai). Não há trilha de dados nem de jogos; o
 * mapeamento abaixo aponta para a mais próxima e deve ser revisto quando
 * a rampa de iniciantes (B12/B17) criar trilhas próprias.
 */
export type TrackId = 'web3' | 'backend' | 'frontend' | 'ai';

/**
 * Nome legível de cada trilha, exibido ao aluno no resultado do
 * diagnóstico. Derivado dos nomes oficiais do cadastro
 * (apps/web/app/register/components/StepTracks.tsx), simplificados:
 * frontend = "Frontend Architecture & React 19", backend =
 * "High-Performance Backend & Rust/Go", web3 = "Fullstack Web3 &
 * Solana/EVM", ai = "AI Agents, Cloud & MLOps".
 */
export const TRACK_NAMES: Record<TrackId, string> = {
  frontend: 'Desenvolvimento Front-end',
  backend: 'Desenvolvimento Back-end',
  web3: 'Desenvolvimento Web3',
  ai: 'Inteligência Artificial',
};

export type ArchetypeId =
  | 'explorador'
  | 'construtor-web'
  | 'resolvedor'
  | 'automatizador'
  | 'criador-de-jogos'
  | 'analista';

export interface ArchetypeDef {
  id: ArchetypeId;
  name: string;
  description: string;
  /** Pontos fortes — lista de frases curtas, sempre positivas, para
   *  qualquer resultado. O front renderiza como lista (contrato B09). */
  strengths: string[];
  recommendedTrack: TrackId;
}

export const ARCHETYPES: Record<ArchetypeId, ArchetypeDef> = {
  explorador: {
    id: 'explorador',
    name: 'Explorador(a)',
    description:
      'Seu perfil é equilibrado: você tem curiosidade por várias áreas e ainda não puxou para um lado só — e isso é ótimo no começo. A sua trilha começa pela base, para você experimentar de tudo um pouco e descobrir onde brilha.',
    strengths: [
      'Ponto de partida perfeito: mente aberta e curiosidade ampla.',
      'Quem explora no início escolhe melhor o caminho depois.',
      'Toda pessoa especialista já esteve exatamente onde você está agora.',
    ],
    recommendedTrack: 'frontend',
  },
  'construtor-web': {
    id: 'construtor-web',
    name: 'Construtor(a) Web',
    description:
      'Você gosta de ver a ideia virar algo na tela, que outras pessoas podem usar. Seu caminho natural é construir para a web: páginas, aplicativos e interfaces.',
    strengths: [
      'Você tira ideias do papel e transforma em algo real.',
      'Seu perfil é visual e prático.',
      'Você cria coisas que as pessoas usam de verdade.',
    ],
    recommendedTrack: 'frontend',
  },
  resolvedor: {
    id: 'resolvedor',
    name: 'Resolvedor(a)',
    description:
      'Você pensa decompondo problemas e testando hipóteses até a lógica fechar. Esse é o coração da programação — e o seu ponto mais forte para construir sistemas de verdade.',
    strengths: [
      'Raciocínio estruturado: você quebra o desafio em partes.',
      'Persistência: você não desiste até resolver.',
      'Essa é a base sobre a qual todo o resto se constrói.',
    ],
    recommendedTrack: 'backend',
  },
  automatizador: {
    id: 'automatizador',
    name: 'Automatizador(a)',
    description:
      'Você enxerga onde o computador pode trabalhar por você: tarefas repetidas viram programas. Seu caminho é usar código para ganhar tempo — o seu e o de muita gente.',
    strengths: [
      'Olhar afiado para eficiência e processos.',
      'Você percebe o trabalho repetido que os outros nem notam.',
      'E sabe que dá para programar a saída.',
    ],
    recommendedTrack: 'ai',
  },
  'criador-de-jogos': {
    id: 'criador-de-jogos',
    name: 'Criador(a) de Jogos',
    description:
      'Você aprende criando mundos: histórias, regras, personagens e desafios. Jogos unem lógica, arte e sistemas — uma das portas mais completas para dominar programação.',
    strengths: [
      'Imaginação com senso de sistema.',
      'Você pensa em regras, recompensas e experiência ao mesmo tempo.',
      'Criar jogos desenvolve todas as habilidades de um programador.',
    ],
    recommendedTrack: 'web3',
  },
  analista: {
    id: 'analista',
    name: 'Analista',
    description:
      'Você gosta de entender o mundo pelos números: comparar, medir e decidir com base em evidências. Seu caminho passa por dados — coletar, organizar e transformar números em respostas.',
    strengths: [
      'Pensamento baseado em evidências: você mede antes de concluir.',
      'Você enxerga padrões onde os outros veem só uma tabela.',
      'Dados são o seu superpoder em formação.',
    ],
    recommendedTrack: 'ai',
  },
};

/** Eixo dominante → arquétipo. `explorador` é o perfil sem eixo dominante. */
export const AXIS_TO_ARCHETYPE: Record<AxisId, ArchetypeId> = {
  logica: 'resolvedor',
  codigo: 'resolvedor',
  web: 'construtor-web',
  dados: 'analista',
  automacao: 'automatizador',
  jogos: 'criador-de-jogos',
};

/**
 * Se a vantagem do eixo líder sobre o segundo colocado for menor ou igual
 * a este valor (em pontos normalizados 0–100), o perfil é considerado
 * equilibrado e o arquétipo é o explorador.
 */
export const FLAT_PROFILE_MARGIN = 8;
