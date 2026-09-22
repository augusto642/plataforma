import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheService } from './cache.service';
import { RedisLockService } from './redis-lock.service';

@Module({
  imports: [ConfigModule],
  providers: [CacheService, RedisLockService],
  exports: [CacheService, RedisLockService],
})
export class CacheModule {}
