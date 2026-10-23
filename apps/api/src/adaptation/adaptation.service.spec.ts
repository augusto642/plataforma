import { NotFoundException } from '@nestjs/common';
import { AdaptationService } from './adaptation.service';

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    course: { findUnique: jest.fn() },
    submission: { findMany: jest.fn().mockResolvedValue([]) },
    activity: { findMany: jest.fn().mockResolvedValue([]) },
    enrollment: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
}

const COURSE = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'introducao-python',
  title: 'Sintaxe Python — Trilha Completa',
  activities: [
    { id: 'a1', slug: 'a1', title: 'A1', order: 1, conceptTags: ['saida-e-variaveis'] },
    { id: 'a2', slug: 'a2', title: 'A2', order: 2, conceptTags: ['saida-e-variaveis'] },
    { id: 'a3', slug: 'a3', title: 'A3', order: 3, conceptTags: ['saida-e-variaveis'] },
    { id: 'b1', slug: 'b1', title: 'B1', order: 4, conceptTags: ['operadores'] },
  ],
};

describe('AdaptationService.getCoursePath', () => {
  it('curso inexistente → 404', async () => {
    const prisma = makePrisma();
    prisma.course.findUnique.mockResolvedValue(null);
    const service = new AdaptationService(prisma as any);
    await expect(
      service.getCoursePath('user-1', COURSE.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('aluno sem submissões: próximo passo é a 1ª atividade e a entrada é o módulo 1', async () => {
    const prisma = makePrisma();
    prisma.course.findUnique.mockResolvedValue(COURSE);
    const service = new AdaptationService(prisma as any);
    const path = await service.getCoursePath('user-1', COURSE.id);
    expect(path.isSyntaxTrack).toBe(true);
    expect(path.nextActivity?.id).toBe('a1');
    expect(path.entryModuleTag).toBe('saida-e-variaveis');
    expect(path.modules[0].status).toBe('not-started');
    expect(path.modules[0].testOutActivity?.id).toBe('a3');
  });

  it('test-out aprovado reflete no caminho: módulo tested-out e próximo passo salta', async () => {
    const prisma = makePrisma();
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.submission.findMany.mockResolvedValue([{ activityId: 'a3' }]);
    const service = new AdaptationService(prisma as any);
    const path = await service.getCoursePath('user-1', COURSE.id);
    expect(path.modules[0].status).toBe('tested-out');
    expect(path.modules[0].passedActivities).toBe(1);
    expect(path.modules[0].effectiveCompletedActivities).toBe(3);
    expect(path.nextActivity?.id).toBe('b1');
    expect(path.nextActivity?.moduleTag).toBe('operadores');
  });
});

describe('AdaptationService.getRemediation', () => {
  const trackRow = {
    id: 't1',
    slug: 't1',
    title: 'T1',
    language: 'python',
    order: 1,
    conceptTags: ['loops'],
    courseId: 'py',
    course: { slug: 'introducao-python', title: 'Python', isPublicLibrary: false },
  };
  const libRow = {
    id: 'bib1',
    slug: 'bib1',
    title: 'BIB1',
    language: 'python',
    order: 1,
    conceptTags: ['loops'],
    courseId: 'bib',
    course: { slug: 'biblioteca', title: 'Biblioteca', isPublicLibrary: true },
  };

  it('3 falhas no conceito geram a oferta com a atividade da Biblioteca', async () => {
    const prisma = makePrisma();
    prisma.submission.findMany.mockResolvedValue(
      [0, 1, 2].map((i) => ({
        activityId: 't1',
        status: 'failed',
        createdAt: new Date(2026, 0, 1, i),
      })),
    );
    prisma.activity.findMany
      .mockResolvedValueOnce([trackRow]) // referenced
      .mockResolvedValueOnce([libRow]) // biblioteca
      .mockResolvedValueOnce([trackRow]); // matriculados
    prisma.enrollment.findMany.mockResolvedValue([{ courseId: 'py' }]);
    const service = new AdaptationService(prisma as any);
    const view = await service.getRemediation('user-1');
    expect(view.threshold).toBe(3);
    expect(view.fragileConcepts).toHaveLength(1);
    expect(view.fragileConcepts[0].conceptTag).toBe('loops');
    expect(view.fragileConcepts[0].reinforcement?.id).toBe('bib1');
    expect(view.fragileConcepts[0].reinforcement?.source).toBe('library');
  });

  it('aluno sem submissões: nenhum conceito frágil', async () => {
    const prisma = makePrisma();
    const service = new AdaptationService(prisma as any);
    const view = await service.getRemediation('user-1');
    expect(view.fragileConcepts).toEqual([]);
  });
});
