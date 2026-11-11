import { UsersService } from './users.service';

// Sprint 21 — o progresso do aluno usa a derivação efetiva única
// (computeCoursePath): módulo concluído por test-out conta como
// concluído em GET /users/me/progress, sem segunda regra.

describe('UsersService.getUserProgress (Sprint 21)', () => {
  const activities = [
    { id: 'a1', title: 'A1', order: 1, conceptTags: ['saida-e-variaveis'] },
    { id: 'a2', title: 'A2', order: 2, conceptTags: ['saida-e-variaveis'] },
    { id: 'a3', title: 'A3', order: 3, conceptTags: ['saida-e-variaveis'] },
    { id: 'b1', title: 'B1', order: 4, conceptTags: ['operadores'] },
  ];

  function makeService(passedIds: string[]) {
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          xp: 0,
          level: 1,
          streakDays: 0,
          badges: [],
        }),
      },
      enrollment: {
        findMany: jest.fn().mockResolvedValue([
          {
            course: {
              id: 'c1',
              title: 'Python',
              slug: 'introducao-python',
              activities,
            },
          },
        ]),
      },
      submission: {
        // M2 (Lote 4): o serviço agrega via groupBy, não findMany — o mock
        // devolve uma linha por atividade aprovada (1 submissão, score 100).
        groupBy: jest.fn().mockResolvedValue(
          passedIds.map((activityId) => ({
            activityId,
            status: 'passed',
            _count: { _all: 1, score: 1 },
            _sum: { score: 100 },
          })),
        ),
      },
    };
    return new UsersService(prisma, {} as any);
  }

  it('sem test-out: progresso é a conta clássica de aprovadas', async () => {
    const progress = await makeService(['a1']).getUserProgress('user-1');
    expect(progress.coursesProgress[0].completedActivities).toBe(1);
    expect(progress.coursesProgress[0].progressPercent).toBe(25);
    expect(progress.completedActivitiesCount).toBe(1);
  });

  it('test-out aprovado (verificação do módulo passada) conclui o módulo no progresso', async () => {
    const progress = await makeService(['a3']).getUserProgress('user-1');
    expect(progress.coursesProgress[0].completedActivities).toBe(3);
    expect(progress.coursesProgress[0].progressPercent).toBe(75);
    expect(progress.completedActivitiesCount).toBe(3);
  });

  it('test-out reprovado não infla o progresso: atividade comum vale só ela', async () => {
    const progress = await makeService(['a2']).getUserProgress('user-1');
    expect(progress.coursesProgress[0].completedActivities).toBe(1);
    expect(progress.coursesProgress[0].progressPercent).toBe(25);
  });
});
