import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../cache/cache.service';
import { TavilyJobsProvider } from './tavily-jobs.provider';
import { ProviderUnavailable } from './providers';

function config(values: Record<string, string>) {
  return {
    get: (name: string, fallback?: string) => values[name] ?? fallback,
  } as unknown as ConfigService;
}

describe('TavilyJobsProvider', () => {
  afterEach(() => jest.restoreAllMocks());

  it('does not call Tavily without an API key', async () => {
    const fetch = jest.spyOn(global, 'fetch');
    const provider = new TavilyJobsProvider(config({}), {} as CacheService);

    await expect(provider.searchDocuments({ goal: 'frontend' })).rejects.toBeInstanceOf(
      ProviderUnavailable,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses the official endpoint with bounded basic-search requests', async () => {
    const cache = { increment: jest.fn().mockResolvedValue(1) } as unknown as CacheService;
    const provider = new TavilyJobsProvider(
      config({ TAVILY_API_KEY: 'test-key', JOB_RESEARCH_DAILY_BUDGET: '3' }),
      cache,
    );
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            title: 'Vaga Frontend',
            content: 'React e TypeScript',
            url: 'https://jobs.example/frontend',
          },
        ],
      }),
    } as Response);

    const documents = await provider.searchDocuments({
      goal: 'frontend',
      region: 'BR',
      seniority: 'junior',
      limit: 100,
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.tavily.com/search',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
        body: expect.stringContaining('"max_results":10'),
      }),
    );
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toMatchObject({
      search_depth: 'basic',
      country: 'brazil',
      language: 'pt',
      filter_by_language: true,
      include_answer: false,
      include_raw_content: false,
    });
    expect(documents).toEqual([
      {
        id: 'https://jobs.example/frontend',
        title: 'Vaga Frontend',
        text: 'Vaga Frontend\nReact e TypeScript',
        url: 'https://jobs.example/frontend',
      },
    ]);
  });
});
