import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role, SubmissionStatus } from '@prisma/client';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;
  let cache: any;
  let metrics: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      course: {
        count: jest.fn(),
      },
      enrollment: {
        count: jest.fn(),
      },
      activity: {
        count: jest.fn(),
      },
      submission: {
        count: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };

    cache = {
      get: jest.fn().mockResolvedValue('1'),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      delPattern: jest.fn().mockResolvedValue(undefined),
    };

    metrics = {
      snapshot: jest.fn().mockReturnValue({
        requestsTotal: 100,
        errorsTotal: 2,
        avgLatencyMs: 45,
        lastReset: new Date().toISOString(),
      }),
      activeSubmissions: 3,
    };

    service = new AdminService(prisma, cache, metrics);
  });

  describe('getUsers', () => {
    it('returns paginated users with counts and default page/limit', async () => {
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          email: 'admin@nexus.code',
          name: 'Nexus Admin',
          role: Role.admin,
          xp: 500,
          level: 5,
          streakDays: 10,
          talentVisible: true,
          giteaUserId: 1,
          lastActiveAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: {
            enrollments: 2,
            submissions: 10,
            instructedCourses: 1,
            badges: 3,
          },
        },
      ]);

      const result = await service.getUsers({ role: Role.admin, page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe('admin@nexus.code');
      expect(result.data[0].submissionsCount).toBe(10);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });
  });

  describe('updateUserRole', () => {
    it('updates role and invalidates cache', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.student, email: 'u1@test.com' });
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        email: 'u1@test.com',
        name: 'User One',
        role: Role.instructor,
        xp: 0,
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updated = await service.updateUserRole('u1', Role.instructor);
      expect(updated.role).toBe(Role.instructor);
      expect(cache.del).toHaveBeenCalledWith('user:u1:profile');
      expect(cache.delPattern).toHaveBeenCalledWith('leaderboard:*');
    });

    it('throws NotFoundException when user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateUserRole('non-existent', Role.admin)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createInstructor', () => {
    it('creates an instructor successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'inst-1',
        email: 'prof@nexus.edu',
        name: 'Professor Turing',
        role: Role.instructor,
        giteaUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createInstructor({
        email: 'prof@nexus.edu',
        name: 'Professor Turing',
        password: 'SecurePassword123!',
      });

      expect(result.id).toBe('inst-1');
      expect(result.role).toBe(Role.instructor);
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('throws ConflictException if email is already taken', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createInstructor({
          email: 'prof@nexus.edu',
          name: 'Professor Turing',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getMetrics', () => {
    it('collects and computes system and platform telemetry', async () => {
      prisma.user.count.mockResolvedValue(50);
      prisma.course.count.mockResolvedValue(10);
      prisma.enrollment.count.mockResolvedValue(120);
      prisma.activity.count.mockResolvedValue(40);
      prisma.submission.count.mockResolvedValue(200);

      const metricsRes = await service.getMetrics();
      expect(metricsRes.timestamp).toBeDefined();
      expect(metricsRes.platform.users.total).toBe(50);
      expect(metricsRes.system.memory).toBeDefined();
      expect(metricsRes.cache.status).toBe('connected');
    });
  });

  describe('getHealth', () => {
    it('returns healthy when database and redis respond', async () => {
      const health = await service.getHealth();
      expect(health.status).toBe('healthy');
      expect(health.services.database).toBe('up');
      expect(health.services.redis).toBe('up');
    });
  });
});
