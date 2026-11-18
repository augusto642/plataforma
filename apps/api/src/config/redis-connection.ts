import { ConfigError } from './secrets.validation';

export interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: Record<string, never>;
}

export function parseRedisConnectionUrl(value: string): RedisConnectionOptions {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ConfigError('Invalid REDIS_URL: expected a redis:// or rediss:// URL.');
  }

  if (!['redis:', 'rediss:'].includes(url.protocol) || !url.hostname) {
    throw new ConfigError('Invalid REDIS_URL: expected a redis:// or rediss:// URL with a host.');
  }

  const database = url.pathname.replace(/^\//, '');
  if (database && !/^\d+$/.test(database)) {
    throw new ConfigError('Invalid REDIS_URL: database path must be a non-negative integer.');
  }

  const username = decodeCredential(url.username);
  const password = decodeCredential(url.password);
  const db = database ? Number(database) : undefined;
  if (db !== undefined && !Number.isSafeInteger(db)) {
    throw new ConfigError('Invalid REDIS_URL: database path must be a safe integer.');
  }

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
    ...(db !== undefined ? { db } : {}),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

function decodeCredential(value: string): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    throw new ConfigError('Invalid REDIS_URL: credentials contain invalid URL encoding.');
  }
}
