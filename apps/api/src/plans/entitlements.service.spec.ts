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
    // Fase 1 premium — resolução única: assinatura ativa vence User.plan.
    // M10 (Lote 4) — a resolução lê TODAS as assinaturas (a mais
    // recente que concede acesso vence); o mock devolve a lista.
    subscription: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    mockPrismaService.user.findUnique.mockReset();
    mockPrismaService.subscription.findMany.mockReset();
    mockPrismaService.subscription.findMany.mockResolvedValue([]);
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

  it('getUserPlan: assinatura ativa vence o User.plan (resolução única Fase 1)', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({ plan: Plan.free });
    mockPrismaService.subscription.findMany.mockResolvedValue([
      { plan: Plan.pro, status: 'active', currentPeriodEnd: null },
    ]);
    await expect(service.getUserPlan('user-1')).resolves.toBe(Plan.pro);
    mockPrismaService.subscription.findMany.mockResolvedValue([]);
  });

  it('assertFeature bloqueia free no simulador de entrevista e libera pro', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({ role: Role.student, plan: Plan.free });
    mockPrismaService.subscription.findMany.mockResolvedValue([]);
    await expect(
      service.assertFeature('user-1', 'interview-simulator'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    mockPrismaService.user.findUnique.mockResolvedValue({ role: Role.student, plan: Plan.pro });
    await expect(
      service.assertFeature('user-1', 'interview-simulator'),
    ).resolves.toBeUndefined();
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

/**
 * M10 (Lote 4) — `past_due`/`trialing` nunca revogam... na verdade,
 * nunca DEVEM manter acesso pago indevido: o achado do Tech Lead era
 * que `getUserPlan` só considerava `active` + `canceled` vigente e
 * caía no `User.plan` — que o webhook deixa em `pro` quando a
 * assinatura atrasa (nunca há evento que o zere). Matriz por status:
 */
describe('EntitlementsService — M10 (status da assinatura × acesso pago)', () => {
  let service: EntitlementsService;

  const mockPrismaService = {
    user: { findUnique: jest.fn() },
    subscription: { findMany: jest.fn() },
  };

  const future = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  const past = new Date(Date.now() - 24 * 3600 * 1000);

  function setup(userPlan: Plan, subscriptions: unknown[]) {
    mockPrismaService.user.findUnique.mockResolvedValue({ plan: userPlan });
    mockPrismaService.subscription.findMany.mockResolvedValue(subscriptions);
  }

  function sub(
    status: string,
    plan: Plan = Plan.pro,
    currentPeriodEnd: Date | null = null,
  ) {
    return { plan, status, currentPeriodEnd };
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntitlementsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EntitlementsService>(EntitlementsService);
  });

  it('active concede o plano da assinatura', async () => {
    setup(Plan.free, [sub('active')]);
    await expect(service.getUserPlan('user-1')).resolves.toBe(Plan.pro);
  });

  it('trialing ATIVO (período vigente) concede acesso', async () => {
    setup(Plan.free, [sub('trialing', Plan.pro, future)]);
    await expect(service.getUserPlan('user-1')).resolves.toBe(Plan.pro);
  });

  it('trialing EXPIRADO revoga: User.plan defasado em pro NÃO vale', async () => {
    setup(Plan.pro, [sub('trialing', Plan.pro, past)]);
    await expect(service.getUserPlan('user-1')).resolves.toBe(Plan.free);
  });

  it('past_due revoga IMEDIATAMENTE (sem tolerância definida no produto)', async () => {
    // O caso do achado: webhook deixou User.plan=pro; a assinatura
    // atrasada não pode manter o acesso pago.
    setup(Plan.pro, [sub('past_due', Plan.pro, future)]);
    await expect(service.getUserPlan('user-1')).resolves.toBe(Plan.free);
  });

  it('past_due sem User.plan pago também é free', async () => {
    setup(Plan.free, [sub('past_due', Plan.pro, future)]);
    await expect(service.getUserPlan('user-1')).resolves.toBe(Plan.free);
  });

  it('canceled com período vigente mantém o acesso (regra anterior, preservada)', async () => {
    setup(Plan.free, [sub('canceled', Plan.pro, future)]);
    await expect(service.getUserPlan('user-1')).resolves.toBe(Plan.pro);
  });

  it('canceled com período vencido revoga (regra anterior, preservada)', async () => {
    setup(Plan.pro, [sub('canceled', Plan.pro, past)]);
    await expect(service.getUserPlan('user-1')).resolves.toBe(Plan.free);
  });

  it('expired revoga', async () => {
    setup(Plan.pro, [sub('expired', Plan.pro, future)]);
    await expect(service.getUserPlan('user-1')).resolves.toBe(Plan.free);
  });

  it('status desconhecido (ex.: incomplete) nega por padrão — fail-closed', async () => {
    setup(Plan.pro, [sub('incomplete', Plan.pro, future)]);
    await expect(service.getUserPlan('user-1')).resolves.toBe(Plan.free);
  });

  it('sem assinatura, vale o User.plan (concessão manual do admin)', async () => {
    setup(Plan.pro, []);
    await expect(service.getUserPlan('user-1')).resolves.toBe(Plan.pro);
    setup(Plan.free, []);
    await expect(service.getUserPlan('user-1')).resolves.toBe(Plan.free);
  });

  it('concessão manual DIVERGENTE da assinatura morta é honrada', async () => {
    // Admin concedeu Carreira manualmente; a assinatura Pro morreu.
    setup(Plan.career, [sub('past_due', Plan.pro, future)]);
    await expect(service.getUserPlan('user-1')).resolves.toBe(Plan.career);
  });

  it('assinatura ativa mais ANTIGA vence past_due mais recente', async () => {
    setup(Plan.free, [
      sub('past_due', Plan.pro, future),
      sub('active', Plan.pro, null),
    ]);
    await expect(service.getUserPlan('user-1')).resolves.toBe(Plan.pro);
  });

  it('assertFeature bloqueia past_due e libera trialing ativo', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({ role: Role.student, plan: Plan.pro });
    mockPrismaService.subscription.findMany.mockResolvedValue([
      sub('past_due', Plan.pro, future),
    ]);
    await expect(
      service.assertFeature('user-1', 'interview-simulator'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    mockPrismaService.subscription.findMany.mockResolvedValue([
      sub('trialing', Plan.pro, future),
    ]);
    await expect(
      service.assertFeature('user-1', 'interview-simulator'),
    ).resolves.toBeUndefined();
  });

  it('assertAiTutorAccess bloqueia past_due a partir do Júnior', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      plan: Plan.pro,
      careerTier: CareerTier.junior,
      role: Role.student,
    });
    mockPrismaService.subscription.findMany.mockResolvedValue([
      sub('past_due', Plan.pro, future),
    ]);
    await expect(service.assertAiTutorAccess('user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('AiTutorPlanGuard', () => {  const mockEntitlements = {
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
