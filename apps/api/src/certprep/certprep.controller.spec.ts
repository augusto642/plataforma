import { Test, TestingModule } from '@nestjs/testing';
import { EntitlementsService } from '../plans/entitlements.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CertprepController } from './certprep.controller';
import { CertprepService } from './certprep.service';

/**
 * A10 (Lote 3 · portões do merge) — CertprepController estava em 0%.
 * Delegação fina ao CertprepService (o gate 'cert-prep' é do
 * FeatureGuard, coberto no seu próprio spec): aqui trava-se que cada
 * rota chama o método certo com o userId do JWT — e que a ausência de
 * `domainScores` no corpo vira `{}` (nunca `undefined` no service).
 */
describe('CertprepController', () => {
  let controller: CertprepController;
  const mockService = {
    listExams: jest.fn(),
    createAttempt: jest.fn(),
    listMyAttempts: jest.fn(),
    getReadiness: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CertprepController],
      providers: [
        {
          provide: EntitlementsService,
          useValue: { assertFeature: jest.fn(), assertAiTutorAccess: jest.fn() },
        },
        { provide: CertprepService, useValue: mockService }],
    }).compile();
    controller = module.get<CertprepController>(CertprepController);
  });

  const user = { sub: 'user-1', role: 'student' } as JwtPayload;

  it('listExams devolve o catálogo do service', async () => {
    mockService.listExams.mockResolvedValue([{ id: 'exam-1' }]);
    await expect(controller.listExams()).resolves.toEqual([{ id: 'exam-1' }]);
    expect(mockService.listExams).toHaveBeenCalledTimes(1);
  });

  it('createAttempt repassa userId, examId e os domainScores', async () => {
    mockService.createAttempt.mockResolvedValue({ id: 'att-1' });
    const scores = { redes: { correct: 3, total: 5 } };

    const result = await controller.createAttempt(
      user,
      '00000000-0000-0000-0000-000000000001',
      { domainScores: scores } as never,
    );

    expect(mockService.createAttempt).toHaveBeenCalledWith(
      'user-1',
      '00000000-0000-0000-0000-000000000001',
      scores,
    );
    expect(result).toEqual({ id: 'att-1' });
  });

  it('createAttempt sem domainScores envia {} ao service', async () => {
    mockService.createAttempt.mockResolvedValue({ id: 'att-2' });

    await controller.createAttempt(
      user,
      '00000000-0000-0000-0000-000000000001',
      {} as never,
    );

    expect(mockService.createAttempt).toHaveBeenCalledWith(
      'user-1',
      '00000000-0000-0000-0000-000000000001',
      {},
    );
  });

  it('listMyAttempts usa o userId do JWT', async () => {
    mockService.listMyAttempts.mockResolvedValue([{ id: 'att-1' }]);
    await expect(controller.listMyAttempts(user)).resolves.toEqual([
      { id: 'att-1' },
    ]);
    expect(mockService.listMyAttempts).toHaveBeenCalledWith('user-1');
  });

  it('getReadiness repassa userId e attemptId', async () => {
    mockService.getReadiness.mockResolvedValue({ score: 0.8 });
    await expect(
      controller.getReadiness(user, '00000000-0000-0000-0000-000000000002'),
    ).resolves.toEqual({ score: 0.8 });
    expect(mockService.getReadiness).toHaveBeenCalledWith(
      'user-1',
      '00000000-0000-0000-0000-000000000002',
    );
  });
});
