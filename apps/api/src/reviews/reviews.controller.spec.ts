import { Test, TestingModule } from '@nestjs/testing';
import { EntitlementsService } from '../plans/entitlements.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

/**
 * A10 (Lote 3 · portões do merge) — ReviewsController estava em 0%.
 * Delegação fina ao ReviewsService (o gate 'code-review' é do
 * FeatureGuard, coberto no seu próprio spec).
 */
describe('ReviewsController', () => {
  let controller: ReviewsController;
  const mockService = {
    requestAiReview: jest.fn(),
    listForSubmission: jest.fn(),
    listMine: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        {
          provide: EntitlementsService,
          useValue: { assertFeature: jest.fn(), assertAiTutorAccess: jest.fn() },
        },
        { provide: ReviewsService, useValue: mockService }],
    }).compile();
    controller = module.get<ReviewsController>(ReviewsController);
  });

  const user = { sub: 'user-1', role: 'student' } as JwtPayload;

  it('requestAiReview repassa userId e submissionId', async () => {
    mockService.requestAiReview.mockResolvedValue({ id: 'rev-1' });
    await expect(
      controller.requestAiReview(user, 'sub-1'),
    ).resolves.toEqual({ id: 'rev-1' });
    expect(mockService.requestAiReview).toHaveBeenCalledWith('user-1', 'sub-1');
  });

  it('listForSubmission repassa userId e submissionId', async () => {
    mockService.listForSubmission.mockResolvedValue([{ id: 'rev-1' }]);
    await expect(controller.listForSubmission(user, 'sub-1')).resolves.toEqual([
      { id: 'rev-1' },
    ]);
    expect(mockService.listForSubmission).toHaveBeenCalledWith('user-1', 'sub-1');
  });

  // Central 219 (D2) — GET /reviews/me.
  it('listMine repassa o userId do token', async () => {
    mockService.listMine.mockResolvedValue([{ id: 'rev-1' }]);
    await expect(controller.listMine(user)).resolves.toEqual([{ id: 'rev-1' }]);
    expect(mockService.listMine).toHaveBeenCalledWith('user-1');
  });
});
