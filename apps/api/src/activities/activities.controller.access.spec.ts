import { ForbiddenException } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';

describe('ActivitiesController access', () => {
  const activities = { findByCourse: jest.fn(), findById: jest.fn(), syncReview: jest.fn() };
  const access = { requireCourse: jest.fn(), requireActivity: jest.fn() };
  const drafts = { read: jest.fn(), save: jest.fn() };
  const controller = new ActivitiesController(activities as never, access as never, drafts as never);
  const user = { sub: 'student', role: 'student' } as never;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('rejects unauthorized reads, review synchronization and drafts', async () => {
    access.requireCourse.mockRejectedValue(new ForbiddenException());
    access.requireActivity.mockRejectedValue(new ForbiddenException());
    await expect(controller.findByCourse('course', undefined, user)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.findById('activity', user)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.readDraft('activity', user)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.syncReview('activity', user, { clientId: '1', score: 100, passed: true }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(activities.findByCourse).not.toHaveBeenCalled();
    expect(activities.findById).not.toHaveBeenCalled();
    expect(activities.syncReview).not.toHaveBeenCalled();
    expect(drafts.read).not.toHaveBeenCalled();
  });
});
