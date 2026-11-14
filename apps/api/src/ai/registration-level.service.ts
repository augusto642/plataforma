import { Injectable, Logger, Optional } from '@nestjs/common';
import { LlmClient } from './llm-client';
import {
  UNTRUSTED_EVALUATION_NOTE,
  wrapUntrustedForEvaluation,
} from './prompt-guard';

export type RegistrationChallengeLanguage =
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'java'
  | 'csharp'
  | 'go'
  | 'php'
  | 'sql'
  | 'rust'
  | 'logic';

export type DetectedExperienceLevel = 'beginner' | 'junior' | 'mid' | 'senior';
export type EvaluationConfidence = 'high' | 'medium' | 'low';

export interface PublicRegistrationChallenge {
  id: string;
  language: RegistrationChallengeLanguage;
  languageLabel: string;
  title: string;
  prompt: string;
  codeSnippet: string;
  hint: string;
}

interface ConceptSignal {
  concept: string;
  patterns: RegExp[];
}

interface InternalRegistrationChallenge extends PublicRegistrationChallenge {
  expectedConcepts: ConceptSignal[];
  intermediateSignals: ConceptSignal[];
  advancedSignals: ConceptSignal[];
}

export interface GetChallengeInput {
  programmed?: boolean;
  language?: string;
}

export interface EvaluateRegistrationLevelInput {
  hasProgrammedBefore: boolean;
  language?: string;
  challengeId?: string;
  explanation: string;
  tabSwitchCount?: number;
  followUpQuestion?: string;
  followUpAnswer?: string;
}

export interface EvaluateRegistrationLevelResult {
  detectedLevel: DetectedExperienceLevel;
  levelLabel: string;
  confidence: EvaluationConfidence;
  feedback: string;
  detectedConcepts: string[];
  source: 'llm' | 'heuristic';
}

export const LEVEL_LABELS: Record<DetectedExperienceLevel, string> = {
  beginner: 'Iniciante',
  junior: 'Júnior',
  mid: 'Pleno',
  senior: 'Sênior',
};

const VALID_LEVELS: ReadonlySet<DetectedExperienceLevel> = new Set([
  'beginner',
  'junior',
  'mid',
  'senior',
]);

const VALID_CONFIDENCES: ReadonlySet<EvaluationConfidence> = new Set([
  'high',
  'medium',
  'low',
]);

const LANGUAGE_ALIASES: Record<string, RegistrationChallengeLanguage> = {
  python: 'python',
  py: 'python',
  javascript: 'javascript',
  js: 'javascript',
  node: 'javascript',
  nodejs: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  java: 'java',
  csharp: 'csharp',
  'c#': 'csharp',
  cs: 'csharp',
  dotnet: 'csharp',
  go: 'go',
  golang: 'go',
  php: 'php',
  sql: 'sql',
  postgres: 'sql',
  postgresql: 'sql',
  mysql: 'sql',
  sqlite: 'sql',
  rust: 'rust',
  rs: 'rust',
  logic: 'logic',
  logica: 'logic',
};

// Sinais transversais de profundidade técnica (funcionam em qualquer desafio
// quando o aluno demonstra leitura arquitetural ou assintótica).
const GENERAL_INTERMEDIATE_SIGNALS: ConceptSignal[] = [
  {
    concept: 'Casos de borda (entrada vazia, nula ou inválida)',
    patterns: [/\b(caso\s+de\s+borda|casos\s+de\s+borda|edge\s*case|entrada\s+vazia|lista\s+vazia|entrada\s+invalida|valores\s+negativos|nan)\b/i],
  },
  {
    concept: 'Complexidade de tempo ou espaço',
    patterns: [/\bo\s*\(\s*[n1logk2^]+\s*\)|complexidade|assintotic|tempo\s+linear|quadratico/i],
  },
  {
    concept: 'Estruturas de busca eficientes (hash / lookup O(1))',
    patterns: [/\b(hash\s*map|hashmap|tabela\s+hash|lookup|busca\s+em\s+o\s*\(\s*1\s*\)|evita\s+o\s*\(\s*n)/i],
  },
];

const GENERAL_ADVANCED_SIGNALS: ConceptSignal[] = [
  {
    concept: 'Trade-offs de performance, memória ou alocação',
    patterns: [/\b(trade-?off|alocac|memoria|heap|stack|garbage|gc|cache|in-?place|overhead)\b/i],
  },
  {
    concept: 'Concorrência, paralelismo ou segurança de execução',
    patterns: [/\b(concorr|race\s*condition|thread|mutex|lock|atomico|deadlock|escalabil)\b/i],
  },
  {
    concept: 'Invariantes, contratos ou refatoração arquitetural',
    patterns: [/\b(invariante|imutabil|idempoten|refator|desacopl|complexidade\s+espacial|amortiz)\b/i],
  },
];

const UNCERTAINTY_PATTERN =
  /\b(nao\s+sei|nunca\s+vi|nao\s+entendi|nao\s+faco\s+ideia|chutei|sem\s+ideia|dificil\s+dizer)\b/i;

const CHALLENGE_CATALOG: Record<
  RegistrationChallengeLanguage,
  InternalRegistrationChallenge
> = {
  python: {
    id: 'reg-python-v1',
    language: 'python',
    languageLabel: 'Python',
    title: 'Leitura de código em Python',
    prompt:
      'Explique com suas próprias palavras o que esta função faz, o que ela retorna e quais detalhes ou cuidados você observa nela.',
    codeSnippet: [
      'def resumir_pedidos(pedidos):',
      '    totais = {}',
      '    for p in pedidos:',
      '        if p.get("pago"):',
      '            cat = p.get("categoria", "outros")',
      '            totais[cat] = totais.get(cat, 0) + p.get("valor", 0)',
      '    return totais',
    ].join('\n'),
    hint: 'Observe o dicionário inicial, o filtro dentro do laço e como os valores são acumulados.',
    expectedConcepts: [
      {
        concept: 'Iteração sobre lista de pedidos',
        patterns: [/\b(for|loop|laco|percorre|itera|cada\s+pedido|lista)\b/i],
      },
      {
        concept: 'Filtro condicional de pedidos pagos',
        patterns: [/\b(if|condic|filtra|pago|somente|apenas\s+os\s+pagos)\b/i],
      },
      {
        concept: 'Agrupamento e soma por categoria em dicionário',
        patterns: [/\b(soma|acumula|agrupa|dicionario|dict|chave|categoria|total|totais)\b/i],
      },
      {
        concept: 'Retorno do resumo agregado',
        patterns: [/\b(retorna|devolve|saida|resultado)\b/i],
      },
    ],
    intermediateSignals: [
      {
        concept: 'Uso de .get() com valor padrão para evitar KeyError',
        patterns: [/\b(keyerror|valor\s+padrao|default|fallback|outros|\.get\()\b/i],
      },
      {
        concept: 'Complexidade O(n) em uma passada',
        patterns: [/\bo\s*\(\s*n\s*\)|linear|uma\s+passada|tempo\s+constante\s+o\s*\(\s*1\s*\)/i],
      },
      {
        concept: 'Validação de tipos ou valores nulos/negativos',
        patterns: [/\b(none|negativo|tipo|float|decimal|precisao|vazi[oa])\b/i],
      },
    ],
    advancedSignals: [
      {
        concept: 'Precisão numérica com float vs Decimal em valores monetários',
        patterns: [/\b(decimal|ponto\s+flutuante|arredond|ieee\s*754|centavos|monetar)\b/i],
      },
      {
        concept: 'Abstrações idiomáticas (defaultdict/Counter) e tipagem estática',
        patterns: [/\b(defaultdict|counter|type\s*hint|typeddict|dataclass|contrato|imutabil)\b/i],
      },
    ],
  },

  javascript: {
    id: 'reg-javascript-v1',
    language: 'javascript',
    languageLabel: 'JavaScript',
    title: 'Leitura de código em JavaScript',
    prompt:
      'Explique com suas próprias palavras o que esta função faz, como ela transforma os dados e o que aconteceria em casos extremos.',
    codeSnippet: [
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
    hint: 'Repare no papel do Set e na normalização do e-mail antes de decidir manter o item.',
    expectedConcepts: [
      {
        concept: 'Filtragem de lista com .filter()',
        patterns: [/\b(filter|filtra|lista|array|usuarios)\b/i],
      },
      {
        concept: 'Verificação de usuário ativo e e-mail preenchido',
        patterns: [/\b(ativo|email|valido|verifica|checa|condic)\b/i],
      },
      {
        concept: 'Remoção de duplicatas com Set',
        patterns: [/\b(set|duplicad|repetid|unico|unicos|vistos)\b/i],
      },
    ],
    intermediateSignals: [
      {
        concept: 'Normalização de string (trim e lowercase)',
        patterns: [/\b(trim|lowercase|minuscul|espaco|normaliz|case\s*insensitive)\b/i],
      },
      {
        concept: 'Optional chaining (?.) e guarda contra null/undefined',
        patterns: [/\b(optional\s*chaining|\?\.|null|undefined|falsy)\b/i],
      },
      {
        concept: 'Busca O(1) no Set evitando O(n²)',
        patterns: [/\bo\s*\(\s*1\s*\)|o\s*\(\s*n\s*\)|hash|busca\s+rapida|complexidade/i],
      },
    ],
    advancedSignals: [
      {
        concept: 'Efeito colateral dentro de callback de .filter() (impureza funcional)',
        patterns: [/\b(efeito\s+colateral|side\s*effect|impura|mutacao|estado\s+externo|referencial)\b/i],
      },
      {
        concept: 'Imutabilidade de entrada e validação de entrada não-array',
        patterns: [/\b(imutab|array\.isarray|nao\s+muta|copia\s+rasa|shallow|contrato)\b/i],
      },
    ],
  },

  typescript: {
    id: 'reg-typescript-v1',
    language: 'typescript',
    languageLabel: 'TypeScript',
    title: 'Leitura de código em TypeScript',
    prompt:
      'Explique o que esta função faz, como os tipos influenciam a segurança do código e que detalhes técnicos chamam sua atenção.',
    codeSnippet: [
      'type Resultado<T> = { ok: true; dados: T } | { ok: false; erro: string };',
      '',
      'function extrairOuPadrao<T>(res: Resultado<T>, padrao: T): T {',
      '  if (res.ok) {',
      '    return res.dados;',
      '  }',
      '  return padrao;',
      '}',
    ].join('\n'),
    hint: 'Observe como o campo `ok` permite distinguir os dois formatos possíveis de `Resultado<T>`.',
    expectedConcepts: [
      {
        concept: 'Função genérica com tipo parametrizado T',
        patterns: [/\b(generic|generico|tipo\s+t|qualquer\s+tipo|reutiliz)\b/i],
      },
      {
        concept: 'Retorno condicional de dados ou valor padrão',
        patterns: [/\b(ok|true|false|padrao|fallback|dados|erro|retorna)\b/i],
      },
      {
        concept: 'Tipo união representando sucesso ou erro',
        patterns: [/\b(uniao|union|sucesso|erro|dois\s+casos|alternativa)\b/i],
      },
    ],
    intermediateSignals: [
      {
        concept: 'Discriminated union e type narrowing pelo campo ok',
        patterns: [/\b(discriminated|uniao\s+discriminada|narrowing|refinamento|type\s*guard)\b/i],
      },
      {
        concept: 'Padrão Result/Either evitando exceções não tipadas',
        patterns: [/\b(result|either|throw|excecao|erro\s+tipado|seguranca\s+de\s+tipo)\b/i],
      },
    ],
    advancedSignals: [
      {
        concept: 'Inferência de tipo em tempo de compilação e exaustividade',
        patterns: [/\b(compilac|inferencia|exaustiv|never|zero\s+overhead|runtime|erased)\b/i],
      },
      {
        concept: 'Trade-off de avaliação eager do parâmetro padrão vs lazy factory',
        patterns: [/\b(eager|lazy|callback|funcao\s+fabrica|avaliado\s+antes|strict)\b/i],
      },
    ],
  },

  java: {
    id: 'reg-java-v1',
    language: 'java',
    languageLabel: 'Java',
    title: 'Leitura de código em Java',
    prompt:
      'Explique o que este método faz, o que ele retorna e quais cuidados de memória, tipos ou casos de borda existem aqui.',
    codeSnippet: [
      'public static Optional<Integer> segundoMaior(List<Integer> nums) {',
      '    if (nums == null || nums.size() < 2) return Optional.empty();',
      '    Integer maior = null, segundo = null;',
      '    for (Integer n : nums) {',
      '        if (n == null) continue;',
      '        if (maior == null || n > maior) { segundo = maior; maior = n; }',
      '        else if (n < maior && (segundo == null || n > segundo)) { segundo = n; }',
      '    }',
      '    return Optional.ofNullable(segundo);',
      '}',
    ].join('\n'),
    hint: 'Acompanhe como `maior` e `segundo` são atualizados em uma única passagem pela lista.',
    expectedConcepts: [
      {
        concept: 'Busca do segundo maior valor na lista',
        patterns: [/\b(segundo\s+maior|maior\s+numero|dois\s+maiores|compar)\b/i],
      },
      {
        concept: 'Laço percorrendo os elementos da lista',
        patterns: [/\b(for|loop|laco|percorre|itera|lista)\b/i],
      },
      {
        concept: 'Tratamento de lista nula, curta ou elementos nulos',
        patterns: [/\b(null|vazio|tamanho|menor\s+que\s+2|optional)\b/i],
      },
    ],
    intermediateSignals: [
      {
        concept: 'Uso de Optional evitando retorno null direto',
        patterns: [/\b(optional|nullpointer|npe|ofnullable|empty)\b/i],
      },
      {
        concept: 'Complexidade O(n) de tempo e O(1) de espaço sem ordenar',
        patterns: [/\b(o\s*\(\s*n\s*\)|o\s*\(\s*1\s*\)|sem\s+ordenar|sort|uma\s+passada|espaco\s+constante)\b/i],
      },
      {
        concept: 'Ignora duplicatas do maior valor (n < maior)',
        patterns: [/\b(duplicad|repetid|igual\s+ao\s+maior|estritamente\s+menor)\b/i],
      },
    ],
    advancedSignals: [
      {
        concept: 'Boxing/unboxing de Integer vs int primitivo e alocação',
        patterns: [/\b(unboxing|autoboxing|boxing|primitivo|heap|alocac|cache\s+de\s+integer)\b/i],
      },
      {
        concept: 'Design de API (Optional como retorno e comparação segura)',
        patterns: [/\b(contrato|api|compareto|stream|distinct|complexidade)\b/i],
      },
    ],
  },

  csharp: {
    id: 'reg-csharp-v1',
    language: 'csharp',
    languageLabel: 'C#',
    title: 'Leitura de código em C#',
    prompt:
      'Explique o que este método faz, como o LINQ/coleções atuam aqui e quais detalhes de performance ou execução você percebe.',
    codeSnippet: [
      'public static Dictionary<string, int> ContarPorDominio(IEnumerable<string> emails)',
      '{',
      '    return emails',
      '        .Where(e => !string.IsNullOrWhiteSpace(e) && e.Contains(\'@\'))',
      '        .Select(e => e.Split(\'@\')[1].Trim().ToLowerInvariant())',
      '        .GroupBy(d => d)',
      '        .ToDictionary(g => g.Key, g => g.Count());',
      '}',
    ].join('\n'),
    hint: 'Observe as etapas encadeadas: filtro, extração do domínio do e-mail, agrupamento e contagem.',
    expectedConcepts: [
      {
        concept: 'Filtragem de e-mails válidos',
        patterns: [/\b(where|filtra|valido|arroba|@|vazio|espaco)\b/i],
      },
      {
        concept: 'Extração e normalização do domínio',
        patterns: [/\b(split|dominio|select|extrai|minuscul|trim)\b/i],
      },
      {
        concept: 'Agrupamento e contagem em dicionário',
        patterns: [/\b(groupby|agrupa|conta|count|dictionary|dicionario)\b/i],
      },
    ],
    intermediateSignals: [
      {
        concept: 'Execução adiada do LINQ materializada pelo ToDictionary',
        patterns: [/\b(linq|lazy|adiad|deferred|materializ|enumer)\b/i],
      },
      {
        concept: 'Caso de borda com múltiplos @ ou string malformada no Split',
        patterns: [/\b(dois\s+@|multiplos\s+@|split|indice|indexoutof|nullreference|borda)\b/i],
      },
    ],
    advancedSignals: [
      {
        concept: 'Alocações de strings/arrays no Split e custo de GroupBy vs loop direto',
        patterns: [/\b(alocac|span|slice|memory|gc|overhead|substring|indexof|ordinalignorecase)\b/i],
      },
      {
        concept: 'Cultura invariante (ToLowerInvariant / StringComparer)',
        patterns: [/\b(invariant|cultura|culture|stringcomparer|turkish|ordinal)\b/i],
      },
    ],
  },

  go: {
    id: 'reg-go-v1',
    language: 'go',
    languageLabel: 'Go',
    title: 'Leitura de código em Go',
    prompt:
      'Explique o que esta função faz, como ela lida com erros e o que chama sua atenção sobre slices, memória ou concorrência.',
    codeSnippet: [
      'func FiltrarPositivos(nums []int) ([]int, error) {',
      '    if nums == nil {',
      '        return nil, errors.New("entrada nula")',
      '    }',
      '    res := make([]int, 0, len(nums))',
      '    for _, n := range nums {',
      '        if n > 0 {',
      '            res = append(res, n)',
      '        }',
      '    }',
      '    return res, nil',
      '}',
    ].join('\n'),
    hint: 'Note o retorno duplo `(resultado, error)` e os três argumentos passados para `make`.',
    expectedConcepts: [
      {
        concept: 'Filtro de números positivos em um slice',
        patterns: [/\b(positivo|maior\s+que\s+zero|filtra|slice|lista|for|range)\b/i],
      },
      {
        concept: 'Retorno explícito de valor e erro',
        patterns: [/\b(erro|error|nil|retorno\s+duplo|entrada\s+nula)\b/i],
      },
      {
        concept: 'Construção do slice resultado com append',
        patterns: [/\b(append|make|novo\s+slice|acumula|retorna)\b/i],
      },
    ],
    intermediateSignals: [
      {
        concept: 'Pré-alocação de capacidade com make([]int, 0, len(nums))',
        patterns: [/\b(capacidade|cap|pre-?aloc|realoc|make\(|len\(nums\))\b/i],
      },
      {
        concept: 'Diferença entre slice nil e slice vazio em Go',
        patterns: [/\b(slice\s+nil|slice\s+vazio|zero\s+value|nil\s+vs)\b/i],
      },
    ],
    advancedSignals: [
      {
        concept: 'Redução de realocações do backing array e pressão no GC',
        patterns: [/\b(backing\s+array|realocac|escape\s+analysis|heap|stack|gc|amortiz)\b/i],
      },
      {
        concept: 'Trade-off de super-alocação quando há poucos positivos',
        patterns: [/\b(trade-?off|desperdicio\s+de\s+memoria|super-?aloc|filtro\s+esparso)\b/i],
      },
    ],
  },

  php: {
    id: 'reg-php-v1',
    language: 'php',
    languageLabel: 'PHP',
    title: 'Leitura de código em PHP',
    prompt:
      'Explique o que esta função faz, como os dados são normalizados e que aspectos de segurança ou tipagem você observa.',
    codeSnippet: [
      'function buscarUsuarioPorEmail(PDO $pdo, string $email): ?array {',
      '    $normalizado = strtolower(trim($email));',
      '    if ($normalizado === \'\') return null;',
      '    $stmt = $pdo->prepare(\'SELECT id, nome FROM usuarios WHERE email = :email LIMIT 1\');',
      '    $stmt->execute([\':email\' => $normalizado]);',
      '    $row = $stmt->fetch(PDO::FETCH_ASSOC);',
      '    return $row ?: null;',
      '}',
    ].join('\n'),
    hint: 'Repare no uso de `prepare` + `execute` em vez de concatenar o `$email` diretamente na string SQL.',
    expectedConcepts: [
      {
        concept: 'Normalização e validação de e-mail vazio',
        patterns: [/\b(trim|strtolower|minuscul|normaliz|vazio|null)\b/i],
      },
      {
        concept: 'Consulta SQL ao banco com PDO',
        patterns: [/\b(select|sql|banco|tabela|usuarios|pdo|fetch)\b/i],
      },
      {
        concept: 'Retorno anulável (?array) quando não encontra',
        patterns: [/\b(retorna|array|null|nao\s+encontr|limit\s+1)\b/i],
      },
    ],
    intermediateSignals: [
      {
        concept: 'Prevenção de SQL Injection com prepared statements',
        patterns: [/\b(sql\s*injection|injecao|prepared\s*statement|parametriz|bind|:email)\b/i],
      },
      {
        concept: 'Projeção explícita de colunas (sem SELECT *) e FETCH_ASSOC',
        patterns: [/\b(fetch_assoc|associativo|select\s*\*|colunas\s+especificas|tipagem)\b/i],
      },
    ],
    advancedSignals: [
      {
        concept: 'Uso de índice em email, case-sensitivity no banco e colação',
        patterns: [/\b(indice|index|collation|colacao|citext|plano\s+de\s+execuc|full\s+scan)\b/i],
      },
      {
        concept: 'Tratamento de exceções do PDO e separação de camadas/repositório',
        patterns: [/\b(errmode|pdoexception|repositorio|injecao\s+de\s+depend|emulate_prepares)\b/i],
      },
    ],
  },

  sql: {
    id: 'reg-sql-v1',
    language: 'sql',
    languageLabel: 'SQL',
    title: 'Leitura de consulta em SQL',
    prompt:
      'Explique o que esta consulta SQL retorna, como as tabelas e filtros funcionam e quais pontos de performance ou edge cases você observa.',
    codeSnippet: [
      'SELECT c.id, c.nome, COUNT(p.id) AS total_pedidos',
      'FROM clientes c',
      'LEFT JOIN pedidos p',
      '  ON p.cliente_id = c.id AND p.status = \'pago\'',
      'GROUP BY c.id, c.nome',
      'HAVING COUNT(p.id) >= 3',
      'ORDER BY total_pedidos DESC;',
    ].join('\n'),
    hint: 'Preste atenção em onde está o filtro `p.status = \'pago\'` (no ON, não no WHERE) e na diferença entre WHERE e HAVING.',
    expectedConcepts: [
      {
        concept: 'Junção de clientes e pedidos com LEFT JOIN',
        patterns: [/\b(join|junta|clientes|pedidos|relaciona)\b/i],
      },
      {
        concept: 'Contagem e agrupamento por cliente (GROUP BY / COUNT)',
        patterns: [/\b(group\s*by|agrupa|count|conta|total\s+de\s+pedidos)\b/i],
      },
      {
        concept: 'Filtro de agregação (HAVING >= 3) e ordenação decrescente',
        patterns: [/\b(having|pelo\s+menos\s+3|maior\s+ou\s+igual|order\s*by|ordena|decrescente|desc)\b/i],
      },
    ],
    intermediateSignals: [
      {
        concept: 'Diferença entre filtro no ON do LEFT JOIN vs no WHERE',
        patterns: [/\b(no\s+on|clausula\s+on|where|transformaria\s+em\s+inner|preserva\s+clientes)\b/i],
      },
      {
        concept: 'Diferença entre WHERE (antes do grupo) e HAVING (após agregação)',
        patterns: [/\b(antes\s+do\s+agrup|apos\s+agrup|agregac|where\s+vs\s+having)\b/i],
      },
      {
        concept: 'COUNT(p.id) ignora NULLs ao contrário de COUNT(*)',
        patterns: [/\b(count\(\*\)|ignora\s+null|valores\s+nulos)\b/i],
      },
    ],
    advancedSignals: [
      {
        concept: 'Interação efetiva entre LEFT JOIN e HAVING >= 3 (anula preservação de 0 pedidos)',
        patterns: [/\b(inner\s+join\s+efetivo|equivale\s+a\s+inner|nunca\s+retorna\s+0|elimina\s+zeros)\b/i],
      },
      {
        concept: 'Índices compostos (cliente_id, status) e plano de execução',
        patterns: [/\b(indice\s+composto|covering\s+index|explain|plano\s+de\s+execuc|hash\s+aggregate|seq\s+scan)\b/i],
      },
    ],
  },

  rust: {
    id: 'reg-rust-v1',
    language: 'rust',
    languageLabel: 'Rust',
    title: 'Leitura de código em Rust',
    prompt:
      'Explique o que esta função faz, como ela lida com memória/ownership e que detalhes idiomáticos ou de performance você observa.',
    codeSnippet: [
      'fn primeira_palavra(texto: &str) -> &str {',
      '    let bytes = texto.as_bytes();',
      '    for (i, &b) in bytes.iter().enumerate() {',
      '        if b == b\' \' {',
      '            return &texto[..i];',
      '        }',
      '    }',
      '    texto',
      '}',
    ].join('\n'),
    hint: 'Observe o uso de `&str` (string slice) e por que a função não precisa criar uma nova `String`.',
    expectedConcepts: [
      {
        concept: 'Busca do primeiro espaço para fatiar a primeira palavra',
        patterns: [/\b(primeira\s+palavra|espaco|fatia|slice|indice|ate\s+o\s+espaco)\b/i],
      },
      {
        concept: 'Retorno do texto inteiro caso não haja espaço',
        patterns: [/\b(texto\s+inteiro|sem\s+espaco|nao\s+encontr|retorna\s+tudo|retorna\s+texto)\b/i],
      },
      {
        concept: 'Iteração pelos bytes da string',
        patterns: [/\b(for|loop|bytes|enumerate|percorre|itera)\b/i],
      },
    ],
    intermediateSignals: [
      {
        concept: 'Borrowing e slices (&str) sem cópia/alocação na heap',
        patterns: [/\b(borrow|emprest|referencia|sem\s+aloc|zero\s+copy|heap|&str)\b/i],
      },
      {
        concept: 'Elisão de lifetimes entre entrada e saída',
        patterns: [/\b(lifetime|tempo\s+de\s+vida|elision|elisao|'a)\b/i],
      },
    ],
    advancedSignals: [
      {
        concept: 'Segurança UTF-8 ao fatiar no byte ASCII 0x20 (espaço nunca está no meio de codepoint)',
        patterns: [/\b(utf-?8|codepoint|ascii|fronteira\s+de\s+caractere|multibyte|panic)\b/i],
      },
      {
        concept: 'Alternativas zero-cost da stdlib (split_whitespace / find)',
        patterns: [/\b(zero-?cost|split_whitespace|iterator|monomorf|inlining|memchr)\b/i],
      },
    ],
  },

  logic: {
    id: 'reg-logic-v1',
    language: 'logic',
    languageLabel: 'Lógica de Programação',
    title: 'Leitura de lógica passo a passo',
    prompt:
      'Não precisa conhecer nenhuma linguagem! Leia os passos abaixo como uma receita e conte, com suas palavras, o que acontece no final.',
    codeSnippet: [
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
    hint: 'Acompanhe os 4 preços um por um: quais entram na soma e se o desconto final se aplica.',
    expectedConcepts: [
      {
        concept: 'Percorrer cada item da lista de preços',
        patterns: [/\b(lista|cada\s+preco|percorre|passa\s+por|repete|itens|valores)\b/i],
      },
      {
        concept: 'Somar apenas valores maiores ou iguais a 20 (40 e 25 = 65)',
        patterns: [/\b(20|40|25|65|soma|maiores|filtra|condic)\b/i],
      },
      {
        concept: 'Aplicar desconto de 10 quando o total passa de 50 (resultado 55)',
        patterns: [/\b(50|10|55|desconto|subtrai|diminui|tira)\b/i],
      },
    ],
    intermediateSignals: [
      {
        concept: 'Rastreio passo a passo com resultado exato (65 -> 55)',
        patterns: [/\b65\b.*\b55\b|\b55\b/],
      },
      {
        concept: 'Separação entre filtro no laço e regra pós-laço',
        patterns: [/\b(depois\s+do\s+laco|apos\s+somar|duas\s+etapas|acumulador|variavel)\b/i],
      },
    ],
    advancedSignals: [
      {
        concept: 'Análise de casos de borda (lista vazia, valores negativos, limite exato 20 ou 50)',
        patterns: [/\b(borda|limite\s+exato|lista\s+vazia|negativo|complexidade|o\s*\(\s*n\s*\))\b/i],
      },
    ],
  },
};

@Injectable()
export class RegistrationLevelService {
  private readonly logger = new Logger(RegistrationLevelService.name);

  constructor(@Optional() private readonly llm?: LlmClient) {}

  getChallenge(input: GetChallengeInput = {}): PublicRegistrationChallenge {
    const challenge = this.resolveChallenge(input.programmed, input.language);
    return {
      id: challenge.id,
      language: challenge.language,
      languageLabel: challenge.languageLabel,
      title: challenge.title,
      prompt: challenge.prompt,
      codeSnippet: challenge.codeSnippet,
      hint: challenge.hint,
    };
  }

  /**
   * Pacote 1.1 — Follow-up Relâmpago de 60s
   * Gera uma pergunta curta e desafiadora baseada na explicação do aluno para mitigar cheat/copy-paste.
   */
  async generateFollowUpQuestion(input: {
    challengeId?: string;
    language?: string;
    explanation: string;
  }): Promise<{ question: string; timeLimitSeconds: number }> {
    const challenge = this.resolveChallengeForEval({
      hasProgrammedBefore: true,
      language: input.language,
      challengeId: input.challengeId,
      explanation: input.explanation,
    });

    if (this.canUseLlm()) {
      try {
        const prompt = [
          'Você é um examinador técnico socrático da NEXUS CODE.',
          'O aluno explicou o seguinte desafio de código:',
          `Desafio: ${challenge.title} (${challenge.languageLabel})`,
          'Código:',
          challenge.codeSnippet,
          '',
          'Explicação enviada pelo aluno:',
          input.explanation,
          '',
          'Gere UMA única pergunta relâmpago direta (máximo 20 palavras) questionando um ponto específico de fluxo, caso de borda ou sintaxe da resposta dele.',
          'Responda APENAS com a pergunta em texto puro, sem aspas.',
        ].join('\n');

        const raw = await this.llm!.complete({
          messages: [{ role: 'user', content: prompt }],
          timeoutMs: 4000,
          purpose: 'registration-followup',
        });

        if (raw && raw.trim().length > 10) {
          return {
            question: raw.trim().replace(/^"|"$/g, ''),
            timeLimitSeconds: 60,
          };
        }
      } catch (err) {
        this.logger.warn(`Follow-up question LLM generation failed: ${(err as Error).message}`);
      }
    }

    const fallbackQuestions: Record<string, string> = {
      python: 'O que aconteceria se a lista passada estivesse vazia ou contivesse valores não esperados?',
      javascript: 'O que a função retornaria se o parâmetro de entrada fosse null ou undefined?',
      typescript: 'Como o compilador reagiria se o tipo da propriedade esperada fosse divergente?',
      java: 'O que aconteceria em tempo de execução se o objeto recebido fosse nulo (NullPointerException)?',
      csharp: 'Como essa estrutura se comportaria se o índice buscado não existisse na coleção?',
      logic: 'Qual seria o resultado final se a sequência de passos recebesse valores invertidos?',
    };

    const q =
      fallbackQuestions[challenge.language] ||
      'Se a entrada fornecida fosse nula ou vazia, qual seria o retorno esperado na execução?';

    return {
      question: q,
      timeLimitSeconds: 60,
    };
  }

  async evaluateExplanation(
    input: EvaluateRegistrationLevelInput,
  ): Promise<EvaluateRegistrationLevelResult> {
    const explanation = (input.explanation ?? '').trim();
    const challenge = this.resolveChallengeForEval(input);

    // Regra explícita para quem nunca programou e deu resposta curta/inicial:
    // nunca humilha, acolhe e define o ponto de partida como Iniciante.
    if (!input.hasProgrammedBefore && explanation.length < 15) {
      return {
        detectedLevel: 'beginner',
        levelLabel: LEVEL_LABELS.beginner,
        confidence: 'high',
        feedback:
          'Que ótimo começar por aqui! Não é preciso saber código ainda — todo mundo parte do zero. Vamos iniciar pelos fundamentos de lógica passo a passo para você ganhar confiança desde o primeiro desafio.',
        detectedConcepts: [],
        source: 'heuristic',
      };
    }

    let result: EvaluateRegistrationLevelResult | null = null;

    if (explanation.length > 0 && this.canUseLlm()) {
      try {
        result = await this.evaluateWithLlm(input, challenge, explanation);
      } catch (err) {
        this.logger.warn(
          `Registration level LLM evaluation fell back to heuristic: ${(err as Error).message}`,
        );
      }
    }

    if (!result) {
      result = this.evaluateWithHeuristic(input, challenge, explanation);
    }

    // Calibração estrita do PRD para a IA: BEGINNER, JUNIOR ou MID_LEVEL (Pleno).
    // Qualquer classificação avançada via LLM é calibrada para mid (Pleno), alinhada com as 3 macro-trilhas.
    let finalLevel: DetectedExperienceLevel = result.detectedLevel;
    if (result.source === 'llm' && finalLevel === 'senior') {
      finalLevel = 'mid';
    }

    // Validação Anti-Cheat: se houve muitas trocas de aba (tabSwitchCount > 2)
    // e o follow-up relâmpago não foi respondido satisfatoriamente, reduz o nível/confiança.
    let finalConfidence = result.confidence;
    const tabSwitches = input.tabSwitchCount ?? 0;
    const followUpLen = (input.followUpAnswer ?? '').trim().length;

    if (tabSwitches >= 3 && followUpLen < 6) {
      finalConfidence = 'low';
      if (finalLevel === 'mid') {
        finalLevel = 'junior';
      }
    }

    return {
      ...result,
      detectedLevel: finalLevel,
      levelLabel: LEVEL_LABELS[finalLevel],
      confidence: finalConfidence,
    };
  }

  private resolveChallenge(
    programmed?: boolean,
    language?: string,
  ): InternalRegistrationChallenge {
    if (programmed === false) {
      return CHALLENGE_CATALOG.logic;
    }
    const normalized = this.normalizeLanguageKey(language);
    if (normalized && CHALLENGE_CATALOG[normalized]) {
      return CHALLENGE_CATALOG[normalized];
    }
    return CHALLENGE_CATALOG.logic;
  }

  private resolveChallengeForEval(
    input: EvaluateRegistrationLevelInput,
  ): InternalRegistrationChallenge {
    if (input.challengeId) {
      const byId = Object.values(CHALLENGE_CATALOG).find(
        (c) => c.id === input.challengeId,
      );
      if (byId) return byId;
    }
    return this.resolveChallenge(input.hasProgrammedBefore, input.language);
  }

  private normalizeLanguageKey(
    language?: string,
  ): RegistrationChallengeLanguage | null {
    if (!language) return null;
    const key = language.trim().toLowerCase();
    return LANGUAGE_ALIASES[key] ?? null;
  }

  private canUseLlm(): boolean {
    if (!this.llm) return false;
    // Compatível com LlmClient real (getter isAvailable) e mocks simples em testes.
    if (this.llm.isAvailable === undefined) {
      return typeof this.llm.complete === 'function';
    }
    return Boolean(this.llm.isAvailable);
  }

  private async evaluateWithLlm(
    input: EvaluateRegistrationLevelInput,
    challenge: InternalRegistrationChallenge,
    explanation: string,
  ): Promise<EvaluateRegistrationLevelResult | null> {
    const rubricConcepts = challenge.expectedConcepts.map((c) => c.concept).join('; ');
    const intermediateList = challenge.intermediateSignals.map((c) => c.concept).join('; ');
    const advancedList = challenge.advancedSignals.map((c) => c.concept).join('; ');

    const systemMessage = [
      'Você é um avaliador pedagógico acolhedor e técnico da NEXUS CODE.',
      'Sua tarefa é calibrar o nível inicial de um aluno a partir da explicação dele sobre um trecho de código/lógica.',
      '',
      'Níveis válidos:',
      '- "beginner": nunca programou ou captou apenas a ideia geral/intuição, sem domínio técnico da execução.',
      '- "junior": descreveu corretamente o fluxo principal, variáveis, condições ou laços.',
      '- "mid": identificou casos de borda, complexidade, normalizações, estruturas eficientes ou riscos comuns.',
      '- "senior": analisou trade-offs profundos (alocação/memória, concorrência, invariantes, segurança/plano de execução ou arquitetura).',
      '',
      'REGRA ANTI-HUMILHAÇÃO OBRIGATÓRIA:',
      '- NUNCA rotule baixo desempenho, erro ou falta de conhecimento como falha, fraqueza ou incapacidade.',
      '- Elogie o raciocínio, a intuição ou a sinceridade apresentada pelo aluno.',
      '- Indique de forma clara, gentil e encorajadora o ponto de partida recomendado.',
      '- Escreva o campo "feedback" em PT-BR simples, direto e humano (2 a 3 frases).',
      '',
      UNTRUSTED_EVALUATION_NOTE,
      '',
      'Responda EXCLUSIVAMENTE com um JSON válido neste formato exato:',
      '{"detectedLevel":"beginner|junior|mid|senior","confidence":"high|medium|low","feedback":"string","detectedConcepts":["string"]}',
    ].join('\n');

    const userMessage = [
      `Desafio: ${challenge.title} (${challenge.languageLabel})`,
      `Aluno já programou antes? ${input.hasProgrammedBefore ? 'Sim' : 'Não'}`,
      '',
      'Trecho analisado:',
      '```',
      challenge.codeSnippet,
      '```',
      '',
      `Rubrica interna — conceitos esperados: ${rubricConcepts}`,
      `Sinais de nível pleno: ${intermediateList}`,
      `Sinais de nível sênior: ${advancedList}`,
      '',
      wrapUntrustedForEvaluation('explicacao_do_aluno', explanation),
    ].join('\n');

    const raw = await this.llm!.complete({
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      jsonMode: true,
      timeoutMs: 12000,
      purpose: 'registration-level-eval',
    });

    const parsed = this.parseLlmJson(raw);
    if (!parsed) return null;

    const detectedLevel = parsed.detectedLevel as DetectedExperienceLevel;
    if (!VALID_LEVELS.has(detectedLevel)) return null;

    const confidence: EvaluationConfidence = VALID_CONFIDENCES.has(
      parsed.confidence as EvaluationConfidence,
    )
      ? (parsed.confidence as EvaluationConfidence)
      : 'medium';

    const detectedConcepts = Array.isArray(parsed.detectedConcepts)
      ? parsed.detectedConcepts
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim())
          .slice(0, 8)
      : [];

    const feedback =
      typeof parsed.feedback === 'string' && parsed.feedback.trim().length > 0
        ? parsed.feedback.trim()
        : this.buildHeuristicFeedback(detectedLevel, detectedConcepts, input.hasProgrammedBefore);

    return {
      detectedLevel,
      levelLabel: LEVEL_LABELS[detectedLevel],
      confidence,
      feedback,
      detectedConcepts,
      source: 'llm',
    };
  }

  private parseLlmJson(raw: string): Record<string, unknown> | null {
    if (!raw || typeof raw !== 'string') return null;
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      const parsed = JSON.parse(cleaned);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  private evaluateWithHeuristic(
    input: EvaluateRegistrationLevelInput,
    challenge: InternalRegistrationChallenge,
    explanation: string,
  ): EvaluateRegistrationLevelResult {
    const normalized = this.normalizeText(explanation);

    if (explanation.length < 15 || UNCERTAINTY_PATTERN.test(normalized)) {
      const sincereFeedback = input.hasProgrammedBefore
        ? 'Obrigado pela sinceridade! Reconhecer o que ainda não está claro é o melhor ponto de partida. Vamos começar pelos fundamentos essenciais para reforçar sua base passo a passo.'
        : 'Obrigado pela sinceridade! Você não precisa saber ler código para começar. Vamos iniciar pelos fundamentos de lógica passo a passo, no seu ritmo.';
      return {
        detectedLevel: 'beginner',
        levelLabel: LEVEL_LABELS.beginner,
        confidence: explanation.length < 15 ? 'medium' : 'high',
        feedback: sincereFeedback,
        detectedConcepts: [],
        source: 'heuristic',
      };
    }

    const coreMatches = this.matchSignals(normalized, challenge.expectedConcepts);
    const challengeIntermediate = this.matchSignals(
      normalized,
      challenge.intermediateSignals,
    );
    const generalIntermediate = this.matchSignals(
      normalized,
      GENERAL_INTERMEDIATE_SIGNALS,
    );
    const challengeAdvanced = this.matchSignals(
      normalized,
      challenge.advancedSignals,
    );
    const generalAdvanced = this.matchSignals(
      normalized,
      GENERAL_ADVANCED_SIGNALS,
    );

    const intermediateMatches = this.dedupeStrings([
      ...challengeIntermediate,
      ...generalIntermediate,
    ]);
    const advancedMatches = this.dedupeStrings([
      ...challengeAdvanced,
      ...generalAdvanced,
    ]);

    const detectedConcepts = this.dedupeStrings([
      ...coreMatches,
      ...intermediateMatches,
      ...advancedMatches,
    ]).slice(0, 8);

    const wordCount = normalized.split(/\s+/).filter(Boolean).length;
    const coreCount = coreMatches.length;
    const midCount = intermediateMatches.length;
    const advCount = advancedMatches.length;

    let detectedLevel: DetectedExperienceLevel = 'beginner';
    let confidence: EvaluationConfidence = 'medium';

    if (
      advCount >= 2 ||
      (advCount >= 1 && midCount >= 2 && coreCount >= 1)
    ) {
      detectedLevel = 'senior';
      confidence = advCount >= 2 && coreCount >= 2 ? 'high' : 'medium';
    } else if (
      midCount >= 2 ||
      (advCount >= 1 && (midCount >= 1 || coreCount >= 2)) ||
      (midCount >= 1 && coreCount >= 2)
    ) {
      detectedLevel = 'mid';
      confidence = midCount >= 2 && coreCount >= 2 ? 'high' : 'medium';
    } else if (
      coreCount >= 2 ||
      (coreCount >= 1 && (midCount >= 1 || wordCount >= 10))
    ) {
      detectedLevel = 'junior';
      confidence = coreCount >= 3 ? 'high' : 'medium';
    } else {
      detectedLevel = 'beginner';
      confidence = coreCount === 0 ? 'medium' : 'low';
    }

    return {
      detectedLevel,
      levelLabel: LEVEL_LABELS[detectedLevel],
      confidence,
      feedback: this.buildHeuristicFeedback(
        detectedLevel,
        detectedConcepts,
        input.hasProgrammedBefore,
      ),
      detectedConcepts,
      source: 'heuristic',
    };
  }

  private matchSignals(normalizedText: string, signals: ConceptSignal[]): string[] {
    const matched: string[] = [];
    for (const signal of signals) {
      if (signal.patterns.some((pattern) => pattern.test(normalizedText))) {
        matched.push(signal.concept);
      }
    }
    return matched;
  }

  private normalizeText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private dedupeStrings(items: string[]): string[] {
    return [...new Set(items)];
  }

  private buildHeuristicFeedback(
    level: DetectedExperienceLevel,
    concepts: string[],
    hasProgrammedBefore: boolean,
  ): string {
    const highlight =
      concepts.length > 0
        ? `Você identificou bem pontos como ${concepts.slice(0, 2).join(' e ').toLowerCase()}. `
        : '';

    switch (level) {
      case 'senior':
        return `${highlight}Sua leitura mostra visão madura sobre trade-offs, invariantes e comportamento do sistema. Seu ponto de partida recomendado é o nível Sênior, com foco em arquitetura, performance e decisões de engenharia.`;
      case 'mid':
        return `${highlight}Você demonstrou atenção a casos de borda, estruturas adequadas e detalhes práticos de execução. Seu ponto de partida recomendado é o nível Pleno, aprofundando arquitetura, escalabilidade e trade-offs.`;
      case 'junior':
        return `${highlight}Você acompanhou com clareza o fluxo principal e o papel das estruturas do trecho. Seu ponto de partida recomendado é o nível Júnior, consolidando casos de borda, estruturas de dados e resolução guiada.`;
      case 'beginner':
      default:
        return hasProgrammedBefore
          ? `${highlight}Boa iniciativa ao descrever a ideia geral do código! Seu ponto de partida recomendado é o nível Iniciante, onde vamos fortalecer a leitura passo a passo e os fundamentos antes de avançar.`
          : `${highlight}Ótima observação inicial! Você já trouxe uma boa intuição sobre o que acontece no exemplo. Seu ponto de partida recomendado é o nível Iniciante, começando pelos fundamentos de lógica de forma leve e prática.`;
    }
  }
}
