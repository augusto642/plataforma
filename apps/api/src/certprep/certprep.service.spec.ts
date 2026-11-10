import { CertprepService, computeReadiness, readinessBand } from './certprep.service';

describe('certprep — prontidão (Fase 5, desenho §6.3)', () => {
  it('readiness é a média ponderada pelo nº de questões do domínio', () => {
    const readiness = computeReadiness({
      A: { correct: 9, total: 10, score: 0.9 },
      B: { correct: 1, total: 10, score: 0.1 },
    });
    expect(readiness).toBeCloseTo(0.5, 5);
  });

  it('sem domínios ou sem questões, readiness é 0', () => {
    expect(computeReadiness({})).toBe(0);
    expect(
      computeReadiness({ A: { correct: 0, total: 0, score: 0 } }),
    ).toBe(0);
  });

  it('bandas: >= 0,8 pronto · >= 0,6 quase lá · abaixo, não pronto', () => {
    expect(readinessBand(0.8)).toBe('ready');
    expect(readinessBand(0.79)).toBe('almost-ready');
    expect(readinessBand(0.6)).toBe('almost-ready');
    expect(readinessBand(0.59)).toBe('not-ready');
  });

  it('createAttempt rejeita domínio fora do formato do exame', async () => {
    const prisma = {
      certExam: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'exam-1',
          domains: ['Conceitos de nuvem'],
        }),
      },
      certAttempt: { create: jest.fn() },
    };
    const service = new CertprepService(prisma as any);
    await expect(
      service.createAttempt('user-1', 'exam-1', {
        'Domínio inventado': { correct: 1, total: 2 },
      }),
    ).rejects.toThrow('não pertence ao formato');
    expect(prisma.certAttempt.create).not.toHaveBeenCalled();
  });

  it('createAttempt rejeita tally impossível (correct > total)', async () => {
    const prisma = {
      certExam: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'exam-1',
          domains: ['Conceitos de nuvem'],
        }),
      },
      certAttempt: { create: jest.fn() },
    };
    const service = new CertprepService(prisma as any);
    await expect(
      service.createAttempt('user-1', 'exam-1', {
        'Conceitos de nuvem': { correct: 5, total: 2 },
      }),
    ).rejects.toThrow('Tally inválido');
  });

  it('createAttempt persiste scores por domínio + readiness derivada', async () => {
    const prisma = {
      certExam: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'exam-1',
          domains: ['Conceitos de nuvem', 'Segurança e conformidade'],
        }),
      },
      certAttempt: {
        create: jest.fn().mockImplementation(({ data }: any) => ({
          id: 'attempt-1',
          ...data,
        })),
      },
    };
    const service = new CertprepService(prisma as any);
    const attempt = await service.createAttempt('user-1', 'exam-1', {
      'Conceitos de nuvem': { correct: 8, total: 10 },
      'Segurança e conformidade': { correct: 10, total: 10 },
    });
    expect(attempt.readiness).toBeCloseTo(0.9, 5);
    expect(attempt.readinessBand).toBe('ready');
    expect(prisma.certAttempt.create).toHaveBeenCalledTimes(1);
  });

  it('getReadiness de outro dono devolve 404 (não vaza existência)', async () => {
    const prisma = {
      certAttempt: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'attempt-1',
          userId: 'outro-usuario',
          scores: {},
          readiness: 0.5,
          createdAt: new Date(),
          exam: { id: 'exam-1', provider: 'aws', name: 'X', domains: [] },
        }),
      },
    };
    const service = new CertprepService(prisma as any);
    await expect(service.getReadiness('user-1', 'attempt-1')).rejects.toThrow(
      'Tentativa não encontrada',
    );
  });
});
