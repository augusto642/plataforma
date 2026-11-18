import { JobsMarketProvider } from './jobs-market.provider';
import { ProviderUnavailable } from './providers';

describe('JobsMarketProvider', () => {
  const adzuna = {
    id: 'adzuna',
    isConfigured: jest.fn().mockReturnValue(true),
    searchDocuments: jest.fn(),
  };
  const tavily = {
    id: 'tavily',
    isConfigured: jest.fn().mockReturnValue(true),
    searchDocuments: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adzuna.isConfigured.mockReturnValue(true);
    tavily.isConfigured.mockReturnValue(true);
  });

  it('combines authorized sources, deduplicates URLs, and reports measured skill counts', async () => {
    adzuna.searchDocuments.mockResolvedValue([
      {
        id: 'adzuna-1',
        title: 'Desenvolvedor React',
        text: 'Desenvolvedor React com TypeScript',
        url: 'https://jobs.example/vaga/1',
      },
    ]);
    tavily.searchDocuments.mockResolvedValue([
      {
        id: 'tavily-1',
        title: 'Vaga de frontend',
        text: 'React, TypeScript e AWS',
        url: 'https://jobs.example/vaga/1#result',
      },
      {
        id: 'tavily-2',
        title: 'Outra vaga',
        text: 'AWS e Docker',
        url: 'https://jobs.example/vaga/2',
      },
    ]);
    const provider = new JobsMarketProvider(adzuna as any, tavily as any);

    const signals = await provider.searchJobs({ goal: 'frontend', region: 'BR' });

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          skill: 'React',
          mentions: 1,
          sampleSize: 2,
          sources: ['adzuna', 'tavily'],
          sourceUrls: ['https://jobs.example/vaga/1'],
        }),
        expect.objectContaining({
          skill: 'AWS',
          mentions: 2,
          sampleSize: 2,
          sources: ['adzuna', 'tavily'],
          sourceUrls: ['https://jobs.example/vaga/1', 'https://jobs.example/vaga/2'],
        }),
      ]),
    );
    expect(signals.every((signal) => Number.isFinite(Date.parse(signal.collectedAt)))).toBe(true);
  });

  it('uses the available source when its peer is unavailable', async () => {
    adzuna.searchDocuments.mockRejectedValue(new ProviderUnavailable('adzuna', 'limite diário'));
    tavily.searchDocuments.mockResolvedValue([
      {
        id: 'tavily-1',
        title: 'Vaga Python',
        text: 'Python e SQL',
        url: 'https://jobs.example/python',
      },
    ]);
    const provider = new JobsMarketProvider(adzuna as any, tavily as any);

    await expect(provider.searchJobs({ goal: 'dados', region: 'BR' })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ skill: 'Python', sources: ['tavily'], sampleSize: 1 }),
      ]),
    );
  });

  it('does not merge distinct case-sensitive paths', async () => {
    adzuna.searchDocuments.mockResolvedValue([
      { id: '1', title: 'First', text: 'Python', url: 'https://jobs.example/Job/A' },
      { id: '2', title: 'Second', text: 'Python', url: 'https://jobs.example/job/a' },
    ]);
    tavily.searchDocuments.mockResolvedValue([]);
    const provider = new JobsMarketProvider(adzuna as any, tavily as any);
    await expect(provider.searchJobs({ goal: 'python' })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ skill: 'Python', mentions: 2, sampleSize: 2 })]),
    );
  });

  it('diagnoses each configured source without exposing its documents', async () => {
    adzuna.searchDocuments.mockResolvedValue([{ id: '1', title: 'Private title', text: 'Python', url: 'https://example.org/job' }]);
    tavily.searchDocuments.mockRejectedValue(new ProviderUnavailable('tavily', 'indisponível'));
    const provider = new JobsMarketProvider(adzuna as any, tavily as any);
    await expect(provider.diagnoseSources()).resolves.toEqual([
      { source: 'adzuna', status: 'ok' },
      { source: 'tavily', status: 'failed', reason: 'fonte indisponível (tavily): indisponível' },
    ]);
    expect(adzuna.searchDocuments).toHaveBeenCalledWith({ goal: 'desenvolvedor python', region: 'BR', limit: 1 });
  });

  it('refuses to fabricate job-market signals without credentials', async () => {
    adzuna.isConfigured.mockReturnValue(false);
    tavily.isConfigured.mockReturnValue(false);
    const provider = new JobsMarketProvider(adzuna as any, tavily as any);

    await expect(
      provider.searchJobs({ goal: 'fullstack', region: 'BR' }),
    ).rejects.toBeInstanceOf(ProviderUnavailable);
    expect(adzuna.searchDocuments).not.toHaveBeenCalled();
    expect(tavily.searchDocuments).not.toHaveBeenCalled();
  });

  it('fails closed when every configured source fails', async () => {
    adzuna.isConfigured.mockReturnValue(true);
    tavily.isConfigured.mockReturnValue(true);
    adzuna.searchDocuments.mockRejectedValue(new ProviderUnavailable('adzuna', 'indisponível'));
    tavily.searchDocuments.mockRejectedValue(new ProviderUnavailable('tavily', 'indisponível'));
    const provider = new JobsMarketProvider(adzuna as any, tavily as any);

    await expect(provider.searchJobs({ goal: 'fullstack' })).rejects.toThrow(
      /adzuna.*indisponível.*tavily.*indisponível/,
    );
  });
});
