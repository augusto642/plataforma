import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

/**
 * A10 (Lote 3 · portões do merge) — OrganizationsController estava em 0%.
 * Delegação fina ao OrganizationsService: o contexto de autorização
 * ({userId, role} do JWT) é repassado em todas as rotas que decidem
 * por ele; o `leave` usa só o userId.
 */
describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  const mockService = {
    create: jest.fn(),
    listMyOrgs: jest.fn(),
    getDashboard: jest.fn(),
    listMembers: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    leave: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [{ provide: OrganizationsService, useValue: mockService }],
    }).compile();
    controller = module.get<OrganizationsController>(OrganizationsController);
  });

  const admin = { sub: 'user-1', role: 'admin' } as JwtPayload;
  const ctx = { userId: 'user-1', role: Role.admin };
  const orgId = '00000000-0000-0000-0000-000000000001';

  it('create repassa o contexto do JWT e o DTO', async () => {
    mockService.create.mockResolvedValue({ id: orgId });
    const dto = { name: 'Turma 201' } as never;
    await expect(controller.create(admin, dto)).resolves.toEqual({ id: orgId });
    expect(mockService.create).toHaveBeenCalledWith(ctx, dto);
  });

  it('listMine usa o userId do JWT', async () => {
    mockService.listMyOrgs.mockResolvedValue([{ id: orgId }]);
    await expect(controller.listMine(admin)).resolves.toEqual([{ id: orgId }]);
    expect(mockService.listMyOrgs).toHaveBeenCalledWith('user-1');
  });

  it('getDashboard repassa contexto e id', async () => {
    mockService.getDashboard.mockResolvedValue({ members: 2 });
    await expect(controller.getDashboard(admin, orgId)).resolves.toEqual({
      members: 2,
    });
    expect(mockService.getDashboard).toHaveBeenCalledWith(ctx, orgId);
  });

  it('listMembers repassa contexto e id', async () => {
    mockService.listMembers.mockResolvedValue([]);
    await expect(controller.listMembers(admin, orgId)).resolves.toEqual([]);
    expect(mockService.listMembers).toHaveBeenCalledWith(ctx, orgId);
  });

  it('addMember repassa contexto, id e DTO', async () => {
    mockService.addMember.mockResolvedValue({ ok: true });
    const dto = { userId: 'user-2', role: 'member' } as never;
    await expect(controller.addMember(admin, orgId, dto)).resolves.toEqual({
      ok: true,
    });
    expect(mockService.addMember).toHaveBeenCalledWith(ctx, orgId, dto);
  });

  it('removeMember repassa contexto, id e userId', async () => {
    mockService.removeMember.mockResolvedValue(undefined);
    await controller.removeMember(admin, orgId, 'user-2');
    expect(mockService.removeMember).toHaveBeenCalledWith(
      ctx,
      orgId,
      'user-2',
    );
  });

  it('leave repassa só o userId do JWT e o id', async () => {
    mockService.leave.mockResolvedValue(undefined);
    await controller.leave(admin, orgId);
    expect(mockService.leave).toHaveBeenCalledWith('user-1', orgId);
  });
});
