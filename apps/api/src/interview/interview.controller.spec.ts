import { Test, TestingModule } from '@nestjs/testing';
import { EntitlementsService } from '../plans/entitlements.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';

/**
 * A10 (Lote 3 · portões do merge) — InterviewController estava em 0%.
 * Delegação fina ao InterviewService (o gate 'interview-simulator' é
 * do FeatureGuard, coberto no seu próprio spec): cada rota repassa o
 * userId do JWT e os parâmetros ao método certo do service.
 */
describe('InterviewController', () => {
  let controller: InterviewController;
  const mockService = {
    createSession: jest.fn(),
    listMySessions: jest.fn(),
    getSession: jest.fn(),
    answer: jest.fn(),
    finish: jest.fn(),
    getReport: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InterviewController],
      providers: [
        {
          provide: EntitlementsService,
          useValue: { assertFeature: jest.fn(), assertAiTutorAccess: jest.fn() },
        },
        { provide: InterviewService, useValue: mockService }],
    }).compile();
    controller = module.get<InterviewController>(InterviewController);
  });

  const user = { sub: 'user-1', role: 'student' } as JwtPayload;

  it('createSession repassa userId, mode e track', async () => {
    mockService.createSession.mockResolvedValue({ id: 'sess-1' });
    const result = await controller.createSession(user, {
      mode: 'mock',
      track: 'backend',
    } as never);
    expect(mockService.createSession).toHaveBeenCalledWith(
      'user-1',
      'mock',
      'backend',
    );
    expect(result).toEqual({ id: 'sess-1' });
  });

  it('listMySessions usa o userId do JWT', async () => {
    mockService.listMySessions.mockResolvedValue([{ id: 'sess-1' }]);
    await expect(controller.listMySessions(user)).resolves.toEqual([
      { id: 'sess-1' },
    ]);
    expect(mockService.listMySessions).toHaveBeenCalledWith('user-1');
  });

  it('getSession repassa userId e id', async () => {
    mockService.getSession.mockResolvedValue({ id: 'sess-1' });
    await expect(controller.getSession(user, 'sess-1')).resolves.toEqual({
      id: 'sess-1',
    });
    expect(mockService.getSession).toHaveBeenCalledWith('user-1', 'sess-1');
  });

  it('answer repassa userId, id e conteúdo', async () => {
    mockService.answer.mockResolvedValue({ ok: true });
    await expect(
      controller.answer(user, 'sess-1', { content: 'resposta' } as never),
    ).resolves.toEqual({ ok: true });
    expect(mockService.answer).toHaveBeenCalledWith(
      'user-1',
      'sess-1',
      'resposta',
    );
  });

  it('finish repassa userId e id', async () => {
    mockService.finish.mockResolvedValue({ finished: true });
    await expect(controller.finish(user, 'sess-1')).resolves.toEqual({
      finished: true,
    });
    expect(mockService.finish).toHaveBeenCalledWith('user-1', 'sess-1');
  });

  it('getReport repassa userId e id', async () => {
    mockService.getReport.mockResolvedValue({ score: 7 });
    await expect(controller.getReport(user, 'sess-1')).resolves.toEqual({
      score: 7,
    });
    expect(mockService.getReport).toHaveBeenCalledWith('user-1', 'sess-1');
  });
});
