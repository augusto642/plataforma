import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKnowledgeReferenceDto, PublishKnowledgeReferenceDto, ReviewKnowledgeReferenceDto } from './dto/knowledge-reference.dto';

@Injectable()
export class KnowledgeReferencesService {
  constructor(private readonly prisma: PrismaService) {}

  list(status = 'pending') {
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      throw new BadRequestException('Estado de referência inválido.');
    }
    return this.prisma.knowledgeReference.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async create(dto: CreateKnowledgeReferenceDto, adminId: string | null, source: 'admin' | 'connector' = 'admin') {
    const url = new URL(dto.url);
    if (url.hash || [...url.searchParams.keys()].some((key) =>
      /(?:token|secret|password|authorization|credential|signature|api[_-]?key)/i.test(key),
    )) {
      throw new BadRequestException('A URL não pode conter fragmentos ou parâmetros de credenciais.');
    }
    try {
      return await this.prisma.knowledgeReference.create({
        data: {
          kind: dto.kind,
          title: dto.title.trim(),
          url: dto.url,
          author: dto.author?.trim() || null,
          license: dto.license?.trim() || null,
          submittedBy: adminId,
          source,
        },
      });
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Esta URL já está na caixa de referências.');
      }
      throw error;
    }
  }

  async review(id: string, dto: ReviewKnowledgeReferenceDto, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.knowledgeReference.updateMany({
        where: { id, status: 'pending' },
        data: { status: dto.decision, reviewedBy: adminId, reviewedAt: new Date() },
      });
      if (!updated.count) {
        const existing = await tx.knowledgeReference.findUnique({ where: { id }, select: { id: true } });
        if (!existing) throw new NotFoundException('Referência não encontrada.');
        throw new ConflictException('Esta referência já foi revisada.');
      }
      await tx.adminAuditEvent.create({
        data: {
          adminId,
          action: 'knowledge.reference.reviewed',
          targetType: 'knowledge-reference',
          targetId: id,
          previousValue: 'pending',
          newValue: dto.decision,
        },
      });
      return tx.knowledgeReference.findUniqueOrThrow({ where: { id } });
    });
  }

  listCuration(status = 'pending') {
    if (!['pending', 'published', 'archived'].includes(status)) {
      throw new BadRequestException('Estado de curadoria inválido.');
    }
    return this.prisma.knowledgeCurationCandidate.findMany({
      where: { status },
      include: { reference: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async publishCuration(id: string, dto: PublishKnowledgeReferenceDto, adminId: string) {
    if (!dto.licenseReviewed) throw new BadRequestException('Confirme a revisão da licença antes de publicar o link.');
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.knowledgeCurationCandidate.findUnique({
        where: { id }, include: { reference: true },
      });
      if (!candidate) throw new NotFoundException('Candidato de curadoria não encontrado.');
      if (candidate.status !== 'pending' || candidate.reference.status !== 'approved' ||
          !candidate.reference.reviewedAt || !candidate.reference.reviewedBy ||
          !candidate.reference.license?.trim()) {
        throw new ConflictException('A publicação exige candidato pendente, referência revisada e licença declarada.');
      }
      const updated = await tx.knowledgeCurationCandidate.updateMany({
        where: { id, status: 'pending', reference: { status: 'approved' } },
        data: { status: 'published', topics: [...new Set(dto.topics)], publishedBy: adminId, publishedAt: new Date() },
      });
      if (!updated.count) throw new ConflictException('O candidato foi alterado durante a revisão.');
      await tx.adminAuditEvent.create({
        data: {
          adminId, action: 'knowledge.curation.published', targetType: 'knowledge-curation',
          targetId: id, previousValue: 'pending', newValue: 'published', changedFields: ['topics', 'licenseReviewed'],
        },
      });
      return tx.knowledgeCurationCandidate.findUniqueOrThrow({ where: { id }, include: { reference: true } });
    });
  }

  async queueForCuration(referenceId: string, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const reference = await tx.knowledgeReference.findUnique({
        where: { id: referenceId },
        select: { id: true, status: true },
      });
      if (!reference) throw new NotFoundException('Referência não encontrada.');
      if (reference.status !== 'approved') {
        throw new ConflictException('Apenas referências aprovadas podem entrar na curadoria.');
      }
      const created = await tx.knowledgeCurationCandidate.createMany({
        data: [{ referenceId, createdBy: adminId }],
        skipDuplicates: true,
      });
      const candidate = await tx.knowledgeCurationCandidate.findUniqueOrThrow({
        where: { referenceId },
        include: { reference: true },
      });
      if (created.count) {
        await tx.adminAuditEvent.create({
          data: {
            adminId,
            action: 'knowledge.curation.queued',
            targetType: 'knowledge-curation',
            targetId: candidate.id,
            newValue: 'pending',
          },
        });
      }
      return candidate;
    });
  }

  async archiveCuration(id: string, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.knowledgeCurationCandidate.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Candidato de curadoria não encontrado.');
      if (!['pending', 'published'].includes(existing.status)) {
        throw new ConflictException('Este candidato já foi arquivado.');
      }
      const updated = await tx.knowledgeCurationCandidate.updateMany({
        where: { id, status: existing.status },
        data: { status: 'archived', archivedBy: adminId, archivedAt: new Date() },
      });
      if (!updated.count) {
        throw new ConflictException('O candidato foi alterado durante a revisão.');
      }
      await tx.adminAuditEvent.create({
        data: {
          adminId,
          action: 'knowledge.curation.archived',
          targetType: 'knowledge-curation',
          targetId: id,
          previousValue: existing.status,
          newValue: 'archived',
        },
      });
      return tx.knowledgeCurationCandidate.findUniqueOrThrow({ where: { id }, include: { reference: true } });
    });
  }

  async requestResearchDraft(id: string, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.knowledgeCurationCandidate.findUnique({
        where: { id }, include: { reference: true },
      });
      if (!candidate) throw new NotFoundException('Candidato de curadoria não encontrado.');
      if (candidate.status !== 'pending' || candidate.reference.status !== 'approved') {
        throw new ConflictException('Apenas candidatos pendentes de referências aprovadas podem gerar pesquisas.');
      }
      await tx.adminAuditEvent.create({
        data: {
          adminId, action: 'knowledge.curation.research_requested',
          targetType: 'knowledge-curation', targetId: id,
        },
      });
      return candidate;
    });
  }
}
