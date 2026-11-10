import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { EntitlementsService } from '../plans/entitlements.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  CommunityAdminController,
  CommunityController,
  PeerReviewsController,
} from './community.controller';
import { CommunityService } from './community.service';
import { PeerReviewsService } from './peer-reviews.service';

/**
 * A10 (Lote 3 · portões do merge) — CommunityController,
 * PeerReviewsController e CommunityAdminController estavam em 0%.
 * Delegação fina aos services (o gate 'community-post' é do
 * FeatureGuard, coberto no seu próprio spec): ler é livre, postar/
 * revisar exige o plano — aqui trava-se só o repasse correto ao
 * service, método a método.
 */
describe('CommunityController', () => {
  let controller: CommunityController;
  const mockCommunity = {
    listThreads: jest.fn(),
    createThread: jest.fn(),
    listPosts: jest.fn(),
    createPost: jest.fn(),
    flagPost: jest.fn(),
    listSolutions: jest.fn(),
    shareSolution: jest.fn(),
    unshareSolution: jest.fn(),
    reviewerReputation: jest.fn(),
    flaggedQueue: jest.fn(),
    hidePost: jest.fn(),
    clearFlag: jest.fn(),
  };
  const mockPeers = {
    requestPeerReview: jest.fn(),
    listOpenRequests: jest.fn(),
    submitReview: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        CommunityController,
        PeerReviewsController,
        CommunityAdminController,
      ],
      providers: [
        { provide: CommunityService, useValue: mockCommunity },
        { provide: PeerReviewsService, useValue: mockPeers },
        {
          provide: EntitlementsService,
          useValue: { assertFeature: jest.fn(), assertAiTutorAccess: jest.fn() },
        },
        { provide: Reflector, useValue: new Reflector() },
      ],
    }).compile();
    controller = module.get<CommunityController>(CommunityController);
  });

  const user = { sub: 'user-1', role: 'student' } as JwtPayload;

  it('listThreads repassa o activityId (ou undefined sem filtro)', async () => {
    mockCommunity.listThreads.mockResolvedValue([]);
    await controller.listThreads('act-1');
    expect(mockCommunity.listThreads).toHaveBeenCalledWith('act-1');
    await controller.listThreads(undefined);
    expect(mockCommunity.listThreads).toHaveBeenCalledWith(undefined);
  });

  it('createThread repassa userId, título, corpo e activityId', async () => {
    mockCommunity.createThread.mockResolvedValue({ id: 'th-1' });
    await expect(
      controller.createThread(user, {
        title: 'Dúvida',
        body: 'Como...?',
        activityId: 'act-1',
      } as never),
    ).resolves.toEqual({ id: 'th-1' });
    expect(mockCommunity.createThread).toHaveBeenCalledWith(
      'user-1',
      'Dúvida',
      'Como...?',
      'act-1',
    );
  });

  it('listPosts repassa o id da thread', async () => {
    mockCommunity.listPosts.mockResolvedValue([]);
    await controller.listPosts('th-1');
    expect(mockCommunity.listPosts).toHaveBeenCalledWith('th-1');
  });

  it('createPost repassa userId, threadId e corpo', async () => {
    mockCommunity.createPost.mockResolvedValue({ id: 'post-1' });
    await controller.createPost(user, 'th-1', { body: 'resposta' } as never);
    expect(mockCommunity.createPost).toHaveBeenCalledWith(
      'user-1',
      'th-1',
      'resposta',
    );
  });

  it('flagPost repassa só o id do post', async () => {
    mockCommunity.flagPost.mockResolvedValue({ flagged: true });
    await expect(controller.flagPost('post-1')).resolves.toEqual({
      flagged: true,
    });
    expect(mockCommunity.flagPost).toHaveBeenCalledWith('post-1');
  });

  it('listSolutions repassa o activityId', async () => {
    mockCommunity.listSolutions.mockResolvedValue([]);
    await controller.listSolutions('act-1');
    expect(mockCommunity.listSolutions).toHaveBeenCalledWith('act-1');
  });

  it('share/unshare repassam userId e submissionId', async () => {
    mockCommunity.shareSolution.mockResolvedValue({ shared: true });
    mockCommunity.unshareSolution.mockResolvedValue({ shared: false });
    await expect(controller.shareSolution(user, 'sub-1')).resolves.toEqual({
      shared: true,
    });
    await expect(controller.unshareSolution(user, 'sub-1')).resolves.toEqual({
      shared: false,
    });
    expect(mockCommunity.shareSolution).toHaveBeenCalledWith('user-1', 'sub-1');
    expect(mockCommunity.unshareSolution).toHaveBeenCalledWith('user-1', 'sub-1');
  });

  it('reputation usa o userId do JWT', async () => {
    mockCommunity.reviewerReputation.mockResolvedValue({ score: 4 });
    await expect(controller.reputation(user)).resolves.toEqual({ score: 4 });
    expect(mockCommunity.reviewerReputation).toHaveBeenCalledWith('user-1');
  });
});

describe('PeerReviewsController', () => {
  let controller: PeerReviewsController;
  const mockCommunity = {
    listThreads: jest.fn(),
    createThread: jest.fn(),
    listPosts: jest.fn(),
    createPost: jest.fn(),
    flagPost: jest.fn(),
    listSolutions: jest.fn(),
    shareSolution: jest.fn(),
    unshareSolution: jest.fn(),
    reviewerReputation: jest.fn(),
    flaggedQueue: jest.fn(),
    hidePost: jest.fn(),
    clearFlag: jest.fn(),
  };
  const mockPeers = {
    requestPeerReview: jest.fn(),
    listOpenRequests: jest.fn(),
    submitReview: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        CommunityController,
        PeerReviewsController,
        CommunityAdminController,
      ],
      providers: [
        { provide: CommunityService, useValue: mockCommunity },
        { provide: PeerReviewsService, useValue: mockPeers },
        {
          provide: EntitlementsService,
          useValue: { assertFeature: jest.fn(), assertAiTutorAccess: jest.fn() },
        },
        { provide: Reflector, useValue: new Reflector() },
      ],
    }).compile();
    controller = module.get<PeerReviewsController>(PeerReviewsController);
  });

  const user = { sub: 'user-1', role: 'student' } as JwtPayload;

  it('requestPeerReview repassa userId e submissionId', async () => {
    mockPeers.requestPeerReview.mockResolvedValue({ id: 'pr-1' });
    await expect(
      controller.requestPeerReview(user, 'sub-1'),
    ).resolves.toEqual({ id: 'pr-1' });
    expect(mockPeers.requestPeerReview).toHaveBeenCalledWith('user-1', 'sub-1');
  });

  it('listOpenRequests usa o userId do JWT', async () => {
    mockPeers.listOpenRequests.mockResolvedValue([]);
    await expect(controller.listOpenRequests(user)).resolves.toEqual([]);
    expect(mockPeers.listOpenRequests).toHaveBeenCalledWith('user-1');
  });

  it('submitReview repassa userId, reviewId e o conteúdo da revisão', async () => {
    mockPeers.submitReview.mockResolvedValue({ id: 'pr-1' });
    const dto = {
      rubric: { legibilidade: 5 },
      summary: 'Bom',
      suggestions: ['x'],
    } as never;
    await expect(controller.submitReview(user, 'pr-1', dto)).resolves.toEqual({
      id: 'pr-1',
    });
    expect(mockPeers.submitReview).toHaveBeenCalledWith('user-1', 'pr-1', {
      rubric: { legibilidade: 5 },
      summary: 'Bom',
      suggestions: ['x'],
    });
  });
});

describe('CommunityAdminController', () => {
  let controller: CommunityAdminController;
  const mockCommunity = {
    listThreads: jest.fn(),
    createThread: jest.fn(),
    listPosts: jest.fn(),
    createPost: jest.fn(),
    flagPost: jest.fn(),
    listSolutions: jest.fn(),
    shareSolution: jest.fn(),
    unshareSolution: jest.fn(),
    reviewerReputation: jest.fn(),
    flaggedQueue: jest.fn(),
    hidePost: jest.fn(),
    clearFlag: jest.fn(),
  };
  const mockPeers = {
    requestPeerReview: jest.fn(),
    listOpenRequests: jest.fn(),
    submitReview: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        CommunityController,
        PeerReviewsController,
        CommunityAdminController,
      ],
      providers: [
        { provide: CommunityService, useValue: mockCommunity },
        { provide: PeerReviewsService, useValue: mockPeers },
        {
          provide: EntitlementsService,
          useValue: { assertFeature: jest.fn(), assertAiTutorAccess: jest.fn() },
        },
        { provide: Reflector, useValue: new Reflector() },
      ],
    }).compile();
    controller =
      module.get<CommunityAdminController>(CommunityAdminController);
  });

  it('flaggedQueue devolve a fila do service', async () => {
    mockCommunity.flaggedQueue.mockResolvedValue([{ id: 'post-1' }]);
    await expect(controller.flaggedQueue()).resolves.toEqual([
      { id: 'post-1' },
    ]);
  });

  it('hidePost e clearFlag repassam o id do post', async () => {
    mockCommunity.hidePost.mockResolvedValue({ hidden: true });
    mockCommunity.clearFlag.mockResolvedValue({ cleared: true });
    await expect(controller.hidePost('post-1')).resolves.toEqual({
      hidden: true,
    });
    await expect(controller.clearFlag('post-1')).resolves.toEqual({
      cleared: true,
    });
    expect(mockCommunity.hidePost).toHaveBeenCalledWith('post-1');
    expect(mockCommunity.clearFlag).toHaveBeenCalledWith('post-1');
  });
});
