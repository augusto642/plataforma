import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: jest.fn().mockResolvedValue('{"foo":"bar"}'),
      set: jest.fn().mockResolvedValue('OK'),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      scan: jest.fn().mockResolvedValue(['0', ['courses:1', 'courses:2']]),
      disconnect: jest.fn(),
    };
  });
});

describe('CacheService', () => {
  let service: CacheService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'REDIS_HOST') return 'localhost';
      if (key === 'REDIS_PORT') return 6379;
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should parse JSON objects on get', async () => {
    const result = await service.get<{ foo: string }>('test_key');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('should delete keys matching a pattern non-blockingly', async () => {
    await expect(service.delPattern('courses:*')).resolves.not.toThrow();
  });
});
