// Trilha dinâmica v1 (Central 209 — DESIGN §2 item 2).
// Endpoints do aluno autenticados (o JwtAuthGuard global exige sessão;
// GET não tem efeito colateral — `seen` é POST separado, DESIGN D5).
// Endpoints admin exigem Role.admin (RolesGuard, mesmo padrão do
// AdminController).
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DynamicTrackService } from './dynamic-track.service';

@Controller('dynamic-track')
@UseGuards(JwtAuthGuard)
export class DynamicTrackController {
  constructor(private readonly dynamicTrack: DynamicTrackService) {}

  /** Estado da investigação do aluno logado (null = nunca investigado). */
  @Get('me')
  async getMine(@CurrentUser() user: JwtPayload) {
    const investigation = await this.dynamicTrack.getMyInvestigation(
      user.sub,
    );
    return { investigation };
  }

  /** Inicia a investigação para contas já existentes (1 por usuário). */
  @Post('me/start')
  async startMine(@CurrentUser() user: JwtPayload) {
    const { view, created } = await this.dynamicTrack.startForUser(user.sub);
    return { investigation: view, created };
  }

  /** Recalcula a sugestão do aluno com objetivos/stack atualizados ou diagnóstico. */
  @Post('me/refresh')
  async refreshMine(
    @CurrentUser() user: JwtPayload,
    @Body()
    body?: {
      careerGoals?: string[];
      primaryTechnology?: string | null;
    },
  ) {
    const investigation = await this.dynamicTrack.refreshForUser(user.sub, body);
    return { investigation };
  }

  /** Marca a sugestão como vista (só quando ready e ainda não vista). */
  @Post('me/seen')
  async markSeen(@CurrentUser() user: JwtPayload) {
    const investigation = await this.dynamicTrack.markSeen(user.sub);
    return { investigation };
  }

  /** Admin: lista investigações (com sinais registrados) — leitura. */
  @Get('admin/investigations')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async listAdmin() {
    const investigations =
      await this.dynamicTrack.listInvestigationsAdmin();
    return { investigations };
  }

  /** Admin: re-enfileira uma investigação investigating/failed. */
  @Post('admin/investigations/:id/reenqueue')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async reenqueueAdmin(@Param('id') id: string) {
    const { investigation, queued, deduped } =
      await this.dynamicTrack.reenqueueAdmin(id);
    if (!investigation) throw new NotFoundException('Investigação não encontrada.');
    return { investigation, queued, deduped };
  }
}
