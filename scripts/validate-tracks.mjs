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
 * Linguagens executadas na checagem 4: javascript e python (as duas
 * linguagens do catálogo hoje). Atividade em outra linguagem reprova
 * com mensagem explícita — quando uma trilha nova entrar (Sprint 23+),
 * o harness dela entra aqui junto.
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { CATALOG_TRACK_ACTIVITIES } from './track-content.mjs';

const TIMEOUT_MS = 5000;

const spine = JSON.parse(
  readFileSync(new URL('../content/concept-spine.json', import.meta.url), 'utf8'),
);
const spineTags = new Set(spine.modules.map((m) => m.tag));

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
      `linguagem "${activity.language}" sem harness de execução neste validador (suportadas: javascript, python)`,
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
  }
}

// ── Checagens por atividade ─────────────────────────────────────────

function validateActivity(activity) {
  const ref = `${activity.courseSlug}/${activity.slug}`;

  // 1. conceptTags da espinha
  if (!Array.isArray(activity.conceptTags) || activity.conceptTags.length === 0) {
    fail(activity, 'conceptTags vazio — a tutora não consegue remediar sem tags da espinha');
  } else {
    for (const tag of activity.conceptTags) {
      if (!spineTags.has(tag)) {
        fail(activity, `conceptTag "${tag}" não existe na espinha (content/concept-spine.json)`);
      }
    }
  }

  // 2–4. testes e solução de referência
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
