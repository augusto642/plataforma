import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisLockService } from '../cache/redis-lock.service';
import { RunnerDiagnosticsService } from './runner-diagnostics.service';

const INTERVAL_MS = 15 * 60 * 1000;

@Injectable()
export class RunnerDiagnosticsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RunnerDiagnosticsScheduler.name);
  private interval: NodeJS.Timeout | null = null;
  private initial: NodeJS.Timeout | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly lock: RedisLockService,
    private readonly diagnostics: RunnerDiagnosticsService,
  ) {}

  onModuleInit() {
    if (this.config.get<string>('PISTON_ENABLED') !== 'true') return;
    this.initial = setTimeout(() => void this.check(), 30_000);
    this.interval = setInterval(() => void this.check(), INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.initial) clearTimeout(this.initial);
    if (this.interval) clearInterval(this.interval);
  }

  async check() {
    try {
      const window = Math.floor(Date.now() / INTERVAL_MS);
      const acquired = await this.lock.acquireLock(`runner:diagnostics:${window}`, INTERVAL_MS * 2);
      if (!acquired) return;
      await this.diagnostics.run(null);
    } catch {
      this.logger.error('Falha ao registrar o diagnóstico automático do executor.');
    }
  }
}
