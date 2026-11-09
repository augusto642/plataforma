import 'reflect-metadata';
import assert from 'node:assert/strict';
import { SubmissionProcessor } from './submission.processor';

/**
 * A3 (worker) + A5 (push): o @Processor precisa declarar `concurrency: 4`
 * com o `limiter` preservado, e o worker precisa avisar o SSE quando o job
 * termina (sucesso ou falha) para o push funcionar.
 */
describe('SubmissionProcessor (A3/A5)', () => {
  it('declares worker concurrency 4 with the rate limiter preserved', () => {
    const workerOptions = Reflect.getMetadata(
      'bullmq:worker_metadata',
      SubmissionProcessor,
    ) as { concurrency?: number; limiter?: { max: number; duration: number } };

    assert.equal(workerOptions.concurrency, 4);
    assert.deepEqual(workerOptions.limiter, { max: 10, duration: 1000 });
  });

  it('declares the submissions queue name', () => {
    const processorOptions = Reflect.getMetadata(
      'bullmq:processor_metadata',
      SubmissionProcessor,
    ) as { name?: string };

    assert.equal(processorOptions.name, 'submissions');
  });

  function buildProcessor(overrides: {
    processSubmission?: (...args: any[]) => Promise<any>;
    executeBattleRun?: (...args: any[]) => Promise<any>;
  } = {}) {
    const notified: string[] = [];
    const evaluator = {
      processSubmission:
        overrides.processSubmission ?? (async () => undefined),
    };
    const submissions = {
      executeBattleRun: overrides.executeBattleRun ?? (async () => ({})),
    };
    const events = { notify: (id: string) => void notified.push(id) };
    const processor = new SubmissionProcessor(
      evaluator as any,
      submissions as any,
      events as any,
    );
    return { processor, evaluator, submissions, notified };
  }

  it('notifies the SSE push channel when an evaluate job completes', async () => {
    const { processor, notified } = buildProcessor();
    const result = await processor.process({
      id: 'job-1',
      name: 'evaluate',
      data: { submissionId: 'sub-1' },
    } as any);

    assert.deepEqual(result, { completed: true });
    assert.deepEqual(notified, ['sub-1']);
  });

  it('notifies the SSE push channel when a battle-run job completes', async () => {
    const { processor, notified } = buildProcessor();
    await processor.process({
      id: 'job-2',
      name: 'battle-run',
      data: {
        submissionId: 'sub-2',
        userId: 'user-1',
        activityId: 'act-1',
        companionId: 'comp-1',
        code: 'solve()',
        language: 'javascript',
      },
    } as any);

    assert.deepEqual(notified, ['sub-2']);
  });

  it('notifies the SSE push channel even when the job fails', async () => {
    const { processor, notified } = buildProcessor({
      processSubmission: async () => {
        throw new Error('boom');
      },
    });
    await assert.rejects(
      processor.process({
        id: 'job-3',
        name: 'evaluate',
        data: { submissionId: 'sub-3' },
      } as any),
      /boom/,
    );

    // O SSE re-busca e vê 'error'/retry — sem o notify, o front só saberia
    // no próximo tick do polling.
    assert.deepEqual(notified, ['sub-3']);
  });
});
