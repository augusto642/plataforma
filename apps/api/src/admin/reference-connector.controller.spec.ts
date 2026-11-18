import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import { KnowledgeReferencesService } from './knowledge-references.service';
import { ReferenceConnectorController } from './reference-connector.controller';
import { ReferenceConnectorGuard } from './reference-connector.guard';

describe('reference connector', () => {
  let app: INestApplication;
  let digest: string;
  const token = randomBytes(32).toString('base64url');
  const create = jest.fn();

  beforeAll(async () => {
    digest = createHash('sha256').update(token).digest('hex');
    const module = await Test.createTestingModule({
      controllers: [ReferenceConnectorController],
      providers: [
        ReferenceConnectorGuard,
        { provide: ConfigService, useValue: { get: () => digest } },
        { provide: KnowledgeReferencesService, useValue: { create } },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => { await app.close(); });
  beforeEach(() => {
    jest.clearAllMocks();
    digest = createHash('sha256').update(token).digest('hex');
  });

  it('accepts a valid key only to submit pending metadata', async () => {
    create.mockResolvedValue({ id: 'ref', status: 'pending', submittedBy: null });
    const dto = { kind: 'book', title: 'Book', url: 'https://example.org/book' };
    const response = await request(app.getHttpServer())
      .post('/connectors/references').set('Authorization', `Bearer ${token}`).send(dto).expect(201);
    expect(response.body).toEqual({ id: 'ref', status: 'pending' });
    expect(create).toHaveBeenCalledWith(dto, null, 'connector');
  });

  it('fails closed without a configured key or with a wrong key', async () => {
    const dto = { kind: 'book', title: 'Book', url: 'https://example.org/book' };
    await request(app.getHttpServer()).post('/connectors/references').send(dto).expect(401);
    await request(app.getHttpServer()).post('/connectors/references')
      .set('Authorization', `Bearer ${randomBytes(32).toString('base64url')}`).send(dto).expect(401);
    digest = '';
    await request(app.getHttpServer()).post('/connectors/references')
      .set('Authorization', `Bearer ${token}`).send(dto).expect(401);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects full content and invalid reference URLs', async () => {
    await request(app.getHttpServer()).post('/connectors/references')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'book', title: 'Book', url: 'https://example.org/book', content: 'text' }).expect(400);
    await request(app.getHttpServer()).post('/connectors/references')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'pdf', title: 'Book', url: 'http://example.org/book' }).expect(400);
    expect(create).not.toHaveBeenCalled();
  });
});
