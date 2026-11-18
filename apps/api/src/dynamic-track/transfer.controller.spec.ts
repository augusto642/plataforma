import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { GUARDS_METADATA, HEADERS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransferController } from './transfer.controller';

describe('TransferController', () => {
  it('scopes both operations to the authenticated user and disables caching', () => {
    const service = { challenge: jest.fn(), submit: jest.fn() };
    const controller = new TransferController(service as never);
    const user = { sub: 'owner' } as never;
    controller.challenge(user, 'submission');
    controller.submit(user, 'submission', { sourceCode: 'def calcular_pontos(quantidade): return 0' });
    expect(service.challenge).toHaveBeenCalledWith('owner', 'submission');
    expect(service.submit).toHaveBeenCalledWith(
      'owner',
      'submission',
      'def calcular_pontos(quantidade): return 0',
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, TransferController)).toContain(JwtAuthGuard);
    for (const method of [controller.challenge, controller.submit]) {
      expect(Reflect.getMetadata(HEADERS_METADATA, method)).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'Cache-Control', value: 'no-store' })]),
      );
    }
  });

  it('rejects claims, non-string code and oversized code at the HTTP validation boundary', async () => {
    const pipe = new ValidationPipe({
      whitelist: true, forbidNonWhitelisted: true, transform: true,
      transformOptions: { enableImplicitConversion: true },
    });
    const metatype = Reflect.getMetadata('design:paramtypes', TransferController.prototype, 'submit')[2];
    const metadata = { type: 'body' as const, metatype };
    const sourceCode = 'def calcular_pontos(quantidade): return 0';
    await expect(pipe.transform({ sourceCode, userId: 'other' }, metadata)).rejects.toBeInstanceOf(BadRequestException);
    await expect(pipe.transform({ sourceCode: 42 }, metadata)).rejects.toBeInstanceOf(BadRequestException);
    await expect(pipe.transform({ sourceCode: 'x'.repeat(12_001) }, metadata)).rejects.toBeInstanceOf(BadRequestException);
    await expect(pipe.transform({ sourceCode }, metadata)).resolves.toMatchObject({ sourceCode });
  });
});
