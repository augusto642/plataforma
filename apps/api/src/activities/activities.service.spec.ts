import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';

/**
 * Specs de fumaça do ActivitiesService (B04) — antes este módulo tinha zero
 * testes. Cobre criação (feliz + curso inexistente + slug duplicado +
 * instrutor não dono), listagem de conceitos, leitura com a regra de
 * privacidade (hiddenTests/referenceSolution só para admin/instrutor dono)
 * e a atividade diária sem matrículas.
 */
describe('ActivitiesService', () => {
  let service: ActivitiesService;

  const instructorId = 'instructor-1';
  const course = { id: 'course-1', instructorId, isPublicLibrary: false };

  const mockPrismaService = {
    course: {
      findUnique: jest.fn(),
    },
    activity: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
    },
    enrollment: {
      findMany: jest.fn(),
    },
    submission: {
      findMany: jest.fn(),
    },
  };

  const createDto = {
    courseId: 'course-1',
    title: 'Olá, mundo',
    slug: 'ola-mundo',
    description: 'Primeira atividade',
    initialCode: 'console.log("oi")',
  } as CreateActivityDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('cria a atividade do instrutor dono aplicando os padrões (JS, 5s, 256MB)', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(course);
      mockPrismaService.activity.findUnique.mockResolvedValue(null);
      mockPrismaService.activity.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'activity-1', ...data }),
      );

      const result = await service.create(createDto, instructorId, 'instructor');

      expect(result.id).toBe('activity-1');
      const createArgs = mockPrismaService.activity.create.mock.calls[0][0];
      expect(createArgs.data.language).toBe('javascript');
      expect(createArgs.data.timeLimitMs).toBe(5000);
      expect(createArgs.data.memoryLimitMb).toBe(256);
      expect(createArgs.data.conceptTags).toEqual([]);
    });

    it('lança NotFoundException quando o curso não existe', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        service.create(createDto, instructorId, 'instructor'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrismaService.activity.create).not.toHaveBeenCalled();
    });

    it('lança ConflictException quando o slug já existe no curso', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(course);
      mockPrismaService.activity.findUnique.mockResolvedValue({ id: 'other' });

      await expect(
        service.create(createDto, instructorId, 'instructor'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(mockPrismaService.activity.create).not.toHaveBeenCalled();
    });

    it('lança ForbiddenException para instrutor que não é dono do curso', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(course);

      await expect(
        service.create(createDto, 'another-instructor', 'instructor'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockPrismaService.activity.create).not.toHaveBeenCalled();
    });
  });

  describe('getConcepts', () => {
    it('retorna as tags únicas ordenadas de todas as atividades', async () => {
      mockPrismaService.activity.findMany.mockResolvedValue([
        { conceptTags: ['loops', 'variaveis'] },
        { conceptTags: ['loops', 'funcoes'] },
        { conceptTags: [] },
      ]);

      await expect(service.getConcepts()).resolves.toEqual([
        'funcoes',
        'loops',
        'variaveis',
      ]);
    });
  });

  describe('findById', () => {
    const storedActivity = {
      id: 'activity-1',
      title: 'Olá, mundo',
      slug: 'ola-mundo',
      hiddenTests: 'testes ocultos',
      referenceSolution: 'solução de referência',
      course: {
        id: 'course-1',
        title: 'Curso',
        slug: 'curso',
        instructorId,
      },
    };

    it('não expõe hiddenTests nem referenceSolution para aluno', async () => {
      mockPrismaService.activity.findUnique.mockResolvedValue(storedActivity);

      const result = await service.findById('activity-1', 'student', 'student-1');

      expect(result).not.toHaveProperty('hiddenTests');
      expect(result).not.toHaveProperty('referenceSolution');
      expect(result.course).toEqual({
        id: 'course-1',
        title: 'Curso',
        slug: 'curso',
      });
    });

    it('expõe os campos privilegiados para o instrutor dono do curso', async () => {
      mockPrismaService.activity.findUnique.mockResolvedValue(storedActivity);

      const result = (await service.findById(
        'activity-1',
        'instructor',
        instructorId,
      )) as Record<string, unknown>;

      expect(result.hiddenTests).toBe('testes ocultos');
      expect(result.referenceSolution).toBe('solução de referência');
    });

    it('lança NotFoundException quando a atividade não existe', async () => {
      mockPrismaService.activity.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getDaily', () => {
    it('retorna activity null quando o aluno não tem matrículas', async () => {
      mockPrismaService.enrollment.findMany.mockResolvedValue([]);

      await expect(service.getDaily('student-1')).resolves.toEqual({
        activity: null,
      });
      expect(mockPrismaService.activity.findMany).not.toHaveBeenCalled();
    });
  });
});
