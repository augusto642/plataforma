import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../cache/cache.service';
import { reserveJobResearchCall } from './market-budget';

describe('reserveJobResearchCall', () => {
  it('reserves one call with a TTL until the next UTC day', async () => {
    const increment = jest.fn().mockResolvedValue(1);
    const cache = { increment } as unknown as CacheService;
    const config = {
      get: jest.fn().mockReturnValue('5'),
    } as unknown as ConfigService;

    await expect(reserveJobResearchCall('adzuna', config, cache)).resolves.toBeUndefined();
    expect(increment).toHaveBeenCalledWith(
      expect.stringMatching(/^job-research:requests:\d{4}-\d{2}-\d{2}$/),
      expect.any(Number),
    );
  });

  it('rejects new calls beyond the configured daily budget and releases the reservation', async () => {
    const increment = jest.fn().mockResolvedValue(6);
    const decrement = jest.fn().mockResolvedValue(5);
    const cache = { increment, decrement } as unknown as CacheService;
    const config = {
      get: jest.fn().mockReturnValue('5'),
    } as unknown as ConfigService;

    await expect(reserveJobResearchCall('tavily', config, cache)).rejects.toThrow(
      /orçamento diário.*esgotado/,
    );
    expect(decrement).toHaveBeenCalledWith(expect.stringMatching(/^job-research:requests:/));
  });

  it('keeps external research disabled when the daily budget is zero', async () => {
    const increment = jest.fn();
    const cache = { increment } as unknown as CacheService;
    const config = {
      get: jest.fn().mockReturnValue('0'),
    } as unknown as ConfigService;

    await expect(reserveJobResearchCall('adzuna', config, cache)).rejects.toThrow(
      /orçamento diário não habilitado/,
    );
    expect(increment).not.toHaveBeenCalled();
  });
});
