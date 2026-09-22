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
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateTalentVisibilityDto } from './dto/update-talent-visibility.dto';
import { CareerTierGuard } from './guards/career-tier.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('check-nickname')
  @Public()
  checkNickname(@Query('nickname') nickname?: string) {
    return this.users.checkNickname(nickname);
  }

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.users.getMe(user.sub);
  }

  @Get('me/progress')
  getMyProgress(@CurrentUser() user: JwtPayload) {
    return this.users.getUserProgress(user.sub);
  }

  @Get('me/export')
  exportMyData(@CurrentUser() user: JwtPayload) {
    return this.users.exportUserData(user.sub);
  }

  @Patch('me/talent-visibility')
  updateTalentVisibility(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTalentVisibilityDto,
  ) {
    return this.users.updateTalentVisibility(user.sub, dto.talentVisible);
  }

  @Patch('me/career-tier')
  @UseGuards(CareerTierGuard)
  updateCareerTier(
    @CurrentUser() user: JwtPayload,
    @Body('careerTier') careerTier: string,
  ) {
    return this.users.updateCareerTier(user.sub, careerTier);
  }

  @Post('me/companion')
  adoptCompanion(
    @CurrentUser() user: JwtPayload,
    @Body('starterName') starterName: string,
  ) {
    return this.users.adoptCompanion(user.sub, starterName);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMyAccount(@CurrentUser() user: JwtPayload) {
    return this.users.delete(user.sub);
  }

  @Get()
  @Roles(Role.admin)
  list() {
    return this.users.list();
  }

  @Post()
  @Roles(Role.admin)
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Delete(':id')
  @Roles(Role.admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.delete(id);
  }
}