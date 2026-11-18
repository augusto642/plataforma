import { BadRequestException } from '@nestjs/common';
import { TowerBoardService } from './tower-board.service';

export type TowerObjectiveKind = 'quiz' | 'bug_hunt' | 'gap_fill';

export interface TowerObjectiveQuestion {
  kind: TowerObjectiveKind;
  title: string;
  prompt: string;
  options: string[];
  codeSnippet?: string;
  correctOption: number;
  explanation: string;
}

interface ObjectiveContent {
  prompt: string;
  options: string[];
  codeSnippet?: string;
  correctOption: number;
  explanation: string;
}

const QUIZ_QUESTIONS: ObjectiveContent[] = [
  {
    prompt: 'Em JavaScript, o que acontece ao declarar uma variável com `const`?',
    options: [
      'Ela não pode receber outro valor depois da inicialização.',
      'Ela só pode guardar números inteiros.',
      'Ela fica disponível apenas dentro de uma função.',
      'Ela é automaticamente convertida em texto.',
    ],
    correctOption: 0,
    explanation: '`const` impede reatribuir a variável; para um valor reatribuível, use `let`.',
  },
  {
    prompt: 'Qual é o índice do primeiro elemento de um array em JavaScript?',
    options: ['-1', '0', '1', 'Depende do tamanho do array.'],
    correctOption: 1,
    explanation: 'Arrays JavaScript usam índice baseado em zero: o primeiro elemento fica em `0`.',
  },
  {
    prompt: 'Qual operador compara valor e tipo em JavaScript?',
    options: ['=', '==', '===', '!='],
    correctOption: 2,
    explanation: '`===` compara valor e tipo sem conversão implícita.',
  },
  {
    prompt: 'O que a instrução `return` faz dentro de uma função?',
    options: [
      'Repete a função até não haver erros.',
      'Encerra o programa inteiro.',
      'Imprime um valor no terminal.',
      'Encerra a função e pode devolver um valor.',
    ],
    correctOption: 3,
    explanation: '`return` encerra a chamada da função e entrega o valor indicado ao chamador.',
  },
  {
    prompt: 'Para que serve a condição de um `if`?',
    options: [
      'Para escolher se um bloco deve ser executado.',
      'Para declarar uma nova função.',
      'Para ordenar os elementos de um array.',
      'Para repetir um bloco um número fixo de vezes.',
    ],
    correctOption: 0,
    explanation: '`if` executa o bloco associado quando a condição é verdadeira.',
  },
  {
    prompt: 'Em um laço `for`, quando a condição é verificada?',
    options: [
      'Somente depois de todas as repetições.',
      'Antes de cada repetição.',
      'Apenas quando o laço começa.',
      'A condição não é verificada.',
    ],
    correctOption: 1,
    explanation: 'O `for` verifica a condição antes de cada iteração.',
  },
  {
    prompt: 'Em `function somar(a, b)`, o que são `a` e `b`?',
    options: ['Argumentos já retornados.', 'Nomes de propriedades.', 'Parâmetros da função.', 'Palavras reservadas.'],
    correctOption: 2,
    explanation: '`a` e `b` são parâmetros que recebem os argumentos passados na chamada.',
  },
  {
    prompt: 'Como acessar a propriedade `nome` do objeto `usuario`?',
    options: ['`usuario->nome`', '`usuario[nome]`', '`nome.usuario`', '`usuario.nome`'],
    correctOption: 3,
    explanation: 'A notação de ponto acessa uma propriedade pelo nome literal.',
  },
  {
    prompt: 'O que `itens.length` informa para um array `itens`?',
    options: [
      'A quantidade de elementos do array.',
      'O índice do último elemento.',
      'A soma dos valores do array.',
      'Se todos os elementos são únicos.',
    ],
    correctOption: 0,
    explanation: '`length` informa quantos elementos existem no array.',
  },
  {
    prompt: 'O que acontece ao chamar `saudar()` depois de declarar `function saudar() {}`?',
    options: [
      'A função é convertida em uma variável.',
      'O código dentro da função é executado.',
      'A função é apagada após a chamada.',
      'A função passa a receber um argumento automaticamente.',
    ],
    correctOption: 1,
    explanation: 'Chamar `saudar()` executa o corpo da função declarada.',
  },
];

const BUG_HUNT_QUESTIONS: ObjectiveContent[] = [
  {
    prompt: 'Encontre o bug: por que a condição altera `idade` em vez de apenas compará-la?',
    codeSnippet: "const idade = 18;\nif (idade = 18) {\n  console.log('Maior de idade');\n}",
    options: [
      'O operador `=` atribui um valor; a comparação deve usar `===`.',
      '`if` não pode ser usado com números.',
      '`console.log` não pode ficar dentro de um bloco.',
      '`const` sempre deve ser trocado por `let`.',
    ],
    correctOption: 0,
    explanation: 'Atribuição e comparação são operações diferentes: use `idade === 18` para comparar.',
  },
  {
    prompt: 'Encontre o bug: qual é o problema no limite do laço?',
    codeSnippet: 'const valores = [2, 4, 6];\nfor (let i = 0; i <= valores.length; i++) {\n  console.log(valores[i]);\n}',
    options: [
      '`let` não pode ser usado na inicialização de um laço.',
      '`<=` deixa o índice chegar ao tamanho do array; use `<`.',
      '`console.log` precisa receber o array inteiro.',
      'Arrays não podem ser percorridos com `for`.',
    ],
    correctOption: 1,
    explanation: 'O último índice válido é `length - 1`; `i < valores.length` evita ler além do array.',
  },
  {
    prompt: 'Encontre o bug: o que falta validar antes de calcular a média?',
    codeSnippet: 'function media(total, quantidade) {\n  return total / quantidade;\n}\nconsole.log(media(12, 0));',
    options: [
      'Validar que `total` é sempre uma string.',
      'Trocar `return` por `console.log` dentro da função.',
      'Tratar `quantidade === 0` antes da divisão.',
      'Converter `quantidade` para boolean.',
    ],
    correctOption: 2,
    explanation: 'Dividir por zero não produz uma média válida; trate o caso antes de fazer a divisão.',
  },
];

const GAP_FILL_QUESTIONS: ObjectiveContent[] = [
  {
    prompt: 'Complete a lacuna para percorrer todos os índices válidos do array.',
    codeSnippet: 'for (let i = 0; i ___ valores.length; i++) {\n  console.log(valores[i]);\n}',
    options: ['`<`', '`<=`', '`===`', '`>`'],
    correctOption: 0,
    explanation: 'Use `i < valores.length`; o índice igual ao tamanho já está fora do array.',
  },
  {
    prompt: 'Complete a comparação para verificar se `numero` é par.',
    codeSnippet: 'const ehPar = numero => numero % 2 ___ 0;',
    options: ['`===`', '`=`', '`!==`', '`=>`'],
    correctOption: 0,
    explanation: 'O resto da divisão por 2 é zero para números pares; `===` compara o resultado.',
  },
  {
    prompt: 'Complete a função para devolver o dobro de `valor`.',
    codeSnippet: 'function dobro(valor) {\n  ___ valor * 2;\n}',
    options: ['`return`', '`break`', '`continue`', '`const`'],
    correctOption: 0,
    explanation: '`return` devolve o resultado da função para quem a chamou.',
  },
];

export function getTowerObjectiveQuestion(
  floor: number,
  square: number,
): TowerObjectiveQuestion {
  if (!Number.isInteger(floor) || floor < 1) {
    throw new BadRequestException('Andar de desafio inválido.');
  }

  const quizOrdinal = TowerBoardService.QUIZ_SQUARES.indexOf(square);
  if (quizOrdinal >= 0) {
    const questionIndex =
      ((floor - 1) * TowerBoardService.QUIZ_SQUARES.length + quizOrdinal) %
      QUIZ_QUESTIONS.length;
    return {
      kind: 'quiz',
      title: 'Quiz rápido',
      ...QUIZ_QUESTIONS[questionIndex],
    };
  }

  const minigameOrdinal = TowerBoardService.MINIGAME_SQUARES.indexOf(square);
  if (minigameOrdinal >= 0) {
    const challengeIndex =
      (floor - 1) * TowerBoardService.MINIGAME_SQUARES.length + minigameOrdinal;
    const questionIndex = Math.floor(challengeIndex / 2);
    if (challengeIndex % 2 === 0) {
      const bugQuestion = BUG_HUNT_QUESTIONS[questionIndex % BUG_HUNT_QUESTIONS.length];
      return {
        kind: 'bug_hunt',
        title: 'Caça ao bug',
        ...bugQuestion,
      };
    }

    const gapQuestion = GAP_FILL_QUESTIONS[questionIndex % GAP_FILL_QUESTIONS.length];
    return {
      kind: 'gap_fill',
      title: 'Complete o código',
      ...gapQuestion,
    };
  }

  throw new BadRequestException('Casa de desafio inválida.');
}
