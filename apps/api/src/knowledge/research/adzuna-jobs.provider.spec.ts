import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../cache/cache.service';
import { AdzunaJobsProvider } from './adzuna-jobs.provider';
import { ProviderUnavailable } from './providers';

function config(values: Record<string, string>) {
  return {
    get: (name: string, fallback?: string) => values[name] ?? fallback,
  } as unknown as ConfigService;
}

describe('AdzunaJobsProvider', () => {
  afterEach(() => jest.restoreAllMocks());

  it('does not call Adzuna without both credentials', async () => {
    const fetch = jest.spyOn(global, 'fetch');
    const provider = new AdzunaJobsProvider(config({ ADZUNA_APP_ID: 'id' }), {} as CacheService);

    await expect(provider.searchDocuments({ goal: 'frontend' })).rejects.toBeInstanceOf(
      ProviderUnavailable,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses the official search endpoint, bounded result count, and extracts valid listings', async () => {
    const cache = { increment: jest.fn().mockResolvedValue(1) } as unknown as CacheService;
    const provider = new AdzunaJobsProvider(
      config({
        ADZUNA_APP_ID: 'test-id',
        ADZUNA_APP_KEY: 'test-key',
        JOB_RESEARCH_DAILY_BUDGET: '3',
      }),
      cache,
    );
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 'listing-1',
            title: 'Pessoa Desenvolvedora React',
            description: 'React e TypeScript',
            redirect_url: 'https://jobs.example/1',
          },
          { title: '', description: '' },
        ],
      }),
    } as Response);

    const documents = await provider.searchDocuments({
      goal: 'frontend',
      region: 'BR',
      seniority: 'junior',
      limit: 500,
    });

    const [url] = fetch.mock.calls[0];
    const parsedUrl = new URL(String(url));
    expect(parsedUrl.pathname).toBe('/v1/api/jobs/br/search/1');
    expect(parsedUrl.searchParams.get('app_id')).toBe('test-id');
    expect(parsedUrl.searchParams.get('app_key')).toBe('test-key');
    expect(parsedUrl.searchParams.get('results_per_page')).toBe('50');
    expect(parsedUrl.searchParams.get('what_exclude')).toBe('senior');
    expect(documents).toEqual([
      {
        id: 'listing-1',
        title: 'Pessoa Desenvolvedora React',
        text: 'Pessoa Desenvolvedora React\nReact e TypeScript',
        url: 'https://jobs.example/1',
      },
    ]);
    expect(cache.increment).toHaveBeenCalledTimes(1);
  });

  it('does not expose API credentials when the provider fails', async () => {
    const cache = { increment: jest.fn().mockResolvedValue(1) } as unknown as CacheService;
    const provider = new AdzunaJobsProvider(
      config({
        ADZUNA_APP_ID: 'test-id',
        ADZUNA_APP_KEY: 'private-test-key',
        JOB_RESEARCH_DAILY_BUDGET: '3',
      }),
      cache,
    );
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 401 } as Response);

    const error = await provider.searchDocuments({ goal: 'frontend' }).catch((reason) => reason);
    expect(error).toBeInstanceOf(ProviderUnavailable);
    expect(error.message).toMatch(/status 401/);
    expect(error.message).not.toContain('private-test-key');
  });
});
