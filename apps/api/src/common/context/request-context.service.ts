import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestStore {
  correlationId: string;
  userId?: string;
  timestamp: number;
}

@Injectable()
export class RequestContextService {
  private static readonly storage = new AsyncLocalStorage<RequestStore>();

  run<R>(store: RequestStore, callback: () => R): R {
    return RequestContextService.storage.run(store, callback);
  }

  getStore(): RequestStore | undefined {
    return RequestContextService.storage.getStore();
  }

  getCorrelationId(): string {
    return this.getStore()?.correlationId || 'system-internal';
  }

  getUserId(): string | undefined {
    return this.getStore()?.userId;
  }
}
