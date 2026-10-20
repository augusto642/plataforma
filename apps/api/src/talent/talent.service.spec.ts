import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from '../courses/courses.service';
import { PrismaService } from '../prisma/prisma.service';
import { TalentService } from './talent.service';

/**
 * Specs de fumaça do TalentService (B04) — antes este módulo tinha zero
 * testes. Cobre os caminhos principais com Prisma/CoursesService mockados:
 * criar empresa (token só sai em claro na resposta, nunca persistido),
 * listar, deletar (feliz + não encontrada) e o leaderboard filtrado por
 * alunos que optaram por visibilidade (talentVisible).
 */
describe('TalentService', () => {
  let service: TalentService;

  const mockPrismaService = {
    company: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const mockCoursesService = {
    getLeaderboard: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TalentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CoursesService, useValue: mockCoursesService },
      ],
    }).compile();

    service = module.get<TalentService>(TalentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCompany', () => {
    it('cria a empresa com nome sem espaços extras e devolve o token em claro uma única vez', async () => {
      mockPrismaService.company.create.mockResolvedValue({
        id: 'company-1',
        name: 'ACME Tecnologia',
      });

      const result = await service.createCompany({ name: '  ACME Tecnologia  ' });

      expect(result.id).toBe('company-1');
      expect(result.name).toBe('ACME Tecnologia');
      // Token de acesso: 32 bytes aleatórios em hexadecimal.
      expect(result.token).toMatch(/^[0-9a-f]{64}$/);

      const createArgs = mockPrismaService.company.create.mock.calls[0][0];
      expect(createArgs.data.name).toBe('ACME Tecnologia');
      // O banco guarda apenas o hash — nunca o token em claro.
      expect(createArgs.data.tokenHash).toBeDefined();
      expect(createArgs.data.tokenHash).not.toBe(result.token);
    });
  });

  describe('listCompanies', () => {
    it('lista empresas da mais recente para a mais antiga, sem expor tokenHash', async () => {
      const companies = [
        { id: 'company-2', name: 'Beta', createdAt: new Date('2026-10-02') },
        { id: 'company-1', name: 'ACME', createdAt: new Date('2026-10-01') },
      ];
      mockPrismaService.company.findMany.mockResolvedValue(companies);

      const result = await service.listCompanies();

      expect(result).toEqual(companies);
      const findArgs = mockPrismaService.company.findMany.mock.calls[0][0];
      expect(findArgs.orderBy).toEqual({ createdAt: 'desc' });
      expect(findArgs.select).not.toHaveProperty('tokenHash');
    });
  });

  describe('deleteCompany', () => {
    it('remove a empresa quando ela existe', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({ id: 'company-1' });
      mockPrismaService.company.delete.mockResolvedValue({ id: 'company-1' });

      await expect(service.deleteCompany('company-1')).resolves.toBeUndefined();
      expect(mockPrismaService.company.delete).toHaveBeenCalledWith({
        where: { id: 'company-1' },
      });
    });

    it('lança NotFoundException quando a empresa não existe', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(null);

      await expect(service.deleteCompany('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockPrismaService.company.delete).not.toHaveBeenCalled();
    });
  });

  describe('getCourseLeaderboard', () => {
    it('mantém apenas alunos visíveis, recalcula o rank e anonimiza o candidato', async () => {
      mockCoursesService.getLeaderboard.mockResolvedValue([
        {
          userId: 'user-visible-0001',
          name: 'Maria Silva',
          xp: 900,
          level: 5,
          streakDays: 12,
          completedActivitiesCount: 20,
        },
        {
          userId: 'user-hidden-00002',
          name: 'João Oculto',
          xp: 800,
          level: 4,
          streakDays: 3,
          completedActivitiesCount: 15,
        },
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-visible-0001' },
      ]);

      const result = await service.getCourseLeaderboard('course-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        rank: 1,
        initials: 'MS',
        candidateId: 'cand_user-vis',
        xp: 900,
        level: 5,
        streakDays: 12,
        completedActivitiesCount: 20,
      });
    });

    it('retorna lista vazia sem consultar usuários quando o ranking está vazio', async () => {
      mockCoursesService.getLeaderboard.mockResolvedValue([]);

      const result = await service.getCourseLeaderboard('course-1');

      expect(result).toEqual([]);
      expect(mockPrismaService.user.findMany).not.toHaveBeenCalled();
    });
  });
});
