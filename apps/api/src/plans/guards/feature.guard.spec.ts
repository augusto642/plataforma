import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Plan, Role } from '@prisma/client';
import { EntitlementsService } from '../entitlements.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FeatureGuard } from './feature.guard';

/**
 * A10 (Lote 3 · portões do merge) — FeatureGuard estava em 0%.
 * Teste de integração guard + EntitlementsService REAL (Prisma mockado):
 * o guard delega a regra plano × feature à matriz (§1.1), então os
 * dois sentidos são verificados nos planos free/pro/career de verdade
 * — não num mock do `assertFeature` que sempre diz sim.
 */
describe('FeatureGuard (integração com EntitlementsService + matriz)', () => {
  let entitlements: EntitlementsService;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
    subscription: { findMany: jest.fn().mockResolvedValue([]) },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.subscription.findMany.mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntitlementsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    entitlements = module.get<EntitlementsService>(EntitlementsService);
  });

  function contextWithUser(user: unknown) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as never;
  }

  /** Usuário aluno com o plano dado (sem assinatura ativa). */
  function studentWithPlan(plan: Plan) {
    mockPrisma.user.findUnique.mockResolvedValue({ role: Role.student, plan });
  }

  it('rejeita requisição sem usuário autenticado (403, sem consultar plano)', async () => {
    const Guard = FeatureGuard('interview-simulator');
    const guard = new Guard(entitlements);
    await expect(guard.canActivate(contextWithUser(undefined))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('free: bloqueia o simulador de entrevista; pro e career: liberam', async () => {
    const Guard = FeatureGuard('interview-simulator');

    studentWithPlan(Plan.free);
    await expect(
      new Guard(entitlements).canActivate(contextWithUser({ sub: 'user-1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);

    studentWithPlan(Plan.pro);
    await expect(
      new Guard(entitlements).canActivate(contextWithUser({ sub: 'user-1' })),
    ).resolves.toBe(true);

    studentWithPlan(Plan.career);
    await expect(
      new Guard(entitlements).canActivate(contextWithUser({ sub: 'user-1' })),
    ).resolves.toBe(true);
  });

  it('talent-spotlight: só o Carreira libera — pro também é bloqueado', async () => {
    const Guard = FeatureGuard('talent-spotlight');

    studentWithPlan(Plan.pro);
    await expect(
      new Guard(entitlements).canActivate(contextWithUser({ sub: 'user-1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);

    studentWithPlan(Plan.career);
    await expect(
      new Guard(entitlements).canActivate(contextWithUser({ sub: 'user-1' })),
    ).resolves.toBe(true);
  });

  it('code-review: free bloqueia (escopo none); pro e career liberam', async () => {
    const Guard = FeatureGuard('code-review');

    studentWithPlan(Plan.free);
    await expect(
      new Guard(entitlements).canActivate(contextWithUser({ sub: 'user-1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);

    studentWithPlan(Plan.pro);
    await expect(
      new Guard(entitlements).canActivate(contextWithUser({ sub: 'user-1' })),
    ).resolves.toBe(true);
  });

  it('instructor/admin não são bloqueados (não são clientes do plano)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      role: Role.instructor,
      plan: Plan.free,
    });
    const Guard = FeatureGuard('interview-simulator');
    await expect(
      new Guard(entitlements).canActivate(contextWithUser({ sub: 'user-1' })),
    ).resolves.toBe(true);
  });

  it('cada FeatureGuard carrega a sua feature (guards diferentes, regras diferentes)', async () => {
    // free passa em NADA pago: cert-prep e community-post bloqueiam;
    // o guard de cert-prep não libera community-post nem vice-versa.
    studentWithPlan(Plan.free);
    await expect(
      new (FeatureGuard('cert-prep'))(entitlements).canActivate(
        contextWithUser({ sub: 'user-1' }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      new (FeatureGuard('community-post'))(entitlements).canActivate(
        contextWithUser({ sub: 'user-1' }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
