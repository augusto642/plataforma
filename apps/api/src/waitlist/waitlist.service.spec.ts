import { Prisma } from '@prisma/client';
import { WaitlistService } from './waitlist.service';

// Sprint 16 (Ciclo 10/10 · P2/B49) — a lista de espera persiste o
// e-mail normalizado, é idempotente por (email, trilha) e o contador
// público é a contagem real da tabela — inclusive o zero.
describe('WaitlistService', () => {
  function makeService() {
    const prisma = {
      trackWaitlistEntry: {
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
    };
    const service = new WaitlistService(prisma as any);
    return { service, prisma };
  }

  it('e-mail novo entra na lista normalizado e recebe a contagem real', async () => {
    const { service, prisma } = makeService();
    prisma.trackWaitlistEntry.findUnique.mockResolvedValue(null);
    prisma.trackWaitlistEntry.create.mockResolvedValue({ id: 'w1' });
    prisma.trackWaitlistEntry.count.mockResolvedValue(1);

    const result = await service.join({ email: '  MARIA@Empresa.com ', track: 'rust' });

    expect(prisma.trackWaitlistEntry.create).toHaveBeenCalledTimes(1);
    expect(prisma.trackWaitlistEntry.create).toHaveBeenCalledWith({
      data: { email: 'maria@empresa.com', track: 'rust' },
    });
    expect(result).toEqual({ track: 'rust', count: 1, alreadyOnList: false });
    // A resposta nunca ecoa o e-mail de quem entrou.
    expect(JSON.stringify(result)).not.toContain('maria@empresa.com');
  });

  it('e-mail repetido na mesma trilha não duplica nem erra', async () => {
    const { service, prisma } = makeService();
    prisma.trackWaitlistEntry.findUnique.mockResolvedValue({ id: 'w1' });
    prisma.trackWaitlistEntry.count.mockResolvedValue(3);

    const result = await service.join({ email: 'maria@empresa.com', track: 'go' });

    expect(prisma.trackWaitlistEntry.create).not.toHaveBeenCalled();
    expect(result).toEqual({ track: 'go', count: 3, alreadyOnList: true });
  });

  it('corrida de escrita (P2002) vira alreadyOnList, não erro 500', async () => {
    const { service, prisma } = makeService();
    prisma.trackWaitlistEntry.findUnique.mockResolvedValue(null);
    prisma.trackWaitlistEntry.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    prisma.trackWaitlistEntry.count.mockResolvedValue(2);

    const result = await service.join({ email: 'maria@empresa.com', track: 'web' });

    expect(result).toEqual({ track: 'web', count: 2, alreadyOnList: true });
  });

  it('counts devolve todas as trilhas do catálogo, com zero onde não há ninguém', async () => {
    const { service, prisma } = makeService();
    prisma.trackWaitlistEntry.groupBy.mockResolvedValue([
      { track: 'rust', _count: { _all: 5 } },
      { track: 'python-ia', _count: { _all: 2 } },
    ]);

    const result = await service.counts();

    expect(result).toEqual({ rust: 5, go: 0, web: 0, 'python-ia': 2 });
  });

  it('counts com a tabela vazia é zero em todas — sem piso nem inflação', async () => {
    const { service, prisma } = makeService();
    prisma.trackWaitlistEntry.groupBy.mockResolvedValue([]);

    const result = await service.counts();

    expect(result).toEqual({ rust: 0, go: 0, web: 0, 'python-ia': 0 });
  });
});
