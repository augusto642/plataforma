import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { autoFlagged, CommunityService } from './community.service';

/**
 * Fase 3 premium — comunidade e moderação:
 * - termo de spam sinaliza automaticamente (sem bloquear: vai para a
 *   fila admin, decisão humana);
 * - galeria: só submissão aprovada do próprio autor; devolve só o
 *   codeSnapshot (nunca testes ocultos);
 * - flag manual chega à fila admin; ocultar não apaga o registro.
 */
describe('CommunityService', () => {
  let service: CommunityService;

  const mockPrisma = {
    activity: { findUnique: jest.fn() },
    forumThread: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    forumPost: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    submission: { findUnique: jest.fn() },
    solutionShare: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    user: { findUnique: jest.fn() },
    codeReview: { count: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommunityService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<CommunityService>(CommunityService);
  });

  it('termo de spam sinaliza; texto limpo não', () => {
    expect(autoFlagged('Gente, ganhe dinheiro fácil clicando aqui')).toBe(true);
    expect(autoFlagged('Dúvida sobre laço for em Python')).toBe(false);
  });

  it('post com spam nasce sinalizado para a fila admin', async () => {
    mockPrisma.forumThread.findUnique.mockResolvedValue({ id: 'th-1' });
    mockPrisma.forumPost.create.mockResolvedValue({ id: 'p1', flagged: true });
    await service.createPost('user-1', 'th-1', 'Compre agora e ganhe dinheiro fácil!');
    expect(mockPrisma.forumPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ flagged: true, flaggedAt: expect.any(Date) }),
      }),
    );
  });

  it('flag manual marca o post e a fila admin o lista', async () => {
    mockPrisma.forumPost.findUnique.mockResolvedValue({ id: 'p1' });
    mockPrisma.forumPost.update.mockResolvedValue({ id: 'p1', flagged: true });
    await service.flagPost('p1');
    expect(mockPrisma.forumPost.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ flagged: true }) }),
    );

    mockPrisma.forumPost.findMany.mockResolvedValue([{ id: 'p1' }]);
    const queue = await service.flaggedQueue();
    expect(queue).toEqual([{ id: 'p1' }]);
    expect(mockPrisma.forumPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { flagged: true, hidden: false } }),
    );
  });

  it('ocultar é decisão humana que preserva o registro (hidden, não delete)', async () => {
    mockPrisma.forumPost.findUnique.mockResolvedValue({ id: 'p1' });
    await service.hidePost('p1');
    expect(mockPrisma.forumPost.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { hidden: true } }),
    );
    expect(mockPrisma.forumPost.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ flagged: false }) }),
    );
  });

  it('galeria recusa submissão reprovada e de outro autor', async () => {
    mockPrisma.submission.findUnique.mockResolvedValue({ id: 's1', userId: 'u1', status: 'failed' });
    await expect(service.shareSolution('u1', 's1')).rejects.toThrow('aprovadas');

    mockPrisma.submission.findUnique.mockResolvedValue({ id: 's1', userId: 'u1', status: 'passed' });
    await expect(service.shareSolution('u2', 's1')).rejects.toThrow('próprias soluções');
  });

  it('galeria devolve só codeSnapshot — sem testes ocultos nem referência', async () => {
    mockPrisma.activity.findUnique.mockResolvedValue({ id: 'act-1' });
    mockPrisma.solutionShare.findMany.mockResolvedValue([
      {
        id: 'sh-1',
        user: { id: 'u1', name: 'Ana', nickname: null },
        submission: { id: 's1', codeSnapshot: 'print(1)', score: 100, createdAt: new Date() },
      },
    ]);
    const solutions = await service.listSolutions('act-1');
    expect(solutions[0]).toEqual(
      expect.objectContaining({ codeSnapshot: 'print(1)', score: 100 }),
    );
    expect(solutions[0]).not.toHaveProperty('hiddenTests');
    expect(solutions[0]).not.toHaveProperty('testCode');
    expect(solutions[0]).not.toHaveProperty('referenceSolution');
  });
});
