import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../cache/cache.service';
import { GiteaService } from '../gitea/gitea.service';
import { PrismaService } from '../prisma/prisma.service';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';

/**
 * Specs de fumaça do CoursesService (B04) — antes este módulo tinha zero
 * testes. Cobre criação (feliz + slug duplicado), listagem com cache
 * (miss popula o cache, hit não toca o banco), leitura por id
 * (feliz + não encontrado) e matrícula por código de turma
 * (inválido + nova + já matriculado).
 */
describe('CoursesService', () => {
  let service: CoursesService;

  const instructorId = 'instructor-1';

  const mockPrismaService = {
    course: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    enrollment: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: GiteaService, useValue: {} },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      title: 'Lógica de Programação',
      slug: 'logica-de-programacao',
      description: 'Curso introdutório',
    } as CreateCourseDto;

    it('cria o curso com código de turma de 8 caracteres e invalida a lista em cache', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);
      mockPrismaService.course.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'course-1',
          ...data,
          instructor: { id: instructorId, name: 'Prof', email: 'prof@ex.com' },
        }),
      );

      const result = await service.create(instructorId, dto);

      expect(result.id).toBe('course-1');
      expect(result.instructorId).toBe(instructorId);
      expect(result.enrollmentCode).toMatch(/^[A-Z0-9]{8}$/);
      expect(mockCacheService.del).toHaveBeenCalledWith('courses:list');
    });

    it('lança ConflictException quando o slug já está em uso', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({ id: 'other' });

      await expect(service.create(instructorId, dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(mockPrismaService.course.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('busca no banco e popula o cache quando não há cache', async () => {
      const courses = [{ id: 'course-1', title: 'Lógica' }];
      mockPrismaService.course.findMany.mockResolvedValue(courses);

      const result = await service.findAll();

      expect(result).toEqual(courses);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'courses:list',
        courses,
        60,
      );
    });

    it('retorna o cache sem tocar o banco quando há cache', async () => {
      const cached = [{ id: 'course-cached', title: 'Do cache' }];
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.findAll();

      expect(result).toEqual(cached);
      expect(mockPrismaService.course.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('retorna o curso e grava no cache', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const course = { id: 'course-1', title: 'Lógica', activities: [] };
      mockPrismaService.course.findUnique.mockResolvedValue(course);

      const result = await service.findById('course-1');

      expect(result).toEqual(course);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'courses:course-1',
        course,
        120,
      );
    });

    it('lança NotFoundException quando o curso não existe', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('joinByCode', () => {
    const course = { id: 'course-1', title: 'Lógica', slug: 'logica' };

    it('lança NotFoundException para código de turma inválido', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        service.joinByCode('student-1', { code: 'XXXX0000' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrismaService.enrollment.create).not.toHaveBeenCalled();
    });

    it('matricula o aluno quando ele ainda não está matriculado', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(course);
      mockPrismaService.enrollment.findUnique.mockResolvedValue(null);
      mockPrismaService.enrollment.create.mockResolvedValue({ id: 'enr-1' });

      const result = await service.joinByCode('student-1', { code: ' abcd1234 ' });

      expect(result).toEqual({ course });
      // O código é normalizado (trim + maiúsculas) antes da busca.
      expect(mockPrismaService.course.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { enrollmentCode: 'ABCD1234' } }),
      );
      expect(mockPrismaService.enrollment.create).toHaveBeenCalledWith({
        data: { userId: 'student-1', courseId: 'course-1' },
      });
    });

    it('não duplica a matrícula de quem já está matriculado', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(course);
      mockPrismaService.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });

      const result = await service.joinByCode('student-1', { code: 'ABCD1234' });

      expect(result).toEqual({ course });
      expect(mockPrismaService.enrollment.create).not.toHaveBeenCalled();
    });
  });
});
