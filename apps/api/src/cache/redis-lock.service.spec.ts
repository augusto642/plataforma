import { RedisLockService } from './redis-lock.service';

describe('RedisLockService', () => {
  let service: RedisLockService;
  let client: any;
  const config = { get: jest.fn((_k: string, d?: any) => d) } as any;

  beforeEach(() => {
    service = new RedisLockService(config);
    // Substitui o client ioredis (lazyConnect nunca conectou) por um mock
    client = {
      set: jest.fn(),
      eval: jest.fn(),
      on: jest.fn(),
      disconnect: jest.fn(),
    };
    (service as any).client = client;
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('acquireLock', () => {
    it('returns the token when SET NX PX succeeds', async () => {
      client.set.mockResolvedValue('OK');
      const token = await service.acquireLock('lock:x', 5000);
      expect(token).toEqual(expect.any(String));
      expect(client.set).toHaveBeenCalledWith('lock:x', token, 'PX', 5000, 'NX');
    });

    it('returns null when the lock is already held', async () => {
      client.set.mockResolvedValue(null);
      expect(await service.acquireLock('lock:x', 5000)).toBeNull();
    });

    it('returns null (fail-safe) when Redis errors', async () => {
      client.set.mockRejectedValue(new Error('conn refused'));
      expect(await service.acquireLock('lock:x', 5000)).toBeNull();
    });
  });

  describe('releaseLock', () => {
    it('releases via conditional Lua when the token matches', async () => {
      client.eval.mockResolvedValue(1);
      const ok = await service.releaseLock('lock:x', 'token-1');
      expect(ok).toBe(true);
      const [script, numKeys, key, token] = client.eval.mock.calls[0];
      expect(script).toContain('del');
      expect(numKeys).toBe(1);
      expect(key).toBe('lock:x');
      expect(token).toBe('token-1');
    });

    it('does NOT delete the lock when the token is wrong (Lua returns 0)', async () => {
      client.eval.mockResolvedValue(0);
      const ok = await service.releaseLock('lock:x', 'wrong-token');
      expect(ok).toBe(false);
      // O del é condicional DENTRO do script Lua — o service só repassa o resultado
      expect(client.eval.mock.calls[0][0]).toContain('if redis.call("get", KEYS[1]) == ARGV[1]');
    });

    it('returns false on Redis errors', async () => {
      client.eval.mockRejectedValue(new Error('boom'));
      expect(await service.releaseLock('lock:x', 'token-1')).toBe(false);
    });
  });

  describe('renewLock (watchdog)', () => {
    it('extends the TTL only when the token still owns the lock', async () => {
      client.eval.mockResolvedValue(1);
      const ok = await service.renewLock('lock:x', 'token-1', 5000);
      expect(ok).toBe(true);
      const [script, numKeys, key, token, ttl] = client.eval.mock.calls[0];
      expect(script).toContain('pexpire');
      expect(numKeys).toBe(1);
      expect(key).toBe('lock:x');
      expect(token).toBe('token-1');
      expect(ttl).toBe('5000');
    });

    it('reports failure (false) when the lock was lost/expired', async () => {
      client.eval.mockResolvedValue(0);
      expect(await service.renewLock('lock:x', 'token-1', 5000)).toBe(false);
    });
  });

  describe('usingLock with periodic renewal', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('renews the lock while a long action runs and releases it at the end', async () => {
      client.set.mockResolvedValue('OK');
      // Primeira chamada de eval = renovação; última = release
      client.eval.mockResolvedValue(1);

      let resolveAction: (v: string) => void;
      const actionPromise = new Promise<string>((r) => (resolveAction = r));

      const run = service.usingLock('lock:long', 9000, () => actionPromise);

      // Aguarda o acquire
      await jest.advanceTimersByTimeAsync(0);
      expect(client.set).toHaveBeenCalledTimes(1);
      const token = client.set.mock.calls[0][1];

      // Watchdog renova a cada ttl/3 = 3000ms enquanto a ação roda
      await jest.advanceTimersByTimeAsync(7000);
      const renewCalls = client.eval.mock.calls.filter((c: any[]) =>
        String(c[0]).includes('pexpire'),
      );
      expect(renewCalls.length).toBeGreaterThanOrEqual(2);
      for (const call of renewCalls) {
        expect(call[3]).toBe(token);
        expect(call[4]).toBe('9000');
      }

      resolveAction!('done');
      await expect(run).resolves.toBe('done');

      // Release condicional executado exatamente uma vez com o token correto
      const releaseCalls = client.eval.mock.calls.filter((c: any[]) =>
        String(c[0]).includes('del'),
      );
      expect(releaseCalls).toHaveLength(1);
      expect(releaseCalls[0][3]).toBe(token);

      // Nenhum timer de renovação continua ativo após o release
      const before = client.eval.mock.calls.length;
      await jest.advanceTimersByTimeAsync(10000);
      expect(client.eval.mock.calls.length).toBe(before);
    });

    it('stops renewing when the lock is lost mid-flight', async () => {
      client.set.mockResolvedValue('OK');
      client.eval.mockResolvedValue(0); // lock perdido (outro holder)

      const run = service.usingLock('lock:lost', 3000, async () => {
        // Avança o relógio fake para disparar renovações enquanto a ação roda
        await jest.advanceTimersByTimeAsync(4000);
        return 'ok';
      });
      await expect(run).resolves.toBe('ok');

      const renewCountAfterLoss = client.eval.mock.calls.filter((c: any[]) =>
        String(c[0]).includes('pexpire'),
      ).length;
      await jest.advanceTimersByTimeAsync(10000);
      const renewCountLater = client.eval.mock.calls.filter((c: any[]) =>
        String(c[0]).includes('pexpire'),
      ).length;
      // Watchdog parou após detectar a perda do lock
      expect(renewCountLater).toBe(renewCountAfterLoss);
    });

    it('calls onLockUnavailable when the lock cannot be acquired', async () => {
      client.set.mockResolvedValue(null);
      const fallback = jest.fn().mockResolvedValue('fallback-result');

      const res = await service.usingLock('lock:busy', 5000, async () => 'main', fallback);
      expect(res).toBe('fallback-result');
      expect(fallback).toHaveBeenCalled();
    });

    it('throws when the lock is unavailable and no fallback is given', async () => {
      client.set.mockResolvedValue(null);
      await expect(
        service.usingLock('lock:busy', 5000, async () => 'main'),
      ).rejects.toThrow('Lock unavailable');
    });
  });

  describe('onModuleDestroy', () => {
    it('disconnects the redis client', () => {
      service.onModuleDestroy();
      expect(client.disconnect).toHaveBeenCalled();
    });
  });
});
