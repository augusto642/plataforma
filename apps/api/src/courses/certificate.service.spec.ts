import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CertificateService } from './certificate.service';

/**
 * Fase 1 premium — certificado verificável:
 * - Certificate primeiro, Enrollment como fallback;
 * - revogado = não encontrado (e NÃO volta pelo fallback);
 * - emissão exige matrícula + conclusão real.
 */
describe('CertificateService', () => {
  let service: CertificateService;

  const code = 'c'.repeat(64);
  const mockPrisma = {
    certificate: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    course: { findUnique: jest.fn() },
    enrollment: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    activity: { count: jest.fn() },
    submission: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<CertificateService>(CertificateService);
  });

  it('verify: Certificate válido vence, sem consultar a matrícula', async () => {
    mockPrisma.certificate.findUnique.mockResolvedValue({
      code,
      revokedAt: null,
      title: 'Python Completo',
      kind: 'module',
      issuedAt: new Date('2026-03-05T00:00:00Z'),
      user: { name: 'Maria Silva' },
    });

    const result = await service.verifyByCode(code);

    expect(result.valid).toBe(true);
    expect(result.studentName).toBe('Maria Silva');
    expect(mockPrisma.enrollment.findFirst).not.toHaveBeenCalled();
  });

  it('verify: revogado não volta pelo fallback da matrícula', async () => {
    mockPrisma.certificate.findUnique.mockResolvedValue({
      code,
      revokedAt: new Date(),
      user: { name: 'Maria Silva' },
    });
    mockPrisma.enrollment.findFirst.mockResolvedValue({
      certificateCode: code,
      user: { name: 'Maria Silva' },
      course: { title: 'Python Completo', slug: 'python' },
    });

    await expect(service.verifyByCode(code)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('verify: sem Certificate, usa o Enrollment legado', async () => {
    mockPrisma.certificate.findUnique.mockResolvedValue(null);
    mockPrisma.enrollment.findFirst.mockResolvedValue({
      certificateCode: code,
      certificateIssuedAt: new Date('2026-03-05T00:00:00Z'),
      user: { name: 'Maria Silva' },
      course: { title: 'Python Completo', slug: 'python' },
    });

    const result = await service.verifyByCode(code);
    expect(result.valid).toBe(true);
    expect(result.courseTitle).toBe('Python Completo');
  });

  it('verify: lixo não toca o banco', async () => {
    await expect(service.verifyByCode('check')).rejects.toBeInstanceOf(NotFoundException);
    expect(mockPrisma.certificate.findUnique).not.toHaveBeenCalled();
  });

  it('issue: sem matrícula lança Forbidden; sem conclusão, BadRequest', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({ id: 'course-1', title: 'Python' });
    mockPrisma.enrollment.findUnique.mockResolvedValue(null);
    await expect(
      service.issueModuleCertificate('user-1', 'course-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    mockPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enr-1',
      certificateCode: null,
      certificateIssuedAt: null,
    });
    mockPrisma.activity.count.mockResolvedValue(2);
    mockPrisma.submission.findMany.mockResolvedValue([
      { activityId: 'act-1', createdAt: new Date() },
    ]);
    await expect(
      service.issueModuleCertificate('user-1', 'course-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('issue: conclusão real emite e reutiliza o código da matrícula', async () => {
    const issuedAt = new Date('2026-03-05T00:00:00Z');
    mockPrisma.course.findUnique.mockResolvedValue({ id: 'course-1', title: 'Python' });
    mockPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enr-1',
      certificateCode: code,
      certificateIssuedAt: issuedAt,
    });
    mockPrisma.activity.count.mockResolvedValue(1);
    mockPrisma.submission.findMany.mockResolvedValue([
      { activityId: 'act-1', createdAt: issuedAt },
    ]);
    mockPrisma.certificate.upsert.mockResolvedValue({
      id: 'cert-1',
      code,
      kind: 'module',
      refId: 'course-1',
      title: 'Python',
      issuedAt,
      revokedAt: null,
    });

    const result = await service.issueModuleCertificate('user-1', 'course-1');
    expect(result.code).toBe(code);
    expect(mockPrisma.enrollment.update).not.toHaveBeenCalled();
  });
});
