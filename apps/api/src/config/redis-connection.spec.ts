import { ConfigError } from './secrets.validation';
import { parseRedisConnectionUrl } from './redis-connection';

describe('parseRedisConnectionUrl', () => {
  it('parses Redis credentials, database and default port', () => {
    expect(parseRedisConnectionUrl('redis://worker:p%40ss@redis/2')).toEqual({
      host: 'redis',
      port: 6379,
      username: 'worker',
      password: 'p@ss',
      db: 2,
    });
  });

  it('enables TLS for rediss URLs', () => {
    expect(parseRedisConnectionUrl('rediss://cache.example')).toEqual({
      host: 'cache.example',
      port: 6379,
      tls: {},
    });
  });

  it.each([
    'not a URL',
    'http://redis:6379',
    'redis:///2',
    'redis://redis/not-a-database',
    'redis://user:%ZZ@redis',
  ])('rejects invalid Redis configuration without falling back (%s)', (value) => {
    expect(() => parseRedisConnectionUrl(value)).toThrow(ConfigError);
  });
});
