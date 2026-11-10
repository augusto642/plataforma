import { Module } from '@nestjs/common';
import { CommunityModule } from '../community/community.module';
import { PlansModule } from '../plans/plans.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ChallengesController, LeaguesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { LeagueService } from './league.service';

/** Fase 3 premium (desenho §4.1) — desafios semanais + ligas por nível. */
@Module({
  imports: [CommunityModule, PlansModule, PrismaModule],
  controllers: [ChallengesController, LeaguesController],
  providers: [ChallengesService, LeagueService],
  exports: [ChallengesService, LeagueService],
})
export class ChallengesModule {}
