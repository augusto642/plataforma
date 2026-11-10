import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { EntitlementsService } from '../plans/entitlements.service';
import { PrismaService } from '../prisma/prisma.service';
import { AI_REVIEWS_QUEUE, ReviewsService } from './reviews.service';

/**
 * Fase 2 premium — gates da revisão de código por IA:
 * - Pro: só projeto final (Activity.isCapstone); Carreira: qualquer;
 * - free: sem revisão; aluno não revisa submissão de outro;
 * - revisão já pedida volta idempotente, sem enfileirar de novo;
 * - a revisão nunca altera Submission.status (tabela à parte — aqui
 *   verifica-se que o serviço nem toca em submission.update).
 */
describe('ReviewsService', () => {
  let service: ReviewsService;

  const mockPrisma = {
    submission: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    codeReview: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
  };
  const mockQueue = { add: jest.fn() };
  const mockEntitlements = { getUserPlan: jest.fn() };

  const submission = (isCapstone: boolean, owner = 'user-1') => ({
    id: 'sub-1',
    userId: owner,
    activity: { isCapstone },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'student' });
    mockPrisma.codeReview.findFirst.mockResolvedValue(null);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EntitlementsService, useValue: mockEntitlements },
        { provide: getQueueToken(AI_REVIEWS_QUEUE), useValue: mockQueue },
      ],
    }).compile();
    service = module.get<ReviewsService>(ReviewsService);
  });

  it('Pro em projeto NÃO final é barrado (403) antes de enfileirar', async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(submission(false));
    mockEntitlements.getUserPlan.mockResolvedValue('pro');
    await expect(service.requestAiReview('user-1', 'sub-1')).rejects.toThrow(
      'apenas projetos finais',
    );
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it('Pro em projeto final enfileira na fila ai-reviews', async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(submission(true));
    mockEntitlements.getUserPlan.mockResolvedValue('pro');
    mockPrisma.codeReview.create.mockResolvedValue({ id: 'rev-1', status: 'pending' });

    const result = await service.requestAiReview('user-1', 'sub-1');

    expect(result.id).toBe('rev-1');
    expect(mockQueue.add).toHaveBeenCalledWith(
      'ai-review',
      { reviewId: 'rev-1' },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it('Carreira revisa qualquer projeto', async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(submission(false));
    mockEntitlements.getUserPlan.mockResolvedValue('career');
    mockPrisma.codeReview.create.mockResolvedValue({ id: 'rev-1' });
    await service.requestAiReview('user-1', 'sub-1');
    expect(mockQueue.add).toHaveBeenCalledTimes(1);
  });

  it('free é barrado mesmo em projeto final', async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(submission(true));
    mockEntitlements.getUserPlan.mockResolvedValue('free');
    await expect(service.requestAiReview('user-1', 'sub-1')).rejects.toThrow(
      'plano pago',
    );
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it('aluno não pede revisão de submissão de outro aluno', async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(submission(true, 'user-2'));
    await expect(service.requestAiReview('user-1', 'sub-1')).rejects.toThrow(
      'suas próprias submissões',
    );
  });

  it('revisão já pedida volta idempotente, sem novo job', async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(submission(true));
    mockEntitlements.getUserPlan.mockResolvedValue('pro');
    mockPrisma.codeReview.findFirst.mockResolvedValue({ id: 'rev-0', status: 'pending' });

    const result = await service.requestAiReview('user-1', 'sub-1');

    expect(result.id).toBe('rev-0');
    expect(mockPrisma.codeReview.create).not.toHaveBeenCalled();
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  // Central 219 (D2) — listMine ("Revisões da IA Salvas" do dashboard).
  it('listMine filtra só as revisões das próprias submissões, recentes primeiro', async () => {
    mockPrisma.codeReview.findMany.mockResolvedValue([
      {
        id: 'rev-1',
        kind: 'ai',
        status: 'completed',
        summary: 'Bom uso de funções.',
        createdAt: new Date('2026-11-10T10:00:00Z'),
        submissionId: 'sub-1',
        submission: { activity: { title: 'Loops e arrays' } },
      },
    ]);
    const result = await service.listMine('user-1');
    expect(mockPrisma.codeReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { submission: { userId: 'user-1' } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: 'rev-1',
        activityTitle: 'Loops e arrays',
        submissionId: 'sub-1',
      }),
    ]);
  });

  it('listMine sem revisão devolve [] (nunca inventa)', async () => {
    mockPrisma.codeReview.findMany.mockResolvedValue([]);
    await expect(service.listMine('user-1')).resolves.toEqual([]);
  });
});
