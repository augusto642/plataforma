import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddOrgMemberDto, CreateOrganizationDto } from './dto/organizations.dto';

/**
 * Fase 4 premium (desenho §5.2) — base técnica B2B, SÓ o enabler.
 * Sem prospecção comercial, sem SLA, sem ciclo de vendas, sem cobrança
 * B2B na v1 (licença concedida por admin da plataforma).
 *
 * Licenças: `seats` vs `count(members)` — convite bloqueado ao atingir
 * o teto (erro claro, sem overbooking silencioso).
 * Convite por e-mail na v1: resolve o usuário pelo e-mail e o adiciona
 * como membro; NÃO há disparo de e-mail (a plataforma não tem mailer
 * para isso) — por isso o membro pode sair sozinho (`leave`) e o
 * "aceite" formal por e-mail fica como trabalho futuro, sem ser fingido.
 * Dashboard de equipe: reuso — membros + contagem de matrículas e
 * XP/nível (nenhuma query nova de analytics na v1). Trilhas por cargo
 * são geradas pelo gerador dinâmico da frente KMS, não aqui.
 */

interface Actor {
  userId: string;
  role: string;
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: Actor, dto: CreateOrganizationDto) {
    if (actor.role !== Role.admin) {
      throw new ForbiddenException('Só admin da plataforma cria organizações');
    }
    if (dto.companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: dto.companyId },
        select: { id: true },
      });
      if (!company) throw new NotFoundException('Empresa não encontrada');
    }
    return this.prisma.organization.create({
      data: { name: dto.name.trim(), seats: dto.seats, companyId: dto.companyId ?? null },
    });
  }

  private async getOrgOrThrow(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organização não encontrada');
    return org;
  }

  private async assertCanManageMembers(actor: Actor, orgId: string): Promise<void> {
    if (actor.role === Role.admin) return;
    const membership = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: actor.userId } },
      select: { role: true },
    });
    if (!membership || membership.role !== 'admin') {
      throw new ForbiddenException('Só admin da organização gerencia membros');
    }
  }

  private async assertCanViewDashboard(actor: Actor, orgId: string): Promise<void> {
    if (actor.role === Role.admin) return;
    const membership = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: actor.userId } },
      select: { role: true },
    });
    if (!membership || membership.role !== 'admin') {
      throw new ForbiddenException('Só admin da organização vê o dashboard de equipe');
    }
  }

  async listMyOrgs(userId: string) {
    const memberships = await this.prisma.orgMember.findMany({
      where: { userId },
      include: { org: { select: { id: true, name: true, seats: true } } },
    });
    return memberships.map((m) => ({ ...m.org, myRole: m.role }));
  }

  async listMembers(actor: Actor, orgId: string) {
    await this.getOrgOrThrow(orgId);
    await this.assertCanViewDashboard(actor, orgId);
    return this.listMembersInternal(orgId);
  }

  private async listMembersInternal(orgId: string) {
    const members = await this.prisma.orgMember.findMany({
      where: { orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            careerTier: true,
            xp: true,
            level: true,
            _count: { select: { enrollments: true } },
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });
    // Dashboard de equipe: nome e progresso são dados de gestão da turma/
    // equipe; e-mail NÃO é exposto aqui (não é necessário para gerir).
    return members.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      role: m.role,
      careerTier: m.user.careerTier,
      xp: m.user.xp,
      level: m.user.level,
      enrollmentsCount: m.user._count.enrollments,
    }));
  }

  async addMember(actor: Actor, orgId: string, dto: AddOrgMemberDto) {
    const org = await this.getOrgOrThrow(orgId);
    await this.assertCanManageMembers(actor, orgId);
    if (dto.role === 'admin' && actor.role !== Role.admin) {
      throw new ForbiddenException('Só admin da plataforma promove a admin da organização');
    }
    if (!dto.userId && !dto.email) {
      throw new BadRequestException('Informe userId ou email');
    }
    const target = dto.userId
      ? await this.prisma.user.findUnique({ where: { id: dto.userId }, select: { id: true } })
      : await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } });
    if (!target) throw new NotFoundException('Usuário não encontrado para o convite');
    const existing = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: target.id } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Usuário já é membro da organização');
    const used = await this.prisma.orgMember.count({ where: { orgId } });
    if (used >= org.seats) {
      throw new ConflictException(
        `Limite de licenças atingido (${used}/${org.seats}) — convite bloqueado`,
      );
    }
    return this.prisma.orgMember.create({
      data: { orgId, userId: target.id, role: dto.role ?? 'member' },
    });
  }

  async removeMember(actor: Actor, orgId: string, targetUserId: string) {
    await this.getOrgOrThrow(orgId);
    await this.assertCanManageMembers(actor, orgId);
    const membership = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: targetUserId } },
      select: { id: true },
    });
    if (!membership) throw new NotFoundException('Membro não encontrado');
    await this.prisma.orgMember.delete({ where: { id: membership.id } });
  }

  async leave(userId: string, orgId: string) {
    await this.getOrgOrThrow(orgId);
    const membership = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
      select: { id: true },
    });
    if (!membership) throw new NotFoundException('Você não é membro desta organização');
    await this.prisma.orgMember.delete({ where: { id: membership.id } });
  }

  async getDashboard(actor: Actor, orgId: string) {
    const org = await this.getOrgOrThrow(orgId);
    await this.assertCanViewDashboard(actor, orgId);
    const members = await this.listMembersInternal(orgId);
    return {
      organization: { id: org.id, name: org.name, seats: org.seats, companyId: org.companyId },
      seatsUsed: members.length,
      seatsAvailable: Math.max(0, org.seats - members.length),
      members,
    };
  }
}
