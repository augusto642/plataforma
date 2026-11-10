import { Test, TestingModule } from '@nestjs/testing';
import { EntitlementsService } from '../plans/entitlements.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { DiagnosticController } from './diagnostic.controller';
import { DiagnosticService } from './diagnostic.service';
import { SkillDiagnosticService } from './skill-diagnostic.service';

/**
 * A10 (Lote 3 · portões do merge) — DiagnosticController estava em 0%.
 * Delegação fina aos dois services (o gate 'diagnostic-full-map' das
 * rotas de skills é do FeatureGuard, coberto no seu próprio spec):
 * as rotas B09 são públicas e repassam o header de autorização opcional;
 * o mapa de skills repassa o targetJobId quando informado.
 */
describe('DiagnosticController', () => {
  let controller: DiagnosticController;
  const mockDiagnostic = {
    getPublicQuiz: jest.fn(),
    submit: jest.fn(),
    getResult: jest.fn(),
  };
  const mockSkillDiagnostic = {
    getSkillMap: jest.fn(),
    refreshSkillMap: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiagnosticController],
      providers: [
        {
          provide: EntitlementsService,
          useValue: { assertFeature: jest.fn(), assertAiTutorAccess: jest.fn() },
        },
        { provide: DiagnosticService, useValue: mockDiagnostic },
        { provide: SkillDiagnosticService, useValue: mockSkillDiagnostic },
      ],
    }).compile();
    controller = module.get<DiagnosticController>(DiagnosticController);
  });

  const user = { sub: 'user-1', role: 'student' } as JwtPayload;

  it('getQuiz devolve o quiz público do service', async () => {
    mockDiagnostic.getPublicQuiz.mockResolvedValue({ questions: [] });
    await expect(controller.getQuiz()).resolves.toEqual({ questions: [] });
  });

  it('submit repassa o DTO e o header de autorização (opcional)', async () => {
    mockDiagnostic.submit.mockResolvedValue({ sessionToken: 'tok-1' });
    const dto = { answers: [] } as never;
    await expect(
      controller.submit(dto, 'Bearer jwt-1'),
    ).resolves.toEqual({ sessionToken: 'tok-1' });
    expect(mockDiagnostic.submit).toHaveBeenCalledWith(dto, 'Bearer jwt-1');
  });

  it('submit sem header repassa undefined (resultado anônimo)', async () => {
    mockDiagnostic.submit.mockResolvedValue({ sessionToken: 'tok-2' });
    const dto = { answers: [] } as never;
    await controller.submit(dto, undefined);
    expect(mockDiagnostic.submit).toHaveBeenCalledWith(dto, undefined);
  });

  it('getResult repassa o sessionToken', async () => {
    mockDiagnostic.getResult.mockResolvedValue({ level: 'junior' });
    await expect(controller.getResult('tok-1')).resolves.toEqual({
      level: 'junior',
    });
    expect(mockDiagnostic.getResult).toHaveBeenCalledWith('tok-1');
  });

  it('getSkillMap repassa userId e targetJobId quando informado', async () => {
    mockSkillDiagnostic.getSkillMap.mockResolvedValue({ gaps: [] });
    await expect(controller.getSkillMap(user, 'job-1')).resolves.toEqual({
      gaps: [],
    });
    expect(mockSkillDiagnostic.getSkillMap).toHaveBeenCalledWith(
      'user-1',
      'job-1',
    );
  });

  it('getSkillMap sem targetJobId envia undefined ao service', async () => {
    mockSkillDiagnostic.getSkillMap.mockResolvedValue({ gaps: [] });
    await controller.getSkillMap(user, undefined);
    expect(mockSkillDiagnostic.getSkillMap).toHaveBeenCalledWith(
      'user-1',
      undefined,
    );
  });

  it('refreshSkillMap usa o userId do JWT', async () => {
    mockSkillDiagnostic.refreshSkillMap.mockResolvedValue({ refreshed: true });
    await expect(controller.refreshSkillMap(user)).resolves.toEqual({
      refreshed: true,
    });
    expect(mockSkillDiagnostic.refreshSkillMap).toHaveBeenCalledWith('user-1');
  });
});
