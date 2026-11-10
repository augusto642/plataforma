import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { SubmitTowerDto } from './dto/submit-tower.dto';
import { TowerService } from './tower.service';

/**
 * Torre de Desafios (Fase 1 — MVP jogável).
 * Auth global (JwtAuthGuard) já protege todas as rotas.
 */
@Controller('tower')
export class TowerController {
  constructor(private readonly tower: TowerService) {}

  @Get('progress')
  getProgress(@CurrentUser() user: JwtPayload) {
    return this.tower.getProgress(user.sub);
  }

  @Post('roll')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  roll(@CurrentUser() user: JwtPayload) {
    return this.tower.roll(user.sub);
  }

  @Post('submit')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  submit(@CurrentUser() user: JwtPayload, @Body() dto: SubmitTowerDto) {
    return this.tower.submit(user.sub, dto.code);
  }
}
