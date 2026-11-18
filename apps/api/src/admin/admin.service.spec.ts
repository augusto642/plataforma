import { ConflictException, NotFoundException } from '@nestjs/common';
import { Plan, Prisma, Role, SubmissionStatus } from '@prisma/client';
import { AdminService } from './admin.service';

/**
 * Mensagem genérica compartilhada com auth.service.register e users.service
 * (anti-enumeração de e-mail): não revela se o endereço já está cadastrado.
 */
const EMAIL_CONFLICT_MESSAGE =
  'Não foi possível concluir o cadastro com os dados informados. Verifique os campos e tente novamente.';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;
  let cache: any;
  let metrics: any;
  let aiUsage: any;
  let aiTutorFeedback: any;

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
      aiOperatorAuditEvent: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
        update: jest.fn().mockResolvedValue({ id: 'audit-1', status: 'succeeded' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      adminAuditEvent: {
        create: jest.fn().mockResolvedValue({ id: 'admin-audit-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((callback: (tx: any) => unknown) => callback(prisma)),
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
      queueMetrics: jest.fn().mockResolvedValue([
        {
          name: 'submissions',
          available: true,
          waiting: 1,
          active: 2,
          completed: 3,
          failed: 4,
          delayed: 5,
        },
      ]),
      activeSubmissions: 3,
    };

    aiUsage = {
      getDailyOperations: jest.fn().mockResolvedValue({
        calls: 4,
        failedCalls: 1,
        blockedCalls: 2,
        fallbackCalls: 3,
        fallbackRate: 0.5,
        promptTokens: 300,
        completionTokens: 120,
        totalTokens: 420,
        pricedCalls: 3,
        unpricedCalls: 1,
        estimatedCostUsd: 0.0012,
        pricingCheckedAt: '2026-11-14',
      }),
    };

    aiTutorFeedback = {
      getQualitySummary: jest.fn().mockResolvedValue({
        windowDays: 30,
        total: 0,
        helpful: 0,
        notHelpful: 0,
        concerns: { tooMuchAnswer: 0, incorrect: 0, unclear: 0 },
      }),
    };

    service = new AdminService(prisma, cache, metrics, aiUsage, aiTutorFeedback);
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

      const updated = await service.updateUserRole('u1', Role.instructor, 'admin-1');
      expect(updated.role).toBe(Role.instructor);
      expect(prisma.adminAuditEvent.create).toHaveBeenCalledWith({
        data: {
          adminId: 'admin-1',
          action: 'user.role.updated',
          targetType: 'user',
          targetId: 'u1',
          previousValue: Role.student,
          newValue: Role.instructor,
        },
      });
      expect(cache.del).toHaveBeenCalledWith('user:u1:profile');
      expect(cache.delPattern).toHaveBeenCalledWith('leaderboard:*');
    });

    it('rejects if the audit record cannot be stored inside the transaction', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.student });
      prisma.user.update.mockResolvedValue({ id: 'u1', role: Role.admin });
      prisma.adminAuditEvent.create.mockRejectedValue(new Error('audit storage unavailable'));

      await expect(service.updateUserRole('u1', Role.admin, 'admin-1')).rejects.toThrow(
        'audit storage unavailable',
      );
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('throws NotFoundException when user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateUserRole('non-existent', Role.admin, 'admin-1')).rejects.toThrow(NotFoundException);
      expect(prisma.adminAuditEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('updateUserPlan', () => {
    it('records the administrator and plan transition atomically', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', plan: Plan.free });
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        email: 'u1@test.com',
        name: 'User One',
        role: Role.student,
        plan: Plan.pro,
        updatedAt: new Date(),
      });

      const updated = await service.updateUserPlan('u1', Plan.pro, 'admin-1');

      expect(updated.plan).toBe(Plan.pro);
      expect(prisma.adminAuditEvent.create).toHaveBeenCalledWith({
        data: {
          adminId: 'admin-1',
          action: 'user.plan.updated',
          targetType: 'user',
          targetId: 'u1',
          previousValue: Plan.free,
          newValue: Plan.pro,
        },
      });
    });
  });

  describe('listAdminAudit', () => {
    it('returns a bounded, privacy-minimal change history', async () => {
      const events = [{ id: 'admin-audit-1', action: 'user.role.updated' }];
      prisma.adminAuditEvent.findMany.mockResolvedValue(events);

      await expect(service.listAdminAudit()).resolves.toBe(events);
      expect(prisma.adminAuditEvent.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          adminId: true,
          action: true,
          targetType: true,
          targetId: true,
          previousValue: true,
          newValue: true,
          changedFields: true,
          createdAt: true,
        },
      });
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
      ).rejects.toThrow(EMAIL_CONFLICT_MESSAGE);
    });

    it('uses the same generic message on P2002 (anti-enumeration, race with the pre-check)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.createInstructor({
          email: 'prof@nexus.edu',
          name: 'Professor Turing',
        }),
      ).rejects.toThrow(EMAIL_CONFLICT_MESSAGE);
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
      expect(metricsRes.ai).toEqual({
        calls: 4,
        failedCalls: 1,
        blockedCalls: 2,
        fallbackCalls: 3,
        fallbackRate: 0.5,
        promptTokens: 300,
        completionTokens: 120,
        totalTokens: 420,
        pricedCalls: 3,
        unpricedCalls: 1,
        estimatedCostUsd: 0.0012,
        pricingCheckedAt: '2026-11-14',
      });
      expect(metricsRes.queues).toEqual([
        expect.objectContaining({ name: 'submissions', available: true, waiting: 1 }),
      ]);
      expect(metricsRes.aiQuality).toEqual(
        expect.objectContaining({ windowDays: 30, total: 0 }),
      );
      expect(aiUsage.getDailyOperations).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      );
    });

    describe('AI operator controls', () => {
      it('lists recent queue-control audit events with bounded fields', async () => {
        const events = [{ id: 'audit-1', queue: 'ai-reviews', status: 'succeeded' }];
        prisma.aiOperatorAuditEvent.findMany.mockResolvedValue(events);

        await expect(service.listAiOperatorAudit()).resolves.toBe(events);
        expect(prisma.aiOperatorAuditEvent.findMany).toHaveBeenCalledWith({
          orderBy: { createdAt: 'desc' },
          take: 25,
          select: {
            id: true,
            adminId: true,
            queue: true,
            action: true,
            reason: true,
            status: true,
            errorCode: true,
            createdAt: true,
            completedAt: true,
          },
        });
      });

      it('does not execute a queue action when the audit record cannot be written', async () => {
        prisma.aiOperatorAuditEvent.create.mockRejectedValue(new Error('database unavailable'));
        metrics.controlQueue = jest.fn();

        await expect(
          service.controlAiQueue(
            { queue: 'ai-reviews', action: 'pause', reason: 'Pausing during provider incident' },
            'admin-1',
          ),
        ).rejects.toThrow('database unavailable');
        expect(metrics.controlQueue).not.toHaveBeenCalled();
      });

      it('records an audit event before performing an allowlisted queue action', async () => {
        metrics.controlQueue = jest.fn().mockResolvedValue(undefined);
        prisma.aiOperatorAuditEvent.update.mockResolvedValue({
          id: 'audit-1',
          queue: 'ai-reviews',
          action: 'pause',
          status: 'succeeded',
        });

        await service.controlAiQueue(
          { queue: 'ai-reviews', action: 'pause', reason: 'Pausing during provider incident' },
          'admin-1',
        );

        expect(prisma.aiOperatorAuditEvent.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              adminId: 'admin-1',
              queue: 'ai-reviews',
              action: 'pause',
            }),
          }),
        );
        expect(metrics.controlQueue).toHaveBeenCalledWith('ai-reviews', 'pause');
        expect(prisma.aiOperatorAuditEvent.update).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ status: 'succeeded' }) }),
        );
      });

      it('records failed controls and rethrows the queue error', async () => {
        const queueError = new Error('redis unavailable');
        metrics.controlQueue = jest.fn().mockRejectedValue(queueError);

        await expect(
          service.controlAiQueue(
            { queue: 'ai-reviews', action: 'resume', reason: 'Recover queue after incident' },
            'admin-1',
          ),
        ).rejects.toBe(queueError);
        expect(prisma.aiOperatorAuditEvent.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: 'failed',
              errorCode: 'QUEUE_CONTROL_FAILED',
            }),
          }),
        );
      });
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
