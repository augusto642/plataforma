import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { DiceService } from './dice.service';
import { TowerBoardService } from './tower-board.service';
import { TowerController } from './tower.controller';
import { TowerService } from './tower.service';

/**
 * Torre de Desafios (Fases 0–1).
 * Reusa GamificationService (XP/streak) e PistonRunnerService (via
 * SubmissionsModule) — nenhum fluxo existente é alterado.
 */
@Module({
  imports: [GamificationModule, SubmissionsModule],
  controllers: [TowerController],
  providers: [TowerService, DiceService, TowerBoardService],
  exports: [TowerService, DiceService, TowerBoardService],
})
export class TowerModule {}
