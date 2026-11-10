#!/usr/bin/env node
/**
 * Validador de trilhas — gate de conteúdo (Sprint 20A).
 *
 * Uso:  node scripts/validate-tracks.mjs   (ou `pnpm validate:tracks`)
 * Saída: exit 0 = trilha íntegra; exit 1 = pelo menos uma reprovação.
 *
 * O que ele reprova, por atividade do catálogo de aluno
 * (scripts/track-content.mjs — a mesma fonte que o seed grava):
 *   1. conceptTags vazio, ou tag fora da espinha
 *      (content/concept-spine.json);
 *   2. testCode (testes visíveis) vazio;
 *   3. hiddenTests (testes ocultos) vazio;
 *   4. referenceSolution vazia — ou que NÃO passa nos próprios testes
 *      visíveis + ocultos (a solução é executada de verdade: JavaScript
 *      via `vm`, Python via `python3` lendo o programa do stdin);
 *      Atividades Portugol (Sprint 23): testCode/hiddenTests são um
 *      array JSON de casos { "stdin", "expected" } (programa inteiro,
 *      entrada→saída — o mesmo formato que o runner executa) e este
 *      gate reprova formato inválido ou array vazio; a referenceSolution
 *      é executada caso a caso com o console oficial quando ele está
 *      disponível (PORTUGOL_CONSOLE_HOME ou a instalação padrão do
 *      Portugol Studio); sem console, a checagem é ESTRUTURAL e o fato
 *      é declarado em warning — nunca silencioso;
 *   5. lessonPayload sem exemplo análogo completo
 *      (title/statement/solution/explanation/concept, strings não
 *      vazias — a mesma forma mínima que
 *      apps/api/src/ai/analogous-examples.ts exige para o escape da
 *      tutora funcionar) ou com a solução do exemplo análogo inválida
 *      na linguagem da atividade;
 *   6. lessonPayload.reviewStatus ausente ou fora de
 *      {'draft', 'approved'} (fluxo Q1: agente rascunha, admin aprova).
 *
 * Escopo: SÓ as atividades do catálogo de aluno (track-content.mjs).
 * A Biblioteca (curso `biblioteca`, conteúdo de reforço) usa o
 * vocabulário legado de tags que alimenta o registro por conceito da
 * tutora — está fora deste gate por decisão da Sprint 20A.
 *
 * Linguagens executadas na checagem 4: javascript, python e portugol
 * (portugol com o console oficial, quando disponível — ver item 4).
 * Atividade em outra linguagem reprova com mensagem explícita.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { CATALOG_TRACK_ACTIVITIES } from './track-content.mjs';

const TIMEOUT_MS = 5000;
// JVM + compilação interna do núcleo Portugol: folga por caso.
const PORTUGOL_TIMEOUT_MS = 30000;

const spine = JSON.parse(
  readFileSync(new URL('../content/concept-spine.json', import.meta.url), 'utf8'),
);
const spineTags = new Set(spine.modules.map((m) => m.tag));

// F1 — taxonomia própria de mercado (content/knowledge-topics.json): trilhas
// GERADAS (lessonPayload.generatedTrack === true) podem usar tags da espinha
// OU desta lista; trilhas de catálogo continuam restritas à espinha, e a
// espinha v1 fica intocada. Tag fora dos dois universos reprova sempre.
let knowledgeTopicTags = new Set();
try {
  const topicsDoc = JSON.parse(
    readFileSync(new URL('../content/knowledge-topics.json', import.meta.url), 'utf8'),
  );
  knowledgeTopicTags = new Set((topicsDoc.topics || []).map((t) => t.id));
} catch {
  // Sem knowledge-topics.json, o universo é só a espinha (fail-closed).
}

const failures = [];
const warnings = [];

function fail(activity, message) {
  failures.push(`[${activity.courseSlug}/${activity.slug}] ${message}`);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// ── Execução das soluções de referência ─────────────────────────────

function runJavaScript(program, label) {
  // solution + testes num contexto isolado; erro de assert/teste vira throw.
  const sandbox = { console };
  vm.createContext(sandbox);
  new vm.Script(program, { filename: label }).runInContext(sandbox, {
    timeout: TIMEOUT_MS,
  });
}

function runPython(program) {
  const result = spawnSync('python3', ['-'], {
    input: program,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
  });
  if (result.error) {
    throw new Error(`python3 indisponível/falhou: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = (result.stderr || '').trim().split('\n').pop();
    throw new Error(`o programa Python falhou (${detail})`);
  }
}

function checkPythonSyntax(code) {
  const result = spawnSync(
    'python3',
    ['-c', 'import sys; compile(sys.stdin.read(), "<analogous>", "exec")'],
    { input: code, encoding: 'utf8', timeout: TIMEOUT_MS },
  );
  if (result.error || result.status !== 0) {
    throw new Error('a solução do exemplo análogo não é Python válido');
  }
}

// ── Portugol (Sprint 23): casos entrada→saída ───────────────────────
// Espelha o runner (apps/api/src/submissions/runner/runner.service.ts):
// testCode/hiddenTests são um array JSON de { "stdin", "expected" };
// a comparação remove o sufixo do console oficial e ignora whitespace
// no fim das saídas. Manter os dois lados em sincronia.

const PORTUGOL_SUCCESS_SUFFIX =
  '\nPrograma finalizado\n\nPressione ENTER para continuar\n';
const PORTUGOL_PROMPT_SUFFIX = '\nPressione ENTER para continuar\n';

function stripPortugolSuffix(stdout) {
  if (stdout.endsWith(PORTUGOL_SUCCESS_SUFFIX)) {
    return stdout.slice(0, -PORTUGOL_SUCCESS_SUFFIX.length);
  }
  if (stdout.endsWith(PORTUGOL_PROMPT_SUFFIX)) {
    return stdout.slice(0, -PORTUGOL_PROMPT_SUFFIX.length);
  }
  return stdout;
}

function normalizePortugolOutput(value) {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\s+$/, '');
}

function parsePortugolCases(script, field) {
  if (!isNonEmptyString(script)) {
    throw new Error(
      `${field} vazio — casos Portugol são um array JSON de { "stdin", "expected" }`,
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(script);
  } catch {
    throw new Error(
      `${field} não é JSON válido — casos Portugol são um array JSON de { "stdin", "expected" }`,
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error(
      `${field} deve ser um array JSON de casos { "stdin", "expected" }`,
    );
  }
  parsed.forEach((item, i) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`${field}, caso ${i + 1}: deve ser um objeto { "stdin", "expected" }`);
    }
    if (typeof item.expected !== 'string') {
      throw new Error(`${field}, caso ${i + 1}: "expected" é obrigatório e deve ser string`);
    }
    if (item.stdin !== undefined && typeof item.stdin !== 'string') {
      throw new Error(
        `${field}, caso ${i + 1}: "stdin" deve ser string (um valor por linha para cada leia)`,
      );
    }
  });
  return parsed.map((item) => ({
    stdin: typeof item.stdin === 'string' ? item.stdin : '',
    expected: item.expected,
  }));
}

let portugolConsoleCache;
function portugolConsole() {
  if (portugolConsoleCache !== undefined) return portugolConsoleCache;
  const candidates = [
    process.env.PORTUGOL_CONSOLE_HOME,
    '/usr/local/portugol-studio',
  ].filter(Boolean);
  for (const home of candidates) {
    const jar = join(home, 'aplicacao', 'portugol-console.jar');
    const java = join(home, 'java', 'java-linux', 'bin', 'java');
    const jdkBin = join(home, 'java', 'java-linux', 'bin');
    if (existsSync(jar) && existsSync(java)) {
      portugolConsoleCache = { jar, java, jdkBin };
      return portugolConsoleCache;
    }
  }
  portugolConsoleCache = null;
  return null;
}

function runPortugol(code, stdin) {
  const home = portugolConsole();
  const dir = mkdtempSync(join(tmpdir(), 'validate-tracks-portugol-'));
  try {
    writeFileSync(join(dir, 'programa.por'), code, 'utf8');
    const result = spawnSync(
      home.java,
      [
        '-Dfile.encoding=UTF-8',
        `-Djava.io.tmpdir=${dir}`,
        '-jar',
        home.jar,
        'programa.por',
      ],
      {
        cwd: dir,
        input: stdin,
        encoding: 'utf8',
        timeout: PORTUGOL_TIMEOUT_MS,
        env: { ...process.env, PATH: `${home.jdkBin}:${process.env.PATH ?? ''}` },
      },
    );
    return {
      status: result.status,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      timedOut: Boolean(result.error && result.error.code === 'ETIMEDOUT'),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function executePortugolReference(activity, visibleCases, hiddenCases) {
  if (!portugolConsole()) {
    warnings.push(
      `[${activity.courseSlug}/${activity.slug}] console do Portugol indisponível neste ambiente — casos validados só ESTRUTURALMENTE (formato JSON); a execução da referenceSolution fica para um ambiente com o console (PORTUGOL_CONSOLE_HOME)`,
    );
    return;
  }
  const all = [
    ...visibleCases.map((c) => ({ ...c, hidden: false })),
    ...hiddenCases.map((c) => ({ ...c, hidden: true })),
  ];
  all.forEach((testCase, index) => {
    const label = testCase.hidden
      ? `caso oculto ${index - visibleCases.length + 1}`
      : `caso visível ${index + 1}`;
    const result = runPortugol(activity.referenceSolution, testCase.stdin);
    if (result.timedOut) {
      throw new Error(`${label}: a execução excedeu ${PORTUGOL_TIMEOUT_MS / 1000}s (timeout)`);
    }
    const stderrLines = result.stderr.split('\n');
    const compileLine = stderrLines.find((l) => l.startsWith('ERRO:'));
    if (compileLine) {
      throw new Error(`${label}: erro de compilação da referenceSolution (${compileLine})`);
    }
    if (result.status !== 0) {
      const runtimeLine =
        stderrLines.find((l) => l.startsWith('Erro de execução:')) ??
        'erro de execução sem mensagem do console';
      throw new Error(`${label}: ${runtimeLine}`);
    }
    const actual = normalizePortugolOutput(stripPortugolSuffix(result.stdout));
    const expected = normalizePortugolOutput(testCase.expected);
    if (actual !== expected) {
      // Caso oculto: não vazar esperado/obtido no relatório do gate.
      throw new Error(
        testCase.hidden
          ? `${label}: saída divergente do esperado`
          : `${label}: saída divergente — esperado "${expected}", obtido "${actual}"`,
      );
    }
  });
}

function checkPortugolSyntax(code) {
  // Sem console no ambiente, a checagem do exemplo análogo é só
  // estrutural (declarado no cabeçalho) — não reprova por ausência
  // da ferramenta.
  if (!portugolConsole()) return;
  const result = runPortugol(code, '');
  const compileLine = result.stderr
    .split('\n')
    .find((l) => l.startsWith('ERRO:'));
  if (compileLine) {
    throw new Error(`erro de compilação no exemplo análogo (${compileLine})`);
  }
  // Erro de EXECUÇÃO (ex.: leia com stdin vazio) não reprova aqui: a
  // checagem é de sintaxe/compilação, como nas outras linguagens.
}

function executeReferenceSolution(activity) {
  const program = [
    activity.referenceSolution,
    activity.testCode,
    activity.hiddenTests,
  ].join('\n');
  if (activity.language === 'javascript') {
    runJavaScript(program, `${activity.slug}.js`);
  } else if (activity.language === 'python') {
    runPython(program);
  } else {
    throw new Error(
      `linguagem "${activity.language}" sem harness de execução neste validador (suportadas: javascript, python; portugol tem harness próprio)`,
    );
  }
}

function checkAnalogousSolutionSyntax(activity, solution) {
  if (activity.language === 'javascript') {
    // Apenas compila/executa a definição — o exemplo análogo não tem
    // testes próprios; o que importa é ser código válido da linguagem.
    runJavaScript(solution, `${activity.slug}.analogous.js`);
  } else if (activity.language === 'python') {
    checkPythonSyntax(solution);
  } else if (activity.language === 'portugol') {
    checkPortugolSyntax(solution);
  }
}

// ── Checagens por atividade ─────────────────────────────────────────

function validateActivity(activity) {
  const ref = `${activity.courseSlug}/${activity.slug}`;

  // 1. conceptTags da espinha (ou da taxonomia de mercado, só em trilha gerada)
  if (!Array.isArray(activity.conceptTags) || activity.conceptTags.length === 0) {
    fail(activity, 'conceptTags vazio — a tutora não consegue remediar sem tags da espinha');
  } else {
    const generated = activity.lessonPayload?.generatedTrack === true;
    for (const tag of activity.conceptTags) {
      if (!spineTags.has(tag) && !(generated && knowledgeTopicTags.has(tag))) {
        fail(activity, `conceptTag "${tag}" não existe na espinha (content/concept-spine.json)${generated ? ' nem em knowledge-topics.json' : ' (tags de mercado só valem em trilhas geradas)'}`);
      }
    }
  }

  // 2–4. testes e solução de referência
  if (activity.language === 'portugol') {
    // Formato entrada→saída (Sprint 23): array JSON de casos.
    let visibleCases = null;
    let hiddenCases = null;
    try {
      visibleCases = parsePortugolCases(activity.testCode, 'testCode');
    } catch (error) {
      fail(activity, error.message);
    }
    try {
      hiddenCases = parsePortugolCases(activity.hiddenTests, 'hiddenTests');
    } catch (error) {
      fail(activity, error.message);
    }
    if (visibleCases && visibleCases.length === 0) {
      fail(activity, 'testCode sem nenhum caso Portugol (array JSON vazio)');
    }
    if (hiddenCases && hiddenCases.length === 0) {
      fail(activity, 'hiddenTests sem nenhum caso Portugol (array JSON vazio)');
    }
    if (!isNonEmptyString(activity.referenceSolution)) {
      fail(activity, 'referenceSolution vazia');
    } else if (visibleCases?.length && hiddenCases?.length) {
      try {
        executePortugolReference(activity, visibleCases, hiddenCases);
      } catch (error) {
        fail(activity, `referenceSolution NÃO passa nos próprios testes: ${error.message}`);
      }
    }
  } else {
    if (!isNonEmptyString(activity.testCode)) {
      fail(activity, 'testCode (testes visíveis) vazio');
    }
    if (!isNonEmptyString(activity.hiddenTests)) {
      fail(activity, 'hiddenTests (testes ocultos) vazio');
    }
    if (!isNonEmptyString(activity.referenceSolution)) {
      fail(activity, 'referenceSolution vazia');
    } else if (isNonEmptyString(activity.testCode) && isNonEmptyString(activity.hiddenTests)) {
      try {
        executeReferenceSolution(activity);
      } catch (error) {
        fail(activity, `referenceSolution NÃO passa nos próprios testes: ${error.message}`);
      }
    }
  }

  // 5–6. lessonPayload: exemplo análogo completo + status de revisão
  const payload = activity.lessonPayload;
  if (!payload || typeof payload !== 'object') {
    fail(activity, 'lessonPayload ausente — sem exemplo análogo, o escape da tutora cai no genérico');
    return;
  }
  if (!['draft', 'approved'].includes(payload.reviewStatus)) {
    fail(
      activity,
      `lessonPayload.reviewStatus deve ser 'draft' ou 'approved' (fluxo Q1), atual: ${JSON.stringify(payload.reviewStatus)}`,
    );
  }
  if (payload.reviewStatus === 'draft') {
    warnings.push(`[${ref}] exemplo análogo é RASCUNHO (Q1) — aguarda revisão/aprovação do admin`);
  }
  const example = payload.analogousExample;
  if (!example || typeof example !== 'object') {
    fail(activity, 'lessonPayload.analogousExample ausente');
    return;
  }
  for (const field of ['title', 'statement', 'solution', 'explanation', 'concept']) {
    if (!isNonEmptyString(example[field])) {
      fail(activity, `analogousExample.${field} vazio ou ausente`);
    }
  }
  if (isNonEmptyString(example.solution)) {
    try {
      checkAnalogousSolutionSyntax(activity, example.solution);
    } catch (error) {
      fail(activity, `solução do exemplo análogo inválida: ${error.message}`);
    }
  }

  // Higiene: o exemplo análogo não pode ser a própria solução de
  // referência (seria spoiler disfarçado, não analogia).
  if (
    isNonEmptyString(example.solution) &&
    isNonEmptyString(activity.referenceSolution) &&
    example.solution.trim() === activity.referenceSolution.trim()
  ) {
    fail(activity, 'analogousExample.solution é idêntica à referenceSolution — isso é spoiler, não analogia');
  }
}

// ── Sanidade da própria espinha ─────────────────────────────────────

function validateSpine() {
  if (spine.version !== 1 || !Array.isArray(spine.modules)) {
    failures.push('[espinha] content/concept-spine.json sem version 1 ou sem modules[]');
    return;
  }
  if (spine.modules.length !== 10) {
    failures.push(`[espinha] esperados 10 módulos canônicos, encontrados ${spine.modules.length}`);
  }
  const seen = new Set();
  spine.modules.forEach((mod, index) => {
    if (mod.order !== index + 1) {
      failures.push(`[espinha] módulo "${mod.tag}" com order ${mod.order}, esperado ${index + 1}`);
    }
    if (seen.has(mod.tag)) {
      failures.push(`[espinha] tag duplicada: "${mod.tag}"`);
    }
    seen.add(mod.tag);
    if (!isNonEmptyString(mod.title) || !isNonEmptyString(mod.description)) {
      failures.push(`[espinha] módulo "${mod.tag}" sem title/description`);
    }
  });
}

// ── Rodada ──────────────────────────────────────────────────────────

validateSpine();
for (const activity of CATALOG_TRACK_ACTIVITIES) {
  validateActivity(activity);
}

console.log(
  `[validate-tracks] ${CATALOG_TRACK_ACTIVITIES.length} atividades do catálogo · espinha v${spine.version} com ${spine.modules.length} módulos`,
);
for (const warning of warnings) {
  console.log(`[validate-tracks] AVISO: ${warning}`);
}
if (failures.length > 0) {
  console.error(`[validate-tracks] REPROVADO — ${failures.length} problema(s):`);
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}
console.log('[validate-tracks] APROVADO — toda atividade tem tags da espinha, testes, solução de referência que passa neles e exemplo análogo completo.');
