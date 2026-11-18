import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ActivityAccessService } from './activity-access.service';

describe('ActivityAccessService', () => {
  const prisma = {
    activity: { findUnique: jest.fn() },
    course: { findUnique: jest.fn() },
    enrollment: { findUnique: jest.fn() },
    challenge: { findFirst: jest.fn() },
  };
  const service = new ActivityAccessService(prisma as never);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.activity.findUnique.mockResolvedValue({ courseId: 'course' });
    prisma.course.findUnique.mockResolvedValue({ instructorId: 'teacher', isPublicLibrary: false });
    prisma.enrollment.findUnique.mockResolvedValue(null);
    prisma.challenge.findFirst.mockResolvedValue(null);
  });

  it('allows enrolled students, course instructors, admins and public library', async () => {
    prisma.enrollment.findUnique.mockResolvedValueOnce({ id: 'enrollment' });
    await expect(service.requireActivity('activity', 'student', 'student')).resolves.toBeUndefined();
    await expect(service.requireActivity('activity', 'teacher', 'instructor')).resolves.toBeUndefined();
    await expect(service.requireActivity('activity', 'admin', 'admin')).resolves.toBeUndefined();
    prisma.course.findUnique.mockResolvedValue({ instructorId: 'teacher', isPublicLibrary: true });
    await expect(service.requireActivity('activity', 'student', 'student')).resolves.toBeUndefined();
  });

  it('allows an active weekly challenge without enrollment', async () => {
    prisma.challenge.findFirst.mockResolvedValue({ id: 'challenge' });
    await expect(service.requireActivity('activity', 'student', 'student')).resolves.toBeUndefined();
    expect(prisma.challenge.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ activityId: 'activity', startsAt: { lte: expect.any(Date) }, endsAt: { gte: expect.any(Date) } }),
    }));
  });

  it('denies unrelated users and missing activities', async () => {
    await expect(service.requireActivity('activity', 'student', 'student')).rejects.toBeInstanceOf(ForbiddenException);
    prisma.activity.findUnique.mockResolvedValue(null);
    await expect(service.requireActivity('missing', 'student', 'student')).rejects.toBeInstanceOf(NotFoundException);
  });
});
