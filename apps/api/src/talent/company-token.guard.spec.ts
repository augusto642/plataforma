import { createHash } from 'crypto';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CompanyTokenGuard } from './company-token.guard';
import { PrismaService } from '../prisma/prisma.service';

/**
 * A10 (Lote 3 · portões do merge) — CompanyTokenGuard estava em 0%.
 * Os dois sentidos: token ausente/desconhecido → 401 sem tocar no
 * resto; token conhecido → 200 (true) com `req.company` preenchido.
 * O token viaja como hash SHA-256 na consulta — o teste trava o hash
 * exato enviado ao Prisma (nunca o token em claro no `where`).
 */
describe('CompanyTokenGuard', () => {
  const mockPrisma = {
    company: { findUnique: jest.fn() },
  };

  function guard() {
    return new CompanyTokenGuard(mockPrisma as unknown as PrismaService);
  }

  function contextWithHeaders(headers: Record<string, string | undefined>): {
    context: ExecutionContext;
    request: Record<string, unknown>;
  } {
    const request: Record<string, unknown> = { headers };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejeita com 401 quando o header x-company-token está ausente', async () => {
    const { context } = contextWithHeaders({});
    await expect(guard().canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
  });

  it('rejeita com 401 quando o token é só espaços em branco', async () => {
    const { context } = contextWithHeaders({ 'x-company-token': '   ' });
    await expect(guard().canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
  });

  it('rejeita com 401 quando o token não corresponde a nenhuma empresa', async () => {
    mockPrisma.company.findUnique.mockResolvedValue(null);
    const { context } = contextWithHeaders({ 'x-company-token': 'tok-errado' });

    await expect(guard().canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({
      where: {
        tokenHash: createHash('sha256').update('tok-errado').digest('hex'),
      },
      select: { id: true, name: true },
    });
  });

  it('libera e preenche req.company quando o token corresponde a uma empresa', async () => {
    const company = { id: 'comp-1', name: 'Acme Tech' };
    mockPrisma.company.findUnique.mockResolvedValue(company);
    const { context, request } = contextWithHeaders({
      'x-company-token': 'tok-valido',
    });

    await expect(guard().canActivate(context)).resolves.toBe(true);
    expect(request.company).toEqual(company);
  });

  it('remove espaços do token antes de calcular o hash', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({ id: 'comp-1', name: 'Acme' });
    const { context } = contextWithHeaders({
      'x-company-token': '  tok-valido  ',
    });

    await guard().canActivate(context);

    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({
      where: {
        tokenHash: createHash('sha256').update('tok-valido').digest('hex'),
      },
      select: { id: true, name: true },
    });
  });
});
