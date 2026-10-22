/**
 * BossBattlesData.ts
 * NEXUS CODE - Especificação e Dados das Batalhas de Bosses Iniciantes
 * 
 * 3 Chefões Épicos de Código Corrompido para o Nível Iniciante:
 * 1. 🐉 The Infinite Loop Drake (Dragão do Tempo Congelado)
 * 2. 🐍 Syntax Error Hydra (A Hidra das Pontuações Quebradas)
 * 3. 👺 Off-by-One Goblin (O Duende do Erro por Um)
 * 
 * Suporta as 3 linguagens dos Starters: Python, JavaScript e Java.
 * Cada desafio inclui:
 * - Código inicial bugado (Starter Code)
 * - Casos de teste visíveis (com feedback na arena de combate)
 * - Bateria de testes ocultos anti-cheat com casos de borda (vazio, negativo, zero)
 */

export interface BossTestCase {
  id: string;
  name: string;
  inputArgs: unknown[];
  expected: unknown;
  description: string;
  hidden?: boolean;
}

export interface BossLanguageImplementation {
  language: 'python' | 'javascript' | 'java';
  functionName: string;
  buggedStarterCode: string;
  referenceSolution: string;
  testCases: BossTestCase[];
  interpreterHint: string;
}

export interface BossBattleDefinition {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  icon: string;
  maxHp: number;
  element: 'loop' | 'syntax' | 'collection';
  arenaDojoName: string;
  loreIntro: string;
  catDialogue: {
    entry: string;
    warning: string;
    victory: string;
  };
  implementations: Record<'python' | 'javascript' | 'java', BossLanguageImplementation>;
}

// ============================================================================
// 1. 🐉 THE INFINITE LOOP DRAKE (Dragão do Tempo Congelado)
// ============================================================================

export const INFINITE_LOOP_DRAKE: BossBattleDefinition = {
  id: 'boss_infinite_loop_drake',
  slug: 'infinite-loop-drake',
  name: 'The Infinite Loop Drake',
  subtitle: 'O Dragão do Tempo Congelado',
  icon: '🐉',
  maxHp: 150,
  element: 'loop',
  arenaDojoName: 'Dojo das Cavernas de Silício (Setor 01)',
  loreIntro: 'O Drake conjurou uma maldição cronomântica que prendeu o processador a 100% de CPU! O laço de repetição nunca converge para zero. Quebre o ciclo para liberar a passagem!',
  catDialogue: {
    entry: '*Orelhas em pé com alerta sonoro!* Miau! O Drake congelou o relógio do sistema. Veja como o contador está se comportando a cada iteração!',
    warning: '*Miado agudo* Cuidado! O sandbox atingirá Timeout se o laço nunca encontrar a condição de parada!',
    victory: '*Ronrona alto dando cambalhotas* Fantástico! O Drake perdeu o controle temporal e o tempo voltou a fluir no reino!',
  },
  implementations: {
    python: {
      language: 'python',
      functionName: 'quebrar_ciclo',
      buggedStarterCode: `def quebrar_ciclo(segundos):
    # BUG DO BOSS: O Drake aumenta os segundos em vez de diminuir!
    # Isso faz o while rodar infinitamente gerando Time Limit Exceeded (TLE).
    voltas = 0
    while segundos > 0:
        voltas += 1
        segundos += 1  # <- O bug está aqui!
    return voltas`,
      referenceSolution: `def quebrar_ciclo(segundos):
    if segundos <= 0:
        return 0
    voltas = 0
    while segundos > 0:
        voltas += 1
        segundos -= 1
    return voltas`,
      testCases: [
        {
          id: 't1_py',
          name: 'Contagem regressiva padrão 5 segundos',
          inputArgs: [5],
          expected: 5,
          description: 'Com 5 segundos, o laço deve dar exatamente 5 voltas e parar.',
        },
        {
          id: 't2_py',
          name: 'Contagem curta de 2 segundos',
          inputArgs: [2],
          expected: 2,
          description: 'Com 2 segundos, o laço deve rodar 2 vezes.',
        },
        {
          id: 'th1_py',
          name: '🔒 Bateria Oculta: Tempo Inicial Zero',
          inputArgs: [0],
          expected: 0,
          description: 'Caso de borda: com 0 segundos, o laço não deve executar nenhuma vez.',
          hidden: true,
        },
        {
          id: 'th2_py',
          name: '🔒 Bateria Oculta: Tempo Negativo',
          inputArgs: [-10],
          expected: 0,
          description: 'Caso anti-cheat: se já começar negativo, retorna 0 imediatamente.',
          hidden: true,
        },
        {
          id: 'th3_py',
          name: '🔒 Bateria Oculta: Carga Moderada (50 segundos)',
          inputArgs: [50],
          expected: 50,
          description: 'Garante que o decremento funcione com valores maiores.',
          hidden: true,
        },
      ],
      interpreterHint: 'Para um laço terminar, a variável "segundos" deve diminuir em direção ao zero (segundos -= 1).',
    },

    javascript: {
      language: 'javascript',
      functionName: 'quebrarCiclo',
      buggedStarterCode: `function quebrarCiclo(segundos) {
  // BUG DO BOSS: O contador do laço incrementa em vez de decrementar!
  let voltas = 0;
  while (segundos > 0) {
    voltas++;
    segundos++; // <- Bug do loop infinito!
  }
  return voltas;
}`,
      referenceSolution: `function quebrarCiclo(segundos) {
  if (segundos <= 0) return 0;
  let voltas = 0;
  while (segundos > 0) {
    voltas++;
    segundos--;
  }
  return voltas;
}`,
      testCases: [
        {
          id: 't1_js',
          name: 'Contagem regressiva padrão 5 segundos',
          inputArgs: [5],
          expected: 5,
          description: 'Com 5 segundos, o laço deve dar exatamente 5 voltas e parar.',
        },
        {
          id: 't2_js',
          name: 'Contagem curta de 3 segundos',
          inputArgs: [3],
          expected: 3,
          description: 'Com 3 segundos, o laço deve rodar 3 vezes.',
        },
        {
          id: 'th1_js',
          name: '🔒 Bateria Oculta: Tempo Zero',
          inputArgs: [0],
          expected: 0,
          description: 'Caso anti-cheat: 0 segundos deve retornar 0.',
          hidden: true,
        },
        {
          id: 'th2_js',
          name: '🔒 Bateria Oculta: Tempo Negativo',
          inputArgs: [-5],
          expected: 0,
          description: 'Caso anti-cheat: números negativos não devem entrar no laço.',
          hidden: true,
        },
        {
          id: 'th3_js',
          name: '🔒 Bateria Oculta: Carga de 40 voltas',
          inputArgs: [40],
          expected: 40,
          description: 'Validação de decremento contínuo.',
          hidden: true,
        },
      ],
      interpreterHint: 'No JavaScript, use "segundos--" para subtrair 1 a cada volta e quebrar a barreira temporal!',
    },

    java: {
      language: 'java',
      functionName: 'quebrarCiclo',
      buggedStarterCode: `public class BossBattle {
    public static int quebrarCiclo(int segundos) {
        // BUG DO BOSS: O loop nunca converge para a saída!
        int voltas = 0;
        while (segundos > 0) {
            voltas++;
            segundos++; // Bug: segundos aumentando indefinidamente!
        }
        return voltas;
    }
}`,
      referenceSolution: `public class BossBattle {
    public static int quebrarCiclo(int segundos) {
        if (segundos <= 0) return 0;
        int voltas = 0;
        while (segundos > 0) {
            voltas++;
            segundos--;
        }
        return voltas;
    }
}`,
      testCases: [
        {
          id: 't1_java',
          name: 'Contagem de 5 segundos',
          inputArgs: [5],
          expected: 5,
          description: 'Deve subtrair até 0 completando 5 voltas.',
        },
        {
          id: 't2_java',
          name: 'Contagem de 1 segundo',
          inputArgs: [1],
          expected: 1,
          description: 'Com 1 segundo, executa 1 única volta.',
        },
        {
          id: 'th1_java',
          name: '🔒 Bateria Oculta: Limite Zero',
          inputArgs: [0],
          expected: 0,
          description: 'Zero deve sair sem executar.',
          hidden: true,
        },
        {
          id: 'th2_java',
          name: '🔒 Bateria Oculta: Negativo (-20)',
          inputArgs: [-20],
          expected: 0,
          description: 'Negativo encerra com 0 voltas.',
          hidden: true,
        },
      ],
      interpreterHint: 'Use "segundos--" para que a cada dente da engrenagem o valor diminua em direção a zero.',
    },
  },
};

// ============================================================================
// 2. 🐍 SYNTAX ERROR HYDRA (A Hidra das Pontuações Quebradas)
// ============================================================================

export const SYNTAX_ERROR_HYDRA: BossBattleDefinition = {
  id: 'boss_syntax_error_hydra',
  slug: 'syntax-error-hydra',
  name: 'Syntax Error Hydra',
  subtitle: 'A Hidra das Pontuações e Indentações Corrompidas',
  icon: '🐍',
  maxHp: 120,
  element: 'syntax',
  arenaDojoName: 'Pântano dos Compiladores Rompidos (Setor 02)',
  loreIntro: 'A Hidra lançou veneno sobre as regras gramaticais da linguagem! Faltam dois pontos, parênteses e chaves no código. Restaure a sintaxe e calcule o escudo total!',
  catDialogue: {
    entry: '*Olha fixamente para o código* Miau! O compilador está cuspindo faíscas. A Hidra comeu a pontuação de fechamento!',
    warning: '*Efeito de arrepio* Um único dois-pontos ou ponto-e-vírgula ausente derruba a execução antes mesmo de começar!',
    victory: '*Pula de alegria com patinhas para cima* Miau! Código limpo, sintaxe aprovada e Hidra banida!',
  },
  implementations: {
    python: {
      language: 'python',
      functionName: 'calcular_escudo',
      buggedStarterCode: `def calcular_escudo(base, nivel)
    # BUG DO BOSS: Falta o ':' na linha def e na linha if, além de erro de indentação!
    if nivel > 5
    bonus = 20
    else
        bonus = 5
    return base + bonus`,
      referenceSolution: `def calcular_escudo(base, nivel):
    if nivel > 5:
        bonus = 20
    else:
        bonus = 5
    return base + bonus`,
      testCases: [
        {
          id: 't1_py',
          name: 'Nível alto (bônus maior de 20)',
          inputArgs: [100, 8],
          expected: 120,
          description: 'Base 100 + Bônus 20 (nível 8 > 5) = 120',
        },
        {
          id: 't2_py',
          name: 'Nível baixo (bônus básico de 5)',
          inputArgs: [50, 3],
          expected: 55,
          description: 'Base 50 + Bônus 5 (nível 3 <= 5) = 55',
        },
        {
          id: 'th1_py',
          name: '🔒 Bateria Oculta: Exatamente Nível 5 (Fronteira)',
          inputArgs: [70, 5],
          expected: 75,
          description: 'Nível 5 não é > 5, logo deve receber bônus 5 = 75.',
          hidden: true,
        },
        {
          id: 'th2_py',
          name: '🔒 Bateria Oculta: Base Zero com Nível Alto',
          inputArgs: [0, 10],
          expected: 20,
          description: '0 + 20 = 20.',
          hidden: true,
        },
      ],
      interpreterHint: 'No Python, toda definição "def" e condição "if/else" OBRIGATORIAMENTE termina com dois pontos (:), e seu bloco interno deve ter 4 espaços!',
    },

    javascript: {
      language: 'javascript',
      functionName: 'calcularEscudo',
      buggedStarterCode: `function calcularEscudo(base, nivel) {
  // BUG DO BOSS: Parênteses abertos sem fechar e chaves descasadas!
  let bonus;
  if (nivel > 5 {
    bonus = 20;
  } else {
    bonus = 5;
  return base + bonus;
}`,
      referenceSolution: `function calcularEscudo(base, nivel) {
  let bonus;
  if (nivel > 5) {
    bonus = 20;
  } else {
    bonus = 5;
  }
  return base + bonus;
}`,
      testCases: [
        {
          id: 't1_js',
          name: 'Nível alto (bônus 20)',
          inputArgs: [100, 8],
          expected: 120,
          description: '100 + 20 = 120',
        },
        {
          id: 't2_js',
          name: 'Nível baixo (bônus 5)',
          inputArgs: [40, 2],
          expected: 45,
          description: '40 + 5 = 45',
        },
        {
          id: 'th1_js',
          name: '🔒 Bateria Oculta: Limite no Nível 5',
          inputArgs: [80, 5],
          expected: 85,
          description: '5 não é > 5, ganha bônus 5 = 85.',
          hidden: true,
        },
        {
          id: 'th2_js',
          name: '🔒 Bateria Oculta: Nível 0',
          inputArgs: [10, 0],
          expected: 15,
          description: '10 + 5 = 15.',
          hidden: true,
        },
      ],
      interpreterHint: 'Verifique se todo parêntese aberto "(" foi fechado com ")" e se todo bloco "else { }" tem sua chave de fechamento "}".',
    },

    java: {
      language: 'java',
      functionName: 'calcularEscudo',
      buggedStarterCode: `public class BossBattle {
    public static int calcularEscudo(int base, int nivel) {
        // BUG DO BOSS: Faltam ponto-e-vírgula e tipos inconsistentes!
        int bonus
        if (nivel > 5) {
            bonus = 20
        } else {
            bonus = 5;
        }
        return base + bonus
    }
}`,
      referenceSolution: `public class BossBattle {
    public static int calcularEscudo(int base, int nivel) {
        int bonus;
        if (nivel > 5) {
            bonus = 20;
        } else {
            bonus = 5;
        }
        return base + bonus;
    }
}`,
      testCases: [
        {
          id: 't1_java',
          name: 'Nível alto (100, 8)',
          inputArgs: [100, 8],
          expected: 120,
          description: '100 + 20 = 120',
        },
        {
          id: 't2_java',
          name: 'Nível baixo (30, 1)',
          inputArgs: [30, 1],
          expected: 35,
          description: '30 + 5 = 35',
        },
        {
          id: 'th1_java',
          name: '🔒 Bateria Oculta: Nível 5',
          inputArgs: [50, 5],
          expected: 55,
          description: '50 + 5 = 55',
          hidden: true,
        },
      ],
      interpreterHint: 'Em Java, toda declaração de variável e instrução de atribuição exige o ponto e vírgula (;) no final da linha.',
    },
  },
};

// ============================================================================
// 3. 👺 OFF-BY-ONE GOBLIN (O Duende do Erro por Um)
// ============================================================================

export const OFF_BY_ONE_GOBLIN: BossBattleDefinition = {
  id: 'boss_off_by_one_goblin',
  slug: 'off-by-one-goblin',
  name: 'Off-by-One Goblin',
  subtitle: 'O Duende do Erro por Um nos Índices',
  icon: '👺',
  maxHp: 140,
  element: 'collection',
  arenaDojoName: 'Santuário dos Vetores e Listas (Setor 03)',
  loreIntro: 'O Duende corrompeu o ponteiro de iteração da lista! Ele sempre pula o primeiro item (índice 0) e tenta morder além do final da coleção (causando IndexOutOfBounds / undefined). Corrija o laço para somar todos os itens!',
  catDialogue: {
    entry: '*Dá uma patadinha curiosa no chão* Miau! Em computação, tudo começa no ZERO! O Duende começou a contar no 1 e caiu do penhasco no final!',
    warning: '*Alerta felino* Se acessar um índice igual ao tamanho da lista, a memória não existirá e o golpe falhará!',
    victory: '*Ronronado triunfante* Miau! Todos os itens somados do primeiro ao último sem faltar nem sobrar nenhum!',
  },
  implementations: {
    python: {
      language: 'python',
      functionName: 'somar_inventario',
      buggedStarterCode: `def somar_inventario(itens):
    # BUG DO BOSS: O Duende começa no índice 1 (esquecendo itens[0])
    # e tenta acessar range(1, len(itens) + 1), gerando IndexError!
    total = 0
    for i in range(1, len(itens) + 1):
        total += itens[i]
    return total`,
      referenceSolution: `def somar_inventario(itens):
    if not itens:
        return 0
    total = 0
    for item in itens:
        total += item
    return total`,
      testCases: [
        {
          id: 't1_py',
          name: 'Lista com 3 poções: [10, 20, 30]',
          inputArgs: [[10, 20, 30]],
          expected: 60,
          description: 'Deve somar todos os 3 itens: 10 + 20 + 30 = 60.',
        },
        {
          id: 't2_py',
          name: 'Dois elementos: [5, 15]',
          inputArgs: [[5, 15]],
          expected: 20,
          description: '5 + 15 = 20.',
        },
        {
          id: 'th1_py',
          name: '🔒 Bateria Oculta: Lista Vazia []',
          inputArgs: [[]],
          expected: 0,
          description: 'Caso anti-cheat: lista sem itens deve retornar 0 sem estourar índice.',
          hidden: true,
        },
        {
          id: 'th2_py',
          name: '🔒 Bateria Oculta: Apenas Um Elemento [42]',
          inputArgs: [[42]],
          expected: 42,
          description: 'O elemento de índice 0 deve ser computado com sucesso.',
          hidden: true,
        },
        {
          id: 'th3_py',
          name: '🔒 Bateria Oculta: Números Negativos [10, -5, 15]',
          inputArgs: [[10, -5, 15]],
          expected: 20,
          description: '10 - 5 + 15 = 20.',
          hidden: true,
        },
      ],
      interpreterHint: 'Em Python, o jeito mais seguro e elegante de iterar é "for item in itens: total += item" ou "range(0, len(itens))". Lembre-se que o primeiro índice é 0!',
    },

    javascript: {
      language: 'javascript',
      functionName: 'somarInventario',
      buggedStarterCode: `function somarInventario(itens) {
  // BUG DO BOSS: Começa em 1 (pula o itens[0]) e usa <= itens.length (tenta ler undefined)!
  let total = 0;
  for (let i = 1; i <= itens.length; i++) {
    total += itens[i]; // Na última volta, itens[itens.length] é undefined, gerando NaN!
  }
  return total;
}`,
      referenceSolution: `function somarInventario(itens) {
  if (!Array.isArray(itens) || itens.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < itens.length; i++) {
    total += itens[i];
  }
  return total;
}`,
      testCases: [
        {
          id: 't1_js',
          name: 'Três itens [10, 20, 30]',
          inputArgs: [[10, 20, 30]],
          expected: 60,
          description: 'Deve somar todos e não retornar NaN: 10 + 20 + 30 = 60.',
        },
        {
          id: 't2_js',
          name: 'Dois itens [8, 12]',
          inputArgs: [[8, 12]],
          expected: 20,
          description: '8 + 12 = 20.',
        },
        {
          id: 'th1_js',
          name: '🔒 Bateria Oculta: Array Vazio []',
          inputArgs: [[]],
          expected: 0,
          description: 'Array vazio retorna 0 sem erro.',
          hidden: true,
        },
        {
          id: 'th2_js',
          name: '🔒 Bateria Oculta: Um único item [99]',
          inputArgs: [[99]],
          expected: 99,
          description: 'Deve ler itens[0] corretamente.',
          hidden: true,
        },
        {
          id: 'th3_js',
          name: '🔒 Bateria Oculta: Valores com negativos [50, -20, 10]',
          inputArgs: [[50, -20, 10]],
          expected: 40,
          description: '50 - 20 + 10 = 40.',
          hidden: true,
        },
      ],
      interpreterHint: 'Em JS, os arrays começam no índice 0 e o último item está em itens.length - 1. A condição correta é: for (let i = 0; i < itens.length; i++)',
    },

    java: {
      language: 'java',
      functionName: 'somarInventario',
      buggedStarterCode: `public class BossBattle {
    public static int somarInventario(int[] itens) {
        // BUG DO BOSS: Começa no índice 1 e estoura o limite com <= itens.length!
        int total = 0;
        for (int i = 1; i <= itens.length; i++) {
            total += itens[i]; // Dispara ArrayIndexOutOfBoundsException!
        }
        return total;
    }
}`,
      referenceSolution: `public class BossBattle {
    public static int somarInventario(int[] itens) {
        if (itens == null || itens.length == 0) return 0;
        int total = 0;
        for (int i = 0; i < itens.length; i++) {
            total += itens[i];
        }
        return total;
    }
}`,
      testCases: [
        {
          id: 't1_java',
          name: 'Array [10, 20, 30]',
          inputArgs: [[10, 20, 30]],
          expected: 60,
          description: 'Soma total = 60 sem exceção de índice.',
        },
        {
          id: 't2_java',
          name: 'Array [15, 25]',
          inputArgs: [[15, 25]],
          expected: 40,
          description: '15 + 25 = 40.',
        },
        {
          id: 'th1_java',
          name: '🔒 Bateria Oculta: Array Vazio int[]{}',
          inputArgs: [[]],
          expected: 0,
          description: 'Array vazio retorna 0.',
          hidden: true,
        },
        {
          id: 'th2_java',
          name: '🔒 Bateria Oculta: Array com 1 elemento [77]',
          inputArgs: [[77]],
          expected: 77,
          description: 'Leitura de itens[0] com sucesso.',
          hidden: true,
        },
      ],
      interpreterHint: 'Use "int i = 0; i < itens.length; i++" para que o primeiro elemento itens[0] seja somado e a JVM não lance ArrayIndexOutOfBoundsException.',
    },
  },
};

// ============================================================================
// DICIONÁRIO UNIFICADO DOS BOSSES
// ============================================================================

export const BEGINNER_BOSS_BATTLES: Record<string, BossBattleDefinition> = {
  infinite_loop_drake: INFINITE_LOOP_DRAKE,
  syntax_error_hydra: SYNTAX_ERROR_HYDRA,
  off_by_one_goblin: OFF_BY_ONE_GOBLIN,
};

/**
 * Retorna todos os chefões da trilha iniciante
 */
export function getAllBeginnerBosses(): BossBattleDefinition[] {
  return Object.values(BEGINNER_BOSS_BATTLES);
}

/**
 * Retorna o desafio de boss adaptado para a linguagem escolhida pelo aluno
 */
export function getBossChallengeForLanguage(
  bossId: string,
  language: 'python' | 'javascript' | 'java',
): BossLanguageImplementation | undefined {
  const boss = BEGINNER_BOSS_BATTLES[bossId];
  if (!boss) return undefined;
  return boss.implementations[language];
}
