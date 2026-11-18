import { ConflictException } from '@nestjs/common';
import { ActivityDraftsService } from './activity-drafts.service';

describe('ActivityDraftsService', () => {
  const prisma = {
    activityDraft: { findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
  };
  const service = new ActivityDraftsService(prisma as never);

  beforeEach(() => jest.resetAllMocks());

  it('scopes reads and writes to the authenticated user', async () => {
    prisma.activityDraft.findUnique.mockResolvedValue(null);
    await service.read('alice', 'activity');
    expect(prisma.activityDraft.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_activityId: { userId: 'alice', activityId: 'activity' } },
    }));
    prisma.activityDraft.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.save('alice', 'activity', { code: 'new', revision: 3 }))
      .resolves.toEqual({ code: 'new', revision: 4 });
    expect(prisma.activityDraft.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'alice', activityId: 'activity', revision: 3 },
    }));
  });

  it('rejects concurrent creates and stale revisions without overwriting', async () => {
    prisma.activityDraft.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.save('alice', 'activity', { code: 'new', revision: 0 }))
      .rejects.toBeInstanceOf(ConflictException);
    prisma.activityDraft.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.save('alice', 'activity', { code: 'new', revision: 1 }))
      .rejects.toBeInstanceOf(ConflictException);
  });
});
