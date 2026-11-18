import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { validate } from 'class-validator';
import { AiTutorFeedbackService } from './ai-tutor-feedback.service';
import { AiTutorFeedbackDto } from './dto/ai-tutor-feedback.dto';

describe('AiTutorFeedbackService', () => {
  const prisma = {
    aiTutorFeedback: {
      create: jest.fn(),
      groupBy: jest.fn(),
    },
  };
  let service: AiTutorFeedbackService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AiTutorFeedbackService(prisma as any);
  });

  it('requires a categorical concern for negative feedback', async () => {
    const invalid = Object.assign(new AiTutorFeedbackDto(), {
      responseId: '123e4567-e89b-42d3-a456-426614174000',
      activityId: '223e4567-e89b-42d3-a456-426614174000',
      helpful: false,
    });
    const valid = Object.assign(new AiTutorFeedbackDto(), {
      ...invalid,
      concern: 'unclear',
    });

    await expect(validate(invalid)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'concern' })]),
    );
    await expect(validate(valid)).resolves.toHaveLength(0);
  });

  it('stores only response/activity identifiers and categorical outcome data', async () => {
    prisma.aiTutorFeedback.create.mockResolvedValue({ id: 'feedback-1' });
    const dto = {
      responseId: '01234567-89ab-cdef-0123-456789abcdef',
      activityId: '11234567-89ab-cdef-0123-456789abcdef',
      helpful: false,
      concern: 'too_much_answer' as const,
    };

    await expect(service.submit(dto)).resolves.toEqual({ recorded: true });
    expect(prisma.aiTutorFeedback.create).toHaveBeenCalledWith({
      data: { ...dto },
      select: { id: true },
    });
    expect(JSON.stringify(prisma.aiTutorFeedback.create.mock.calls[0][0])).not.toContain('code');
  });

  it('rejects duplicate feedback for one response', async () => {
    prisma.aiTutorFeedback.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.submit({
        responseId: '123e4567-e89b-42d3-a456-426614174000',
        activityId: '223e4567-e89b-42d3-a456-426614174000',
        helpful: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('summarizes only the rolling 30-day categorical feedback window', async () => {
    prisma.aiTutorFeedback.groupBy.mockResolvedValue([
      { helpful: true, concern: null, _count: { _all: 8 } },
      { helpful: false, concern: 'too_much_answer', _count: { _all: 2 } },
      { helpful: false, concern: 'incorrect', _count: { _all: 1 } },
    ]);

    await expect(service.getQualitySummary(new Date('2026-11-15T00:00:00.000Z'))).resolves.toEqual({
      windowDays: 30,
      total: 11,
      helpful: 8,
      notHelpful: 3,
      concerns: { tooMuchAnswer: 2, incorrect: 1, unclear: 0 },
    });
    expect(prisma.aiTutorFeedback.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdAt: { gte: new Date('2026-10-16T00:00:00.000Z') } },
      }),
    );
  });
});
