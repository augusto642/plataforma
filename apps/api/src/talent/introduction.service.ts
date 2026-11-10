import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { candidateIdFor } from './talent-profile.service';
import { RequestIntroductionDto } from './dto/talent-phase4.dto';

/**
 * Fase 4 premium (desenho §5.1) — introdução mediada.
 *
 * A empresa identifica o aluno só pelo `candidateId` anonimizado e pede
 * a introdução; o aluno aceita ou recusa. Em NENHUM momento, em NENHUMA
 * resposta, o e-mail (ou o nome completo, ou o userId) do aluno é
 * entregue à empresa — nem depois do aceite. O aceite sinaliza interesse
 * mútuo; o canal de contato dentro da plataforma é trabalho futuro e
 * NÃO é improvisado aqui (ex.: não se envia e-mail com o endereço do
 * aluno "só desta vez"). Respostas ao aluno, sim, trazem o nome da
 * empresa e da vaga — é ele quem decide.
 */

function toCompanyView(intro: {
  id: string;
  status: string;
  createdAt: Date;
  decidedAt: Date | null;
  userId: string;
  jobPosting: { title: string } | null;
}) {
  return {
    id: intro.id,
    candidateId: candidateIdFor(intro.userId),
    status: intro.status,
    jobTitle: intro.jobPosting?.title ?? null,
    createdAt: intro.createdAt,
    decidedAt: intro.decidedAt,
  };
}

@Injectable()
export class IntroductionService {
  constructor(private readonly prisma: PrismaService) {}

  async request(companyId: string, dto: RequestIntroductionDto) {
    const prefix = dto.candidateId.replace(/^cand_/, '');
    if (!/^[0-9a-f]{8}$/i.test(prefix)) {
      throw new BadRequestException('candidateId inválido');
    }
    // Prefixo de 8 chars do UUID + perfil visível nos dois consentimentos.
    // UuidFilter não aceita startsWith: o filtro de prefixo roda em memória
    // sobre o conjunto opt-in (só usuários com talentVisible + perfil
    // visível — pequeno por definição, nunca a base inteira).
    const visibleUsers = await this.prisma.user.findMany({
      where: {
        talentVisible: true,
        talentProfile: { visible: true },
      },
      select: { id: true },
    });
    const candidates = visibleUsers.filter((u) => u.id.startsWith(prefix));
    if (candidates.length !== 1) {
      throw new NotFoundException('Candidato não encontrado ou não visível para empresas');
    }
    const userId = candidates[0].id;

    let jobPostingId: string | null = null;
    if (dto.jobPostingId) {
      const job = await this.prisma.jobPosting.findUnique({
        where: { id: dto.jobPostingId },
        select: { id: true, expiresAt: true },
      });
      if (!job || job.expiresAt <= new Date()) {
        throw new NotFoundException('Vaga não encontrada ou expirada');
      }
      jobPostingId = job.id;
    }

    const pending = await this.prisma.talentIntroduction.findFirst({
      where: { companyId, userId, jobPostingId, status: 'pending' },
      select: { id: true },
    });
    if (pending) {
      throw new ConflictException('Já existe um pedido de introdução pendente para este candidato');
    }

    const intro = await this.prisma.talentIntroduction.create({
      data: {
        companyId,
        userId,
        jobPostingId,
        companyMessage: dto.message?.trim() || null,
      },
      include: { jobPosting: { select: { title: true } } },
    });
    return toCompanyView(intro);
  }

  async listForCompany(companyId: string) {
    const intros = await this.prisma.talentIntroduction.findMany({
      where: { companyId },
      include: { jobPosting: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return intros.map(toCompanyView);
  }

  async listForStudent(userId: string) {
    const intros = await this.prisma.talentIntroduction.findMany({
      where: { userId },
      include: {
        company: { select: { name: true } },
        jobPosting: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return intros.map((intro) => ({
      id: intro.id,
      companyName: intro.company.name,
      jobTitle: intro.jobPosting?.title ?? null,
      companyMessage: intro.companyMessage,
      status: intro.status,
      createdAt: intro.createdAt,
      decidedAt: intro.decidedAt,
    }));
  }

  async decide(userId: string, id: string, accept: boolean) {
    const intro = await this.prisma.talentIntroduction.findUnique({
      where: { id },
      include: {
        company: { select: { name: true } },
        jobPosting: { select: { title: true } },
      },
    });
    if (!intro) throw new NotFoundException('Pedido de introdução não encontrado');
    if (intro.userId !== userId) {
      throw new ForbiddenException('Só o próprio aluno decide sobre o pedido');
    }
    if (intro.status !== 'pending') {
      throw new ConflictException(`Pedido já decidido (${intro.status})`);
    }
    const decided = await this.prisma.talentIntroduction.update({
      where: { id },
      data: { status: accept ? 'accepted' : 'declined', decidedAt: new Date() },
    });
    return {
      id: decided.id,
      status: decided.status,
      companyName: intro.company.name,
      jobTitle: intro.jobPosting?.title ?? null,
      decidedAt: decided.decidedAt,
    };
  }
}
