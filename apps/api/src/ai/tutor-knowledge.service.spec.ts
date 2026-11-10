import { TutorKnowledgeService } from './tutor-knowledge.service';

/** M12 — specs do TutorKnowledgeService (extraído do AiService). */
describe('TutorKnowledgeService', () => {
  const prismaMock = {
    course: { findMany: jest.fn() },
  };
  const knowledgeMock = {
    findByTopics: jest.fn(),
    findEntriesByTopics: jest.fn(),
  };
  const researchMock = {
    requestForGoal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sem KnowledgeService: buscas devolvem [] (Sprint 22 inalterado)', async () => {
    const service = new TutorKnowledgeService(prismaMock as any);
    await expect(service.findKnowledgeForTopics(['loops'])).resolves.toEqual([]);
    await expect(service.findKmsEntriesForTopics(['loops'])).resolves.toEqual([]);
    expect(knowledgeMock.findByTopics).not.toHaveBeenCalled();
  });

  it('sem tópicos: não consulta a base', async () => {
    const service = new TutorKnowledgeService(prismaMock as any, knowledgeMock as any);
    await expect(service.findKnowledgeForTopics([])).resolves.toEqual([]);
    await expect(service.findKmsEntriesForTopics([])).resolves.toEqual([]);
    expect(knowledgeMock.findByTopics).not.toHaveBeenCalled();
    expect(knowledgeMock.findEntriesByTopics).not.toHaveBeenCalled();
  });

  it('com KnowledgeService: delega com limit 3', async () => {
    const lessons = [{ id: 'l1' }];
    const entries = [{ slug: 'e1' }];
    knowledgeMock.findByTopics.mockResolvedValue(lessons);
    knowledgeMock.findEntriesByTopics.mockResolvedValue(entries);
    const service = new TutorKnowledgeService(prismaMock as any, knowledgeMock as any);
    await expect(service.findKnowledgeForTopics(['loops'])).resolves.toBe(lessons);
    await expect(service.findKmsEntriesForTopics(['loops'])).resolves.toBe(entries);
    expect(knowledgeMock.findByTopics).toHaveBeenCalledWith(['loops'], { limit: 3 });
    expect(knowledgeMock.findEntriesByTopics).toHaveBeenCalledWith(['loops'], { limit: 3 });
  });

  it('sem ResearchService: aviso honesto, sem trilha fabricada', async () => {
    const service = new TutorKnowledgeService(prismaMock as any);
    const res = await service.requestResearchForGoal('analista de dados python');
    expect(res.approved).toBeNull();
    expect(res.request).toBeNull();
    expect(res.nearestTrack).toBeNull();
    expect(res.message).toMatch(/nenhuma trilha foi fabricada/);
  });

  it('com ResearchService: pedido + trilha mais próxima por sobreposição de tokens', async () => {
    researchMock.requestForGoal.mockReturnValue({
      approved: null,
      request: { id: 'r1', status: 'requested' },
      message: 'Ainda não há pesquisa aprovada.',
    });
    prismaMock.course.findMany.mockResolvedValue([
      { id: 'c1', title: 'Python para Dados', slug: 'python-dados' },
      { id: 'c2', title: 'Java do Zero', slug: 'java-zero' },
    ]);
    const service = new TutorKnowledgeService(prismaMock as any, undefined, researchMock as any);
    const res = await service.requestResearchForGoal('analista de dados python');
    expect(researchMock.requestForGoal).toHaveBeenCalledWith('analista de dados python');
    expect(res.nearestTrack?.slug).toBe('python-dados');
  });

  it('falha ao listar cursos: pedido preservado, nearestTrack null', async () => {
    researchMock.requestForGoal.mockReturnValue({
      approved: null,
      request: { id: 'r1', status: 'requested' },
      message: 'Ainda não há pesquisa aprovada.',
    });
    prismaMock.course.findMany.mockRejectedValue(new Error('db down'));
    const service = new TutorKnowledgeService(prismaMock as any, undefined, researchMock as any);
    const res = await service.requestResearchForGoal('python');
    expect(res.request?.status).toBe('requested');
    expect(res.nearestTrack).toBeNull();
  });
});
