import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GuidedProjectsService } from './guided-projects.service';

@Controller('guided-projects')
@UseGuards(JwtAuthGuard)
export class GuidedProjectsController {
  constructor(private readonly service: GuidedProjectsService) {}

  @Get()
  async listProjects(@Req() req: any) {
    const userId = req.user?.sub;
    return this.service.listProjects(userId);
  }

  @Get(':slug')
  async getProject(@Param('slug') slug: string, @Req() req: any) {
    const userId = req.user?.sub;
    return this.service.getProjectBySlug(slug, userId);
  }

  @Get(':id/prerequisites')
  async checkPrerequisites(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub;
    return this.service.checkPrerequisites(userId, id);
  }

  @Post(':id/start')
  async startProject(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub;
    return this.service.startProject(userId, id);
  }
}
