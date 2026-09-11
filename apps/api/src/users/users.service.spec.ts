import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;
  let gitea: any;

  const userRow = {
    id: 'user-1',
    email: 'aluno@example.com',
    name: 'Aluno Teste',
    role: 'student',
    giteaUserId: 42,
    xp: 120,
    level: 2,
    streakDays: 1,
    lastActiveAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    badges: [{ id: 'b1', badgeCode: 'first_step', title: 'Primeiro Passo' }],
    chatMessages: [
      { id: 'm1', activityId: 'a1', role: 'user', content: 'duvida?', createdAt: new Date() },
    ],
    enrollments: [
      {
        createdAt: new Date('2026-01-02T00:00:00Z'),
        course: { id: 'c1', title: 'Logica', slug: 'logica' },
      },
    ],
    submissions: [
      {
        id: 's1',
        activityId: 'a1',
        commitSha: 'abc123',
        status: 'passed',
        score: 100,
        maxScore: 100,
        durationMs: 500,
        errorMessage: null,
        logs: null,
        codeSnapshot: 'console.log("hello")',
        aiFeedback: null,
        aiHints: null,
        xpAwarded: true,
        createdAt: new Date('2026-01-03T00:00:00Z'),
        updatedAt: new Date('2026-01-03T00:00:00Z'),
        testResults: [{ id: 't1', name: 'case 1', passed: true }],
      },
    ],
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: { deleteMany: jest.fn() },
      activity: { findMany: jest.fn().mockResolvedValue([]) },
    };
    gitea = {
      propagateDeletion: jest.fn().mockResolvedValue({
        ok: true,
        pending: false,
        userStatus: 'deleted',
        reposDeleted: ['plataforma/soma-aluno'],
        reposRenamed: [],
        reposFailed: [],
      }),
    };
    service = new UsersService(prisma, gitea);
  });

  describe('exportUserData', () => {
    it('returns named sections including codeSnapshot in submissions', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow);

      const result = await service.exportUserData('user-1');

      expect(result.exportedAt).toBeDefined();
      expect(result.sections.profile.email).toBe('aluno@example.com');
      expect(result.sections.gamification.badges).toHaveLength(1);
      expect(result.sections.chat.messages).toHaveLength(1);
      expect(result.sections.enrollments[0].course.slug).toBe('logica');
      expect(result.sections.submissions[0].codeSnapshot).toBe('console.log("hello")');
      expect(result.sections.submissions[0].testResults).toEqual([
        { id: 't1', name: 'case 1', passed: true },
      ]);
    });

    it('throws NotFoundException for unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.exportUserData('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes local data first, then propagates to Gitea, in order', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow);

      await service.delete('user-1');

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(gitea.propagateDeletion).toHaveBeenCalledWith('aluno', expect.any(Array));

      const order = [
        prisma.refreshToken.deleteMany.mock.invocationCallOrder[0],
        prisma.user.delete.mock.invocationCallOrder[0],
        gitea.propagateDeletion.mock.invocationCallOrder[0],
      ];
      expect(order).toEqual([...order].sort((a, b) => a - b));
    });

    it('does not throw when Gitea propagation fails', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow);
      gitea.propagateDeletion.mockRejectedValue(new Error('gitea unreachable'));

      await expect(service.delete('user-1')).resolves.toBeUndefined();
      expect(prisma.user.delete).toHaveBeenCalledTimes(1);
    });

    it('returns 409 (not 500) when the instructor still owns courses (A4 regression)', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow);
      prisma.user.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('FK restrict', {
          code: 'P2003',
          clientVersion: 'test',
        }),
      );

      await expect(service.delete('user-1')).rejects.toThrow(ConflictException);
    });

    it('does not throw when Gitea reports pending deletion', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow);
      gitea.propagateDeletion.mockResolvedValue({
        ok: false,
        pending: true,
        userStatus: 'failed',
        reposDeleted: [],
        reposRenamed: [],
        reposFailed: ['plataforma/soma-aluno'],
      });

      await expect(service.delete('user-1')).resolves.toBeUndefined();
    });

    it('throws NotFoundException when the user does not exist and skips Gitea', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.delete('missing')).rejects.toThrow(NotFoundException);
      expect(gitea.propagateDeletion).not.toHaveBeenCalled();
    });

    it('skips Gitea propagation when no username can be derived', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...userRow, email: '', name: '' });

      await expect(service.delete('user-1')).resolves.toBeUndefined();
      expect(gitea.propagateDeletion).not.toHaveBeenCalled();
    });
  });

  describe('giteaUsernameFor', () => {
    it('derives the Gitea username from the email local part', () => {
      expect(service.giteaUsernameFor({ email: 'Joao.Silva@Example.com', name: 'Joao' })).toBe(
        'joao.silva',
      );
    });

    it('falls back to the sanitized name when the email yields nothing', () => {
      expect(service.giteaUsernameFor({ email: '@x.com', name: 'Maria Ana' })).toBe('mariaana');
    });
  });

  describe('getMe', () => {
    it('returns the user profile when found', async () => {
      const mockProfile = {
        id: 'user-1',
        email: 'aluno@example.com',
        name: 'Aluno Teste',
        role: 'student',
        xp: 120,
        level: 2,
        streakDays: 1,
        talentVisible: true,
        createdAt: new Date(),
      };
      prisma.user.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getMe('user-1');
      expect(result).toEqual(mockProfile);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: expect.objectContaining({
          id: true,
          email: true,
          name: true,
          role: true,
          xp: true,
          level: true,
          streakDays: true,
          talentVisible: true,
          createdAt: true,
        }),
      });
    });

    it('throws NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('missing')).rejects.toThrow(NotFoundException);
    });
  });
});