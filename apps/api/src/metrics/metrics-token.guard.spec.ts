import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { MetricsTokenGuard } from './metrics-token.guard';

describe('MetricsTokenGuard', () => {
  async function createGuard(token: string | undefined) {
    const module = await Test.createTestingModule({
      providers: [
        MetricsTokenGuard,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(token) },
        },
      ],
    }).compile();

    return module.get(MetricsTokenGuard);
  }

  it('accepts the configured token in the existing x-metrics-token header', async () => {
    const guard = await createGuard('scrape-secret');
    const context = new ExecutionContextHost([
      { headers: { 'x-metrics-token': 'scrape-secret' } },
    ]);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('accepts a standard Bearer token for Prometheus scrapes', async () => {
    const guard = await createGuard('scrape-secret');
    const context = new ExecutionContextHost([
      { headers: { authorization: 'Bearer scrape-secret' } },
    ]);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('fails closed when the token is missing, malformed, or invalid', async () => {
    const guard = await createGuard('scrape-secret');

    for (const headers of [
      {},
      { authorization: 'Basic scrape-secret' },
      { authorization: 'Bearer wrong-secret' },
      { 'x-metrics-token': 'wrong-secret' },
    ]) {
      const context = new ExecutionContextHost([{ headers }]);
      expect(() => guard.canActivate(context)).toThrow('Invalid metrics token');
    }

    const unconfiguredGuard = await createGuard(undefined);
    const context = new ExecutionContextHost([
      { headers: { authorization: 'Bearer scrape-secret' } },
    ]);
    expect(() => unconfiguredGuard.canActivate(context)).toThrow('Metrics endpoint disabled');
  });
});
