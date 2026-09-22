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
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Post()
  @Roles(Role.instructor, Role.admin)
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateActivityDto,
  ) {
    return this.activities.create(dto, user.sub, user.role);
  }

  @Get()
  findByCourse(
    @Query('courseId') courseId: string,
    @Query('conceptTag') conceptTag: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    if (courseId) {
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
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.activities.findById(id, user.role, user.sub);
  }

  @Get(':id/reference-solution')
  getReferenceSolution(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
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
