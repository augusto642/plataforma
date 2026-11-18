import { Controller, Get, Header, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CredentialsService } from './credentials.service';

@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentials: CredentialsService) {}

  @Public()
  @Get('issuer')
  issuerProfile() {
    return this.credentials.issuerProfile();
  }

  @Public()
  @Get('issuer/keys/:keyId')
  issuerKey(@Param('keyId') keyId: string) {
    return this.credentials.issuerKey(keyId);
  }

  @Public()
  @Get('status-lists/:shard')
  @Header('Cache-Control', 'no-store')
  statusList(@Param('shard') shard: string) {
    return this.credentials.statusList(shard);
  }

  @Post('admin/:id/revoke')
  @Roles(Role.admin)
  revoke(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.credentials.revoke(id, user.sub);
  }

  @Post(':submissionId')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  issue(@CurrentUser() user: JwtPayload, @Param('submissionId', ParseUUIDPipe) submissionId: string) {
    return this.credentials.issue(user.sub, submissionId);
  }
}
