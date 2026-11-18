import { BadRequestException, ConflictException } from '@nestjs/common';
import { PlaygroundDraftsService } from './playground-drafts.service';

describe('PlaygroundDraftsService', () => {
  const prisma = {
    playgroundDraft: { findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
  };
  const service = new PlaygroundDraftsService(prisma as never);

  beforeEach(() => jest.resetAllMocks());

  it('scopes drafts to the authenticated user and language', async () => {
    prisma.playgroundDraft.findUnique.mockResolvedValue(null);
    await service.read('alice', 'python');
    expect(prisma.playgroundDraft.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_language: { userId: 'alice', language: 'python' } },
    }));
    prisma.playgroundDraft.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.save('alice', 'python', { code: 'print(1)', revision: 2 }))
      .resolves.toEqual({ code: 'print(1)', revision: 3 });
    expect(prisma.playgroundDraft.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'alice', language: 'python', revision: 2 },
    }));
  });

  it('rejects invalid languages and conflicting revisions', async () => {
    expect(() => service.read('alice', 'java')).toThrow(BadRequestException);
    prisma.playgroundDraft.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.save('alice', 'javascript', { code: 'x', revision: 0 }))
      .rejects.toBeInstanceOf(ConflictException);
    prisma.playgroundDraft.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.save('alice', 'portugol', { code: 'x', revision: 1 }))
      .rejects.toBeInstanceOf(ConflictException);
  });
});
