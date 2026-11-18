import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../cache/cache.service';
import {
  ProviderUnavailable,
  type JobMarketDocument,
  type JobMarketSourceProvider,
  type MarketQuery,
} from './providers';
import { reserveJobResearchCall } from './market-budget';

const API_BASE_URL = 'https://api.adzuna.com/v1/api/jobs';
const DEFAULT_TIMEOUT_MS = 8_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

@Injectable()
export class AdzunaJobsProvider implements JobMarketSourceProvider {
  readonly id = 'adzuna';

  constructor(
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('ADZUNA_APP_ID')?.trim() &&
        this.config.get<string>('ADZUNA_APP_KEY')?.trim(),
    );
  }

  async searchDocuments(query: MarketQuery): Promise<JobMarketDocument[]> {
    const appId = this.config.get<string>('ADZUNA_APP_ID')?.trim();
    const appKey = this.config.get<string>('ADZUNA_APP_KEY')?.trim();
    if (!appId || !appKey) {
      throw new ProviderUnavailable(this.id, 'ADZUNA_APP_ID/ADZUNA_APP_KEY ausentes');
    }

    await reserveJobResearchCall(this.id, this.config, this.cache);

    const page = new URL(`${API_BASE_URL}/br/search/1`);
    page.searchParams.set('app_id', appId);
    page.searchParams.set('app_key', appKey);
    page.searchParams.set('what', query.goal);
    if (query.seniority === 'junior') page.searchParams.set('what_exclude', 'senior');
    page.searchParams.set('results_per_page', String(this.resultLimit(query.limit)));
    page.searchParams.set('content-type', 'application/json');

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.timeoutMs(),
    );
    try {
      const response = await fetch(page, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new ProviderUnavailable(this.id, `API retornou status ${response.status}`);
      }

      const payload: unknown = await response.json();
      if (!isRecord(payload) || !Array.isArray(payload.results)) {
        throw new ProviderUnavailable(this.id, 'resposta inválida da API');
      }

      return payload.results.flatMap((item, index) => {
        if (!isRecord(item)) return [];
        const title = stringValue(item.title);
        const description = stringValue(item.description);
        if (!title && !description) return [];
        const jobId = stringValue(item.id);
        const url = stringValue(item.redirect_url);
        return [
          {
            id: jobId || url || `adzuna-${index}`,
            title,
            text: `${title}\n${description}`,
            ...(url ? { url } : {}),
          },
        ];
      });
    } catch (error) {
      if (error instanceof ProviderUnavailable) throw error;
      throw new ProviderUnavailable(
        this.id,
        controller.signal.aborted ? 'tempo limite excedido' : 'falha de rede ou resposta inválida',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private resultLimit(requested?: number): number {
    return Math.max(1, Math.min(50, Math.floor(requested ?? 20)));
  }

  private timeoutMs(): number {
    const configured = Number(this.config.get<string>('JOB_RESEARCH_TIMEOUT_MS', ''));
    return Number.isSafeInteger(configured) && configured >= 1_000
      ? Math.min(configured, 15_000)
      : DEFAULT_TIMEOUT_MS;
  }
}
