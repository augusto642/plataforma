import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PeerReviewsService } from './peer-reviews.service';

/**
 * Fase 3 premium — revisão por pares (CodeReview kind=peer, distinta
 * da revisão por IA kind=ai da Fase 2):
 * - só o autor pede; pedido pendente existente volta idempotente;
 * - revisor nunca é o próprio autor; rubrica exige os 4 critérios
 *   da Fase 2 com nota 0–5;
 * - concluir nunca toca Submission (só CodeReview) e, no 5º review
 *   concluído, dá o badge de revisor (uma única vez).
 */
describe('PeerReviewsService', () => {
  let service: PeerReviewsService;

  const mockPrisma = {
    submission: { findUnique: jest.fn() },
    codeReview: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
    userBadge: { findUnique: jest.fn(), create: jest.fn() },
  };

  const validRubric = {
    legibilidade: { score: 4, comment: 'Claro' },
    estrutura: { score: 3, comment: 'Ok' },
    nomes: { score: 5, comment: 'Bons nomes' },
    casosDeBorda: { score: 2, comment: 'Falta tratar vazio' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PeerReviewsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<PeerReviewsService>(PeerReviewsService);
  });

  it('autor pede revisão; pedido pendente existente volta sem duplicar', async () => {
    mockPrisma.submission.findUnique.mockResolvedValue({ id: 's1', userId: 'author' });
    mockPrisma.codeReview.findFirst.mockResolvedValue({ id: 'r-pending', kind: 'peer', status: 'pending' });
    const existing = await service.requestPeerReview('author', 's1');
    expect(existing.id).toBe('r-pending');
    expect(mockPrisma.codeReview.create).not.toHaveBeenCalled();

    mockPrisma.codeReview.findFirst.mockResolvedValue(null);
    mockPrisma.codeReview.create.mockResolvedValue({ id: 'r-new', kind: 'peer' });
    const created = await service.requestPeerReview('author', 's1');
    expect(created).toMatchObject({ kind: 'peer' });
    expect(mockPrisma.codeReview.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ kind: 'peer', status: 'pending' }) }),
    );
  });

  it('não-autor não pode pedir revisão de submissão alheia', async () => {
    mockPrisma.submission.findUnique.mockResolvedValue({ id: 's1', userId: 'author' });
    await expect(service.requestPeerReview('intruso', 's1')).rejects.toThrow('próprias submissões');
  });

  it('revisor não revisa o próprio código; revisão de IA não aceita par', async () => {
    mockPrisma.codeReview.findUnique.mockResolvedValue({
      id: 'r1', kind: 'peer', status: 'pending', submission: { userId: 'author' },
    });
    await expect(
      service.submitReview('author', 'r1', { rubric: validRubric, summary: 'x', suggestions: [] }),
    ).rejects.toThrow('próprio código');

    mockPrisma.codeReview.findUnique.mockResolvedValue({
      id: 'r2', kind: 'ai', status: 'completed', submission: { userId: 'author' },
    });
    await expect(
      service.submitReview('par', 'r2', { rubric: validRubric, summary: 'x', suggestions: [] }),
    ).rejects.toThrow('não é uma revisão por pares');
  });

  it('rubrica incompleta ou fora de 0–5 é recusada antes de gravar', async () => {
    mockPrisma.codeReview.findUnique.mockResolvedValue({
      id: 'r1', kind: 'peer', status: 'pending', submission: { userId: 'author' },
    });
    const bad = { ...validRubric, nomes: { score: 9, comment: 'x' } };
    await expect(
      service.submitReview('par', 'r1', { rubric: bad, summary: 'x', suggestions: [] }),
    ).rejects.toThrow('Rubrica inválida');
    expect(mockPrisma.codeReview.update).not.toHaveBeenCalled();
  });

  it('5º review concluído dá o badge (uma única vez); 4º não dá', async () => {
    mockPrisma.codeReview.findUnique.mockResolvedValue({
      id: 'r1', kind: 'peer', status: 'pending', submission: { userId: 'author' },
    });
    mockPrisma.codeReview.update.mockResolvedValue({ id: 'r1', status: 'completed' });

    mockPrisma.codeReview.count.mockResolvedValue(4);
    await service.submitReview('par', 'r1', { rubric: validRubric, summary: 'x', suggestions: [] });
    expect(mockPrisma.userBadge.create).not.toHaveBeenCalled();

    mockPrisma.codeReview.count.mockResolvedValue(5);
    mockPrisma.userBadge.findUnique.mockResolvedValue(null);
    await service.submitReview('par', 'r1', { rubric: validRubric, summary: 'x', suggestions: [] });
    expect(mockPrisma.userBadge.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ badgeCode: 'peer_reviewer' }) }),
    );

    mockPrisma.userBadge.findUnique.mockResolvedValue({ id: 'b1' });
    await service.submitReview('par', 'r1', { rubric: validRubric, summary: 'x', suggestions: [] });
    expect(mockPrisma.userBadge.create).toHaveBeenCalledTimes(1);
  });
});
