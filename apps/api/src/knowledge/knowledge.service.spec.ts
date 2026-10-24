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
});
