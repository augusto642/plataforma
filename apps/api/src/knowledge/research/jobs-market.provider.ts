import { Injectable } from '@nestjs/common';
import {
  ProviderUnavailable,
  type JobMarketDocument,
  type JobMarketSignal,
  type MarketQuery,
  type JobMarketSourceProvider,
  type MarketResearchProvider,
} from './providers';
import { AdzunaJobsProvider } from './adzuna-jobs.provider';
import { TavilyJobsProvider } from './tavily-jobs.provider';

export const CANONICAL_JOB_SKILLS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: 'JavaScript', pattern: /\bjavascript\b|\bjs\b/i },
  { name: 'TypeScript', pattern: /\btypescript\b|\bts\b/i },
  { name: 'React', pattern: /\breact(?:\.js)?\b/i },
  { name: 'Next.js', pattern: /\bnext\.js\b/i },
  { name: 'Node.js', pattern: /\bnode(?:\.js)?\b/i },
  { name: 'Python', pattern: /\bpython\b/i },
  { name: 'Java', pattern: /\bjava\b/i },
  { name: 'SQL', pattern: /\bsql\b/i },
  { name: 'PostgreSQL', pattern: /\bpostgres(?:ql)?\b/i },
  { name: 'AWS', pattern: /\baws\b|amazon web services/i },
  { name: 'Docker', pattern: /\bdocker\b/i },
  { name: 'Kubernetes', pattern: /\bkubernetes\b|\bk8s\b/i },
  { name: 'Git', pattern: /\bgit(?:hub|lab)?\b/i },
];

@Injectable()
export class JobsMarketProvider implements MarketResearchProvider {
  readonly id = 'jobs-market';

  constructor(
    private readonly adzuna: AdzunaJobsProvider,
    private readonly tavily: TavilyJobsProvider,
  ) {}

  configuredSources() {
    return { adzuna: this.adzuna.isConfigured(), tavily: this.tavily.isConfigured() };
  }

  async diagnoseSources() {
    const sources: JobMarketSourceProvider[] = [this.adzuna, this.tavily];
    const results: Array<{ source: string; status: 'unconfigured' | 'ok' | 'empty' | 'failed'; reason?: string }> = [];
    for (const source of sources) {
      if (!source.isConfigured()) {
        results.push({ source: source.id, status: 'unconfigured' });
        continue;
      }
      try {
        const documents = await source.searchDocuments({ goal: 'desenvolvedor python', region: 'BR', limit: 1 });
        results.push({ source: source.id, status: documents.length > 0 ? 'ok' : 'empty' });
      } catch (error) {
        if (!(error instanceof ProviderUnavailable)) throw error;
        results.push({ source: source.id, status: 'failed', reason: error.message });
      }
    }
    return results;
  }

  async searchJobs(query: MarketQuery): Promise<JobMarketSignal[]> {
    const sources: JobMarketSourceProvider[] = [this.adzuna, this.tavily];
    const configuredSources = sources.filter((source) => source.isConfigured());
    if (configuredSources.length === 0) {
      throw new ProviderUnavailable(
        this.id,
        'configure as credenciais Adzuna ou Tavily e habilite JOB_RESEARCH_DAILY_BUDGET',
      );
    }

    const documents: Array<JobMarketDocument & { source: string }> = [];
    const errors: string[] = [];
    for (const source of configuredSources) {
      try {
        const results = await source.searchDocuments(query);
        documents.push(...results.map((document) => ({ ...document, source: source.id })));
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `${source.id}: falha desconhecida`);
      }
    }

    if (documents.length === 0 && errors.length > 0) {
      throw new ProviderUnavailable(this.id, errors.join('; '));
    }

    const uniqueDocuments = this.deduplicateDocuments(documents);
    const collectedAt = new Date().toISOString();
    return this.skillSignals(uniqueDocuments, collectedAt);
  }

  private deduplicateDocuments(
    documents: Array<JobMarketDocument & { source: string }>,
  ): Array<JobMarketDocument & { sources: string[] }> {
    const unique = new Map<string, JobMarketDocument & { sources: string[] }>();
    for (const document of documents) {
      let urlKey: string | undefined;
      if (document.url) {
        try {
          const parsed = new URL(document.url.trim());
          parsed.hash = '';
          urlKey = parsed.toString();
        } catch {
          urlKey = undefined;
        }
      }
      const key = urlKey || `${document.source}:${document.id}`;
      const existing = unique.get(key);
      if (existing) {
        if (!existing.sources.includes(document.source)) existing.sources.push(document.source);
        existing.text += `\n${document.text}`;
        continue;
      }
      unique.set(key, { ...document, sources: [document.source] });
    }
    return [...unique.values()];
  }

  private skillSignals(
    documents: Array<JobMarketDocument & { sources: string[] }>,
    collectedAt: string,
  ): JobMarketSignal[] {
    return CANONICAL_JOB_SKILLS.flatMap(({ name, pattern }) => {
      const matches = documents.filter((document) => pattern.test(document.text));
      if (matches.length === 0) return [];
      return [
        {
          skill: name,
          mentions: matches.length,
          sampleSize: documents.length,
          sources: [...new Set(matches.flatMap((document) => document.sources))],
          sourceUrls: [
            ...new Set(
              matches
                .map((document) => this.safeSourceUrl(document.url))
                .filter((url): url is string => url !== null),
            ),
          ],
          collectedAt,
        },
      ];
    });
  }

  private safeSourceUrl(value?: string): string | null {
    if (!value) return null;
    try {
      const url = new URL(value);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
        return null;
      }
      url.hash = '';
      for (const key of [...url.searchParams.keys()]) {
        if (/(?:api[_-]?key|token|secret|password|authorization)/i.test(key)) {
          url.searchParams.delete(key);
        }
      }
      return url.toString();
    } catch {
      return null;
    }
  }
}
