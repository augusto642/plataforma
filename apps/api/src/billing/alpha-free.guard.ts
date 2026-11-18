import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AlphaFreeBillingGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(_context: ExecutionContext): boolean {
    if (this.config.get<string>('ALPHA_FREE_MODE') === 'true') {
      throw new ServiceUnavailableException(
        'Checkout is disabled during the free alpha.',
      );
    }
    return true;
  }
}
