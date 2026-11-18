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

const API_URL = 'https://api.tavily.com/search';
const DEFAULT_TIMEOUT_MS = 8_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

@Injectable()
export class TavilyJobsProvider implements JobMarketSourceProvider {
  readonly id = 'tavily';

  constructor(
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('TAVILY_API_KEY')?.trim());
  }

  async searchDocuments(query: MarketQuery): Promise<JobMarketDocument[]> {
    const apiKey = this.config.get<string>('TAVILY_API_KEY')?.trim();
    if (!apiKey) {
      throw new ProviderUnavailable(this.id, 'TAVILY_API_KEY ausente');
    }

    await reserveJobResearchCall(this.id, this.config, this.cache);

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.timeoutMs(),
    );
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query: `vagas no Brasil para ${query.goal} ${query.seniority === 'junior' ? 'júnior' : ''} requisitos e habilidades`,
          search_depth: 'basic',
          topic: 'general',
          max_results: Math.max(1, Math.min(10, Math.floor(query.limit ?? 10))),
          ...(query.region === 'BR' ? { country: 'brazil' } : {}),
          language: 'pt',
          filter_by_language: true,
          include_answer: false,
          include_raw_content: false,
        }),
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
        const content = stringValue(item.content);
        const url = stringValue(item.url);
        if (!title && !content) return [];
        return [
          {
            id: url || `tavily-${index}`,
            title,
            text: `${title}\n${content}`,
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

  private timeoutMs(): number {
    const configured = Number(this.config.get<string>('JOB_RESEARCH_TIMEOUT_MS', ''));
    return Number.isSafeInteger(configured) && configured >= 1_000
      ? Math.min(configured, 15_000)
      : DEFAULT_TIMEOUT_MS;
  }
}
