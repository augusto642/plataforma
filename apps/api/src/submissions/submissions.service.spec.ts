import { ConflictException, NotFoundException } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';

describe('SubmissionsService - create idempotency / IDOR / pagination', () => {
  let service: SubmissionsService;
  let prisma: any;
  let evaluator: any;
  let runner: any;
  let queue: any;
  let redisLock: any;
  let heldLocks: string[];

  const activity = { id: 'act-1', language: 'javascript' };

  beforeEach(() => {
    heldLocks = [];
    prisma = {
      activity: { findUnique: jest.fn().mockResolvedValue(activity) },
      submission: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({ id: 'sub-1' }),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    evaluator = { processSubmission: jest.fn() };
    runner = { executeInSandbox: jest.fn() };
    queue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    // Lock mock que simula o lock real: concede se a chave não estiver em uso
    redisLock = {
      usingLock: jest.fn(async (key: string, _ttl: number, action: any, onUnavailable: any) => {
        if (heldLocks.includes(key)) {
          return onUnavailable();
        }
        heldLocks.push(key);
        try {
          return await action();
        } finally {
          heldLocks = heldLocks.filter((k) => k !== key);
        }
      }),
    };
    service = new SubmissionsService(prisma, evaluator, runner, queue, redisLock);
  });

  describe('create (enqueue dedupe + idempotency)', () => {
    const dto: CreateSubmissionDto = { activityId: 'act-1', code: 'console.log(1)' };

    it('enqueues with jobId = submission.id for BullMQ native dedupe', async () => {
      prisma.submission.create.mockResolvedValue({ id: 'sub-1', status: 'queued' });

      const res = await service.create('user-1', dto);

      expect(res.id).toBe('sub-1');
      expect(queue.add).toHaveBeenCalledWith(
        'evaluate',
        { submissionId: 'sub-1' },
        expect.objectContaining({ jobId: 'sub-1', attempts: 2 }),
      );
    });

    it('uses a short Redis lock keyed by user+activity', async () => {
      prisma.submission.create.mockResolvedValue({ id: 'sub-1', status: 'queued' });

      await service.create('user-1', dto);

      expect(redisLock.usingLock).toHaveBeenCalledWith(
        'sub:lock:user-1:act-1',
        expect.any(Number),
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('returns the existing submission on P2002 instead of throwing (commitSha dedupe)', async () => {
      prisma.submission.create.mockRejectedValue({ code: 'P2002', message: 'unique' });
      prisma.submission.findFirst.mockResolvedValue({ id: 'sub-existing', status: 'queued' });

      const res = await service.create('user-1', { ...dto, commitSha: 'abc123' });

      expect(res.id).toBe('sub-existing');
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('rethrows non-P2002 errors from create', async () => {
      prisma.submission.create.mockRejectedValue({ code: 'P2003', message: 'fk' });

      await expect(service.create('user-1', dto)).rejects.toMatchObject({ code: 'P2003' });
    });

    it('returns existing submission when a concurrent create holds the lock', async () => {
      heldLocks.push('sub:lock:user-1:act-1');
      prisma.submission.findFirst.mockResolvedValue({ id: 'sub-concurrent', status: 'queued' });

      const res = await service.create('user-1', dto);

      expect(res.id).toBe('sub-concurrent');
      expect(prisma.submission.create).not.toHaveBeenCalled();
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('throws ConflictException when lock is held and no recent submission exists', async () => {
      heldLocks.push('sub:lock:user-1:act-1');
      prisma.submission.findFirst.mockResolvedValue(null);

      await expect(service.create('user-1', dto)).rejects.toThrow(ConflictException);
    });

    it('fail-closed: marks submission as error when the queue is down (no unsafe setImmediate fallback)', async () => {
      prisma.submission.create.mockResolvedValue({ id: 'sub-1', status: 'queued' });
      queue.add.mockRejectedValue(new Error('redis down'));

      const res = await service.create('user-1', dto);

      expect(res.status).toBe('error');
      expect(prisma.submission.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: expect.objectContaining({ status: 'error' }),
      });
      // nunca executa avaliação fora da fila
      expect(evaluator.processSubmission).not.toHaveBeenCalled();
    });
  });

  describe('findById (anti-IDOR)', () => {
    const baseSubmission = {
      id: 'sub-1',
      userId: 'student-1',
      codeSnapshot: 'x',
      activity: {
        id: 'act-1',
        title: 'A',
        slug: 'a',
        language: 'javascript',
        courseId: 'course-1',
        course: { instructorId: 'instr-1' },
      },
      user: { id: 'student-1', name: 'S', email: 's@x.com' },
      testResults: [
        { id: 't1', name: 'public', passed: true, durationMs: 1, isHidden: false, stdout: 'ok', errorMessage: null },
        { id: 't2', name: 'secret', passed: true, durationMs: 1, isHidden: true, stdout: 'hidden-out', errorMessage: null },
      ],
    };

    it('student sees only their own submission (404 for others, anti-enumeration)', async () => {
      prisma.submission.findUnique.mockResolvedValue(baseSubmission);

      await expect(service.findById('sub-1', 'other-student', 'student')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('instructor WITHOUT relation to the course gets 404 (was IDOR)', async () => {
      prisma.submission.findUnique.mockResolvedValue(baseSubmission);

      await expect(service.findById('sub-1', 'instr-evil', 'instructor')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('instructor OF the course can access the submission', async () => {
      prisma.submission.findUnique.mockResolvedValue(baseSubmission);

      const res = await service.findById('sub-1', 'instr-1', 'instructor');
      expect(res.id).toBe('sub-1');
    });

    it('admin can access any submission', async () => {
      prisma.submission.findUnique.mockResolvedValue(baseSubmission);

      const res = await service.findById('sub-1', 'admin-1', 'admin');
      expect(res.id).toBe('sub-1');
    });

    it('student never receives hidden testResults content (stdout/errorMessage stripped)', async () => {
      prisma.submission.findUnique.mockResolvedValue(baseSubmission);

      const res = await service.findById('sub-1', 'student-1', 'student');
      const hidden = res.testResults.find((t: any) => t.isHidden) as any;
      expect(hidden).toBeDefined();
      expect(hidden.stdout).toBeUndefined();
      expect(hidden.errorMessage).toBeUndefined();
      expect(hidden.passed).toBe(true);
    });
  });

  describe('findProgress (SSE lightweight projection)', () => {
    const row = {
      id: 'sub-1',
      userId: 'student-1',
      status: 'running',
      score: null,
      maxScore: 100,
      durationMs: null,
      errorMessage: null,
      aiFeedback: null,
      aiHints: null,
      createdAt: new Date(),
      activity: { course: { instructorId: 'instr-1' } },
      testResults: [{ id: 't1', name: 'a', passed: false, durationMs: 1, errorMessage: null, isHidden: false }],
    };

    it('returns only light fields and enforces the same authorization', async () => {
      prisma.submission.findUnique.mockResolvedValue(row);

      const res = await service.findProgress('sub-1', 'student-1', 'student');
      expect(res.status).toBe('running');
      expect((res as any).userId).toBeUndefined();
      expect((res as any).activity).toBeUndefined();
      expect((res as any).codeSnapshot).toBeUndefined();
      expect(res.testResults).toHaveLength(1);

      await expect(service.findProgress('sub-1', 'intruder', 'student')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findProgress('sub-1', 'instr-evil', 'instructor')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('selects only the needed columns in the Prisma query', async () => {
      prisma.submission.findUnique.mockResolvedValue(row);

      await service.findProgress('sub-1', 'student-1', 'student');

      const args = prisma.submission.findUnique.mock.calls[0][0];
      expect(args.select).toBeDefined();
      expect(args.include).toBeUndefined();
      expect(args.select.codeSnapshot).toBeUndefined();
      expect(args.select.logs).toBeUndefined();
      expect(args.select.status).toBe(true);
      expect(args.select.testResults.select.stdout).toBeUndefined();
    });
  });

  describe('countMine (GET /submissions/count)', () => {
    it('student gets only the own total (no byStatus, never third-party data)', async () => {
      prisma.submission.count.mockResolvedValue(3);

      const res = await service.countMine('user-1', 'student');

      expect(res).toEqual({ total: 3 });
      expect(prisma.submission.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prisma.submission.groupBy).not.toHaveBeenCalled();
    });

    it('instructor/admin also gets the byStatus grouping of the own submissions', async () => {
      prisma.submission.count.mockResolvedValue(3);
      prisma.submission.groupBy.mockResolvedValue([
        { status: 'passed', _count: { _all: 2 } },
        { status: 'failed', _count: { _all: 1 } },
      ]);

      const res = await service.countMine('user-1', 'admin');

      expect(res).toEqual({ total: 3, byStatus: { passed: 2, failed: 1 } });
      expect(prisma.submission.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { userId: 'user-1' },
        _count: { _all: true },
        orderBy: { status: 'asc' },
      });
    });
  });

  describe('findAll (pagination)', () => {
    it('applies default safe take (50) and skip (0)', async () => {
      await service.findAll('user-1', 'student');

      const args = prisma.submission.findMany.mock.calls[0][0];
      expect(args.take).toBe(50);
      expect(args.skip).toBe(0);
      expect(args.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('clamps take to the maximum of 200 and parses string query params', async () => {
      await service.findAll('user-1', 'student', undefined, '5000', '20');

      const args = prisma.submission.findMany.mock.calls[0][0];
      expect(args.take).toBe(200);
      expect(args.skip).toBe(20);
    });

    it('falls back to defaults for invalid values', async () => {
      await service.findAll('user-1', 'student', undefined, 'abc', '-5');

      const args = prisma.submission.findMany.mock.calls[0][0];
      expect(args.take).toBe(50);
      expect(args.skip).toBe(0);
    });

    it('keeps the student where-scope and returns a plain array (backward compatible)', async () => {
      prisma.submission.findMany.mockResolvedValue([{ id: 'sub-1' }]);

      const res = await service.findAll('user-1', 'student', 'act-9');

      expect(Array.isArray(res)).toBe(true);
      const args = prisma.submission.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ userId: 'user-1', activityId: 'act-9' });
    });
  });
});
