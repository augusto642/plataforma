import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CareerTier, Plan, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from './entitlements.service';
import { AiTutorPlanGuard } from './guards/ai-tutor-plan.guard';
import { canUseAiTutor, PLAN_ENTITLEMENTS } from './plan-entitlements';

/**
 * B32 (Sprint 10) — o plano vira entidade. Estes testes travam a regra
 * de entitlement da tutora de IA (plano × nível de carreira), que é a
 * promessa literal da landing: free = tutora no Iniciante; Pro = tutora
 * em todos os níveis.
 */
describe('canUseAiTutor (matriz plano × nível)', () => {
  it('free só libera a tutora no nível Iniciante (beginner)', () => {
    expect(canUseAiTutor(Plan.free, CareerTier.beginner)).toBe(true);
    expect(canUseAiTutor(Plan.free, CareerTier.junior)).toBe(false);
    expect(canUseAiTutor(Plan.free, CareerTier.mid)).toBe(false);
    expect(canUseAiTutor(Plan.free, CareerTier.senior)).toBe(false);
  });

  it('pro libera a tutora em todos os níveis', () => {
    expect(canUseAiTutor(Plan.pro, CareerTier.beginner)).toBe(true);
    expect(canUseAiTutor(Plan.pro, CareerTier.junior)).toBe(true);
    expect(canUseAiTutor(Plan.pro, CareerTier.mid)).toBe(true);
    expect(canUseAiTutor(Plan.pro, CareerTier.senior)).toBe(true);
  });

  it('a matriz declara o teto de cada plano', () => {
    expect(PLAN_ENTITLEMENTS.free.aiTutorMaxCareerTier).toBe(CareerTier.beginner);
    expect(PLAN_ENTITLEMENTS.pro.aiTutorMaxCareerTier).toBeNull();
  });
});

describe('EntitlementsService', () => {
  let service: EntitlementsService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    mockPrismaService.user.findUnique.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntitlementsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EntitlementsService>(EntitlementsService);
  });

  it('getUserPlan devolve o plano persistido do usuário', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({ plan: Plan.pro });
    await expect(service.getUserPlan('user-1')).resolves.toBe(Plan.pro);

    mockPrismaService.user.findUnique.mockResolvedValue({ plan: Plan.free });
    await expect(service.getUserPlan('user-2')).resolves.toBe(Plan.free);
  });

  it('getUserPlan lança NotFound para usuário inexistente', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(null);
    await expect(service.getUserPlan('ghost')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('assertAiTutorAccess libera free no Iniciante (a promessa do plano gratuito)', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      plan: Plan.free,
      careerTier: CareerTier.beginner,
      role: Role.student,
    });
    await expect(service.assertAiTutorAccess('user-1')).resolves.toBeUndefined();
  });

  it('assertAiTutorAccess bloqueia free a partir do Júnior', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      plan: Plan.free,
      careerTier: CareerTier.junior,
      role: Role.student,
    });
    await expect(service.assertAiTutorAccess('user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('assertAiTutorAccess libera pro em qualquer nível', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      plan: Plan.pro,
      careerTier: CareerTier.senior,
      role: Role.student,
    });
    await expect(service.assertAiTutorAccess('user-1')).resolves.toBeUndefined();
  });

  it('assertAiTutorAccess não bloqueia staff (instructor/admin não são clientes do plano)', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      plan: Plan.free,
      careerTier: CareerTier.senior,
      role: Role.instructor,
    });
    await expect(service.assertAiTutorAccess('user-1')).resolves.toBeUndefined();
  });
});

describe('AiTutorPlanGuard', () => {
  const mockEntitlements = {
    assertAiTutorAccess: jest.fn(),
  };

  function contextWithUser(user: unknown) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as never;
  }

  beforeEach(() => {
    mockEntitlements.assertAiTutorAccess.mockReset();
  });

  it('rejeita requisição sem usuário autenticado', async () => {
    const guard = new AiTutorPlanGuard(mockEntitlements as never);
    await expect(guard.canActivate(contextWithUser(undefined))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(mockEntitlements.assertAiTutorAccess).not.toHaveBeenCalled();
  });

  it('delega ao EntitlementsService com o sub do JWT e libera quando ele libera', async () => {
    mockEntitlements.assertAiTutorAccess.mockResolvedValue(undefined);
    const guard = new AiTutorPlanGuard(mockEntitlements as never);

    await expect(guard.canActivate(contextWithUser({ sub: 'user-1' }))).resolves.toBe(true);
    expect(mockEntitlements.assertAiTutorAccess).toHaveBeenCalledWith('user-1');
  });

  it('propaga o Forbidden do entitlement (free além do Iniciante)', async () => {
    mockEntitlements.assertAiTutorAccess.mockRejectedValue(new ForbiddenException('pro'));
    const guard = new AiTutorPlanGuard(mockEntitlements as never);

    await expect(guard.canActivate(contextWithUser({ sub: 'user-1' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
