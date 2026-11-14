#!/usr/bin/env node
/**
 * Calibração do matching (DESIGN §13.2, G8) — relatório de precisão do
 * casamento sobre pares ROTULADOS (fixtures), já que ainda não há merges
 * reais: a precisão após merges reais será medida sobre os desfechos
 * registrados (decisão do admin vs proposta do merge), não estimada aqui.
 *
 * Uso: node scripts/kms-calibration.mjs [--out <json>]
 * Saída: precisão/recall por desfecho + acurácia global; exit 1 se a
 * acurácia < 1.0 — recalibrar limiares exige atualizar estas fixtures
 * junto (o número versionado vive em kms-lib.mjs, não aqui).
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KMS_MATCH_THRESHOLDS, KMS_MATCH_VERSION, decideMatch, scoreEntry } from './kms-lib.mjs';

function entry(slug, title, topicIds, courseSlug) {
  return { slug, title, topicIds, courseSlugForScoring: courseSlug };
}

/** Casos rotulados: source + entradas candidatas + desfecho esperado. */
export const CALIBRATION_CASES = [
  {
    name: 'enriquecer inequívoco (tópico primário + título + curso)',
    source: { primaryTopic: 'funcoes', topics: ['funcoes', 'listas'], title: 'Funções em Python', courseSlug: 'trilha-python' },
    entries: [
      entry('funcoes', 'Funções em Python', ['funcoes'], 'trilha-python'),
      entry('listas', 'Listas em Python', ['listas'], 'trilha-python'),
    ],
    expected: 'enrich',
  },
  {
    name: 'tema novo (nenhum candidato ≥ 40)',
    source: { primaryTopic: 'decorators', topics: ['decorators'], title: 'Decorators avançados', courseSlug: 'trilha-python' },
    entries: [entry('funcoes', 'Funções em Python', ['funcoes'], 'trilha-python')],
    expected: 'new',
  },
  {
    name: 'fila por margem < 20 (dois candidatos ≥ 70 próximos)',
    source: { primaryTopic: 'funcoes', topics: ['funcoes'], title: 'Funções', courseSlug: 'trilha-python' },
    entries: [
      entry('funcoes', 'Funções', ['funcoes'], 'trilha-python'),
      entry('funcoes-avancado', 'Funções', ['funcoes'], 'trilha-python'),
    ],
    expected: 'review',
  },
  {
    name: 'fila por score intermediário (40–69)',
    source: { primaryTopic: 'funcoes', topics: ['funcoes'], title: 'Introdução a funções e escopo', courseSlug: 'outro-curso' },
    entries: [entry('funcoes', 'Funções em Python', ['funcoes'], 'trilha-python')],
    expected: 'review',
  },
  {
    name: 'enriquecer sem bônus de curso (pesquisa: sem courseSlug)',
    source: { primaryTopic: 'pandas', topics: ['pandas'], title: 'Pandas' },
    entries: [entry('pandas', 'Pandas', ['pandas'], 'trilha-python')],
    expected: 'enrich',
  },
  {
    name: 'tema novo sem entradas',
    source: { primaryTopic: 'asyncio', topics: ['asyncio'], title: 'Asyncio', courseSlug: 'trilha-python' },
    entries: [],
    expected: 'new',
  },
];

export function runCalibration(cases = CALIBRATION_CASES) {
  const perOutcome = {};
  let correct = 0;
  const details = cases.map((c) => {
    const candidates = c.entries.map((e) => {
      const s = scoreEntry(c.source, e);
      return { entrySlug: e.slug, score: s.score, matchReasons: s.matchReasons };
    });
    const { outcome } = decideMatch(candidates);
    const ok = outcome === c.expected;
    if (ok) correct++;
    if (!perOutcome[c.expected]) perOutcome[c.expected] = { expected: 0, correct: 0, predicted: 0 };
    perOutcome[c.expected].expected++;
    if (ok) perOutcome[c.expected].correct++;
    if (!perOutcome[outcome]) perOutcome[outcome] = { expected: 0, correct: 0, predicted: 0 };
    perOutcome[outcome].predicted++;
    return { name: c.name, expected: c.expected, predicted: outcome, ok, candidates };
  });
  const report = {
    matchVersion: KMS_MATCH_VERSION, thresholds: { ...KMS_MATCH_THRESHOLDS },
    cases: cases.length, correct, accuracy: cases.length ? correct / cases.length : 0,
    perOutcome: Object.fromEntries(Object.entries(perOutcome).map(([k, v]) => [k, {
      ...v,
      precision: v.predicted ? v.correct / v.predicted : null,
      recall: v.expected ? v.correct / v.expected : null,
    }])),
    note: 'Precisão sobre fixtures rotulados. Precisão após merges reais: medir decisão do admin vs proposta do merge quando houver merges reais (Q10).',
    details,
  };
  return report;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(new URL(import.meta.url)));
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log([
      'Uso: node scripts/kms-calibration.mjs [--out <json>]',
      'Relatório de precisão do matching KMS (limiares 70/40, versão 1) sobre fixtures rotulados.',
    ].join('\n'));
    process.exit(0);
  }
  const outIdx = args.indexOf('--out');
  const report = runCalibration();
  console.log(`kms-calibration: versão=${report.matchVersion} limiares=${report.thresholds.enrichMin}/${report.thresholds.newMax} casos=${report.cases} acertos=${report.correct} acurácia=${report.accuracy}`);
  for (const [k, v] of Object.entries(report.perOutcome)) {
    console.log(`  ${k}: precisão=${v.precision ?? 'n/a'} recall=${v.recall ?? 'n/a'} (esperados=${v.expected}, preditos=${v.predicted})`);
  }
  for (const d of report.details.filter((x) => !x.ok)) console.log(`  ERRO: ${d.name}: esperado ${d.expected}, obteve ${d.predicted}`);
  if (outIdx >= 0) writeFileSync(resolve(args[outIdx + 1]), `${JSON.stringify(report, null, 2)}\n`);
  if (report.accuracy < 1) { console.error('kms-calibration: REPROVADO — limiares e fixtures divergem; recalibre os dois juntos'); process.exit(1); }
}
