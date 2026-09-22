import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

/**
 * Distributed lock (single-node Redis / Redlock simplificado) com renovação
 * periódica (watchdog): enquanto a ação protegida roda, o TTL é estendido via
 * PEXPIRE condicional ao token, evitando expiração prematura em ações longas.
 *
 * Nota sobre a conexão: CacheService não expõe seu client ioredis (e o módulo
 * de housekeeping depende da semântica lazyConnect daqui), por isso este
 * serviço mantém uma conexão própria — agora com disconnect no shutdown do
 * módulo para não vazar sockets.
 */
@Injectable()
export class RedisLockService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisLockService.name);
  private readonly client: Redis;
  private readonly renewTimers = new Map<string, NodeJS.Timeout>();

  // Script Lua atômico para liberar o lock apenas se o valor for o token adquirido
  private static readonly RELEASE_LUA_SCRIPT = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  // Script Lua atômico para renovar o TTL apenas se o token ainda for o dono.
  private static readonly RENEW_LUA_SCRIPT = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("pexpire", KEYS[1], ARGV[2])
    else
      return 0
    end
  `;

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (redisUrl) {
      this.client = new Redis(redisUrl, { lazyConnect: true });
    } else {
      this.client = new Redis({
        host: this.config.get<string>('REDIS_HOST', 'localhost'),
        port: Number(this.config.get<string>('REDIS_PORT', '6379')),
        lazyConnect: true,
      });
    }

    this.client.on('error', (err) => {
      this.logger.warn(`Redis lock connection error: ${err.message}`);
    });
  }

  onModuleDestroy() {
    for (const timer of this.renewTimers.values()) {
      clearInterval(timer);
    }
    this.renewTimers.clear();
    this.client.disconnect();
  }

  async acquireLock(key: string, ttlMs: number = 5000): Promise<string | null> {
    const lockToken = randomUUID();
    try {
      const result = await this.client.set(key, lockToken, 'PX', ttlMs, 'NX');
      return result === 'OK' ? lockToken : null;
    } catch (err: any) {
      this.logger.warn(`Failed to acquire lock for ${key}: ${err.message}`);
      return null;
    }
  }

  async releaseLock(key: string, lockToken: string): Promise<boolean> {
    this.stopRenewal(key);
    try {
      const result = await this.client.eval(
        RedisLockService.RELEASE_LUA_SCRIPT,
        1,
        key,
        lockToken,
      );
      return result === 1;
    } catch (err: any) {
      this.logger.warn(`Failed to release lock for ${key}: ${err.message}`);
      return false;
    }
  }

  /**
   * Estende o TTL do lock somente se o token ainda for o dono (Lua condicional).
   * Retorna false se o lock expirou/foi tomado por outro holder.
   */
  async renewLock(key: string, lockToken: string, ttlMs: number): Promise<boolean> {
    try {
      const result = await this.client.eval(
        RedisLockService.RENEW_LUA_SCRIPT,
        1,
        key,
        lockToken,
        String(ttlMs),
      );
      return result === 1;
    } catch (err: any) {
      this.logger.warn(`Failed to renew lock for ${key}: ${err.message}`);
      return false;
    }
  }

  private startRenewal(key: string, lockToken: string, ttlMs: number) {
    this.stopRenewal(key);
    const period = Math.max(500, Math.floor(ttlMs / 3));
    const timer = setInterval(() => {
      this.renewLock(key, lockToken, ttlMs)
        .then((ok) => {
          if (!ok) {
            this.logger.warn(
              `Lock ${key} was lost (token mismatch or expiry); stopping renewal`,
            );
            this.stopRenewal(key);
          }
        })
        .catch(() => this.stopRenewal(key));
    }, period);
    // Não segura o event loop aberto só por causa do watchdog
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
    this.renewTimers.set(key, timer);
  }

  private stopRenewal(key: string) {
    const timer = this.renewTimers.get(key);
    if (timer) {
      clearInterval(timer);
      this.renewTimers.delete(key);
    }
  }

  async usingLock<T>(
    key: string,
    ttlMs: number,
    action: () => Promise<T>,
    onLockUnavailable?: () => Promise<T>,
  ): Promise<T> {
    const token = await this.acquireLock(key, ttlMs);
    if (!token) {
      if (onLockUnavailable) {
        return onLockUnavailable();
      }
      throw new Error(`Lock unavailable for resource: ${key}`);
    }

    this.startRenewal(key, token, ttlMs);
    try {
      return await action();
    } finally {
      this.stopRenewal(key);
      await this.releaseLock(key, token);
    }
  }
}
