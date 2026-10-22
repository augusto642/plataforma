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
      count: jest.fn(),
    },
    enrollment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    activity: {
      count: jest.fn(),
    },
    submission: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    planInterestLead: {
      count: jest.fn(),
    },
    planInterest: {
      count: jest.fn(),
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

  describe('findPublicCatalog (B74)', () => {
    it('projeta só os campos da vitrine e deriva a contagem do _count real', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.course.findMany.mockResolvedValue([
        {
          slug: 'introducao-python',
          title: 'Introdução à Programação com Python',
          description: 'Domine a sintaxe limpa do Python.',
          activities: [
            { title: '1. Dobro de um Número', language: 'python' },
            { title: '2. Contagem de Vogais', language: 'python' },
          ],
          _count: { activities: 2 },
        },
      ]);

      const result = await service.findPublicCatalog();

      expect(mockPrismaService.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublicLibrary: false },
          orderBy: { createdAt: 'asc' },
        }),
      );
      expect(result).toEqual([
        {
          slug: 'introducao-python',
          title: 'Introdução à Programação com Python',
          description: 'Domine a sintaxe limpa do Python.',
          activityCount: 2,
          activities: [
            { title: '1. Dobro de um Número', language: 'python' },
            { title: '2. Contagem de Vogais', language: 'python' },
          ],
        },
      ]);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'courses:public-catalog',
        result,
        60,
      );
    });

    it('catálogo vazio é lista vazia (a vitrine mostra o estado, não inventa)', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.course.findMany.mockResolvedValue([]);

      await expect(service.findPublicCatalog()).resolves.toEqual([]);
    });

    it('retorna o cache do catálogo sem tocar o banco quando há cache', async () => {
      const cached = [{ slug: 'x', title: 'Do cache', activityCount: 1, activities: [] }];
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.findPublicCatalog();

      expect(result).toEqual(cached);
      expect(mockPrismaService.course.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findPublicStats (B77 · Sprint 19)', () => {
    it('agrega as contagens vivas com as réguas declaradas e soma os interessados', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.course.count.mockResolvedValue(2);
      mockPrismaService.activity.count.mockResolvedValue(5);
      mockPrismaService.user.count.mockResolvedValue(42);
      mockPrismaService.planInterestLead.count.mockResolvedValue(4);
      mockPrismaService.planInterest.count.mockResolvedValue(3);

      const result = await service.findPublicStats();

      // Cursos e atividades: a régua do catálogo público (fora a
      // biblioteca interna) — a mesma do findPublicCatalog.
      expect(mockPrismaService.course.count).toHaveBeenCalledWith({
        where: { isPublicLibrary: false },
      });
      expect(mockPrismaService.activity.count).toHaveBeenCalledWith({
        where: { course: { isPublicLibrary: false } },
      });
      // Alunos: só o papel de aluno — admin e instrutor fora da
      // contagem pela própria role; nenhum dado individual sai.
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: { role: 'student' },
      });
      expect(result).toEqual({
        publishedCourses: 2,
        publishedActivities: 5,
        registeredStudents: 42,
        planInterestTotal: 7,
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'courses:public-stats',
        result,
        60,
      );
    });

    it('zero real é devolvido como zero (a landing exibe zero, não estima)', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.course.count.mockResolvedValue(0);
      mockPrismaService.activity.count.mockResolvedValue(0);
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.planInterestLead.count.mockResolvedValue(0);
      mockPrismaService.planInterest.count.mockResolvedValue(0);

      await expect(service.findPublicStats()).resolves.toEqual({
        publishedCourses: 0,
        publishedActivities: 0,
        registeredStudents: 0,
        planInterestTotal: 0,
      });
    });

    it('retorna o cache das estatísticas sem tocar o banco quando há cache', async () => {
      const cached = {
        publishedCourses: 2,
        publishedActivities: 5,
        registeredStudents: 42,
        planInterestTotal: 7,
      };
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.findPublicStats();

      expect(result).toEqual(cached);
      expect(mockPrismaService.course.count).not.toHaveBeenCalled();
      expect(mockPrismaService.user.count).not.toHaveBeenCalled();
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

  // B30 (Sprint 10) — a verificação pública de certificados consulta
  // apenas o código persistido na emissão. Antes, a página /verify
  // fabricava um certificado "válido" para qualquer hash digitado.
  describe('certificados (B30)', () => {
    const validCode = 'a'.repeat(64);
    const issuedAt = new Date('2026-03-05T18:42:19Z');

    beforeEach(() => {
      mockPrismaService.enrollment.findFirst.mockReset();
      mockPrismaService.enrollment.update.mockReset();
    });

    it('verifyCertificateByCode devolve o registro real de um código emitido', async () => {
      mockPrismaService.enrollment.findFirst.mockResolvedValue({
        certificateCode: validCode,
        certificateIssuedAt: issuedAt,
        user: { name: 'Maria Silva' },
        course: { title: 'APIs com Go', slug: 'apis-go' },
      });

      const result = await service.verifyCertificateByCode(validCode);

      expect(result).toEqual({
        valid: true,
        studentName: 'Maria Silva',
        courseTitle: 'APIs com Go',
        courseSlug: 'apis-go',
        completedAt: issuedAt,
        verificationCode: validCode,
      });
      expect(mockPrismaService.enrollment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { certificateCode: validCode } }),
      );
    });

    it('verifyCertificateByCode aceita o código com prefixo sha256: e maiúsculas', async () => {
      mockPrismaService.enrollment.findFirst.mockResolvedValue({
        certificateCode: validCode,
        certificateIssuedAt: issuedAt,
        user: { name: 'Maria Silva' },
        course: { title: 'APIs com Go', slug: 'apis-go' },
      });

      const result = await service.verifyCertificateByCode(`SHA256:${validCode.toUpperCase()}`);

      expect(result.valid).toBe(true);
      expect(mockPrismaService.enrollment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { certificateCode: validCode } }),
      );
    });

    it('verifyCertificateByCode lança NotFound para código bem-formado desconhecido', async () => {
      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);

      await expect(service.verifyCertificateByCode('b'.repeat(64))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('verifyCertificateByCode lança NotFound para lixo (sem tocar o banco)', async () => {
      await expect(service.verifyCertificateByCode('check')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.verifyCertificateByCode('')).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrismaService.enrollment.findFirst).not.toHaveBeenCalled();
    });

    it('getCertificate persiste o código na matrícula na primeira emissão', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: 'course-1',
        title: 'APIs com Go',
        slug: 'apis-go',
      });
      mockPrismaService.enrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        certificateCode: null,
      });
      mockPrismaService.activity.count.mockResolvedValue(1);
      mockPrismaService.submission.findMany.mockResolvedValue([
        { activityId: 'act-1', createdAt: issuedAt },
      ]);
      mockPrismaService.user.findUnique.mockResolvedValue({ name: 'Maria Silva' });
      mockPrismaService.enrollment.update.mockResolvedValue({});

      const result = await service.getCertificate('course-1', 'student-1');

      expect(result.studentName).toBe('Maria Silva');
      expect(result.verificationCode).toMatch(/^[a-f0-9]{64}$/);
      expect(mockPrismaService.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            certificateCode: result.verificationCode,
            certificateIssuedAt: issuedAt,
          }),
        }),
      );
    });

    it('getCertificate não sobrescreve o código já emitido', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: 'course-1',
        title: 'APIs com Go',
        slug: 'apis-go',
      });
      mockPrismaService.enrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        certificateCode: validCode,
      });
      mockPrismaService.activity.count.mockResolvedValue(1);
      mockPrismaService.submission.findMany.mockResolvedValue([
        { activityId: 'act-1', createdAt: issuedAt },
      ]);
      mockPrismaService.user.findUnique.mockResolvedValue({ name: 'Maria Silva' });

      await service.getCertificate('course-1', 'student-1');

      expect(mockPrismaService.enrollment.update).not.toHaveBeenCalled();
    });
  });
});
