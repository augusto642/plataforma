import { RunnerDiagnosticsService } from './runner-diagnostics.service';

describe('RunnerDiagnosticsService', () => {
  const prisma = {
    runnerDiagnostic: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  };
  const runner = { execute: jest.fn() };
  const service = new RunnerDiagnosticsService(prisma as never, runner as never);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.runnerDiagnostic.create
      .mockResolvedValueOnce({ id: 'one' })
      .mockResolvedValueOnce({ id: 'two' });
    prisma.runnerDiagnostic.update.mockImplementation(async ({ data }) => data);
  });

  it('records real results without storing output or submitted code', async () => {
    runner.execute
      .mockResolvedValueOnce({ status: 'passed', kind: 'passed', stdout: 'nexus-runner-test-ok\n', durationMs: 42 })
      .mockResolvedValueOnce({ status: 'error', kind: 'sandbox_unavailable', stdout: '', durationMs: 8 });

    await expect(service.run('admin')).resolves.toEqual([
      expect.objectContaining({ status: 'passed', kind: 'passed', durationMs: 42 }),
      expect.objectContaining({ status: 'failed', kind: 'sandbox_unavailable', durationMs: 8 }),
    ]);
    expect(runner.execute.mock.calls.map(([language]) => language)).toEqual(['javascript', 'python']);
    expect(prisma.runnerDiagnostic.create).toHaveBeenCalledWith({
      data: { adminId: 'admin', language: 'javascript', status: 'running' },
    });
    expect(JSON.stringify(prisma.runnerDiagnostic.update.mock.calls)).not.toContain('nexus-runner-test-ok');
  });

  it('does not report success for unexpected output or an exception', async () => {
    runner.execute
      .mockResolvedValueOnce({ status: 'passed', kind: 'passed', stdout: 'wrong', durationMs: 1 })
      .mockRejectedValueOnce(new Error('private upstream detail'));
    await expect(service.run('admin')).resolves.toEqual([
      expect.objectContaining({ status: 'failed', kind: 'unexpected_output' }),
      expect.objectContaining({ status: 'failed', kind: 'internal_error' }),
    ]);
    expect(JSON.stringify(prisma.runnerDiagnostic.update.mock.calls)).not.toContain('private upstream detail');
  });

  it('limits the history to the most recent 50 entries', async () => {
    await service.list();
    expect(prisma.runnerDiagnostic.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  });
});
