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
});
