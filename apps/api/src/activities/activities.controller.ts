import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ActivitiesService } from './activities.service';
import { ActivityAccessService } from './activity-access.service';
import { ActivityDraftsService } from './activity-drafts.service';
import { SaveActivityDraftDto } from './dto/save-activity-draft.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Controller('activities')
export class ActivitiesController {
  constructor(
    private readonly activities: ActivitiesService,
    private readonly access: ActivityAccessService,
    private readonly drafts: ActivityDraftsService,
  ) {}

  @Post()
  @Roles(Role.instructor, Role.admin)
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateActivityDto,
  ) {
    return this.activities.create(dto, user.sub, user.role);
  }

  @Get(':id/draft')
  async readDraft(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    await this.access.requireActivity(id, user.sub, user.role);
    return { draft: await this.drafts.read(user.sub, id) };
  }

  @Put(':id/draft')
  async saveDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SaveActivityDraftDto,
  ) {
    await this.access.requireActivity(id, user.sub, user.role);
    return this.drafts.save(user.sub, id, dto);
  }

  @Get()
  async findByCourse(
    @Query('courseId') courseId: string,
    @Query('conceptTag') conceptTag: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    if (courseId) {
      await this.access.requireCourse(courseId, user.sub, user.role);
      return this.activities.findByCourse(courseId, user.role, user.sub, conceptTag || undefined);
    }
    return [];
  }

  @Get('concepts')
  getConcepts() {
    return this.activities.getConcepts();
  }

  @Get('library')
  @Roles(Role.instructor, Role.admin)
  getLibrary() {
    return this.activities.getLibrary();
  }

  @Get('daily')
  getDaily(@CurrentUser() user: JwtPayload) {
    return this.activities.getDaily(user.sub);
  }

  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.access.requireActivity(id, user.sub, user.role);
    return this.activities.findById(id, user.role, user.sub);
  }

  // Fase 5 premium (§6.2) — fila offline de revisão do PWA.
  @Post(':id/review-sync')
  async syncReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: { clientId: string; score: number; passed: boolean },
  ) {
    await this.access.requireActivity(id, user.sub, user.role);
    return this.activities.syncReview(user.sub, id, dto);
  }

  @Get(':id/reference-solution')
  async getReferenceSolution(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.access.requireActivity(id, user.sub, user.role);
    return this.activities.getReferenceSolution(id, user.sub, user.role);
  }

  @Patch(':id')
  @Roles(Role.instructor, Role.admin)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.activities.update(id, dto, user.sub, user.role);
  }

  @Delete(':id')
  @Roles(Role.instructor, Role.admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.activities.delete(id, user.sub, user.role);
  }
}
