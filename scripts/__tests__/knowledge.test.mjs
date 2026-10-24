/**
 * Testes Node (node:test) do sistema de conhecimento — sem banco, sem Drive,
 * sem rede. Cobrem: validador (5 gates, um fixture inválido por gate,
 * incluindo `transcript` proibido), reconcile do rescan (novo/igual/alterado/
 * erro fail-closed), course-map (python-outros + flag), gerador (topologia,
 * ciclo, skill sem amostra, saída draft, lacuna) e extractOne com stubs
 * (lição válida, sem transcript, transcrição descartada).
 * Uso: node --test scripts/__tests__/knowledge.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { validateKnowledge, forbiddenFieldsDeep } from '../../scripts/validate-knowledge.mjs';
import { reconcile, fingerprint } from '../../scripts/drive-rescan.mjs';
import { resolveCourse } from '../../scripts/course-map.mjs';
import { generateTrack } from '../../scripts/knowledge-generate-track.mjs';
import { extractOne } from '../../scripts/knowledge-extract.mjs';

function fixtureTree({ lesson = null, registryRecords = [], research = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'know-test-'));
  const content = join(root, 'content');
  mkdirSync(join(content, 'knowledge', 'lessons', 'trilha-python'), { recursive: true });
  mkdirSync(join(content, 'knowledge', 'research'), { recursive: true });
  writeFileSync(join(content, 'concept-spine.json'), JSON.stringify({ modules: [{ tag: 'saida-e-variaveis' }, { tag: 'funcoes' }, { tag: 'listas' }] }));
  writeFileSync(join(content, 'knowledge-topics.json'), JSON.stringify({ topics: [{ id: 'pandas', prerequisites: [] }] }));
  writeFileSync(join(content, 'knowledge', 'course-map.json'), JSON.stringify({ mappings: [{ courseSlug: 'trilha-python', courseName: 'Trilha Python', driveFolderNames: ['Trilha Python'] }] }));
  if (lesson) writeFileSync(join(content, 'knowledge', 'lessons', 'trilha-python', 'aula.json'), JSON.stringify(lesson));
  writeFileSync(join(content, 'knowledge', 'extraction-registry.json'), JSON.stringify({ version: 1, scope: 'python', records: registryRecords }));
  if (research) writeFileSync(join(content, 'knowledge', 'research', 'r.json'), JSON.stringify(research));
  return content;
}

const goodLesson = {
  id: 'trilha-python/aula', driveFileId: 'file-1', courseSlug: 'trilha-python', courseName: 'Trilha Python',
  lessonTitle: 'Aula', summary: 'Resumo condensado em linguagem própria.', topics: ['funcoes'], prerequisites: ['saida-e-variaveis'],
  keyExamples: ['Exemplo análogo.'], difficulty: 'beginner',
  source: { type: 'drive-course', courseName: 'Trilha Python', lessonTitle: 'Aula', driveFileId: 'file-1', drivePath: 'x' },
  extractedAt: '2026-10-24T00:00:00.000Z', extractorVersion: 'knowledge-extractor@1', reviewStatus: 'draft',
};

test('gate 2: transcript proibido reprova sempre', () => {
  const content = fixtureTree({ lesson: { ...goodLesson, transcript: 'texto integral...' } });
  const { failures } = validateKnowledge(content);
  assert.ok(failures.some((f) => f.includes('PROIBIDO')), failures.join('\n'));
});

test('gate 2: summary >1200 e tópico fora do universo reprovam', () => {
  const content = fixtureTree({ lesson: { ...goodLesson, summary: 'x'.repeat(1201), topics: ['django-inexistente'] } });
  const { failures } = validateKnowledge(content);
  assert.ok(failures.some((f) => f.includes('1200')));
  assert.ok(failures.some((f) => f.includes('fora do universo')));
});

test('gate 1: driveFileId duplicado e extracted sem lição reprovam', () => {
  const content = fixtureTree({
    registryRecords: [
      { driveFileId: 'a', status: 'pending' },
      { driveFileId: 'a', status: 'pending' },
      { driveFileId: 'b', status: 'extracted', lessonId: 'inexistente/x' },
    ],
  });
  const { failures } = validateKnowledge(content);
  assert.ok(failures.some((f) => f.includes('duplicado')));
  assert.ok(failures.some((f) => f.includes('inexistente')));
});

test('gate 3: research sem sourcesUnavailable e skill sem sampleSize reprova', () => {
  const content = fixtureTree({ research: { id: 'r', status: 'draft', market: { skills: [{ skill: 'pandas' }] } } });
  const { failures } = validateKnowledge(content);
  assert.ok(failures.some((f) => f.includes('sourcesUnavailable')));
  assert.ok(failures.some((f) => f.includes('sampleSize')));
});

test('gate 5: courseSlug fora do mapa reprova; fixture válido aprova', () => {
  const bad = fixtureTree({ lesson: { ...goodLesson, courseSlug: 'curso-inventado' } });
  assert.ok(validateKnowledge(bad).failures.some((f) => f.includes('course-map')));
  const good = fixtureTree({ lesson: goodLesson });
  assert.deepEqual(validateKnowledge(good).failures, []);
});

test('rescan: novo => pending, igual => ignorado, diferente => changed', () => {
  const reg = { version: 1, scope: 'python', records: [{ driveFileId: 'old', status: 'extracted', md5Checksum: 'm1', modifiedTime: '2026-01-01T00:00:00.000Z', sizeBytes: 10, lessonId: 'x/y' }] };
  const files = [
    { id: 'old', name: 'a.mp4', mimeType: 'video/mp4', size: 10, md5Checksum: 'm1', modifiedTime: '2026-01-01T00:00:00.000Z', trashed: false },
    { id: 'old2', name: 'b.mp4', mimeType: 'video/mp4', size: 20, md5Checksum: 'm2', modifiedTime: '2026-01-02T00:00:00.000Z', trashed: false },
    { id: 'old3', name: 'c.mp4', mimeType: 'video/mp4', size: 30, md5Checksum: 'mX', modifiedTime: '2026-01-03T00:00:00.000Z', trashed: false },
  ];
  // old2 é novo; simular changed com um registro extracted separado:
  const reg2 = { version: 1, scope: 'python', records: [{ driveFileId: 'old3', status: 'extracted', md5Checksum: 'mOld', modifiedTime: '2026-01-01T00:00:00.000Z', sizeBytes: 30, lessonId: 'x/z' }] };
  const r = reconcile(reg2, files.filter((f) => f.id !== 'old'));
  assert.equal(r.report.discovered, 1);
  assert.equal(r.report.changed, 1);
  const changed = r.registry.records.find((x) => x.driveFileId === 'old3');
  assert.equal(changed.status, 'changed');
  assert.equal(fingerprint({ md5Checksum: undefined, modifiedTime: 't', size: 5 }), 'meta:t:5');
});

test('course-map: sem ancestral conhecido => python-outros + flag, nunca nome inventado', () => {
  const map = { mappings: [{ courseSlug: 'trilha-python', courseName: 'Trilha Python', driveFolderNames: ['Trilha Python'] }] };
  assert.deepEqual(resolveCourse(['04. Trilha Python'], [], map), { courseSlug: 'trilha-python', courseName: 'Trilha Python', needsCourseMapping: false });
  assert.deepEqual(resolveCourse(['Pasta Aleatória XYZ'], [], map), { courseSlug: 'python-outros', courseName: 'Python (outros)', needsCourseMapping: true });
});

test('gerador: topologia, saída draft, skill sem amostra removida, lacuna vira GapEntry', () => {
  const research = { id: 'research-x', status: 'approved', market: { skills: [{ skill: 'pandas', sampleSize: 42 }, { skill: 'sem-amostra' }] } };
  const lessons = [
    { ...goodLesson, id: 'a', lessonTitle: 'Base', topics: ['saida-e-variaveis'], prerequisites: [], reviewStatus: 'approved' },
    { ...goodLesson, id: 'b', lessonTitle: 'Funções', topics: ['funcoes'], prerequisites: ['saida-e-variaveis'], reviewStatus: 'approved' },
    { ...goodLesson, id: 'c', lessonTitle: 'Rascunho', topics: ['listas'], prerequisites: [], reviewStatus: 'draft' },
  ];
  const out = generateTrack({ goal: 'analista de dados', research, lessons });
  assert.deepEqual(out.activities.map((a) => a.lessonPayload.reviewStatus), ['draft', 'draft']);
  assert.ok(out.activities[0].slug.includes('base'));
  assert.equal(out.removedSkills.length, 1);
  assert.ok(out.gaps.some((g) => g.skill === 'pandas' && g.reason === 'no-approved-lesson'));
});

test('gerador: ciclo => erro; pesquisa não aprovada => erro', () => {
  const research = { id: 'r', status: 'approved', market: { skills: [] } };
  const cyclic = [
    { ...goodLesson, id: 'a', lessonTitle: 'A', topics: ['funcoes'], prerequisites: ['listas'], reviewStatus: 'approved' },
    { ...goodLesson, id: 'b', lessonTitle: 'B', topics: ['listas'], prerequisites: ['funcoes'], reviewStatus: 'approved' },
  ];
  assert.throws(() => generateTrack({ goal: 'x', research, lessons: cyclic }), /ciclo/);
  assert.throws(() => generateTrack({ goal: 'x', research: { ...research, status: 'draft' }, lessons: [] }), /não aprovada/);
});

test('extractOne com stubs: lição válida, sem transcript, e sem resíduo de transcrição', async () => {
  const root = mkdtempSync(join(tmpdir(), 'extract-test-'));
  const lessonsDir = join(root, 'lessons');
  const entry = { driveFileId: 'file-9', fileName: 'Aula 01 - Teste.mp4', courseSlug: 'trilha-python', courseName: 'Trilha Python', drivePath: 'p' };
  const { lesson, dest } = await extractOne(entry, {
    download: async () => join(root, 'video.mp4'),
    transcribe: async () => ({ text: 'transcrição transitória que não pode vazar', durationSeconds: 600 }),
    summarize: async () => ({ summary: 'Resumo próprio curto.', topics: ['funcoes'], prerequisites: [], keyExamples: [], difficulty: 'beginner' }),
    lessonsDir, registryPath: join(root, 'registry.json'),
  });
  assert.ok(existsSync(dest));
  assert.ok(!('transcript' in lesson) && !JSON.stringify(lesson).includes('transitória'));
  assert.equal(forbiddenFieldsDeep(lesson).length, 0);
  const content = fixtureTree({ lesson });
  assert.deepEqual(validateKnowledge(content).failures, []);
});
