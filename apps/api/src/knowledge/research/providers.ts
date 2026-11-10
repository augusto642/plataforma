/**
 * Pesquisa profunda — contratos dos provedores (DESIGN §3.2).
 * Um arquivo por provedor na implementação; trocar o provedor é trocar a
 * classe, não o consumidor (mesmo padrão da camada LlmProvider).
 * Regra D5: sem chave => ProviderUnavailable — fonte indisponível e ROTULADA
 * em sourcesUnavailable, nunca dado inventado, nunca 500.
 */
export class ProviderUnavailable extends Error {
  constructor(
    public readonly provider: string,
    reason: string,
  ) {
    super(`fonte indisponível (${provider}): ${reason}`);
    this.name = 'ProviderUnavailable';
  }
}

export interface MarketQuery {
  goal: string;
  region?: 'BR';
  seniority?: 'junior' | 'mid';
  limit?: number;
}
export interface JobMarketSignal {
  skill: string;
  mentions: number;
  sampleSize: number;
  sources: string[];
  collectedAt: string;
}
export interface MarketResearchProvider {
  readonly id: string;
  searchJobs(query: MarketQuery): Promise<JobMarketSignal[]>;
}

export interface VideoSignal {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  viewCount?: number;
  url: string;
}
export interface ChannelSignal {
  channelId: string;
  title: string;
  subscriberCount?: number;
  url: string;
}
export interface VideoResearchProvider {
  readonly id: string;
  searchVideos(q: string, opts?: { maxResults?: number; language?: 'pt' }): Promise<VideoSignal[]>;
  getChannel(channelId: string): Promise<ChannelSignal | null>;
}

export interface RepoSignal {
  fullName: string;
  description?: string;
  stars: number;
  url: string;
  language?: string;
  updatedAt: string;
}
export interface RepoResearchProvider {
  readonly id: string;
  searchRepos(q: string, opts?: { language?: 'python'; minStars?: number }): Promise<RepoSignal[]>;
}
