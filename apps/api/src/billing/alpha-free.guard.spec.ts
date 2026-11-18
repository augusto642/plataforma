import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlphaFreeBillingGuard } from './alpha-free.guard';

describe('AlphaFreeBillingGuard', () => {
  function createGuard(enabled: string | undefined) {
    const config = {
      get: jest.fn((key: string) => key === 'ALPHA_FREE_MODE' ? enabled : undefined),
    } as unknown as ConfigService;
    return new AlphaFreeBillingGuard(config);
  }

  it('allows billing outside the free alpha', () => {
    expect(createGuard('false').canActivate({} as never)).toBe(true);
    expect(createGuard(undefined).canActivate({} as never)).toBe(true);
  });

  it('blocks checkout and payment simulation during the free alpha', () => {
    expect(() => createGuard('true').canActivate({} as never)).toThrow(
      ServiceUnavailableException,
    );
  });
});
