import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

function parseCorsOrigins(value: string | undefined): string[] {
  const raw = value ?? 'http://localhost:3001';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bodyParser: false,
  });

  // Security headers (finding ALTA — AppSec). Aplicado ANTES das rotas e do
  // body parser: helmet não toca no corpo da requisição, então o rawBody do
  // webhook do Gitea (verificação HMAC) continua íntegro.
  // - contentSecurityPolicy: a API só serve JSON (CSP do HTML fica no Next,
  //   next.config.js); mantemos a CSP restritiva default do helmet.
  // - crossOriginResourcePolicy: 'cross-origin' porque o web app (outra
  //   origem em dev) consome respostas/SSE da API com CORS + credentials.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Trust proxy: atrás de um reverse proxy (docker-compose/produção), sem
  // isso o ThrottlerGuard vê todos os clientes com o mesmo IP (o do proxy)
  // e o rate limit vira global. Confiar apenas em loopback/link-local/
  // unique-local (redes privadas) impede spoofing de X-Forwarded-For vindo
  // da internet pública.
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

  // Limite explícito de payload (o default de 100kb rejeitava pushes legítimos
  // do Gitea antes do check de 1MB do controller de webhooks).
  app.useBodyParser('json', { limit: '1mb' });
  const config = app.get(ConfigService);

  const corsOrigins = parseCorsOrigins(config.get<string>('CORS_ORIGIN'));
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-metrics-token'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableShutdownHooks();

  const port = Number(config.get('PORT', 3000));
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();
