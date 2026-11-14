import { Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { GamificationService } from './gamification.service';

@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Get('daily-status')
  async getDailyStatus(@CurrentUser() user: JwtPayload) {
    return this.gamification.getDailyBonusStatus(user.sub);
  }

  @Post('daily-claim')
  async claimDailyBonus(@CurrentUser() user: JwtPayload) {
    return this.gamification.claimDailyBonus(user.sub);
  }
}
