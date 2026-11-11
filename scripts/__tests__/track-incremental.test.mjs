/**
 * Testes Node (node:test) da trilha incremental (DESIGN §4.5, Fase H) e das
 * correções do laudo QA2 (D1/D2/D4/D6) — sem banco, sem LLM, sem rede.
 * Uso: node --test scripts/__tests__/track-incremental.test.mjs
 *
 * O teste Java de referência (§I8) roda 100% offline: generatedAt pinada
 * em 2026-10-24, resolvedor stubado (java 25 confirmed), fixtures locais.
 * Critérios: subsequência ordenada das 8 etapas, 7 tópicos do básico, piso
 * de 21 exercícios, 3 casos de borda de vagas (730 dentro, 731 fora, sem
 * data excluída) + regressão introducao-python (validate-tracks).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateKnowledge, realTestExpressions, assertGeneratedActivitySeedable } from '../validate-knowledge.mjs';
import { kmsPaths, loadEntries } from '../kms-lib.mjs';
import { approveVersion, applyReview, syncResearchFromDb } from '../kms-apply.mjs';
import { writeReviewItem } from '../kms-merge.mjs';
import { changelogPayloadsEqual } from '../import-knowledge.mjs';
import {
  buildTrackSkeleton, deriveTrackProgress, exerciseFloor, filterJobSamples,
  generateIncrementalSegment, planFreshResearch, slugify, summarizeResearchJobs,
  writeSegmentFiles,
} from '../track-incremental.mjs';
import { loadBudget, recordUsage, reserveCall } from '../pipeline-budget.mjs';

const REPO_ROOT = new URL('../..', import.meta.url).pathname;
const GEN_AT = '2026-10-24T00:00:00.000Z';

// ---------- fixtures §I8 ----------

const BASIC_TOPICS = ['sintaxe', 'lacos', 'condicionais', 'arrays', 'poo', 'collections', 'lambda'];
const REFERENCE_STAGES = ['java-basico', 'spring-boot', 'banco-de-dados', 'docker', 'arquitetura', 'git', 'clean-code', 'padroes-de-projetos'];
const STAGES_WITH_EXTRAS = [
  { stageSlug: 'java-basico', title: 'Java básico', topics: BASIC_TOPICS, language: 'java' },
  { stageSlug: 'ferramentas-de-build', title: 'Ferramentas de build', topics: ['maven'] },
  { stageSlug: 'spring-boot', title: 'Spring Boot', topics: ['spring-boot'] },
  { stageSlug: 'testes-automatizados', title: 'Testes automatizados', topics: ['testes'] },
  { stageSlug: 'banco-de-dados', title: 'Banco de dados', topics: ['sql'] },
  { stageSlug: 'docker', title: 'Docker', topics: ['docker'] },
  { stageSlug: 'arquitetura', title: 'Arquitetura', topics: ['arquitetura'] },
  { stageSlug: 'git', title: 'Git', topics: ['git'] },
  { stageSlug: 'clean-code', title: 'Clean code', topics: ['clean-code'] },
  { stageSlug: 'padroes-de-projetos', title: 'Padrões de projetos', topics: ['padroes'] },
];

function kmsEntry(topic) {
  return {
    version: 1, slug: topic, title: topic, topicIds: [topic], status: 'active', currentVersion: 1,
    supersededByEntry: null, supersededAt: null, supersedeReason: null,
    versions: [{ version: 1, status: 'active', summary: `Resumo ${topic}.`, keyExamples: [], contributions: [{ kind: 'drive', driveFileId: `f-${topic}`, lessonId: 'x', contributedAt: GEN_AT, changeKind: 'created' }], marketContext: [], createdAt: GEN_AT, supersededBy: null, supersededAt: null, supersedeReason: null }],
  };
}

function lessonFor(topic) {
  return {
    id: `java/${topic}`, driveFileId: `f-${topic}`, courseSlug: 'java', courseName: 'Java',
    lessonTitle: topic, summary: `Resumo próprio ${topic}.`, topics: [topic], prerequisites: [],
    keyExamples: [], difficulty: 'beginner',
    source: { type: 'drive-course', courseName: 'Java', lessonTitle: topic, driveFileId: `f-${topic}`, drivePath: 'x' },
    extractedAt: GEN_AT, extractorVersion: 'knowledge-extractor@1', reviewStatus: 'approved',
  };
}

function jobSample(postedAt, url) {
  return { sourceUrl: url, postedAt, collectedAt: GEN_AT };
}

function researchFixture() {
  return {
    id: 'research-desenvolvedor-java-seg1', goal: 'desenvolvedor Java', status: 'approved',
    approvedBy: 'admin-1', approvedAt: GEN_AT,
    sourcesAvailable: ['github', 'jobs'], sourcesUnavailable: ['youtube'],
    market: {
      sampleSize: 5,
      skills: [
        {
          skill: 'java', collectedAt: GEN_AT,
          samples: [
            jobSample('2025-06-01', 'https://vagas.example/java-1'),
            jobSample('2024-10-24', 'https://vagas.example/java-730'), // exatamente 730 dias: DENTRO
            jobSample('2024-10-23', 'https://vagas.example/java-731'), // 731 dias: FORA
            jobSample(null, 'https://vagas.example/java-sem-data'), // sem data: EXCLUÍDA
          ],
        },
        { skill: 'spring-boot', collectedAt: GEN_AT, samples: [jobSample('2026-01-15', 'https://vagas.example/spring-1'), jobSample('2026-03-01', 'https://vagas.example/spring-2')] },
        // Só stale + undated ⇒ removida (stale-skill-removed), nunca GapEntry.
        { skill: 'cobol', collectedAt: GEN_AT, samples: [jobSample('2020-01-01', 'https://vagas.example/cobol-velha'), jobSample(null, 'https://vagas.example/cobol-sem-data')] },
      ],
    },
    videos: [], channels: [], repos: [], collectedAt: GEN_AT,
  };
}

function javaSegment() {
  const skeleton = buildTrackSkeleton('desenvolvedor Java', STAGES_WITH_EXTRAS);
  const stage = skeleton.stages[0];
  return {
    skeleton, stage,
    ...generateIncrementalSegment({
      goal: 'desenvolvedor Java', goalSlug: skeleton.goalSlug, stage,
      topics: BASIC_TOPICS,
      kmsEntries: [...BASIC_TOPICS, 'spring-boot', 'sql', 'docker', 'arquitetura', 'git', 'clean-code', 'padroes'].map(kmsEntry),
      lessons: BASIC_TOPICS.map(lessonFor),
      research: researchFixture(),
      techVersions: {
        java: { version: '25', status: 'confirmed', resolvedAt: GEN_AT, source: 'stub-endoflife/java' },
        'spring-boot': { version: '3.5', status: 'confirmed', resolvedAt: GEN_AT, source: 'stub-endoflife/spring-boot' },
      },
      generatedAt: GEN_AT,
      web: { status: 'available', roadmapTopics: BASIC_TOPICS, researchId: 'research-desenvolvedor-java-seg1', collectedAt: GEN_AT },
    }),
  };
}

// ---------- §I8: teste Java de referência ----------

test('Java (§I8): esqueleto contém as 8 etapas de referência em ordem (extras permitidos)', () => {
  const { skeleton } = javaSegment();
  const slugs = skeleton.stages.map((s) => s.stageSlug);
  let cursor = -1;
  for (const ref of REFERENCE_STAGES) {
    const idx = slugs.indexOf(ref, cursor + 1);
    assert.ok(idx > cursor, `etapa de referência ausente ou fora de ordem: ${ref} (sequência: ${slugs.join(' → ')})`);
    cursor = idx;
  }
  assert.ok(slugs.includes('ferramentas-de-build') && slugs.includes('testes-automatizados'), 'extras entre as de referência são aceitos, não exigidos');
});

test('Java (§I8): básico cobre os 7 tópicos, piso de 21 exercícios e ≥ 50%', () => {
  const { segment, report } = javaSegment();
  assert.equal(segment.status, 'draft'); // nasce draft, nunca active sem admin
  const covered = new Set(segment.activities.flatMap((a) => a.conceptTags));
  for (const t of BASIC_TOPICS) assert.ok(covered.has(t), `tópico do básico ausente: ${t}`);
  const floor = exerciseFloor(segment.activities);
  assert.equal(floor.exercises, 21);
  assert.equal(floor.perTopicMin, 3);
  assert.ok(floor.ratio >= 0.5, `razão ${floor.ratio}`);
  assert.ok(floor.ok);
  assert.deepEqual(report.exerciseFloor.exercises, 21);
});

test('Java (§I8): rastreabilidade — kmsEntries só active, marketSkills só com amostra válida, techVersions java 25', () => {
  const { segment } = javaSegment();
  for (const a of segment.activities) {
    for (const k of a.lessonPayload.kmsEntries) assert.equal(k.version, 1);
    for (const ms of a.lessonPayload.marketSkills) assert.ok(ms.sampleSize > 0, `marketSkill sem amostra válida: ${ms.skill}`);
    assert.equal(a.lessonPayload.techVersions.java.version, '25');
    assert.equal(a.lessonPayload.techVersions.java.status, 'confirmed');
    assert.equal(a.lessonPayload.segment.trackSlug, 'desenvolvedor-java');
    assert.equal(a.lessonPayload.segment.stageSlug, 'java-basico');
    assert.ok(['theory', 'exercise'].includes(a.lessonPayload.activityKind));
  }
});

test('Java (§I8): filtro de vagas — 730 dentro, 731 fora, sem data excluída; cobol removido, não gap', () => {
  const { report } = javaSegment();
  const java = report.sources.jobs.skills.find((s) => s.skill === 'java');
  assert.equal(java.sampleSize, 2); // 2025-06-01 + 2024-10-24 (730 dias)
  assert.equal(report.sources.jobs.samplesSeen, 8);
  assert.equal(report.sources.jobs.staleDiscarded, 2); // java-731 + cobol-velha
  assert.equal(report.sources.jobs.undatedExcluded, 2); // java-sem-data + cobol-sem-data
  assert.equal(report.marketAligned, true);
  const cobol = report.staleSkillsRemoved.find((s) => s.skill === 'cobol');
  assert.ok(cobol, 'skill zerada vai para staleSkillsRemoved');
  assert.ok(!report.gaps.some((g) => g.skill === 'cobol'), 'skill sem demanda atual NÃO vira GapEntry');
  const filtered = filterJobSamples(researchFixture().market.skills[0].samples, GEN_AT);
  assert.equal(filtered.valid.length, 2);
  assert.equal(filtered.stale, 1);
  assert.equal(filtered.undated, 1);
});

test('Java (§I8): web indisponível sem roadmap ⇒ erro explícito (segmento fica planned)', () => {
  const { stage } = javaSegment();
  assert.throws(() => generateIncrementalSegment({
    goal: 'desenvolvedor Java', goalSlug: 'desenvolvedor-java', stage, topics: BASIC_TOPICS,
    kmsEntries: [], lessons: [], research: researchFixture(), generatedAt: GEN_AT, web: { status: 'unavailable' },
  }), /web indisponível sem roadmap/);
});

test('regressão: validate-tracks aprova introducao-python sem mudança', () => {
  const out = execFileSync('node', ['scripts/validate-tracks.mjs'], { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.match(out, /APROVADO/);
});

// ---------- D1: composição supersede → approve → validador ----------

function kmsTree({ entries = [], lessons = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'r3-test-'));
  const content = join(root, 'content');
  mkdirSync(join(content, 'knowledge', 'lessons', 'trilha-python'), { recursive: true });
  mkdirSync(join(content, 'knowledge', 'research'), { recursive: true });
  mkdirSync(join(content, 'knowledge', 'entries'), { recursive: true });
  mkdirSync(join(content, 'knowledge', 'review-queue'), { recursive: true });
  writeFileSync(join(content, 'concept-spine.json'), JSON.stringify({ modules: [{ tag: 'funcoes' }] }));
  writeFileSync(join(content, 'knowledge-topics.json'), JSON.stringify({ topics: [] }));
  writeFileSync(join(content, 'knowledge', 'course-map.json'), JSON.stringify({ mappings: [{ courseSlug: 'trilha-python', courseName: 'Trilha Python', driveFolderNames: ['Trilha Python'] }] }));
  writeFileSync(join(content, 'knowledge', 'topics.json'), JSON.stringify({ version: 1, topics: {} }));
  for (const l of lessons) writeFileSync(join(content, 'knowledge', 'lessons', 'trilha-python', `${l.file || 'aula'}.json`), JSON.stringify(l));
  for (const e of entries) writeFileSync(join(content, 'knowledge', 'entries', `${e.slug}.json`), JSON.stringify(e));
  writeFileSync(join(content, 'knowledge', 'extraction-registry.json'), JSON.stringify({ version: 1, scope: 'python', records: [] }));
  return content;
}

const entryV1 = () => ({
  version: 1, slug: 'funcoes', title: 'Funções em Python', topicIds: ['funcoes'], status: 'active', currentVersion: 1,
  supersededByEntry: null, supersededAt: null, supersedeReason: null,
  versions: [{ version: 1, status: 'active', summary: 'Base.', keyExamples: [], contributions: [{ kind: 'drive', driveFileId: 'f1', lessonId: 'x', contributedAt: GEN_AT, changeKind: 'created' }], marketContext: [], createdAt: GEN_AT, supersededBy: null, supersededAt: null, supersedeReason: null }],
});

const lessonFuncoes = () => ({
  id: 'trilha-python/aula-funcoes', driveFileId: 'file-funcoes', courseSlug: 'trilha-python',
  courseName: 'Trilha Python', lessonTitle: 'Funções em Python', summary: 'Resumo próprio novo sobre funções.',
  topics: ['funcoes'], prerequisites: [], keyExamples: ['Exemplo análogo.'], difficulty: 'beginner',
  source: { type: 'drive-course', courseName: 'Trilha Python', lessonTitle: 'Funções em Python', driveFileId: 'file-funcoes', drivePath: 'x' },
  extractedAt: GEN_AT, extractorVersion: 'knowledge-extractor@1', reviewStatus: 'approved', file: 'aula-funcoes',
});

test('D1 (composição): decisão supersede → draft com supersedeReason → approve → validador APROVADO', () => {
  const content = kmsTree({ entries: [entryV1()], lessons: [lessonFuncoes()] });
  const paths = kmsPaths(content);
  const item = writeReviewItem(paths, {
    kind: 'supersede-candidate',
    sourceRef: { kind: 'drive', driveFileId: 'file-funcoes', lessonId: 'trilha-python/aula-funcoes' },
    candidates: [{ entrySlug: 'funcoes', score: 95, matchReasons: ['topico-primario'] }], confidence: 95,
  });
  // A decisão supersede produz o draft com supersedeReason — a forma exata
  // que o teste da rodada 2 NÃO cobria (draft com supersedeReason: null).
  const applied = applyReview(paths, item.id, { action: 'supersede', targetEntrySlug: 'funcoes', reason: 'conteúdo novo supera o anterior', supersedeReason: 'outdated', actor: 'admin:admin-1' });
  assert.equal(applied.materialized.version, 2);
  const draft = JSON.parse(readFileSync(join(content, 'knowledge', 'entries', 'funcoes.json'), 'utf8'));
  assert.equal(draft.versions[1].status, 'draft');
  assert.equal(draft.versions[1].supersedeReason, 'outdated');
  // Approve: a versão ativada zera os 3 campos; a superada herda o motivo.
  approveVersion(paths, 'funcoes', 2, 'admin:admin-1');
  const entry = JSON.parse(readFileSync(join(content, 'knowledge', 'entries', 'funcoes.json'), 'utf8'));
  assert.equal(entry.currentVersion, 2);
  assert.equal(entry.versions[1].status, 'active');
  assert.equal(entry.versions[1].supersededBy, null);
  assert.equal(entry.versions[1].supersededAt, null);
  assert.equal(entry.versions[1].supersedeReason, null);
  assert.equal(entry.versions[0].status, 'superseded');
  assert.equal(entry.versions[0].supersedeReason, 'outdated');
  assert.deepEqual(validateKnowledge(content).failures, []);
});

// ---------- D2 / D4 / D6 ----------

test('D2: upsert de changelog compara payload (mesmo seq, payload diferente ⇒ divergência)', () => {
  const file = { entrySlug: 'funcoes', changeType: 'enriched', version: 2, source: { type: 'admin-decision', decisionId: 'approve:funcoes:2' }, actor: 'kms-apply', occurredAt: new Date('2026-10-24T01:00:00.000Z'), detail: 'Versão 2 aprovada e ativada.' };
  const dbSame = { ...file, occurredAt: '2026-10-24T01:00:00.000Z' };
  assert.equal(changelogPayloadsEqual(dbSame, file), true); // Date vs ISO não é divergência
  const dbAdmin = { ...file, actor: 'admin:uuid-1', detail: 'Versão 2 aprovada (decisão; …)' };
  assert.equal(changelogPayloadsEqual(dbAdmin, file), false); // colisão de seq reproduzida pelo QA2
});

test('D4: realTestExpressions com hiddenTests não-string dá erro claro; gate lista a falha, não aborta', () => {
  assert.throws(() => realTestExpressions('assert x', []), /hiddenTests deve ser string \(recebido array\)/);
  const problems = assertGeneratedActivitySeedable({ testCode: 'assert x', hiddenTests: [], referenceSolution: 'def f(): pass' });
  assert.ok(problems.some((p) => p.includes('hiddenTests deve ser string')), problems.join('\n'));
});

test('D6: --help em todos os CLIs do sistema de conhecimento sai 0 com uso', () => {
  // Complemento rodada 3 (conclusão): os CLIs pré-existentes do repo também
  // respeitam --help — antes, validate-tracks validava, seed-data semeava e
  // seed-gitea tocava o Gitea mesmo com --help (defaults executados).
  for (const cli of ['kms-apply', 'kms-merge', 'kms-backfill', 'validate-knowledge', 'knowledge-generate-track', 'knowledge-extract', 'drive-rescan', 'import-knowledge', 'kms-calibration', 'track-generate-segment', 'seed-track-instance', 'pipeline-budget', 'validate-tracks', 'seed-data', 'seed-gitea']) {
    const out = execFileSync('node', [`scripts/${cli}.mjs`, '--help'], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.match(out, /Uso:/, cli);
  }
});

// ---------- Orçamento do pipeline (R4) ----------

test('R4: teto diário pausa sem furar cota; ledger sem userId; lote default 10', async () => {
  const { PIPELINE_BATCH_SIZE_DEFAULT } = await import('../pipeline-budget.mjs');
  assert.equal(PIPELINE_BATCH_SIZE_DEFAULT, 10);
  const dir = mkdtempSync(join(tmpdir(), 'pipeline-budget-'));
  const env = { PIPELINE_LLM_DAILY_CAP: '2' };
  const s0 = loadBudget(dir, env);
  assert.equal(s0.cap, 2);
  assert.equal(s0.used, 0);
  reserveCall(dir, env);
  reserveCall(dir, env);
  assert.throws(() => reserveCall(dir, env), /orçamento do pipeline esgotado/);
  recordUsage(dir, { purpose: 'knowledge-generation', model: 'stub', segmentRef: 'java-basico' });
  const lines = readFileSync(join(dir, 'pipeline-usage.jsonl'), 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);
  assert.equal(JSON.parse(lines[0]).purpose, 'knowledge-generation');
  assert.ok(!('userId' in JSON.parse(lines[0])));
});

test('R4 (complemento): knowledge-extract com teto esgotado PAUSA (exit 0) antes de Q1; sem teto, segue fail-closed Q1 (exit 2)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'extract-budget-'));
  const paused = execFileSync('node', ['scripts/knowledge-extract.mjs'], {
    cwd: REPO_ROOT, encoding: 'utf8',
    env: { ...process.env, PIPELINE_BUDGET_DIR: dir, PIPELINE_LLM_DAILY_CAP: '0' },
  });
  assert.match(paused, /PAUSADO — orçamento do pipeline esgotado/);
  const q1 = spawnSync('node', ['scripts/knowledge-extract.mjs'], {
    cwd: REPO_ROOT, encoding: 'utf8',
    env: { ...process.env, PIPELINE_BUDGET_DIR: dir, GOOGLE_DRIVE_CREDENTIALS: '' },
  });
  assert.equal(q1.status, 2);
  assert.match(q1.stderr, /BLOQUEADOR Q1/);
});

// ---------- Gates 10–11 no validador ----------

test('gates 10–11: segmento draft com piso violado e active com PENDENTE reprovam; Java válido passa', () => {
  const { segment, report } = javaSegment();
  const content = kmsTree({});
  mkdirSync(join(content, 'knowledge', 'tracks', 'desenvolvedor-java', 'segments'), { recursive: true });
  const { segPath, repPath } = writeSegmentFiles(join(content, 'knowledge', 'tracks'), segment, report);
  void segPath; void repPath;
  // O validador precisa do universo de tópicos do básico.
  writeFileSync(join(content, 'knowledge-topics.json'), JSON.stringify({ topics: BASIC_TOPICS.map((id) => ({ id, prerequisites: [] })) }));
  assert.deepEqual(validateKnowledge(content).failures, []);
  // Piso violado: 40% de exercícios.
  const bad = JSON.parse(JSON.stringify(segment));
  bad.activities = bad.activities.filter((a) => a.lessonPayload.activityKind === 'exercise').slice(0, 8);
  writeFileSync(join(content, 'knowledge', 'tracks', 'desenvolvedor-java', 'segments', '1-java-basico.json'), JSON.stringify(bad));
  const fails = validateKnowledge(content).failures;
  assert.ok(fails.some((f) => f.includes('gate 11')), fails.join('\n'));
  // Ativação com PENDENTE: active + exercise sem teste autorado reprova.
  const activeBad = JSON.parse(JSON.stringify(segment));
  activeBad.status = 'active';
  writeFileSync(join(content, 'knowledge', 'tracks', 'desenvolvedor-java', 'segments', '1-java-basico.json'), JSON.stringify(activeBad));
  const fails2 = validateKnowledge(content).failures;
  assert.ok(fails2.some((f) => f.includes('NÃO ATIVÁVEL')), fails2.join('\n'));
});

test('gate 10: research com sampleSize divergente das amostras válidas reprova', () => {
  const content = kmsTree({});
  const doc = researchFixture();
  doc.market.skills[0] = { ...doc.market.skills[0], sampleSize: 99 };
  writeFileSync(join(content, 'knowledge', 'research', `${doc.id}.json`), JSON.stringify(doc));
  const fails = validateKnowledge(content).failures;
  assert.ok(fails.some((f) => f.includes('gate 10')), fails.join('\n'));
});

// ---------- Progresso derivado + frescor ----------

test('progresso derivado (§I1.3): completed só com passed em todas; próximo a gerar é o planned após active', () => {
  const stages = [
    { order: 1, stageSlug: 'java-basico', title: 'Java básico', status: 'active' },
    { order: 2, stageSlug: 'spring-boot', title: 'Spring Boot', status: 'planned' },
  ];
  const activities = [
    { slug: 'java-basico-sintaxe-ex1', lessonPayload: { segment: { stageSlug: 'java-basico' } } },
    { slug: 'java-basico-sintaxe-ex2', lessonPayload: { segment: { stageSlug: 'java-basico' } } },
  ];
  const partial = deriveTrackProgress(stages, activities, ['java-basico-sintaxe-ex1']);
  assert.equal(partial.segments[0].completed, false);
  assert.equal(partial.current.stageSlug, 'java-basico');
  const full = deriveTrackProgress(stages, activities, ['java-basico-sintaxe-ex1', 'java-basico-sintaxe-ex2']);
  assert.equal(full.segments[0].completed, true);
  assert.equal(full.current, null);
  assert.equal(full.nextToGenerate.stageSlug, 'spring-boot');
});

test('frescor (§I2.3): vagas sempre frescas; roadmap 90d; vídeos/repos 30d — reuso registrado', () => {
  const prev = { id: 'research-x', collectedAt: '2026-10-24T00:00:00.000Z' };
  const d8 = planFreshResearch(prev, '2026-11-01T00:00:00.000Z');
  assert.equal(d8.jobs.mode, 'fresh');
  assert.equal(d8.web.mode, 'reused');
  assert.equal(d8.videosRepos.mode, 'reused');
  const d38 = planFreshResearch(prev, '2026-12-01T00:00:00.000Z');
  assert.equal(d38.web.mode, 'reused');
  assert.equal(d38.videosRepos.mode, 'fresh');
  const d100 = planFreshResearch(prev, '2027-02-01T00:00:00.000Z');
  assert.equal(d100.web.mode, 'fresh');
  assert.equal(d100.videosRepos.mode, 'fresh');
  const none = planFreshResearch(null, GEN_AT);
  assert.equal(none.web.mode, 'fresh');
});

test('sumarização de mercado: skill sem desagregação não sustenta selo', () => {
  const summary = summarizeResearchJobs({ market: { skills: [{ skill: 'x', sampleSize: 5 }] } }, GEN_AT);
  assert.equal(summary.skills.length, 0);
  assert.equal(summary.staleSkillsRemoved[0].reason, 'no-disaggregated-samples');
});

// ---------- sync-research (V2) com prisma falso ----------

test('V2 sync-research: decisão do banco vira arquivo; já sincronizado é ignorado', async () => {
  const content = kmsTree({});
  const paths = kmsPaths(content);
  const rows = [{
    stableId: 'research-x', goal: 'g', status: 'approved', approvedBy: 'admin-1',
    approvedAt: new Date('2026-10-24T00:00:00.000Z'), collectedAt: new Date('2026-10-24T00:00:00.000Z'),
    payload: { id: 'research-x', goal: 'g', status: 'draft', sourcesAvailable: [], sourcesUnavailable: ['youtube', 'github', 'jobs'], market: { sampleSize: 0, skills: [] }, videos: [], channels: [], repos: [], collectedAt: '2026-10-24T00:00:00.000Z', createdAt: GEN_AT, approvedAt: null, approvedBy: null },
  }];
  const fakePrisma = {
    $queryRawUnsafe: async () => [{ research: 'knowledge_research' }],
    knowledgeResearch: { findMany: async () => rows },
  };
  const report = await syncResearchFromDb(paths, fakePrisma);
  assert.deepEqual(report.applied, ['research-x → approved']);
  const file = JSON.parse(readFileSync(join(content, 'knowledge', 'research', 'research-x.json'), 'utf8'));
  assert.equal(file.status, 'approved');
  assert.equal(file.approvedBy, 'admin-1');
  const report2 = await syncResearchFromDb(paths, fakePrisma);
  assert.equal(report2.applied.length, 0);
  assert.equal(report2.skipped.length, 1);
  assert.ok(existsSync(join(content, 'knowledge', 'research', 'research-x.json')));
  void loadEntries;
});
