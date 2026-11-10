import { DynamicTrackProcessor } from './dynamic-track.processor';

function buildProcessor(runImpl: jest.Mock) {
  const service = {
    runInvestigation: runImpl,
    markFailed: jest.fn().mockResolvedValue(undefined),
  };
  return {
    processor: new DynamicTrackProcessor(service as never),
    service,
  };
}

function job(overrides: Record<string, unknown> = {}) {
  return {
    name: 'investigate',
    data: { userId: 'user-1' },
    attemptsMade: 0,
    ...overrides,
  } as never;
}

describe('DynamicTrackProcessor', () => {
  it('conclui a investigação e devolve action/track', async () => {
    const { processor } = buildProcessor(
      jest.fn().mockResolvedValue({
        action: 'ready',
        track: 'backend',
        basis: 'profile-only',
        evidenceCount: 0,
      }),
    );
    const out = await processor.process(job());
    expect(out).toEqual({ ok: true, action: 'ready', track: 'backend' });
  });

  it('job desconhecido ⇒ erro (não engole fila errada)', async () => {
    const { processor } = buildProcessor(jest.fn());
    await expect(
      processor.process(job({ name: 'outro-job' })),
    ).rejects.toThrow('job desconhecido');
  });

  it('erro transitório na 1ª tentativa ⇒ rethrow (BullMQ tenta de novo)', async () => {
    const run = jest.fn().mockRejectedValue(new Error('banco fora'));
    const { processor, service } = buildProcessor(run);
    await expect(
      processor.process(job({ attemptsMade: 0 })),
    ).rejects.toThrow('banco fora');
    expect(service.markFailed).not.toHaveBeenCalled();
  });

  it('erro na 2ª tentativa ⇒ rethrow (ainda há 1 tentativa)', async () => {
    const run = jest.fn().mockRejectedValue(new Error('banco fora'));
    const { processor, service } = buildProcessor(run);
    await expect(
      processor.process(job({ attemptsMade: 1 })),
    ).rejects.toThrow('banco fora');
    expect(service.markFailed).not.toHaveBeenCalled();
  });

  it('erro na última tentativa (3ª) ⇒ marca failed e NÃO rethrow', async () => {
    const run = jest.fn().mockRejectedValue(new Error('banco fora'));
    const { processor, service } = buildProcessor(run);
    const out = await processor.process(job({ attemptsMade: 2 }));
    expect(out).toEqual({ ok: false, action: 'failed' });
    expect(service.markFailed).toHaveBeenCalledWith('user-1', 'banco fora');
  });

  it('noop (sem investigação) não é erro', async () => {
    const { processor } = buildProcessor(
      jest.fn().mockResolvedValue({ action: 'noop' }),
    );
    const out = await processor.process(job());
    expect(out).toEqual({ ok: true, action: 'noop', track: undefined });
  });
});
