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
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}
