import { GuidedProjectsService } from './guided-projects.service';

describe('GuidedProjectsService', () => {
  let service: GuidedProjectsService;
  let mockPrisma: any;
  let mockGitea: any;

  beforeEach(() => {
    mockPrisma = {
      guidedProject: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      userGuidedProjectProgress: {
        upsert: jest.fn(),
      },
    };

    mockGitea = {
      generateRepoFromTemplate: jest.fn().mockResolvedValue({ clone_url: 'http://localhost:3030/test/repo.git' }),
    };

    service = new GuidedProjectsService(mockPrisma, mockGitea);
  });

  it('deve listar projetos guiados com formatação correta', async () => {
    mockPrisma.guidedProject.findMany.mockResolvedValue([
      {
        id: 'proj-1',
        title: 'Sistema Imobiliário',
        slug: 'sistema-imobiliario',
        level: 'junior',
        prerequisites: [{ id: 'java', title: 'Java POO' }],
        techStack: ['Java', 'React'],
        sprints: [{ id: 's1', order: 1 }],
        userProgress: [],
      },
    ]);

    const result = await service.listProjects('user-1');
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Sistema Imobiliário');
    expect(result[0].sprintsCount).toBe(1);
  });

  it('deve validar checklist de pré-requisitos com sucesso se usuário for nível >= 2', async () => {
    mockPrisma.guidedProject.findUnique.mockResolvedValue({
      id: 'proj-1',
      prerequisites: [{ id: 'java', title: 'Java POO' }],
    });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', level: 2, xp: 250 });

    const result = await service.checkPrerequisites('user-1', 'proj-1');
    expect(result.canStart).toBe(true);
    expect(result.checklist[0].completed).toBe(true);
  });

  it('deve bloquear início de projeto caso pré-requisitos não sejam atendidos', async () => {
    mockPrisma.guidedProject.findUnique.mockResolvedValue({
      id: 'proj-1',
      prerequisites: [{ id: 'java', title: 'Java POO' }],
    });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', level: 1, xp: 50 });

    await expect(service.startProject('user-1', 'proj-1')).rejects.toThrow(
      'Você precisa atender a todos os pré-requisitos antes de iniciar este projeto.',
    );
  });
});
