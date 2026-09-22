import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsersService } from './users.service';

/**
 * Mensagem genérica compartilhada com auth.service.register e admin.service
 * (anti-enumeração de e-mail): não revela se o endereço já está cadastrado.
 */
const EMAIL_CONFLICT_MESSAGE =
  'Não foi possível concluir o cadastro com os dados informados. Verifique os campos e tente novamente.';

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

  describe('create (anti-enumeration)', () => {
    it('uses the generic message (same as auth.register) on duplicate email (P2002)', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.create({
          email: 'aluno@example.com',
          name: 'Aluno Teste',
          password: 'SenhaForte123!',
        }),
      ).rejects.toThrow(EMAIL_CONFLICT_MESSAGE);
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

  describe('checkNickname', () => {
    it('returns unavailable if nickname is empty or not provided', async () => {
      const res = await service.checkNickname('');
      expect(res.available).toBe(false);
      expect(res.reason).toBe('Nickname não fornecido.');
    });

    it('returns unavailable if nickname contains invalid characters or wrong length', async () => {
      const tooShort = await service.checkNickname('ab');
      expect(tooShort.available).toBe(false);

      const invalidChars = await service.checkNickname('dev@123!');
      expect(invalidChars.available).toBe(false);
      expect(invalidChars.reason).toContain('alfanumérico');
    });

    it('returns unavailable if nickname is in reserved blacklist', async () => {
      const res = await service.checkNickname('admin');
      expect(res.available).toBe(false);
      expect(res.reason).toContain('reservado');

      const upperRoot = await service.checkNickname('ROOT');
      expect(upperRoot.available).toBe(false);
    });

    it('returns unavailable if nickname already exists in database (case-insensitive)', async () => {
      prisma.user.findFirst = jest.fn().mockResolvedValue({ id: 'existing-id' });

      const res = await service.checkNickname('DevHero');
      expect(res.available).toBe(false);
      expect(res.reason).toContain('já em uso');
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          nickname: {
            equals: 'DevHero',
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });
    });

    it('returns available true when nickname is valid and unique', async () => {
      prisma.user.findFirst = jest.fn().mockResolvedValue(null);

      const res = await service.checkNickname('super_coder_42');
      expect(res.available).toBe(true);
      expect(res.reason).toBeUndefined();
    });
  });

  describe('updateCareerTier', () => {
    it('allows setting beginner career tier', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.user.update.mockResolvedValue({ id: 'user-1', careerTier: 'beginner' });

      const res = await service.updateCareerTier('user-1', 'beginner');
      expect(res.careerTier).toBe('beginner');
    });

    it('blocks junior, mid, and senior career tiers with ForbiddenException', async () => {
      await expect(service.updateCareerTier('user-1', 'junior')).rejects.toThrow(
        'Patente bloqueada: conclua o nível Iniciante primeiro',
      );
      await expect(service.updateCareerTier('user-1', 'mid')).rejects.toThrow(
        'Patente bloqueada: conclua o nível Iniciante primeiro',
      );
      await expect(service.updateCareerTier('user-1', 'senior')).rejects.toThrow(
        'Patente bloqueada: conclua o nível Iniciante primeiro',
      );
    });
  });

  describe('adoptCompanion', () => {
    beforeEach(() => {
      prisma.userCompanion = {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      };
    });

    it('creates new companion if none exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.userCompanion.findUnique.mockResolvedValue(null);
      prisma.userCompanion.create.mockResolvedValue({
        id: 'comp-1',
        userId: 'user-1',
        starterName: 'pythox',
        currentStage: 1,
        xp: 0,
      });

      const res = await service.adoptCompanion('user-1', 'pythox');
      expect(res.starterName).toBe('pythox');
      expect(res.currentStage).toBe(1);
    });
  });
});