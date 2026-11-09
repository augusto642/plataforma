/**
 * B03 — Escape pós-Tier 3: exemplos análogos resolvidos + reforço conceitual.
 *
 * A regra de ouro do tutor é NUNCA entregar a solução do exercício atual.
 * Quando o aluno esgota o Tier 3 (ver TIER3_EXHAUSTION_FAILURES em
 * ai.service.ts), o tutor destrava uma saída que não é spoiler:
 *
 *   1. EXEMPLO ANÁLOGO — um problema DIFERENTE que usa a MESMA técnica do
 *      exercício atual, com a solução comentada. O aluno estuda a técnica
 *      no problema análogo e a transfere sozinho para o exercício dele.
 *   2. REFORÇO CONCEITUAL — quando não há exemplo análogo disponível, o
 *      tutor reforça a explicação do conceito com perguntas guiadas. Também
 *      sem spoiler: nada de código da solução nem de valores esperados.
 *
 * FONTES DE EXEMPLO (nesta ordem de precedência):
 *   a) Conteúdo autoral da atividade: `Activity.lessonPayload` (Json) pode
 *      guardar um exemplo análogo específico no formato:
 *        { "analogousExample": { title, statement, solution, explanation,
 *                                concept } }
 *      Quem preenche é o conteúdo futuro (time pedagógico/IA autora), não
 *      este código — aqui só lemos e validamos a forma mínima.
 *   b) Registro por conceito (ANALOGOUS_EXAMPLES, abaixo): exemplos-semente
 *      genéricos casados pelas `conceptTags` da atividade ou pelo conceito
 *      sugerido. É o mecanismo mínimo que faz o escape funcionar hoje,
 *      antes de existir conteúdo autoral por atividade.
 *
 * O que é MECANISMO (pronto aqui): desbloqueio, busca, precedência,
 * sinalização na resposta e o reforço conceitual de fallback.
 * O que depende de CONTEÚDO FUTURO: exemplos análogos autorais por
 * atividade (via lessonPayload) e a ampliação deste registro.
 */

export interface AnalogousExample {
  /** Título do problema análogo (sempre diferente do exercício do aluno). */
  title: string;
  /** Enunciado completo do problema análogo. */
  statement: string;
  /** Solução COMENTADA do problema análogo — nunca a do exercício atual. */
  solution: string;
  /** Ponte: como a técnica do exemplo se transfere ao exercício atual. */
  explanation: string;
  /** Conceito/técnica compartilhada entre o análogo e o exercício. */
  concept: string;
}

/** Forma esperada do exemplo autoral dentro de Activity.lessonPayload. */
export interface LessonPayloadWithAnalogousExample {
  analogousExample?: Partial<AnalogousExample>;
}

/**
 * Extrai um exemplo análogo autoral do lessonPayload da atividade.
 * Retorna null se o payload não tiver o campo ou se ele estiver incompleto
 * (título, enunciado, solução e explicação são obrigatórios para o escape
 * fazer sentido pedagógico).
 */
export function extractAuthoredAnalogousExample(
  lessonPayload: unknown,
): AnalogousExample | null {
  if (!lessonPayload || typeof lessonPayload !== 'object') return null;
  const candidate = (lessonPayload as LessonPayloadWithAnalogousExample)
    .analogousExample;
  if (!candidate || typeof candidate !== 'object') return null;

  const { title, statement, solution, explanation, concept } = candidate;
  if (
    typeof title !== 'string' ||
    typeof statement !== 'string' ||
    typeof solution !== 'string' ||
    typeof explanation !== 'string' ||
    !title.trim() ||
    !statement.trim() ||
    !solution.trim() ||
    !explanation.trim()
  ) {
    return null;
  }

  return {
    title,
    statement,
    solution,
    explanation,
    concept: typeof concept === 'string' && concept.trim() ? concept : title,
  };
}

interface RegisteredAnalogousExample extends AnalogousExample {
  /** Termos normalizados (minúsculas, sem acento) p/ casar com conceptTags. */
  tags: string[];
}

function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Registro-semente de exemplos análogos por conceito. Cada exemplo é um
 * problema propositalmente diferente dos exercícios típicos da sua técnica,
 * com solução comentada passo a passo.
 */
const ANALOGOUS_EXAMPLES: RegisteredAnalogousExample[] = [
  {
    tags: ['loops', 'lacos', 'repeticao', 'acumulador', 'iteracao', 'for', 'while'],
    concept: 'Laços de repetição com acumulador',
    title: 'Contar as vogais de uma palavra',
    statement:
      'Escreva uma função contarVogais(palavra) que receba uma string e retorne quantas vogais (a, e, i, o, u) ela contém.',
    solution: [
      'function contarVogais(palavra) {',
      '  let total = 0; // acumulador: começa zerado, antes do laço',
      '  for (let i = 0; i < palavra.length; i++) { // percorre posição por posição',
      '    const letra = palavra[i];',
      "    if ('aeiou'.includes(letra)) { // a condição decide se acumula",
      '      total = total + 1; // acumula um por vez, dentro do laço',
      '    }',
      '  }',
      '  return total; // devolve o acumulado DEPOIS que o laço termina',
      '}',
    ].join('\n'),
    explanation:
      'Repare no esqueleto da técnica: um acumulador nasce zerado ANTES do laço, é atualizado DENTRO dele só quando a condição pede, e o return acontece DEPOIS da última volta. No seu exercício, pergunte-se: o que faz o papel de "total" aqui? O que entra no lugar da condição das vogais? Transfira o esqueleto, não os valores.',
  },
  {
    tags: ['arrays', 'listas', 'indices', 'indice', 'vetores', 'strings'],
    concept: 'Índices e limites de uma sequência',
    title: 'Primeira e última letra de uma palavra',
    statement:
      'Escreva uma função bordas(palavra) que retorne uma string com a primeira e a última letra da palavra recebida, nesta ordem (ex.: "casa" -> "ca").',
    solution: [
      'function bordas(palavra) {',
      '  const primeira = palavra[0]; // a contagem começa no ZERO',
      '  const ultima = palavra[palavra.length - 1]; // última posição válida = tamanho - 1',
      '  return primeira + ultima;',
      '}',
    ].join('\n'),
    explanation:
      'A técnica aqui é o mapa de posições: primeira posição é sempre 0 e a última é sempre tamanho - 1, nunca o tamanho. No seu exercício, identifique qual posição o enunciado pede e traduza esse pedido para esse mesmo mapa — é a tradução do pedido para índice que costuma falhar, não o acesso em si.',
  },
  {
    tags: ['funcoes', 'funcao', 'retorno', 'return', 'parametros'],
    concept: 'Funções que devolvem valor com return',
    title: 'Converter minutos em segundos',
    statement:
      'Escreva uma função minutosParaSegundos(minutos) que receba um número de minutos e devolva a quantidade equivalente de segundos.',
    solution: [
      'function minutosParaSegundos(minutos) {',
      '  const segundos = minutos * 60; // 1) calcula e guarda o resultado',
      '  return segundos; // 2) ENTREGA o resultado a quem chamou',
      '}',
    ].join('\n'),
    explanation:
      'O ponto da técnica é a entrega: calcular não basta — sem return, quem chamou a função recebe um valor vazio. No seu exercício, siga o valor que você calcula até o fim da função e confira se ele é devolvido explicitamente, com o tipo que o enunciado espera.',
  },
  {
    tags: ['condicionais', 'condicional', 'if', 'else', 'decisao', 'comparacao'],
    concept: 'Decisões com condicionais em cadeia',
    title: 'Classificar a temperatura do dia',
    statement:
      'Escreva uma função classificarTemperatura(t) que retorne "frio" se t for menor que 15, "agradavel" se t estiver entre 15 e 25 (inclusive), e "quente" se t for maior que 25.',
    solution: [
      'function classificarTemperatura(t) {',
      '  if (t < 15) { // testa a primeira faixa e já devolve',
      "    return 'frio';",
      '  } else if (t <= 25) { // quem chegou aqui já sabe que t >= 15',
      "    return 'agradavel';",
      '  } else { // sobrou só a última faixa',
      "    return 'quente';",
      '  }',
      '}',
    ].join('\n'),
    explanation:
      'A técnica é ordenar as faixas: cada else só é alcançado quando todas as condições anteriores falharam, então cada teste pode pressupor as faixas já descartadas. No seu exercício, liste as faixas do enunciado em ordem e confira se os limites (menor, menor ou igual) batem com o texto — erro de fronteira é o defeito clássico deste padrão.',
  },
  {
    tags: ['complexidade', 'big-o', 'eficiencia', 'hash', 'map', 'dicionario', 'frequencia'],
    concept: 'Contagem eficiente com Map (hash)',
    title: 'Contar quantas vezes cada letra aparece',
    statement:
      'Escreva uma função frequenciaDeLetras(palavra) que retorne um objeto com a quantidade de ocorrências de cada letra da palavra (ex.: "banana" -> { b: 1, a: 3, n: 2 }).',
    solution: [
      'function frequenciaDeLetras(palavra) {',
      '  const contagem = new Map(); // a "caixa de contadores": chave = letra',
      '  for (const letra of palavra) { // UMA única passada pelos dados',
      '    const atual = contagem.get(letra) || 0; // busca O(1) pela chave',
      '    contagem.set(letra, atual + 1); // atualiza o contador daquela letra',
      '  }',
      '  return Object.fromEntries(contagem);',
      '}',
    ].join('\n'),
    explanation:
      'A técnica é trocar buscas repetidas por uma tabela: em vez de recontar a palavra inteira para cada letra (laços aninhados, O(N²)), uma passada só alimenta o Map e cada consulta custa O(1). No seu exercício, pergunte-se: que informação você está buscando repetidas vezes dentro do laço? Ela pode virar a chave de um Map ou Set?',
  },
];

/**
 * Busca um exemplo análogo do registro a partir das conceptTags da
 * atividade — o sinal de conceito autoral e confiável. (Não casar por
 * texto livre de conceitos genéricos de estágio: eles são rótulos de tier,
 * não o conceito da atividade.)
 */
export function findAnalogousExample(
  conceptTags: string[] = [],
): AnalogousExample | null {
  const terms = new Set<string>();
  for (const tag of conceptTags || []) {
    if (typeof tag === 'string') terms.add(normalizeTerm(tag));
  }
  if (terms.size === 0) return null;

  for (const example of ANALOGOUS_EXAMPLES) {
    if (example.tags.some((tag) => terms.has(tag))) {
      const { tags: _tags, ...analogous } = example;
      return analogous;
    }
  }
  return null;
}

export interface ConceptReinforcement {
  explanation: string;
  guidingQuestions: string[];
}

/**
 * Reforço conceitual reforçado (fallback do escape quando não há exemplo
 * análogo): explica o conceito em camadas e devolve perguntas guiadas.
 * NUNCA contém código de solução nem valores esperados de testes.
 */
export function buildConceptReinforcement(
  concept: string,
  activityTitle: string,
): ConceptReinforcement {
  const safeConcept = concept && concept.trim() ? concept : 'o conceito central do exercício';
  return {
    explanation:
      `Você já passou por todos os estágios de dicas deste exercício, então vamos reconstruir a base: "${safeConcept}". ` +
      `Releia o enunciado de "${activityTitle}" e sublinhe três coisas: (1) exatamente o que entra na função, com tipos; ` +
      `(2) exatamente o que deve sair dela, com tipo; (3) a regra que transforma um no outro, em uma frase com as suas palavras. ` +
      `A maior parte dos travamentos mora num desses três pontos mal lidos — não na digitação do código. ` +
      `Depois, pegue o menor exemplo do enunciado e execute o seu código no papel, linha a linha, anotando o valor de cada variável: ` +
      `o ponto onde o papel diverge do que o enunciado promete é onde a correção mora.`,
    guidingQuestions: [
      'Qual é, em uma frase, a transformação que a função deve produzir entre a entrada e a saída?',
      'No menor exemplo do enunciado, qual é o primeiro passo que o seu código executa — e ele corresponde ao primeiro passo da sua frase?',
      'Que caso de borda (vazio, zero, um único elemento, valor negativo) o seu código trata igual ao caso comum, mas o enunciado trata diferente?',
    ],
  };
}
