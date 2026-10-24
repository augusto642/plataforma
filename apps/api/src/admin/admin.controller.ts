import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { UpdateUserPlanDto } from './dto/update-user-plan.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { Optional } from '@nestjs/common';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { ResearchService } from '../knowledge/research/research.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    @Optional() private readonly knowledge?: KnowledgeService,
    @Optional() private readonly research?: ResearchService,
  ) {}

  @Get('metrics')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getMetrics() {
    return this.adminService.getMetrics();
  }

  @Get('users')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getUsers(
    @Query('role') role?: Role,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUsers({
      role,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch('users/:id/role')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  // B32 (Sprint 10) — plano do usuário (free/pro), gestão manual do
  // admin enquanto não há gateway de pagamento.
  @Patch('users/:id/plan')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  updateUserPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserPlanDto,
  ) {
    return this.adminService.updateUserPlan(id, dto.plan);
  }

  @Post('instructors')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  createInstructor(@Body() dto: CreateInstructorDto) {
    return this.adminService.createInstructor(dto);
  }

  @Get('health')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getHealth() {
    return this.adminService.getHealth();
  }

  // ── Sistema de conhecimento (DESIGN §3.5) — mesmas guardas admin ──────
  @Post('knowledge/research')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  createResearch(@Body() dto: { goal: string }) {
    return this.research!.createResearch(dto.goal);
  }

  @Get('knowledge/research')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  listResearch() {
    return this.research!.list();
  }

  @Get('knowledge/research/:id')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getResearch(@Param('id') id: string) {
    return this.research!.get(id);
  }

  @Post('knowledge/research/:id/approve')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  approveResearch(@Param('id') id: string, @Req() req: any) {
    // approvedBy é o admin autenticado (JwtAuthGuard) — nunca opcional:
    // aprovar sem admin autenticado é impossível via API.
    const adminId = req?.user?.sub;
    if (!adminId) throw new Error('approve exige admin autenticado');
    return this.research!.approve(id, adminId);
  }

  @Post('knowledge/research/:id/reject')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  rejectResearch(@Param('id') id: string, @Body() dto: { reason: string }) {
    return this.research!.reject(id, dto.reason);
  }

  @Get('knowledge/registry')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getRegistryStats() {
    return this.knowledge!.stats();
  }
}
