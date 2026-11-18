import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateProjectDto, UpdateProjectDto } from './dto/save-project.dto';
import { PlaygroundProjectsService } from './playground-projects.service';
import { PlaygroundDraftsService } from './playground-drafts.service';
import { SaveActivityDraftDto } from '../activities/dto/save-activity-draft.dto';

const EXAMPLES = [
  {
    id: 'javascript-modules', title: 'Saudação com módulos', language: 'javascript',
    files: [
      { name: 'main.js', content: "const { saudacao } = require('./saudacao');\nconsole.log(saudacao('Nexus'));\n" },
      { name: 'saudacao.js', content: "exports.saudacao = (nome) => `Olá, ${nome}!`;\n" },
    ],
  },
  {
    id: 'python-modules', title: 'Saudação com módulos', language: 'python',
    files: [
      { name: 'main.py', content: "from saudacao import saudar\n\nprint(saudar('Nexus'))\n" },
      { name: 'saudacao.py', content: 'def saudar(nome):\n    return f"Olá, {nome}!"\n' },
    ],
  },
];

@Controller('playground-projects')
export class PlaygroundProjectsController {
  constructor(
    private readonly projects: PlaygroundProjectsService,
    private readonly drafts: PlaygroundDraftsService,
  ) {}

  @Get('examples')
  examples() {
    return EXAMPLES;
  }

  @Get('drafts/:language')
  async readDraft(@CurrentUser() user: JwtPayload, @Param('language') language: string) {
    return { draft: await this.drafts.read(user.sub, language) };
  }

  @Put('drafts/:language')
  saveDraft(@CurrentUser() user: JwtPayload, @Param('language') language: string, @Body() dto: SaveActivityDraftDto) {
    return this.drafts.save(user.sub, language, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.projects.list(user.sub);
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProjectDto) {
    return this.projects.create(user.sub, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.projects.get(user.sub, id);
  }

  @Put(':id')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('revision', ParseIntPipe) revision: number,
  ) {
    await this.projects.remove(user.sub, id, revision);
  }
}
