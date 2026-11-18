import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../cache/cache.service';
import { ProviderUnavailable } from './providers';

export async function reserveJobResearchCall(
  provider: string,
  config: ConfigService,
  cache: CacheService,
): Promise<void> {
  const dailyBudget = Number(config.get<string>('JOB_RESEARCH_DAILY_BUDGET', '0'));
  if (!Number.isSafeInteger(dailyBudget) || dailyBudget < 1) {
    throw new ProviderUnavailable(provider, 'orçamento diário não habilitado');
  }

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const nextUtcDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const ttlSeconds = Math.max(1, Math.ceil((nextUtcDay - now.getTime()) / 1000));
  const key = `job-research:requests:${day}`;
  const reserved = await cache.increment(key, ttlSeconds);
  if (reserved > dailyBudget) {
    await cache.decrement(key);
    throw new ProviderUnavailable(provider, 'orçamento diário de pesquisas esgotado');
  }
}
