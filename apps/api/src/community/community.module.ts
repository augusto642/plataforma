import { Module } from '@nestjs/common';
import { PlansModule } from '../plans/plans.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  CommunityAdminController,
  CommunityController,
  PeerReviewsController,
} from './community.controller';
import { CommunityService } from './community.service';
import { PeerReviewsService } from './peer-reviews.service';

/** Fase 3 premium (desenho §4.2) — fórum, galeria, pares, moderação. */
@Module({
  imports: [PlansModule, PrismaModule],
  controllers: [CommunityController, PeerReviewsController, CommunityAdminController],
  providers: [CommunityService, PeerReviewsService],
  exports: [CommunityService, PeerReviewsService],
})
export class CommunityModule {}
