import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateTowerPartyDto } from './dto/create-tower-party.dto';
import { JoinTowerPartyDto } from './dto/join-tower-party.dto';
import { SubmitTowerObjectiveDto } from './dto/submit-tower-objective.dto';
import { SubmitTowerDto } from './dto/submit-tower.dto';
import { UseTowerItemDto } from './dto/use-tower-item.dto';
import { TowerService } from './tower.service';

/**
 * Torre de Desafios (código, quiz, bug-hunt e lacunas).
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

  @Post('objective-submit')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  submitObjective(@CurrentUser() user: JwtPayload, @Body() dto: SubmitTowerObjectiveDto) {
    return this.tower.submitObjective(user.sub, dto.choiceIndex);
  }

  // ── Mercador, Economia e Inventário (Pacote 4) ───────────────────────

  @Get('merchant')
  listMerchant() {
    return this.tower.listMerchantItems();
  }

  @Get('inventory')
  getUserInventory(@CurrentUser() user: JwtPayload) {
    return this.tower.getUserInventory(user.sub);
  }

  @Post('merchant/buy')
  buyItem(@CurrentUser() user: JwtPayload, @Body() body: { itemCode: string }) {
    return this.tower.buyItem(user.sub, body.itemCode);
  }

  @Post('inventory/use')
  useItem(@CurrentUser() user: JwtPayload, @Body() dto: UseTowerItemDto) {
    return this.tower.useItem(user.sub, dto.itemCode, dto.targetUserId);
  }

  @Post('oracle-hint')
  askOracleHint(@CurrentUser() user: JwtPayload) {
    return this.tower.askOracleHint(user.sub);
  }

  @Get('party')
  getParty(@CurrentUser() user: JwtPayload) {
    return this.tower.getParty(user.sub);
  }

  @Post('party')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  createParty(@CurrentUser() user: JwtPayload, @Body() dto: CreateTowerPartyDto) {
    return this.tower.createParty(user.sub, dto.name);
  }

  @Post('party/join')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  joinParty(@CurrentUser() user: JwtPayload, @Body() dto: JoinTowerPartyDto) {
    return this.tower.joinParty(user.sub, dto.partyId);
  }

  @Post('party/leave')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  leaveParty(@CurrentUser() user: JwtPayload) {
    return this.tower.leaveParty(user.sub);
  }
}
