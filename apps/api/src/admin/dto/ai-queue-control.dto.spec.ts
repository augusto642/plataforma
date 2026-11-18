import { validate } from 'class-validator';
import { AiQueueControlDto } from './ai-queue-control.dto';

describe('AiQueueControlDto', () => {
  const control = (values: Partial<AiQueueControlDto>) =>
    Object.assign(new AiQueueControlDto(), {
      queue: 'ai-reviews',
      action: 'pause',
      reason: 'Pausing during provider incident',
      ...values,
    });

  it('accepts a reasoned action for an AI queue', async () => {
    await expect(validate(control({}))).resolves.toHaveLength(0);
  });

  it('rejects non-AI queues, unsupported actions, and short reasons', async () => {
    const errors = await validate(
      control({ queue: 'billing-events' as any, action: 'delete' as any, reason: 'stop' }),
    );
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['queue', 'action', 'reason']),
    );
  });
});
