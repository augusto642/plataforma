/**
 * YouTube Data API v3 (DESIGN §3.2, B1). Cota padrão 10.000 unidades/dia;
 * search.list custa 100 — por isso o provedor cacheia resultados por 7 dias
 * e nunca repete a mesma busca no mesmo dia. Sem YOUTUBE_API_KEY =>
 * ProviderUnavailable (fail-closed, D5).
 */
import { ProviderUnavailable, type ChannelSignal, type VideoResearchProvider, type VideoSignal } from './providers';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class YouTubeDataProvider implements VideoResearchProvider {
  readonly id = 'youtube';
  private cache = new Map<string, { at: number; value: VideoSignal[] }>();

  constructor(private readonly apiKey: string | undefined = process.env.YOUTUBE_API_KEY) {}

  private assertKey(): string {
    if (!this.apiKey) throw new ProviderUnavailable('youtube', 'YOUTUBE_API_KEY ausente (não consta no .env.example)');
    return this.apiKey;
  }

  async searchVideos(q: string, opts?: { maxResults?: number; language?: 'pt' }): Promise<VideoSignal[]> {
    const key = this.assertKey();
    const cacheKey = `${q}|${opts?.maxResults ?? 10}|${opts?.language ?? 'pt'}`;
    const hit = this.cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
    const params = new URLSearchParams({
      part: 'snippet', q, type: 'video', maxResults: String(opts?.maxResults ?? 10),
      relevanceLanguage: opts?.language ?? 'pt', key,
    });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    if (res.status === 403) {
      const body = await res.text();
      if (/quota/i.test(body)) throw new ProviderUnavailable('youtube', 'cota da YouTube Data API esgotada — resultado parcial nunca é apresentado como completo');
      throw new ProviderUnavailable('youtube', `YouTube API recusou a chamada (403)`);
    }
    if (!res.ok) throw new ProviderUnavailable('youtube', `YouTube API retornou ${res.status}`);
    const data: any = await res.json();
    const value: VideoSignal[] = (data.items || []).map((it: any) => ({
      videoId: it.id?.videoId,
      title: it.snippet?.title,
      channelTitle: it.snippet?.channelTitle,
      channelId: it.snippet?.channelId,
      publishedAt: it.snippet?.publishedAt,
      url: `https://www.youtube.com/watch?v=${it.id?.videoId}`,
    }));
    this.cache.set(cacheKey, { at: Date.now(), value });
    return value;
  }

  async getChannel(channelId: string): Promise<ChannelSignal | null> {
    const key = this.assertKey();
    const params = new URLSearchParams({ part: 'snippet,statistics', id: channelId, key });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`);
    if (!res.ok) throw new ProviderUnavailable('youtube', `YouTube API retornou ${res.status}`);
    const data: any = await res.json();
    const it = data.items?.[0];
    if (!it) return null;
    return {
      channelId,
      title: it.snippet?.title,
      subscriberCount: it.statistics?.subscriberCount ? Number(it.statistics.subscriberCount) : undefined,
      url: `https://www.youtube.com/channel/${channelId}`,
    };
  }
}
