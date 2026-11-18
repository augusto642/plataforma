import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { CreateKnowledgeReferenceDto, ReviewKnowledgeReferenceDto } from './dto/knowledge-reference.dto';
import { KnowledgeReferencesService } from './knowledge-references.service';

describe('KnowledgeReferencesService', () => {
  const tx = {
    knowledgeReference: { updateMany: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
    knowledgeCurationCandidate: { createMany: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
    adminAuditEvent: { create: jest.fn() },
  };
  const prisma = {
    knowledgeReference: { create: jest.fn(), findMany: jest.fn() },
    knowledgeCurationCandidate: { findMany: jest.fn() },
    $transaction: jest.fn((callback) => callback(tx)),
  };
  const service = new KnowledgeReferencesService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('creates metadata as a pending reference and rejects duplicate URLs', async () => {
    const dto = { kind: 'book' as const, title: 'Book', url: 'https://example.org/book' };
    prisma.knowledgeReference.create.mockResolvedValueOnce({ id: 'ref', status: 'pending' });
    await expect(service.create(dto, 'admin')).resolves.toEqual({ id: 'ref', status: 'pending' });
    expect(prisma.knowledgeReference.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ submittedBy: 'admin', kind: 'book', url: dto.url }),
    }));
    prisma.knowledgeReference.create.mockRejectedValueOnce({ code: 'P2002' });
    await expect(service.create(dto, 'admin')).rejects.toBeInstanceOf(ConflictException);
  });

  it('makes a single audited decision without importing content', async () => {
    tx.knowledgeReference.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.knowledgeReference.findUniqueOrThrow.mockResolvedValueOnce({ id: 'ref', status: 'approved' });
    await expect(service.review('ref', { decision: 'approved' }, 'admin')).resolves.toEqual({ id: 'ref', status: 'approved' });
    expect(tx.knowledgeReference.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'ref', status: 'pending' } }));
    expect(tx.adminAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ adminId: 'admin', targetId: 'ref', newValue: 'approved' }),
    }));
    tx.knowledgeReference.updateMany.mockResolvedValueOnce({ count: 0 });
    tx.knowledgeReference.findUnique.mockResolvedValueOnce({ id: 'ref' });
    await expect(service.review('ref', { decision: 'rejected' }, 'admin')).rejects.toBeInstanceOf(ConflictException);
    tx.knowledgeReference.updateMany.mockResolvedValueOnce({ count: 0 });
    tx.knowledgeReference.findUnique.mockResolvedValueOnce(null);
    await expect(service.review('missing', { decision: 'approved' }, 'admin')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('filters review states explicitly', async () => {
    await service.list('pending');
    expect(prisma.knowledgeReference.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'pending' }, take: 100 }));
    expect(() => service.list('unknown')).toThrow(BadRequestException);
  });

  it('rejects links with credential parameters or fragments', async () => {
    for (const url of ['https://example.org/book?X-Amz-Signature=secret', 'https://example.org/book#token']) {
      await expect(service.create({ kind: 'book', title: 'Book', url }, null, 'connector'))
        .rejects.toBeInstanceOf(BadRequestException);
    }
    expect(prisma.knowledgeReference.create).not.toHaveBeenCalled();
  });

  it('queues an approved reference once and audits only the first submission', async () => {
    tx.knowledgeReference.findUnique.mockResolvedValue({ id: 'ref', status: 'approved' });
    tx.knowledgeCurationCandidate.createMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    tx.knowledgeCurationCandidate.findUniqueOrThrow.mockResolvedValue({ id: 'candidate', status: 'pending' });
    await expect(service.queueForCuration('ref', 'admin')).resolves.toEqual({ id: 'candidate', status: 'pending' });
    await service.queueForCuration('ref', 'admin');
    expect(tx.knowledgeCurationCandidate.createMany).toHaveBeenCalledWith({
      data: [{ referenceId: 'ref', createdBy: 'admin' }], skipDuplicates: true,
    });
    expect(tx.adminAuditEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.adminAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'knowledge.curation.queued', adminId: 'admin', targetId: 'candidate' }),
    }));
  });

  it('refuses missing, pending and rejected references without creating a candidate', async () => {
    for (const reference of [null, { id: 'ref', status: 'pending' }, { id: 'ref', status: 'rejected' }]) {
      tx.knowledgeReference.findUnique.mockResolvedValueOnce(reference);
      await expect(service.queueForCuration('ref', 'admin')).rejects.toBeInstanceOf(
        reference ? ConflictException : NotFoundException,
      );
    }
    expect(tx.knowledgeCurationCandidate.createMany).not.toHaveBeenCalled();
  });

  it('archives an open candidate with an audit event and rejects repeats', async () => {
    tx.knowledgeCurationCandidate.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.knowledgeCurationCandidate.findUniqueOrThrow.mockResolvedValueOnce({ id: 'candidate', status: 'archived' });
    tx.knowledgeCurationCandidate.findUnique.mockResolvedValueOnce({ id: 'candidate', status: 'published' })
      .mockResolvedValueOnce({ id: 'candidate', status: 'archived' });
    await expect(service.archiveCuration('candidate', 'admin')).resolves.toEqual({ id: 'candidate', status: 'archived' });
    await expect(service.archiveCuration('candidate', 'admin')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.adminAuditEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.adminAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ previousValue: 'published', newValue: 'archived' }),
    }));
  });

  it('filters candidate states explicitly', async () => {
    await service.listCuration('pending');
    expect(prisma.knowledgeCurationCandidate.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'pending' }, include: { reference: true }, take: 100,
    }));
    expect(() => service.listCuration('invalid')).toThrow(BadRequestException);
  });

  it('publishes only with reviewed license and an audited explicit decision', async () => {
    const dto = { topics: ['loops', 'loops'], licenseReviewed: true };
    tx.knowledgeCurationCandidate.findUnique.mockResolvedValueOnce({
      id: 'candidate', status: 'pending', reference: { status: 'approved', reviewedAt: new Date(), reviewedBy: 'reviewer', license: 'CC BY' },
    });
    tx.knowledgeCurationCandidate.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.knowledgeCurationCandidate.findUniqueOrThrow.mockResolvedValueOnce({ id: 'candidate', status: 'published' });
    await expect(service.publishCuration('candidate', dto, 'admin')).resolves.toMatchObject({ status: 'published' });
    expect(tx.knowledgeCurationCandidate.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ topics: ['loops'], publishedBy: 'admin' }),
    }));
    expect(tx.adminAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'knowledge.curation.published', adminId: 'admin' }),
    }));
    await expect(service.publishCuration('candidate', { ...dto, licenseReviewed: false }, 'admin')).rejects.toBeInstanceOf(BadRequestException);
    tx.knowledgeCurationCandidate.findUnique.mockResolvedValueOnce({
      id: 'candidate', status: 'pending', reference: { status: 'approved', reviewedAt: new Date(), reviewedBy: 'reviewer', license: null },
    });
    await expect(service.publishCuration('candidate', dto, 'admin')).rejects.toBeInstanceOf(ConflictException);
  });

  it('records a research request only for a pending candidate with an approved reference', async () => {
    tx.knowledgeCurationCandidate.findUnique.mockResolvedValueOnce({
      id: 'candidate', status: 'pending', reference: { status: 'approved' },
    }).mockResolvedValueOnce({
      id: 'candidate', status: 'archived', reference: { status: 'approved' },
    }).mockResolvedValueOnce(null);
    await expect(service.requestResearchDraft('candidate', 'admin')).resolves.toMatchObject({ id: 'candidate' });
    await expect(service.requestResearchDraft('candidate', 'admin')).rejects.toBeInstanceOf(ConflictException);
    await expect(service.requestResearchDraft('missing', 'admin')).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.adminAuditEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.adminAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'knowledge.curation.research_requested', adminId: 'admin' }),
    }));
  });

  it('accepts only HTTPS metadata and valid review decisions', async () => {
    const dto = Object.assign(new CreateKnowledgeReferenceDto(), { kind: 'pdf', title: '   ', url: 'http://example.org/a.pdf' });
    expect((await validate(dto)).map((error) => error.property)).toEqual(expect.arrayContaining(['title', 'url']));
    dto.title = 'Open resource';
    dto.url = 'https://user:password@example.org/a.pdf';
    expect((await validate(dto)).map((error) => error.property)).toContain('url');
    const review = Object.assign(new ReviewKnowledgeReferenceDto(), { decision: 'publish' });
    expect(await validate(review)).not.toHaveLength(0);
  });
});
