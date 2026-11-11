import assert from 'node:assert/strict';
import { PistonCircuitBreaker } from './circuit-breaker';

/**
 * M7 (Lote 4) — circuit breaker mínimo do Piston, testado com relógio
 * injetado (`allowRequest(now)` / `stateAt(now)`) para não depender de
 * esperas reais.
 */
describe('PistonCircuitBreaker (M7)', () => {
  it('starts closed and allows requests', () => {
    const breaker = new PistonCircuitBreaker(3, 30_000);

    assert.equal(breaker.state, 'closed');
    assert.equal(breaker.allowRequest(1000), true);
    assert.equal(breaker.failureCount, 0);
  });

  it('stays closed below the failure threshold', () => {
    const breaker = new PistonCircuitBreaker(3, 30_000);

    breaker.recordFailure(1000);
    breaker.recordFailure(2000);

    assert.equal(breaker.stateAt(2000), 'closed');
    assert.equal(breaker.allowRequest(2000), true);
    assert.equal(breaker.failureCount, 2);
  });

  it('opens after N consecutive failures and refuses requests until the cooldown elapses', () => {
    const breaker = new PistonCircuitBreaker(3, 30_000);

    breaker.recordFailure(1000);
    breaker.recordFailure(2000);
    breaker.recordFailure(3000);

    assert.equal(breaker.stateAt(3000), 'open');
    assert.equal(breaker.allowRequest(3000), false);
    assert.equal(breaker.allowRequest(32_999), false);
    assert.equal(breaker.stateAt(32_999), 'open');
  });

  it('allows exactly one half-open trial after the cooldown, and blocks the rest while it flies', () => {
    const breaker = new PistonCircuitBreaker(2, 1000);

    breaker.recordFailure(0);
    breaker.recordFailure(0);
    assert.equal(breaker.stateAt(0), 'open');

    assert.equal(breaker.allowRequest(1000), true);
    assert.equal(breaker.stateAt(1000), 'half-open');
    // Segunda chamada concorrente durante o trial: falha rápido.
    assert.equal(breaker.allowRequest(1000), false);
  });

  it('closes after a successful half-open trial', () => {
    const breaker = new PistonCircuitBreaker(2, 1000);

    breaker.recordFailure(0);
    breaker.recordFailure(0);
    assert.equal(breaker.allowRequest(1000), true);

    breaker.recordSuccess();

    assert.equal(breaker.state, 'closed');
    assert.equal(breaker.failureCount, 0);
    assert.equal(breaker.allowRequest(), true);
  });

  it('reopens after a failed half-open trial', () => {
    const breaker = new PistonCircuitBreaker(2, 1000);

    breaker.recordFailure(0);
    breaker.recordFailure(0);
    assert.equal(breaker.allowRequest(1000), true);

    breaker.recordFailure(1500);

    assert.equal(breaker.stateAt(1500), 'open');
    assert.equal(breaker.allowRequest(1500), false);
    assert.equal(breaker.allowRequest(2500), true);
  });

  it('a success below the threshold resets the consecutive failure count', () => {
    const breaker = new PistonCircuitBreaker(3, 30_000);

    breaker.recordFailure(1000);
    breaker.recordFailure(2000);
    breaker.recordSuccess();
    breaker.recordFailure(3000);
    breaker.recordFailure(4000);

    assert.equal(breaker.stateAt(4000), 'closed');
    assert.equal(breaker.failureCount, 2);
  });
});
