import { JobResearchPreflightService } from './job-research-preflight.service';

describe('job research preflight', () => {
  it('reports configuration only, without returning provider credentials', () => {
    const service = new JobResearchPreflightService(
      { configuredSources: () => ({ adzuna: true, tavily: false }) } as never,
      { get: () => '5' } as never,
      {} as never,
    );
    expect(service.getStatus()).toEqual({
      sources: { adzuna: true, tavily: false }, dailyBudget: 5, enabled: true,
    });
  });

  it('reports disabled for an invalid budget or absent sources', () => {
    const jobs = { configuredSources: () => ({ adzuna: false, tavily: false }) };
    const invalid = new JobResearchPreflightService(jobs as never, { get: () => 'invalid' } as never, {} as never);
    expect(invalid.getStatus()).toEqual({
      sources: { adzuna: false, tavily: false }, dailyBudget: null, enabled: false,
    });
    const noSources = new JobResearchPreflightService(jobs as never, { get: () => '5' } as never, {} as never);
    expect(noSources.getStatus().enabled).toBe(false);
  });

  it('audits a manual diagnostic without storing returned documents', async () => {
    const results = [{ source: 'adzuna', status: 'ok' }, { source: 'tavily', status: 'unconfigured' }];
    const jobs = { configuredSources: () => ({ adzuna: true, tavily: false }), diagnoseSources: jest.fn().mockResolvedValue(results) };
    const create = jest.fn().mockResolvedValue({});
    const service = new JobResearchPreflightService(jobs as never, { get: () => '2' } as never, { adminAuditEvent: { create } } as never);
    expect(await service.runDiagnostic('admin')).toEqual({ id: expect.any(String), results });
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][0].data).toEqual(expect.objectContaining({ action: 'knowledge.jobs.diagnostic.started' }));
    expect(create.mock.calls[1][0].data).toEqual(expect.objectContaining({ action: 'knowledge.jobs.diagnostic.finished', newValue: 'adzuna:ok,tavily:off' }));
  });

  it('refuses to call providers without a configured budget', async () => {
    const jobs = { configuredSources: () => ({ adzuna: true, tavily: false }), diagnoseSources: jest.fn() };
    const service = new JobResearchPreflightService(jobs as never, { get: () => '0' } as never, {} as never);
    await expect(service.runDiagnostic('admin')).rejects.toThrow(/orçamento/);
    expect(jobs.diagnoseSources).not.toHaveBeenCalled();
  });
});
