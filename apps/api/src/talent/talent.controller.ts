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
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyTokenGuard } from './company-token.guard';
import { CreateCompanyDto } from './dto/create-company.dto';
import { TalentService } from './talent.service';

@Controller('talent')
export class TalentController {
  constructor(private readonly talent: TalentService) {}

  @Post('companies')
  @Roles(Role.admin)
  createCompany(@Body() dto: CreateCompanyDto) {
    return this.talent.createCompany(dto);
  }

  @Get('companies')
  @Roles(Role.admin)
  listCompanies() {
    return this.talent.listCompanies();
  }

  @Delete('companies/:id')
  @Roles(Role.admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCompany(@Param('id', ParseUUIDPipe) id: string) {
    return this.talent.deleteCompany(id);
  }

  @Get('courses/:courseId/leaderboard')
  @Public()
  @UseGuards(CompanyTokenGuard)
  getCourseLeaderboard(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.talent.getCourseLeaderboard(courseId);
  }
}
