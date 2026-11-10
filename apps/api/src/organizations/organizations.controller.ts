import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '@prisma/client';
import { AddOrgMemberDto, CreateOrganizationDto } from './dto/organizations.dto';
import { OrganizationsService } from './organizations.service';

/** Fase 4 premium (desenho §5.2) — enabler B2B, sem operação comercial. */
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Post()
  @Roles(Role.admin)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrganizationDto) {
    return this.orgs.create({ userId: user.sub, role: user.role }, dto);
  }

  @Get('me')
  listMine(@CurrentUser() user: JwtPayload) {
    return this.orgs.listMyOrgs(user.sub);
  }

  @Get(':id/dashboard')
  getDashboard(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.orgs.getDashboard({ userId: user.sub, role: user.role }, id);
  }

  @Get(':id/members')
  listMembers(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.orgs.listMembers({ userId: user.sub, role: user.role }, id);
  }

  @Post(':id/members')
  addMember(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddOrgMemberDto,
  ) {
    return this.orgs.addMember({ userId: user.sub, role: user.role }, id, dto);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.orgs.removeMember({ userId: user.sub, role: user.role }, id, userId);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.orgs.leave(user.sub, id);
  }
}
