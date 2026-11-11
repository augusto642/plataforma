/**
 * BattleChallenges.ts
 * NEXUS CODE - Coding Challenge Matrix for Turn-based Battles
 * 
 * Desafios de código didáticos com casos de teste automatizados para cada habilidade dos Starters:
 * - COMPILER: Byte-Drake (Syntax Strike, Hot Reload, Kernel Panic)
 * - NETWORK: Hydra-Shell (Packet Blast, TLS Handshake, DDoS Surge)
 * - LOGIC: Volt-Fox (Neon Pulse, Borrow Checker, Quantum Loop)
 */

export interface TestCase {
  id: string;
  name: string;
  inputArgs: unknown[];
  expected: unknown;
  description: string;
  hidden?: boolean; // Se true, esconde os parâmetros na UI para evitar respostas hardcoded
}

export interface BattleChallenge {
  id: string;
  skillId: string;
  title: string;
  language: 'javascript' | 'typescript' | 'python';
  difficulty: 'novice' | 'junior' | 'craftsman';
  description: string;
  starterCode: string;
  functionName: string;
  testCases: TestCase[];
  hint: string;
  damageMultiplier: number;
}

export const BATTLE_CHALLENGES: Record<string, BattleChallenge> = {
  // Byte-Drake [COMPILER] - Skill 1: Syntax Strike
  skill_syntax_strike: {
    id: 'challenge_syntax_strike',
    skillId: 'skill_syntax_strike',
    title: 'Syntax Strike: Validador de Tipos & Imposto',
    language: 'javascript',
    difficulty: 'novice',
    description: 'Corrija e complete a função para calcular o valor final com taxa de imposto percentual e retornar formatado com 2 casas decimais.',
    starterCode: `function calculateTax(price, taxRate) {
  // TODO: Retorne o valor total (preço + imposto) arredondado para 2 casas decimais (number)
  // Exemplo: price = 100, taxRate = 0.1 -> 110
  const tax = price * taxRate;
  return Number((price + tax).toFixed(2));
}`,
    functionName: 'calculateTax',
    testCases: [
      {
        id: 't1',
        name: 'Imposto padrão 10%',
        inputArgs: [100, 0.1],
        expected: 110,
        description: '100 + 10% deve ser igual a 110',
      },
      {
        id: 't2',
        name: 'Imposto com casas decimais',
        inputArgs: [49.9, 0.08],
        expected: 53.89,
        description: '49.9 + 8% deve arredondar para 53.89',
      },
      {
        id: 't3',
        name: 'Taxa zero (isenção fiscal)',
        inputArgs: [250, 0],
        expected: 250,
        description: '250 + 0% deve ser 250',
      },
      {
        id: 't_h1',
        name: '🔒 Bateria Oculta: Alíquota Fracionária',
        inputArgs: [199.99, 0.15],
        expected: 229.99,
        description: 'Caso anti-cheat: validação com centavos complexos',
        hidden: true,
      },
      {
        id: 't_h2',
        name: '🔒 Bateria Oculta: Preço Zero',
        inputArgs: [0, 0.25],
        expected: 0,
        description: 'Caso anti-cheat: preço 0 deve permanecer 0',
        hidden: true,
      },
    ],
    hint: 'Use (price + price * taxRate).toFixed(2) e converta com Number()!',
    damageMultiplier: 1.5,
  },

  // Byte-Drake [COMPILER] - Skill 2: Hot Reload
  skill_hot_reload: {
    id: 'challenge_hot_reload',
    skillId: 'skill_hot_reload',
    title: 'Hot Reload: Deduplicação de Cache de Módulos',
    language: 'javascript',
    difficulty: 'novice',
    description: 'O compilador precisa limpar módulos duplicados em memória. Remova os elementos duplicados do array preservando a ordem original.',
    starterCode: `function deduplicateModules(modules) {
  // TODO: Remova duplicados preservando a primeira ocorrência
  return [...new Set(modules)];
}`,
    functionName: 'deduplicateModules',
    testCases: [
      {
        id: 't1',
        name: 'Módulos inteiros duplicados',
        inputArgs: [[1, 2, 2, 3, 1, 4]],
        expected: [1, 2, 3, 4],
        description: '[1, 2, 2, 3, 1, 4] -> [1, 2, 3, 4]',
      },
      {
        id: 't2',
        name: 'Strings de nomes de arquivos',
        inputArgs: [['index.ts', 'app.ts', 'index.ts', 'store.ts']],
        expected: ['index.ts', 'app.ts', 'store.ts'],
        description: 'Remove index.ts repetido',
      },
      {
        id: 't_h1',
        name: '🔒 Bateria Oculta: Sequência Complexa',
        inputArgs: [['a', 'b', 'a', 'c', 'd', 'b', 'e']],
        expected: ['a', 'b', 'c', 'd', 'e'],
        description: 'Caso anti-cheat: preservação de ordem com múltiplas repetições',
        hidden: true,
      },
    ],
    hint: 'A estrutura Set em JavaScript garante unicidade imediata de valores!',
    damageMultiplier: 1.8,
  },

  // Hydra-Shell [NETWORK] - Skill 1: Packet Blast
  skill_packet_blast: {
    id: 'challenge_packet_blast',
    skillId: 'skill_packet_blast',
    title: 'Packet Blast: Validador de Endereço IPv4',
    language: 'javascript',
    difficulty: 'novice',
    description: 'Valide se a string representa um endereço IPv4 válido (4 octetos entre 0 e 255 separados por pontos).',
    starterCode: `function validateIpv4(ip) {
  // TODO: Retorne true se o IPv4 for válido, false caso contrário
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  
  return parts.every(part => {
    if (!/^\\d+$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255 && String(num) === part;
  });
}`,
    functionName: 'validateIpv4',
    testCases: [
      {
        id: 't1',
        name: 'IP local padrão',
        inputArgs: ['192.168.1.1'],
        expected: true,
        description: '192.168.1.1 é um IPv4 válido',
      },
      {
        id: 't2',
        name: 'Octeto fora dos limites (> 255)',
        inputArgs: ['256.100.0.1'],
        expected: false,
        description: '256 é inválido em IPv4',
      },
      {
        id: 't3',
        name: 'Formato incompleto',
        inputArgs: ['10.0.1'],
        expected: false,
        description: 'Menos de 4 octetos deve ser falso',
      },
      {
        id: 't_h1',
        name: '🔒 Bateria Oculta: Zeros à esquerda rejeitados',
        inputArgs: ['192.168.1.001'],
        expected: false,
        description: 'Caso anti-cheat: octetos como 001 são inválidos em IPv4 canônico',
        hidden: true,
      },
      {
        id: 't_h2',
        name: '🔒 Bateria Oculta: Loopback Canônico',
        inputArgs: ['127.0.0.1'],
        expected: true,
        description: 'Caso anti-cheat: validação de interface loopback',
        hidden: true,
      },
    ],
    hint: 'Cada octeto deve ter apenas dígitos, estar entre 0 e 255, sem zeros à esquerda!',
    damageMultiplier: 1.6,
  },

  // Hydra-Shell [NETWORK] - Skill 2: TLS Handshake
  skill_tls_shield: {
    id: 'challenge_tls_shield',
    skillId: 'skill_tls_shield',
    title: 'TLS Handshake: Cifra Criptográfica de Pacotes',
    language: 'javascript',
    difficulty: 'junior',
    description: 'Implemente uma cifra de rotação simples (César com offset de chave) para blindar a mensagem contra interceptação.',
    starterCode: `function cipherMessage(msg, shift) {
  // TODO: Aplique o deslocamento nas letras minúsculas 'a' até 'z'
  return msg
    .split('')
    .map(char => {
      const code = char.charCodeAt(0);
      if (code >= 97 && code <= 122) {
        return String.fromCharCode(((code - 97 + shift) % 26) + 97);
      }
      return char;
    })
    .join('');
}`,
    functionName: 'cipherMessage',
    testCases: [
      {
        id: 't1',
        name: 'Cifra simples shift 1',
        inputArgs: ['abc', 1],
        expected: 'bcd',
        description: 'abc com deslocamento 1 vira bcd',
      },
      {
        id: 't2',
        name: 'Cifra com wrap-around (z -> a)',
        inputArgs: ['xyz', 3],
        expected: 'abc',
        description: 'xyz com deslocamento 3 deve fazer wrap para abc',
      },
      {
        id: 't_h1',
        name: '🔒 Bateria Oculta: Palavra Completa',
        inputArgs: ['hello', 5],
        expected: 'mjqqt',
        description: 'Caso anti-cheat: rotação não trivial de frase',
        hidden: true,
      },
    ],
    hint: 'Use String.fromCharCode e char.charCodeAt(0) com módulo 26!',
    damageMultiplier: 2.0,
  },

  // Volt-Fox [LOGIC] - Skill 1: Neon Pulse
  skill_neon_pulse: {
    id: 'challenge_neon_pulse',
    skillId: 'skill_neon_pulse',
    title: 'Neon Pulse: Balanceamento de Delimitadores de Sintaxe',
    language: 'javascript',
    difficulty: 'novice',
    description: 'Verifique se todos os parênteses (), colchetes [] e chaves {} do código estão perfeitamente balanceados.',
    starterCode: `function isBalancedSyntax(code) {
  const stack = [];
  const pairs = { ')': '(', ']': '[', '}': '{' };
  
  for (const char of code) {
    if (char === '(' || char === '[' || char === '{') {
      stack.push(char);
    } else if (char === ')' || char === ']' || char === '}') {
      if (stack.pop() !== pairs[char]) return false;
    }
  }
  
  return stack.length === 0;
}`,
    functionName: 'isBalancedSyntax',
    testCases: [
      {
        id: 't1',
        name: 'Expressão perfeitamente balanceada',
        inputArgs: ['({[]})'],
        expected: true,
        description: '({[]}) deve retornar true',
      },
      {
        id: 't2',
        name: 'Expressão cruzada incorreta',
        inputArgs: ['([)]'],
        expected: false,
        description: '([)] fecha na ordem errada, deve ser false',
      },
      {
        id: 't3',
        name: 'Delimitador não fechado',
        inputArgs: ['(('],
        expected: false,
        description: '(( nunca fecha, deve ser false',
      },
      {
        id: 't_h1',
        name: '🔒 Bateria Oculta: Aninhamento Múltiplo',
        inputArgs: ['{()[]}'],
        expected: true,
        description: 'Caso anti-cheat: validação de blocos adjacentes internos',
        hidden: true,
      },
      {
        id: 't_h2',
        name: '🔒 Bateria Oculta: Fechamento Invertido',
        inputArgs: ['}{'],
        expected: false,
        description: 'Caso anti-cheat: fechamento antes de abertura',
        hidden: true,
      },
    ],
    hint: 'Uma pilha (Stack) Last-In First-Out é a estrutura perfeita para balanceamento!',
    damageMultiplier: 1.7,
  },

  // Volt-Fox [LOGIC] - Skill 2: Borrow Checker
  skill_borrow_checker: {
    id: 'challenge_borrow_checker',
    skillId: 'skill_borrow_checker',
    title: 'Borrow Checker: Busca Binária em O(log n)',
    language: 'javascript',
    difficulty: 'junior',
    description: 'Encontre o índice do ponteiro de memória alvo em uma lista ordenada utilizando busca binária eficiente.',
    starterCode: `function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return -1;
}`,
    functionName: 'binarySearch',
    testCases: [
      {
        id: 't1',
        name: 'Elemento presente no meio',
        inputArgs: [[10, 20, 30, 40, 50], 30],
        expected: 2,
        description: 'O valor 30 está no índice 2',
      },
      {
        id: 't2',
        name: 'Elemento presente na ponta',
        inputArgs: [[2, 4, 6, 8, 10], 10],
        expected: 4,
        description: 'O valor 10 está no índice 4',
      },
      {
        id: 't3',
        name: 'Elemento inexistente',
        inputArgs: [[1, 3, 5, 7], 4],
        expected: -1,
        description: 'Deve retornar -1 quando não encontrado',
      },
      {
        id: 't_h1',
        name: '🔒 Bateria Oculta: Inteiros Negativos',
        inputArgs: [[-10, -5, 0, 5, 10], -5],
        expected: 1,
        description: 'Caso anti-cheat: indexação de negativos em lista ordenada',
        hidden: true,
      },
      {
        id: 't_h2',
        name: '🔒 Bateria Oculta: Vetor Vazio',
        inputArgs: [[], 42],
        expected: -1,
        description: 'Caso anti-cheat: array sem elementos deve retornar -1',
        hidden: true,
      },
    ],
    hint: 'Divida o espaço de busca pela metade em cada iteração atualizando left ou right!',
    damageMultiplier: 2.2,
  },
};

/**
 * Retorna o desafio correspondente à skill ou um desafio padrão de sintaxe
 */
export function getChallengeForSkill(skillId: string): BattleChallenge {
  return BATTLE_CHALLENGES[skillId] || BATTLE_CHALLENGES.skill_syntax_strike;
}
