import { BullModule } from '@nestjs/bullmq';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ActivitiesModule } from './activities/activities.module';
import { AiModule } from './ai/ai.module';
import { AppController } from './app.controller';
import { validateRequiredSecrets } from './config/secrets.validation';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { CacheModule } from './cache/cache.module';
import { CoursesModule } from './courses/courses.module';
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
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env', '../.env'],
      validate: validateRequiredSecrets,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(config.get('THROTTLE_TTL_MS', 60_000)),
            limit: Number(config.get('THROTTLE_LIMIT', 100)),
          },
        ],
      }),
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
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
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
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}