import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CareerTierGuard } from './career-tier.guard';

describe('CareerTierGuard', () => {
  let guard: CareerTierGuard;
  let reflector: Reflector;

  const mockContext = (body: any = {}, params: any = {}, query: any = {}): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ body, params, query }),
      }),
    } as unknown as ExecutionContext);

  beforeEach(() => {
    reflector = new Reflector();
    guard = new CareerTierGuard(reflector);
  });

  it('allows access when no tier is requested or required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = mockContext();

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when beginner tier is requested', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = mockContext({ careerTier: 'beginner' });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('blocks junior career tier with ForbiddenException', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = mockContext({ careerTier: 'junior' });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow(
      'Patente bloqueada: conclua o nível Iniciante primeiro',
    );
  });

  it('blocks mid career tier with ForbiddenException', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = mockContext({ careerTier: 'mid' });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow(
      'Patente bloqueada: conclua o nível Iniciante primeiro',
    );
  });

  it('blocks senior career tier with ForbiddenException', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = mockContext({ careerTier: 'senior' });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow(
      'Patente bloqueada: conclua o nível Iniciante primeiro',
    );
  });

  it('blocks when reflector has junior required tier', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('junior');
    const ctx = mockContext();

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
