import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { FeatureGuard } from '../plans/guards/feature.guard';
import { ChallengesService } from './challenges.service';
import { CreateChallengeDto } from './dto/challenges.dto';

/**
 * Fase 3 premium (desenho §4.1) — desafios semanais e ligas.
 *
 * Gates (matriz §1.1): o desafio é aberto a todo aluno autenticado
 * (free participa, com ranking do desafio); as ligas persistentes
 * (`/leagues/*`) exigem `challenges-full` (Pro/Carreira) — free
 * participa "sem liga paga". Criação de desafio é admin.
 * Nenhum texto promete emprego; o prêmio é XP + posição na liga.
 */
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challenges: ChallengesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  createChallenge(@CurrentUser() user: JwtPayload, @Body() dto: CreateChallengeDto) {
    return this.challenges.createChallenge(user.sub, {
      activityId: dto.activityId,
      title: dto.title,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      optIn: dto.optIn,
    });
  }

  // Central 216 (auditoria do Designer, item 1) — GET /challenges/current
  // SEM desafio ativo devolvia `null` e o Nest responde 200 com corpo
  // VAZIO para nil (ExpressAdapter.reply: isNil → response.send()):
  // o front fazia res.json() e quebrava com erro vermelho visível em
  // /desafios. O envelope `{ challenge }` garante corpo JSON sempre.
  @Get('current')
  async getCurrent(@CurrentUser() user: JwtPayload) {
    const challenge = await this.challenges.getCurrent(user.sub);
    return { challenge };
  }

  @Get(':id')
  getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.challenges.getById(id, user.sub);
  }

  @Post(':id/join')
  join(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.challenges.join(user.sub, id);
  }

  @Post(':id/leave')
  leave(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.challenges.leave(user.sub, id);
  }

  @Get(':id/leaderboard')
  leaderboard(@Param('id') id: string) {
    return this.challenges.leaderboard(id);
  }
}

/**
 * Ligas persistentes — à parte porque o gate é diferente do desafio:
 * só Pro/Carreira (staff passa direto, como nos demais FeatureGuards).
 */
@Controller('leagues')
export class LeaguesController {
  constructor(private readonly challenges: ChallengesService) {}

  @Get('me')
  @UseGuards(FeatureGuard('challenges-full'))
  myLeagues(@CurrentUser() user: JwtPayload) {
    return this.challenges.myLeagues(user.sub);
  }

  @Get('seasons/:id')
  @UseGuards(FeatureGuard('challenges-full'))
  seasonStandings(@Param('id') id: string) {
    return this.challenges.seasonStandings(id);
  }
}
