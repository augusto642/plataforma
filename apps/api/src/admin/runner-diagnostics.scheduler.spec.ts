import { RunnerDiagnosticsScheduler } from './runner-diagnostics.scheduler';

describe('RunnerDiagnosticsScheduler', () => {
  const config = { get: jest.fn() };
  const lock = { acquireLock: jest.fn() };
  const diagnostics = { run: jest.fn() };
  const scheduler = new RunnerDiagnosticsScheduler(config as never, lock as never, diagnostics as never);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
  });
  afterEach(() => {
    scheduler.onModuleDestroy();
    jest.useRealTimers();
  });

  it('only schedules tests when the executor is explicitly enabled', async () => {
    config.get.mockReturnValue('false');
    scheduler.onModuleInit();
    await jest.advanceTimersByTimeAsync(900_000);
    expect(diagnostics.run).not.toHaveBeenCalled();
  });

  it('runs once for an acquired window and skips another replica', async () => {
    config.get.mockReturnValue('true');
    lock.acquireLock.mockResolvedValueOnce('token').mockResolvedValueOnce(null);
    scheduler.onModuleInit();
    await jest.advanceTimersByTimeAsync(30_000);
    expect(diagnostics.run).toHaveBeenCalledWith(null);
    await scheduler.check();
    expect(diagnostics.run).toHaveBeenCalledTimes(1);
    expect(lock.acquireLock).toHaveBeenCalledTimes(2);
  });
});
