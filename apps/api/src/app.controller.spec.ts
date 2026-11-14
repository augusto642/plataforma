import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;
  let mockPrisma: { $queryRaw: jest.Mock };
  let mockCache: { ping: jest.Mock };
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: jest.fn(),
    };
    mockCache = {
      ping: jest.fn(),
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
    };
    controller = new AppController(mockPrisma as any, mockCache as any);
  });

  it('deve retornar status "ok" e 200 quando banco e redis estiverem saudáveis', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    mockCache.ping.mockResolvedValueOnce(true);

    const result = await controller.health(mockRes as Response);

    expect(result.status).toBe('ok');
    expect(result.services.database).toBe('up');
    expect(result.services.redis).toBe('up');
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('deve retornar status "degraded" e 503 quando o banco falhar', async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('DB Connection Refused'));
    mockCache.ping.mockResolvedValueOnce(true);

    const result = await controller.health(mockRes as Response);

    expect(result.status).toBe('degraded');
    expect(result.services.database).toBe('down');
    expect(result.services.redis).toBe('up');
    expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('deve retornar status "degraded" e 503 quando o redis falhar', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    mockCache.ping.mockResolvedValueOnce(false);

    const result = await controller.health(mockRes as Response);

    expect(result.status).toBe('degraded');
    expect(result.services.database).toBe('up');
    expect(result.services.redis).toBe('down');
    expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });
});
