import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TestModeGuard } from './test-mode.guard';

/**
 * A10 (Lote 3 · portões do merge) — o guard que trava o checkout fora
 * do modo teste estava com o `canActivate` sem cobertura (só a
 * instanciação pelo Nest contava: 60% stmts / 50% funcs). Os dois
 * sentidos: permite em modo teste (explícito ou ausente, que usa o
 * default 'test') e bloqueia com 503 qualquer outro modo.
 */
describe('TestModeGuard', () => {
  function guardWithMode(mode: string | undefined) {
    const config = {
      get: jest.fn((_key: string, def?: unknown) =>
        mode === undefined ? def : mode,
      ),
    } as unknown as ConfigService;
    return new TestModeGuard(config);
  }

  it('permite quando BILLING_MODE é "test"', () => {
    const guard = guardWithMode('test');
    expect(guard.canActivate({} as never)).toBe(true);
  });

  it('permite quando a variável está ausente (default é modo teste)', () => {
    const guard = guardWithMode(undefined);
    expect(guard.canActivate({} as never)).toBe(true);
  });

  it('bloqueia com 503 quando o modo é diferente de "test"', () => {
    const guard = guardWithMode('live');
    expect(() => guard.canActivate({} as never)).toThrow(
      ServiceUnavailableException,
    );
    expect(() => guard.canActivate({} as never)).toThrow(
      /Cobrança real não ativada/,
    );
  });
});
