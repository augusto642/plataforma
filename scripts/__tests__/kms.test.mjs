/**
 * Testes Node (node:test) do KMS (DESIGN §13, Fase G) — sem banco, sem Drive.
 * Cobrem: merge (3 desfechos + fila + idempotência + recusa de draft),
 * pesquisa no merge (marketContext, nunca entrada própria), apply
 * (approve, review→materialização, pending-sync via changelog), backfill
 * (dry-run 0, apply, re-execução no-op), gates 6–9 do validador, extractOne
 * atualizando o registro, resolveCourse com prioridade exata e gerador com
 * kmsEntries.
 * Uso: node --test scripts/__tests__/kms.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateKnowledge, realTestExpressions } from '../../scripts/validate-knowledge.mjs';
import { kmsPaths, loadEntries } from '../../scripts/kms-lib.mjs';
import { proposeForSource, writeReviewItem } from '../../scripts/kms-merge.mjs';
import { approveVersion, applyReview, syncFromDb } from '../../scripts/kms-apply.mjs';
import { runBackfill } from '../../scripts/kms-backfill.mjs';
import { runCalibration } from '../../scripts/kms-calibration.mjs';
import { extractOne } from '../../scripts/knowledge-extract.mjs';
import { resolveCourse } from '../../scripts/course-map.mjs';
import { generateTrack } from '../../scripts/knowledge-generate-track.mjs';

function kmsTree({ lessons = [], research = [], entries = [], registryRecords = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'kms-test-'));
  const content = join(root, 'content');
  mkdirSync(join(content, 'knowledge', 'lessons', 'trilha-python'), { recursive: true });
  mkdirSync(join(content, 'knowledge', 'research'), { recursive: true });
  mkdirSync(join(content, 'knowledge', 'entries'), { recursive: true });
  mkdirSync(join(content, 'knowledge', 'review-queue'), { recursive: true });
  writeFileSync(join(content, 'concept-spine.json'), JSON.stringify({ modules: [{ tag: 'saida-e-variaveis' }, { tag: 'funcoes' }, { tag: 'listas' }] }));
  writeFileSync(join(content, 'knowledge-topics.json'), JSON.stringify({ topics: [{ id: 'pandas', prerequisites: [] }] }));
  writeFileSync(join(content, 'knowledge', 'course-map.json'), JSON.stringify({ mappings: [{ courseSlug: 'trilha-python', courseName: 'Trilha Python', driveFolderNames: ['Trilha Python'] }] }));
  writeFileSync(join(content, 'knowledge', 'topics.json'), JSON.stringify({ version: 1, topics: {} }));
  for (const l of lessons) writeFileSync(join(content, 'knowledge', 'lessons', 'trilha-python', `${l.file || 'aula'}.json`), JSON.stringify(l));
  for (const r of research) writeFileSync(join(content, 'knowledge', 'research', `${r.id}.json`), JSON.stringify(r));
  for (const e of entries) writeFileSync(join(content, 'knowledge', 'entries', `${e.slug}.json`), JSON.stringify(e));
  writeFileSync(join(content, 'knowledge', 'extraction-registry.json'), JSON.stringify({ version: 1, scope: 'python', records: registryRecords }));
  return content;
}

const lesson = (over = {}) => ({
  id: 'trilha-python/aula-funcoes', driveFileId: 'file-funcoes', courseSlug: 'trilha-python',
  courseName: 'Trilha Python', lessonTitle: 'Funções em Python', summary: 'Resumo próprio sobre funções.',
  topics: ['funcoes'], prerequisites: [], keyExamples: ['Exemplo análogo.'], difficulty: 'beginner',
  source: { type: 'drive-course', courseName: 'Trilha Python', lessonTitle: 'Funções em Python', driveFileId: 'file-funcoes', drivePath: 'x' },
  extractedAt: '2026-10-24T00:00:00.000Z', extractorVersion: 'knowledge-extractor@1', reviewStatus: 'approved', file: 'aula-funcoes',
  ...over,
});

const researchDoc = (over = {}) => ({
  id: 'research-python-dados-junior', goal: 'analista de dados', status: 'approved',
  approvedBy: 'admin-1', approvedAt: '2026-10-24T00:00:00.000Z',
  sourcesAvailable: ['github'], sourcesUnavailable: ['youtube', 'jobs'],
  market: { sampleSize: 87, skills: [{ skill: 'pandas', mentions: 80, sampleSize: 87, sources: [] }] },
  videos: [], channels: [], repos: [], collectedAt: '2026-10-24T00:00:00.000Z',
  ...over,
});

function readEntry(content, slug) {
  return JSON.parse(readFileSync(join(content, 'knowledge', 'entries', `${slug}.json`), 'utf8'));
}

test('merge: tema novo cria entrada draft (nunca active) + changelog + registro', () => {
  const content = kmsTree({
    lessons: [lesson()],
    registryRecords: [{ driveFileId: 'file-funcoes', status: 'pending' }],
  });
  const paths = kmsPaths(content);
  const report = proposeForSource(paths, { kind: 'lesson', lesson: lesson() }, {});
  assert.equal(report.outcome, 'new');
  const entry = readEntry(content, 'trilha-python-aula-funcoes');
  assert.equal(entry.status, 'draft');
  assert.equal(entry.versions[0].status, 'draft');
  assert.equal(entry.versions[0].contributions[0].changeKind, 'created');
  const reg = JSON.parse(readFileSync(join(content, 'knowledge', 'extraction-registry.json'), 'utf8'));
  assert.deepEqual(reg.records[0].entrySlugs, ['trilha-python-aula-funcoes']);
  const changelog = JSON.parse(readFileSync(join(content, 'knowledge', 'changelog.json'), 'utf8'));
  assert.equal(changelog.entries[0].changeType, 'created');
  assert.deepEqual(validateKnowledge(content).failures, []);
});

test('merge: enriquecer inequívoco cria versão draft herdando contribuições; 2ª execução é no-op', () => {
  const base = lesson();
  const content = kmsTree({
    lessons: [lesson({ id: 'trilha-python/aula-funcoes-2', lessonTitle: 'Funções em Python', summary: 'Outro resumo próprio sobre funções.', driveFileId: 'file-funcoes-2', file: 'aula-funcoes-2' })],
    entries: [{
      version: 1, slug: 'funcoes', title: 'Funções em Python', topicIds: ['funcoes'], status: 'active', currentVersion: 1,
      supersededByEntry: null, supersededAt: null, supersedeReason: null,
      versions: [{ version: 1, status: 'active', summary: 'Resumo base.', keyExamples: [], contributions: [{ kind: 'drive', driveFileId: 'file-base', lessonId: 'trilha-python/base', contributedAt: '2026-10-24T00:00:00.000Z', changeKind: 'created' }], marketContext: [], createdAt: '2026-10-24T00:00:00.000Z', supersededBy: null, supersededAt: null, supersedeReason: null }],
    }],
    registryRecords: [{ driveFileId: 'file-funcoes-2', status: 'pending' }],
  });
  const paths = kmsPaths(content);
  const first = proposeForSource(paths, { kind: 'lesson', lesson: lesson({ id: 'trilha-python/aula-funcoes-2', lessonTitle: 'Funções em Python', summary: 'Outro resumo próprio sobre funções.', driveFileId: 'file-funcoes-2' }) }, {});
  assert.equal(first.outcome, 'enrich');
  const entry = readEntry(content, 'funcoes');
  assert.equal(entry.versions.length, 2);
  assert.equal(entry.versions[1].status, 'draft'); // nunca active pelo merge
  assert.equal(entry.versions[1].contributions.length, 2); // herança + nova
  assert.equal(entry.currentVersion, 1); // active segue v1 até aprovação
  const second = proposeForSource(paths, { kind: 'lesson', lesson: lesson({ id: 'trilha-python/aula-funcoes-2', lessonTitle: 'Funções em Python', summary: 'Outro resumo próprio sobre funções.', driveFileId: 'file-funcoes-2' }) }, {});
  assert.equal(second.outcome, 'already-fed');
  assert.equal(readEntry(content, 'funcoes').versions.length, 2);
  assert.deepEqual(validateKnowledge(content).failures, []);
  void base;
});

test('merge: caso ambíguo vai para a fila sem escrever em entrada; draft é recusado', () => {
  const content = kmsTree({
    lessons: [lesson({ lessonTitle: 'Funções', topics: ['funcoes'] })],
    entries: [
      { version: 1, slug: 'funcoes', title: 'Funções', topicIds: ['funcoes'], status: 'active', currentVersion: 1, supersededByEntry: null, supersededAt: null, supersedeReason: null, versions: [{ version: 1, status: 'active', summary: 'Base.', keyExamples: [], contributions: [{ kind: 'drive', driveFileId: 'f1', lessonId: 'x', contributedAt: '2026-10-24T00:00:00.000Z', changeKind: 'created' }], marketContext: [], createdAt: '2026-10-24T00:00:00.000Z', supersededBy: null, supersededAt: null, supersedeReason: null }] },
      { version: 1, slug: 'funcoes-avancado', title: 'Funções', topicIds: ['funcoes'], status: 'active', currentVersion: 1, supersededByEntry: null, supersededAt: null, supersedeReason: null, versions: [{ version: 1, status: 'active', summary: 'Base 2.', keyExamples: [], contributions: [{ kind: 'drive', driveFileId: 'f2', lessonId: 'y', contributedAt: '2026-10-24T00:00:00.000Z', changeKind: 'created' }], marketContext: [], createdAt: '2026-10-24T00:00:00.000Z', supersededBy: null, supersededAt: null, supersedeReason: null }] },
    ],
  });
  const paths = kmsPaths(content);
  const report = proposeForSource(paths, { kind: 'lesson', lesson: lesson({ lessonTitle: 'Funções', topics: ['funcoes'] }) }, {});
  assert.equal(report.outcome, 'review');
  assert.ok(report.reviewId);
  assert.equal(readdirSync(join(content, 'knowledge', 'review-queue')).length, 1);
  assert.equal(readEntry(content, 'funcoes').versions.length, 1);
  assert.throws(() => proposeForSource(paths, { kind: 'lesson', lesson: lesson({ reviewStatus: 'draft' }) }, {}), /não aprovado/);
  assert.throws(() => proposeForSource(paths, { kind: 'research', research: researchDoc({ status: 'draft' }) }, {}), /não aprovado/);
});

test('merge pesquisa: enriquece com marketContext sem criar entrada; sem alvo vai para new-or-enrich', () => {
  const content = kmsTree({
    research: [researchDoc()],
    entries: [{
      version: 1, slug: 'pandas', title: 'Pandas', topicIds: ['pandas'], status: 'active', currentVersion: 1,
      supersededByEntry: null, supersededAt: null, supersedeReason: null,
      versions: [{ version: 1, status: 'active', summary: 'Base pandas.', keyExamples: [], contributions: [{ kind: 'drive', driveFileId: 'f9', lessonId: 'x', contributedAt: '2026-10-24T00:00:00.000Z', changeKind: 'created' }], marketContext: [], createdAt: '2026-10-24T00:00:00.000Z', supersededBy: null, supersededAt: null, supersedeReason: null }],
    }],
  });
  const paths = kmsPaths(content);
  const report = proposeForSource(paths, { kind: 'research', research: researchDoc() }, {});
  assert.equal(report.outcome, 'enrich');
  const entry = readEntry(content, 'pandas');
  assert.equal(entry.versions.length, 2);
  assert.equal(entry.versions[1].marketContext[0].skill, 'pandas');
  assert.equal(entry.versions[1].marketContext[0].sampleSize, 87);

  const content2 = kmsTree({ research: [researchDoc({ market: { sampleSize: 10, skills: [{ skill: 'rust-inexistente', mentions: 1, sampleSize: 10, sources: [] }] } })] });
  const report2 = proposeForSource(kmsPaths(content2), { kind: 'research', research: researchDoc({ market: { sampleSize: 10, skills: [{ skill: 'rust-inexistente', mentions: 1, sampleSize: 10, sources: [] }] } }) }, {});
  assert.equal(report2.outcome, 'review-new-or-enrich');
  assert.equal(readdirSync(join(content2, 'knowledge', 'entries')).length, 0); // pesquisa nunca cria entrada
});

test('apply: approve ativa draft e supera a anterior; review resolve + materializa + sai do pending-sync', () => {
  const content = kmsTree({
    entries: [{
      version: 1, slug: 'funcoes', title: 'Funções em Python', topicIds: ['funcoes'], status: 'active', currentVersion: 1,
      supersededByEntry: null, supersededAt: null, supersedeReason: null,
      versions: [
        { version: 1, status: 'active', summary: 'Base.', keyExamples: [], contributions: [{ kind: 'drive', driveFileId: 'f1', lessonId: 'x', contributedAt: '2026-10-24T00:00:00.000Z', changeKind: 'created' }], marketContext: [], createdAt: '2026-10-24T00:00:00.000Z', supersededBy: null, supersededAt: null, supersedeReason: null },
        { version: 2, status: 'draft', summary: 'Enriquecida.', keyExamples: [], contributions: [{ kind: 'drive', driveFileId: 'f1', lessonId: 'x', contributedAt: '2026-10-24T00:00:00.000Z', changeKind: 'created' }, { kind: 'drive', driveFileId: 'f2', lessonId: 'y', contributedAt: '2026-10-24T00:00:00.000Z', changeKind: 'enriched' }], marketContext: [], createdAt: '2026-10-24T00:00:00.000Z', supersededBy: null, supersededAt: null, supersedeReason: null },
      ],
    }],
  });
  const paths = kmsPaths(content);
  const out = approveVersion(paths, 'funcoes', 2, 'admin:admin-uuid-9');
  assert.equal(out.approvedBy, 'admin:admin-uuid-9');
  const entry = readEntry(content, 'funcoes');
  assert.equal(entry.currentVersion, 2);
  assert.equal(entry.versions[0].status, 'superseded');
  assert.equal(entry.versions[0].supersededBy, 2);
  assert.ok(entry.versions[0].supersededAt);
  assert.equal(entry.versions[1].status, 'active');
  const changelog = JSON.parse(readFileSync(join(content, 'knowledge', 'changelog.json'), 'utf8'));
  assert.ok(changelog.entries.some((c) => c.actor === 'admin:admin-uuid-9'));
  assert.deepEqual(validateKnowledge(content).failures, []);

  // Fila: item open + applyReview com decisão enrich materializa draft e resolve o item.
  const content3 = kmsTree({
    lessons: [lesson()],
    entries: [{
      version: 1, slug: 'funcoes', title: 'Funções em Python', topicIds: ['funcoes'], status: 'active', currentVersion: 1,
      supersededByEntry: null, supersededAt: null, supersedeReason: null,
      versions: [{ version: 1, status: 'active', summary: 'Base.', keyExamples: [], contributions: [{ kind: 'drive', driveFileId: 'f1', lessonId: 'x', contributedAt: '2026-10-24T00:00:00.000Z', changeKind: 'created' }], marketContext: [], createdAt: '2026-10-24T00:00:00.000Z', supersededBy: null, supersededAt: null, supersedeReason: null }],
    }],
  });
  const paths3 = kmsPaths(content3);
  const item = writeReviewItem(paths3, {
    kind: 'ambiguous-match',
    sourceRef: { kind: 'drive', driveFileId: 'file-funcoes', lessonId: 'trilha-python/aula-funcoes' },
    candidates: [{ entrySlug: 'funcoes', score: 65, matchReasons: ['topico-primario'] }], confidence: 65,
  });
  const applied = applyReview(paths3, item.id, { action: 'enrich', targetEntrySlug: 'funcoes', reason: 'admin escolheu funcoes', actor: 'admin:admin-1' });
  assert.equal(applied.materialized.entrySlug, 'funcoes');
  const saved = JSON.parse(readFileSync(join(content3, 'knowledge', 'review-queue', `${item.id}.json`), 'utf8'));
  assert.equal(saved.status, 'resolved');
  assert.equal(saved.resolvedBy, 'admin:admin-1');
  const cl3 = JSON.parse(readFileSync(join(content3, 'knowledge', 'changelog.json'), 'utf8'));
  assert.ok(cl3.entries.some((c) => c.changeType === 'review-resolved' && c.source.decisionId === item.id));
  assert.deepEqual(validateKnowledge(content3).failures, []);
});

test('sync-db (V1): decisão do banco ativa a versão no arquivo; sem tabelas, recusa', async () => {
  const content = kmsTree({
    entries: [{
      version: 1, slug: 'funcoes', title: 'Funções em Python', topicIds: ['funcoes'], status: 'active', currentVersion: 1,
      supersededByEntry: null, supersededAt: null, supersedeReason: null,
      versions: [
        { version: 1, status: 'active', summary: 'Base.', keyExamples: [], contributions: [{ kind: 'drive', driveFileId: 'f1', lessonId: 'x', contributedAt: '2026-10-24T00:00:00.000Z', changeKind: 'created' }], marketContext: [], createdAt: '2026-10-24T00:00:00.000Z', supersededBy: null, supersededAt: null, supersedeReason: null },
        { version: 2, status: 'draft', summary: 'Enriquecida.', keyExamples: [], contributions: [{ kind: 'drive', driveFileId: 'f1', lessonId: 'x', contributedAt: '2026-10-24T00:00:00.000Z', changeKind: 'created' }], marketContext: [], createdAt: '2026-10-24T00:00:00.000Z', supersededBy: null, supersededAt: null, supersedeReason: null },
      ],
    }],
  });
  const paths = kmsPaths(content);
  const fakePrisma = {
    $queryRawUnsafe: async () => [{ entries: 'knowledge_entries', versions: 'knowledge_entry_versions', review: 'knowledge_review_items' }],
    knowledgeEntry: { findMany: async () => [{ slug: 'funcoes', status: 'active', versions: [{ version: 1, status: 'superseded' }, { version: 2, status: 'active' }] }] },
    knowledgeReviewItem: { findMany: async () => [] },
  };
  const report = await syncFromDb(paths, fakePrisma);
  assert.deepEqual(report.versionsActivated, ['funcoes v2']);
  const entry = readEntry(content, 'funcoes');
  assert.equal(entry.currentVersion, 2);
  assert.equal(entry.versions[1].status, 'active');
  assert.equal(entry.versions[0].status, 'superseded');
  assert.deepEqual(validateKnowledge(content).failures, []);
  await assert.rejects(() => syncFromDb(paths, {
    $queryRawUnsafe: async () => [{ entries: null, versions: null, review: null }],
    knowledgeEntry: { findMany: async () => [] },
    knowledgeReviewItem: { findMany: async () => [] },
  }), /tabelas KMS ausentes/);
});

test('backfill: dry-run 0 em árvore vazia; apply cria drafts + marketContext; re-execução é no-op', () => {
  const empty = kmsTree({});
  const dry = runBackfill(join(empty), { apply: false });
  assert.equal(dry.lessonsApproved, 0);
  assert.equal(dry.wouldCreate, 0);
  assert.equal(readdirSync(join(empty, 'knowledge', 'entries')).length, 0);

  const content = kmsTree({
    lessons: [
      lesson({ id: 'trilha-python/aula-funcoes', file: 'aula-funcoes' }),
      lesson({ id: 'trilha-python/aula-pandas', lessonTitle: 'Pandas', summary: 'Resumo pandas.', topics: ['pandas'], driveFileId: 'file-pandas', file: 'aula-pandas' }),
      lesson({ id: 'trilha-python/rascunho', lessonTitle: 'Rascunho', reviewStatus: 'draft', driveFileId: 'file-rasc', file: 'rascunho' }),
    ],
    research: [researchDoc()],
    registryRecords: [
      { driveFileId: 'file-funcoes', status: 'extracted', lessonId: 'trilha-python/aula-funcoes' },
      { driveFileId: 'file-pandas', status: 'extracted', lessonId: 'trilha-python/aula-pandas' },
    ],
  });
  const first = runBackfill(content, { apply: true });
  assert.equal(first.entriesCreated, 2);
  assert.equal(first.lessonsSkippedDraft, 1);
  assert.equal(first.marketContextsAdded, 1);
  const pandas = readEntry(content, 'trilha-python-aula-pandas');
  assert.equal(pandas.status, 'draft'); // nasce draft, nunca active
  assert.equal(pandas.versions[0].marketContext[0].skill, 'pandas');
  const reg = JSON.parse(readFileSync(join(content, 'knowledge', 'extraction-registry.json'), 'utf8'));
  assert.ok(reg.records.find((r) => r.driveFileId === 'file-pandas').entrySlugs.includes('trilha-python-aula-pandas'));
  const clCount = JSON.parse(readFileSync(join(content, 'knowledge', 'changelog.json'), 'utf8')).entries.length;
  const second = runBackfill(content, { apply: true });
  assert.equal(second.entriesCreated, 0);
  assert.equal(second.entriesUnchanged, 2);
  assert.equal(second.marketContextsAdded, 0);
  assert.equal(JSON.parse(readFileSync(join(content, 'knowledge', 'changelog.json'), 'utf8')).entries.length, clCount);
  assert.deepEqual(validateKnowledge(content).failures, []);
});

test('gates 6–9: sem procedência, superada sem campos, seq duplicado e registro↔entrada quebrados reprovam', () => {
  const noProv = kmsTree({
    entries: [{ version: 1, slug: 'x', title: 'X', topicIds: ['funcoes'], status: 'active', currentVersion: 0, supersededByEntry: null, supersededAt: null, supersedeReason: null, versions: [{ version: 1, status: 'draft', summary: 'S.', keyExamples: [], contributions: [], marketContext: [], createdAt: '2026-10-24T00:00:00.000Z', supersededBy: null, supersededAt: null, supersedeReason: null }] }],
  });
  assert.ok(validateKnowledge(noProv).failures.some((f) => f.includes('procedência')));

  const badSup = kmsTree({
    entries: [{ version: 1, slug: 'x', title: 'X', topicIds: ['funcoes'], status: 'active', currentVersion: 0, supersededByEntry: null, supersededAt: null, supersedeReason: null, versions: [{ version: 1, status: 'superseded', summary: 'S.', keyExamples: [], contributions: [{ kind: 'drive', driveFileId: 'f', lessonId: 'l', contributedAt: '2026-10-24T00:00:00.000Z', changeKind: 'created' }], marketContext: [], createdAt: '2026-10-24T00:00:00.000Z', supersededBy: null, supersededAt: null, supersedeReason: null }] }],
  });
  assert.ok(validateKnowledge(badSup).failures.some((f) => f.includes('superada')));

  const content = kmsTree({
    entries: [{ version: 1, slug: 'funcoes', title: 'Funções', topicIds: ['funcoes'], status: 'active', currentVersion: 1, supersededByEntry: null, supersededAt: null, supersedeReason: null, versions: [{ version: 1, status: 'active', summary: 'S.', keyExamples: [], contributions: [{ kind: 'drive', driveFileId: 'f1', lessonId: 'x', contributedAt: '2026-10-24T00:00:00.000Z', changeKind: 'created' }], marketContext: [], createdAt: '2026-10-24T00:00:00.000Z', supersededBy: null, supersededAt: null, supersedeReason: null }] }],
    registryRecords: [{ driveFileId: 'f1', status: 'extracted', lessonId: 'x', entrySlugs: ['entrada-fantasma'] }],
  });
  writeFileSync(join(content, 'knowledge', 'changelog.json'), JSON.stringify({ version: 1, entries: [
    { seq: 1, entrySlug: 'funcoes', changeType: 'created', version: 1, source: { type: 'drive', driveFileId: 'f1' }, actor: 'kms-merge', occurredAt: '2026-10-24T00:00:00.000Z', detail: 'd' },
    { seq: 1, entrySlug: 'funcoes', changeType: 'enriched', version: 1, source: { type: 'drive' }, actor: 'kms-merge', occurredAt: '2026-10-24T00:00:00.000Z', detail: 'd' },
  ] }));
  const fails = validateKnowledge(content).failures;
  assert.ok(fails.some((f) => f.includes('seq')), fails.join('\n'));
  assert.ok(fails.some((f) => f.includes('entrada inexistente')), fails.join('\n'));
  assert.ok(fails.some((f) => f.includes('sem o slug no entrySlugs')), fails.join('\n'));
});

test('extractOne atualiza o registro (M1); falha no registro preserva o estado anterior', async () => {
  const root = mkdtempSync(join(tmpdir(), 'extract-reg-'));
  const lessonsDir = join(root, 'lessons');
  const registryPath = join(root, 'registry.json');
  writeFileSync(registryPath, JSON.stringify({ version: 1, scope: 'python', records: [{ driveFileId: 'file-9', status: 'pending' }] }));
  const entry = { driveFileId: 'file-9', fileName: 'Aula 01 - Teste.mp4', courseSlug: 'trilha-python', courseName: 'Trilha Python', drivePath: 'p' };
  const out = await extractOne(entry, {
    download: async () => join(root, 'video.mp4'),
    transcribe: async () => ({ text: 't', durationSeconds: 10 }),
    summarize: async () => ({ summary: 'Resumo próprio curto.', topics: ['funcoes'], prerequisites: [], keyExamples: [], difficulty: 'beginner' }),
    lessonsDir, registryPath,
  });
  assert.equal(out.registryUpdated, true);
  const reg = JSON.parse(readFileSync(registryPath, 'utf8'));
  assert.equal(reg.records[0].status, 'extracted');
  assert.equal(reg.records[0].lessonId, out.lesson.id);
  assert.ok(reg.records[0].summaryHash.startsWith('sha256:'));

  // Registro inválido: lição escrita, registro intacto, sem exceção.
  const badPath = join(root, 'registry-bad.json');
  writeFileSync(badPath, '{ inválido');
  const out2 = await extractOne(entry, {
    download: async () => join(root, 'video.mp4'),
    transcribe: async () => ({ text: 't', durationSeconds: 10 }),
    summarize: async () => ({ summary: 'Resumo próprio curto.', topics: ['funcoes'], prerequisites: [], keyExamples: [], difficulty: 'beginner' }),
    lessonsDir, registryPath: badPath,
  });
  assert.equal(out2.registryUpdated, false);
  assert.ok(out2.registryError);
  assert.equal(readFileSync(badPath, 'utf8'), '{ inválido');
});

test('resolveCourse: nome exato vence substring; substring segue como fallback', () => {
  const map = { mappings: [
    { courseSlug: 'python-impressionador', courseName: 'Python Impressionador', driveFolderNames: ['Python Impressionador'] },
    { courseSlug: 'python-impressionador-avancado', courseName: 'Python Impressionador Avançado', driveFolderNames: ['Python Impressionador Avançado'] },
    { courseSlug: 'trilha-python', courseName: 'Trilha Python', driveFolderNames: ['Trilha Python'] },
  ] };
  assert.equal(resolveCourse(['Python Impressionador Avançado'], [], map).courseSlug, 'python-impressionador-avancado');
  assert.equal(resolveCourse(['Trilha Python — Turma 2024'], [], map).courseSlug, 'trilha-python');
});

test('gerador: kmsEntries só de entradas active; skill sem entrada vira gap no-kms-entry', () => {
  const research = { id: 'research-x', status: 'approved', market: { skills: [{ skill: 'pandas', sampleSize: 42 }, { skill: 'funcoes', sampleSize: 10 }] } };
  const lessons = [
    { ...lesson(), id: 'a', lessonTitle: 'Base', topics: ['saida-e-variaveis'], prerequisites: [], reviewStatus: 'approved' },
    { ...lesson(), id: 'b', lessonTitle: 'Funções', topics: ['funcoes'], prerequisites: ['saida-e-variaveis'], reviewStatus: 'approved' },
    // Pandas tem lição aprovada (sem gap de lição) mas só entrada draft (sem gap KMS coberto) => gap no-kms-entry.
    { ...lesson(), id: 'c', lessonTitle: 'Pandas', topics: ['pandas'], prerequisites: [], reviewStatus: 'approved' },
  ];
  const kmsEntries = [
    { slug: 'funcoes', title: 'Funções', topicIds: ['funcoes'], status: 'active', currentVersion: 2, versions: [{ version: 2, status: 'active' }] },
    { slug: 'pandas-rascunho', title: 'Pandas', topicIds: ['pandas'], status: 'draft', currentVersion: 0, versions: [{ version: 1, status: 'draft' }] },
  ];
  const out = generateTrack({ goal: 'analista', research, lessons, kmsEntries });
  const funcoesActivity = out.activities.find((a) => a.conceptTags.includes('funcoes'));
  assert.deepEqual(funcoesActivity.lessonPayload.kmsEntries, [{ slug: 'funcoes', version: 2 }]);
  assert.ok(out.gaps.some((g) => g.skill === 'pandas' && g.reason === 'no-kms-entry'));
  assert.ok(!out.gaps.some((g) => g.skill === 'funcoes' && g.reason === 'no-kms-entry'));
});

test('V6: atividade gerada com testCode placeholder é NÃO SEMEÁVEL; com testes reais passa', () => {
  assert.deepEqual(realTestExpressions('# PENDENTE-AUTORIA-ADMIN: testes de comportamento específicos', ''), []);
  assert.ok(realTestExpressions('assert soma(2, 3) == 5\n# comentário', '').length === 1);
  const content = kmsTree({});
  mkdirSync(join(content, 'knowledge', 'generated-tracks'), { recursive: true });
  const track = (testCode, referenceSolution) => ({
    course: { slug: 'trilha-x', title: 'T', description: 'D' },
    activities: [{
      slug: 'a1', title: 'A1', conceptTags: ['funcoes'],
      testCode, hiddenTests: '', referenceSolution,
      lessonPayload: { reviewStatus: 'draft', generatedTrack: true, knowledgeSources: [{ lessonId: 'x', courseName: 'C', lessonTitle: 'L' }] },
    }],
  });
  writeFileSync(join(content, 'knowledge', 'generated-tracks', 't.json'), JSON.stringify(track('# PENDENTE-AUTORIA-ADMIN: testes', '')));
  const fails = validateKnowledge(content).failures;
  assert.ok(fails.some((f) => f.includes('NÃO SEMEÁVEL')), fails.join('\n'));
  writeFileSync(join(content, 'knowledge', 'generated-tracks', 't.json'), JSON.stringify(track('assert soma(2, 3) == 5', 'def soma(a, b):\n    return a + b\n')));
  assert.deepEqual(validateKnowledge(content).failures, []);
});

test('calibração: 6/6 nos fixtures rotulados (limiares 70/40 versionados)', () => {
  const report = runCalibration();
  assert.equal(report.accuracy, 1);
  assert.equal(report.matchVersion, 1);
});

test('rodada 3 — changelog malformado: validador lista a falha, nunca stack cru', () => {
  const content = kmsTree({});
  writeFileSync(join(content, 'knowledge', 'changelog.json'), '[]');
  const fails = validateKnowledge(content).failures;
  assert.ok(fails.some((f) => f.includes('changelog.json: entries ausente ou não é lista')), fails.join('\n'));
});

test('rodada 3 — appendChangelog sobre changelog malformado falha fechado, sem perda silenciosa', async () => {
  const { appendChangelog } = await import('../../scripts/kms-lib.mjs');
  const content = kmsTree({});
  const changelogPath = join(content, 'knowledge', 'changelog.json');
  writeFileSync(changelogPath, '[]');
  assert.throws(() => appendChangelog(changelogPath, { entrySlug: 'x', changeType: 'created', version: 1, source: { type: 'drive', driveFileId: 'f' }, actor: 'kms-apply' }), /changelog malformado/);
  assert.equal(readFileSync(changelogPath, 'utf8'), '[]');
});

test('rodada 3 — toUuidOrNull: admin:<uuid> vira uuid, ator de arquivo vira null', async () => {
  const { toUuidOrNull } = await import('../../scripts/import-knowledge.mjs');
  assert.equal(toUuidOrNull('admin:30af5ad6-80f9-470d-b7f4-e36c08bbd32a'), '30af5ad6-80f9-470d-b7f4-e36c08bbd32a');
  assert.equal(toUuidOrNull('kms-apply'), null);
  assert.equal(toUuidOrNull(null), null);
});

test('backfill CLI: árvore vazia prova 0 entradas (dry-run default)', () => {
  const content = kmsTree({});
  const out = execFileSync('node', ['scripts/kms-backfill.mjs', '--content', content], { cwd: fileURLToPath(new URL('../..', import.meta.url)), encoding: 'utf8' });
  assert.match(out, /lições-aprovadas=0/);
  assert.match(out, /criaria 0 entrada/);
  assert.equal(existsSync(join(content, 'knowledge', 'entries', 'x.json')), false);
});
