import { ContactService } from './contact.service';

// Sprint 6 — o service persiste a mensagem normalizada (trim + e-mail
// em minúsculas) e devolve só o recibo mínimo, sem ecoar dado pessoal.
describe('ContactService', () => {
  function makeService() {
    const prisma = {
      contactMessage: {
        create: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      },
    };
    const service = new ContactService(prisma as any);
    return { service, prisma };
  }

  it('persiste a mensagem normalizada e devolve apenas o recibo', async () => {
    const { service, prisma } = makeService();

    const result = await service.createMessage({
      name: '  Maria Silva  ',
      email: '  MARIA@Empresa.com ',
      message: '  Quero o plano Staff para o meu time.  ',
    });

    expect(prisma.contactMessage.create).toHaveBeenCalledTimes(1);
    expect(prisma.contactMessage.create).toHaveBeenCalledWith({
      data: {
        name: 'Maria Silva',
        email: 'maria@empresa.com',
        message: 'Quero o plano Staff para o meu time.',
      },
    });
    expect(result).toEqual({ received: true });
    expect(JSON.stringify(result)).not.toContain('maria@empresa.com');
  });
});
