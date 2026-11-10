import { BullModule } from '@nestjs/bullmq';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ActivitiesModule } from './activities/activities.module';
import { AiModule } from './ai/ai.module';
import { AppController } from './app.controller';
import { validateRequiredSecrets } from './config/secrets.validation';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { CacheModule } from './cache/cache.module';
import { CoursesModule } from './courses/courses.module';
import { AdaptationModule } from './adaptation/adaptation.module';
import { DiagnosticModule } from './diagnostic/diagnostic.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ContactModule } from './contact/contact.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { PlanInterestModule } from './plan-interest/plan-interest.module';
import { GamificationModule } from './gamification/gamification.module';
import { GiteaModule } from './gitea/gitea.module';
import { PrismaModule } from './prisma/prisma.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { TalentModule } from './talent/talent.module';
import { UsersModule } from './users/users.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { MetricsModule } from './metrics/metrics.module';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import { AdminModule } from './admin/admin.module';
import { CommonModule } from './common/common.module';
import { HousekeepingModule } from './housekeeping/housekeeping.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { CsrfOriginMiddleware } from './common/middleware/csrf-origin.middleware';
import { UserThrottlerGuard } from './common/throttler/user-throttler.guard';
import { buildThrottlerOptions } from './common/throttler/throttle.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env', '../.env'],
      validate: validateRequiredSecrets,
    }),
    // M6 (Lote 4) — throttle por usuário autenticado (default: 100/min
    // por usuário e por rota) + teto global de segurança por IP
    // (1.000/min em todas as rotas). Números e justificativa em
    // common/throttler/throttle.config.ts e no .env.example
    // (THROTTLE_LIMIT / THROTTLE_GLOBAL_LIMIT).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildThrottlerOptions(config),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          try {
            const parsed = new URL(redisUrl);
            return {
              connection: {
                host: parsed.hostname || 'localhost',
                port: Number(parsed.port || 6379),
                password: parsed.password || undefined,
              },
            };
          } catch {}
        }
        return {
          connection: {
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: Number(config.get('REDIS_PORT', 6379)),
          },
        };
      },
    }),
    PrismaModule,
    GiteaModule,
    CacheModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    AdaptationModule,
    DiagnosticModule,
    AnalyticsModule,
    ContactModule,
    WaitlistModule,
    PlanInterestModule,
    GamificationModule,
    ActivitiesModule,
    SubmissionsModule,
    WebhooksModule,
    AiModule,
    MetricsModule,
    AdminModule,
    CommonModule,
    HousekeepingModule,
  ],
  controllers: [AppController],
  providers: [
    // M6 (Lote 4) — ORDEM IMPORTA: o JwtAuthGuard PRECISA vir antes do
    // UserThrottlerGuard, porque é ele quem popula `req.user` — sem isso
    // o throttle não enxerga o usuário e volta a limitar por IP.
    // (Há teste de regressão para esta ordem em
    // common/throttler/user-throttler.guard.spec.ts.)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: UserThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // M9 (Lote 4) — filtro global de exceções: padroniza o corpo de erro
    // (`{ statusCode, errorCode, message, ... }`, sem vazar detalhe interno
    // em produção). Registrado ANTES do PrismaExceptionFilter: erros do
    // Prisma são delegados a ele de dentro do filtro global, então a ordem
    // não muda o resultado — os dois corpos têm o mesmo formato.
    {
      provide: APP_FILTER,
      useClass: GlobalHttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // M15 (Lote 4) — CSRF por Origin/Referer nas mutações, ANTES das rotas.
    // Ordem: correlação primeiro (o 403 do CSRF já sai com correlationId).
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
    consumer.apply(CsrfOriginMiddleware).forRoutes('*');
  }
}