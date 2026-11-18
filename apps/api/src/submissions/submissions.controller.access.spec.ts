import { ForbiddenException } from '@nestjs/common';
import { SubmissionsController } from './submissions.controller';

describe('SubmissionsController activity access', () => {
  it('checks access before running or submitting code', async () => {
    const submissions = { practice: jest.fn(), create: jest.fn(), battleRun: jest.fn() };
    const access = { requireActivity: jest.fn().mockRejectedValue(new ForbiddenException()) };
    const controller = new SubmissionsController(submissions as never, {} as never, access as never);
    const user = { sub: 'student', role: 'student' } as never;
    await expect(controller.practice(user, { activityId: 'a', code: 'x' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.create(user, { activityId: 'a', code: 'x' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.battleRun(user, { activityId: 'a', companionId: 'c', code: 'x', language: 'python' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(submissions.practice).not.toHaveBeenCalled();
    expect(submissions.create).not.toHaveBeenCalled();
    expect(submissions.battleRun).not.toHaveBeenCalled();
  });
});
