import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const latencyMs = Date.now() - startTime;
          this.metricsService.recordRequest(latencyMs, false);
        },
        error: () => {
          const latencyMs = Date.now() - startTime;
          this.metricsService.recordRequest(latencyMs, true);
        },
      }),
    );
  }
}
