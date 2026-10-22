import { Prisma } from '@prisma/client';
import { PlanInterestService } from './plan-interest.service';

// Sprint 17 (Ciclo 10/10 · Volta 2/B54) — a intenção de plano vira
// registro: um por usuário, idempotente na repetição, substituído por
// uma intenção nova, e o contador público é a contagem real da tabela
// — inclusive o zero. Nenhum benefício além do aviso é prometido.
describe('PlanInterestService', () => {
  const createdAt = new Date('2026-10-22T12:00:00.000Z');

  function makeService() {
    const prisma = {
      planInterest: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      // B71 (Sprint 18 · Volta 3) — captura só-e-mail + vinculação.
      planInterestLead: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ email: 'u1@mail.com' }),
      },
    };
    const service = new PlanInterestService(prisma as any);
    return { service, prisma };
  }

  it('primeira intenção cria o registro e confirma como novo', async () => {
    const { service, prisma } = makeService();
    prisma.planInterest.findUnique.mockResolvedValue(null);
    prisma.planInterest.create.mockResolvedValue({
      userId: 'u1',
      plan: 'pro',
      billingCycle: 'annual',
      createdAt,
    });

    const result = await service.register('u1', {
      plan: 'pro',
      billingCycle: 'annual',
    });

    expect(prisma.planInterest.create).toHaveBeenCalledTimes(1);
    expect(prisma.planInterest.create).toHaveBeenCalledWith({
      data: { userId: 'u1', plan: 'pro', billingCycle: 'annual' },
    });
    expect(result).toEqual({
      plan: 'pro',
      billingCycle: 'annual',
      createdAt,
      alreadyRegistered: false,
    });
  });

  it('intenção sem ciclo grava billingCycle nulo', async () => {
    const { service, prisma } = makeService();
    prisma.planInterest.findUnique.mockResolvedValue(null);
    prisma.planInterest.create.mockResolvedValue({
      userId: 'u1',
      plan: 'staff',
      billingCycle: null,
      createdAt,
    });

    const result = await service.register('u1', { plan: 'staff' });

    expect(prisma.planInterest.create).toHaveBeenCalledWith({
      data: { userId: 'u1', plan: 'staff', billingCycle: null },
    });
    expect(result.billingCycle).toBeNull();
    expect(result.alreadyRegistered).toBe(false);
  });

  it('repetir a mesma intenção não escreve de novo (idempotente)', async () => {
    const { service, prisma } = makeService();
    prisma.planInterest.findUnique.mockResolvedValue({
      userId: 'u1',
      plan: 'pro',
      billingCycle: 'monthly',
      createdAt,
    });

    const result = await service.register('u1', {
      plan: 'pro',
      billingCycle: 'monthly',
    });

    expect(prisma.planInterest.create).not.toHaveBeenCalled();
    expect(prisma.planInterest.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      plan: 'pro',
      billingCycle: 'monthly',
      createdAt,
      alreadyRegistered: true,
    });
  });

  it('intenção nova substitui a anterior (último plano escolhido vale)', async () => {
    const { service, prisma } = makeService();
    prisma.planInterest.findUnique.mockResolvedValue({
      userId: 'u1',
      plan: 'pro',
      billingCycle: 'monthly',
      createdAt,
    });
    prisma.planInterest.update.mockResolvedValue({
      userId: 'u1',
      plan: 'staff',
      billingCycle: 'annual',
      createdAt,
    });

    const result = await service.register('u1', {
      plan: 'staff',
      billingCycle: 'annual',
    });

    expect(prisma.planInterest.update).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { plan: 'staff', billingCycle: 'annual' },
    });
    expect(result.plan).toBe('staff');
    expect(result.alreadyRegistered).toBe(true);
  });

  it('corrida de escrita (P2002) devolve o registro vencedor, não erro 500', async () => {
    const { service, prisma } = makeService();
    prisma.planInterest.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        userId: 'u1',
        plan: 'pro',
        billingCycle: null,
        createdAt,
      });
    prisma.planInterest.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const result = await service.register('u1', { plan: 'pro' });

    expect(result).toEqual({
      plan: 'pro',
      billingCycle: null,
      createdAt,
      alreadyRegistered: true,
    });
  });

  it('getMine devolve null para quem nunca registrou intenção', async () => {
    const { service, prisma } = makeService();
    prisma.planInterest.findUnique.mockResolvedValue(null);

    await expect(service.getMine('u9')).resolves.toBeNull();
  });

  it('getMine devolve o registro do próprio usuário', async () => {
    const { service, prisma } = makeService();
    prisma.planInterest.findUnique.mockResolvedValue({
      userId: 'u1',
      plan: 'staff',
      billingCycle: 'monthly',
      createdAt,
    });

    await expect(service.getMine('u1')).resolves.toEqual({
      plan: 'staff',
      billingCycle: 'monthly',
      createdAt,
    });
  });

  it('counts devolve zero para plano sem interessados e a contagem real dos demais', async () => {
    const { service, prisma } = makeService();
    prisma.planInterest.groupBy.mockResolvedValue([
      { plan: 'pro', _count: { _all: 7 } },
    ]);

    await expect(service.counts()).resolves.toEqual({ pro: 7, staff: 0 });
  });

  // B71 (Sprint 18 · Volta 3) — captura só-e-mail da lista: o lead
  // mais valioso não pode exigir o cadastro completo (Growth M1).
  describe('registerLead — captura pública só-e-mail', () => {
    it('e-mail novo entra na lista e a contagem devolvida soma leads + contas', async () => {
      const { service, prisma } = makeService();
      prisma.planInterestLead.findUnique.mockResolvedValue(null);
      prisma.planInterestLead.create.mockResolvedValue({});
      prisma.planInterestLead.count.mockResolvedValue(3);
      prisma.planInterest.count.mockResolvedValue(2);

      const result = await service.registerLead({
        email: 'Visitante@Mail.com ',
        plan: 'pro',
        billingCycle: 'monthly',
      });

      expect(prisma.planInterestLead.create).toHaveBeenCalledWith({
        data: { email: 'visitante@mail.com', plan: 'pro', billingCycle: 'monthly' },
      });
      expect(result).toEqual({ plan: 'pro', count: 5, alreadyOnList: false });
    });

    it('repetir o mesmo e-mail/plano/ciclo é idempotente (alreadyOnList, sem escrita)', async () => {
      const { service, prisma } = makeService();
      prisma.planInterestLead.findUnique.mockResolvedValue({
        email: 'a@mail.com',
        plan: 'pro',
        billingCycle: 'annual',
        createdAt,
      });

      const result = await service.registerLead({
        email: 'a@mail.com',
        plan: 'pro',
        billingCycle: 'annual',
      });

      expect(prisma.planInterestLead.create).not.toHaveBeenCalled();
      expect(prisma.planInterestLead.update).not.toHaveBeenCalled();
      expect(result.alreadyOnList).toBe(true);
    });

    it('intenção nova do mesmo e-mail substitui a anterior (update, sem duplicar)', async () => {
      const { service, prisma } = makeService();
      prisma.planInterestLead.findUnique.mockResolvedValue({
        email: 'a@mail.com',
        plan: 'pro',
        billingCycle: 'monthly',
        createdAt,
      });
      prisma.planInterestLead.update.mockResolvedValue({});

      const result = await service.registerLead({
        email: 'a@mail.com',
        plan: 'staff',
        billingCycle: 'annual',
      });

      expect(prisma.planInterestLead.update).toHaveBeenCalledWith({
        where: { email: 'a@mail.com' },
        data: { plan: 'staff', billingCycle: 'annual' },
      });
      expect(prisma.planInterestLead.create).not.toHaveBeenCalled();
      expect(result.plan).toBe('staff');
      expect(result.alreadyOnList).toBe(true);
    });

    it('corrida de escrita (P2002) responde alreadyOnList, nunca 500', async () => {
      const { service, prisma } = makeService();
      prisma.planInterestLead.findUnique.mockResolvedValue(null);
      prisma.planInterestLead.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      const result = await service.registerLead({ email: 'a@mail.com', plan: 'pro' });

      expect(result.alreadyOnList).toBe(true);
      expect(result.plan).toBe('pro');
    });
  });

  it('counts soma leads e registros de conta por plano (sem dobrar quem migrou)', async () => {
    const { service, prisma } = makeService();
    prisma.planInterest.groupBy.mockResolvedValue([
      { plan: 'pro', _count: { _all: 2 } },
    ]);
    prisma.planInterestLead.groupBy.mockResolvedValue([
      { plan: 'pro', _count: { _all: 3 } },
      { plan: 'staff', _count: { _all: 1 } },
    ]);

    await expect(service.counts()).resolves.toEqual({ pro: 5, staff: 1 });
  });

  it('register autenticado remove o lead do e-mail do usuário (a conta prevalece)', async () => {
    const { service, prisma } = makeService();
    prisma.planInterest.findUnique.mockResolvedValue(null);
    prisma.planInterest.create.mockResolvedValue({
      userId: 'u1',
      plan: 'pro',
      billingCycle: null,
      createdAt,
    });
    prisma.user.findUnique.mockResolvedValue({ email: 'U1@Mail.com' });

    await service.register('u1', { plan: 'pro' });

    expect(prisma.planInterestLead.deleteMany).toHaveBeenCalledWith({
      where: { email: 'u1@mail.com' },
    });
  });
});
