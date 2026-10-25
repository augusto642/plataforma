/**
 * KnowledgeService / FileKnowledgeRepository — só lições approved chegam à
 * tutora; base vazia => comportamento inalterado (regressão zero).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileKnowledgeRepository } from './knowledge.service';

function fixtureDir() {
  const root = join(tmpdir(), `know-spec-${Date.now()}`);
  const dir = join(root, 'content', 'knowledge', 'lessons', 'trilha-python');
  mkdirSync(dir, { recursive: true });
  const lesson = (id: string, status: string, topics: string[]) => ({
    id, lessonTitle: id, courseName: 'Trilha Python', summary: 'Resumo próprio.',
    topics, prerequisites: [], difficulty: 'beginner', reviewStatus: status,
  });
  writeFileSync(join(dir, 'a.json'), JSON.stringify(lesson('trilha-python/a', 'approved', ['funcoes'])));
  writeFileSync(join(dir, 'b.json'), JSON.stringify(lesson('trilha-python/b', 'draft', ['funcoes'])));
  return join(root, 'content');
}

function kmsFixtureDir() {
  const root = join(tmpdir(), `know-kms-${Date.now()}`);
  const entries = join(root, 'content', 'knowledge', 'entries');
  mkdirSync(entries, { recursive: true });
  const entry = (slug: string, status: string, currentVersion: number, versions: any[], topicIds: string[]) => ({
    version: 1, slug, title: slug, topicIds, status, currentVersion,
    supersededByEntry: null, supersededAt: null, supersedeReason: null, versions,
  });
  const v = (version: number, status: string) => ({
    version, status, summary: 'Resumo próprio.', keyExamples: [],
    contributions: [{ kind: 'drive', driveFileId: 'f1', lessonId: 'trilha-python/a', contributedAt: '2026-10-24T00:00:00.000Z', changeKind: 'created' }],
    marketContext: [], createdAt: '2026-10-24T00:00:00.000Z', supersededBy: null, supersededAt: null, supersedeReason: null,
  });
  writeFileSync(join(entries, 'funcoes.json'), JSON.stringify(entry('funcoes', 'active', 2, [v(1, 'superseded'), v(2, 'active')], ['funcoes'])));
  writeFileSync(join(entries, 'rascunho.json'), JSON.stringify(entry('rascunho', 'draft', 0, [v(1, 'draft')], ['funcoes'])));
  writeFileSync(join(entries, 'antiga.json'), JSON.stringify(entry('antiga', 'superseded', 0, [v(1, 'superseded')], ['funcoes'])));
  return join(root, 'content');
}

describe('FileKnowledgeRepository', () => {
  it('só approved por tópico; draft nunca vaza para a tutora', async () => {
    const repo = new FileKnowledgeRepository(fixtureDir());
    const found = await repo.findByTopics(['funcoes']);
    expect(found.map((l) => l.id)).toEqual(['trilha-python/a']);
    expect(await repo.findById('trilha-python/b')).toBeNull();
    expect(await repo.stats()).toEqual({ lessonsApproved: 1, lessonsDraft: 1, sources: 1 });
  });

  it('base vazia => lista vazia (tutora Sprint 22 inalterada)', async () => {
    const repo = new FileKnowledgeRepository(join(tmpdir(), 'inexistente-xyz'));
    expect(await repo.findByTopics(['funcoes'])).toEqual([]);
  });

  it('KMS: só versão active de entrada active; draft e superseded invisíveis', async () => {
    const repo = new FileKnowledgeRepository(kmsFixtureDir());
    const found = await repo.findEntriesByTopics(['funcoes']);
    expect(found.map((e) => e.slug)).toEqual(['funcoes']);
    expect(found[0].version).toBe(2);
    expect(await repo.findEntryBySlug('rascunho')).toBeNull();
    expect(await repo.findEntryBySlug('antiga')).toBeNull();
    expect((await repo.findEntryBySlug('funcoes'))?.version).toBe(2);
  });
});
