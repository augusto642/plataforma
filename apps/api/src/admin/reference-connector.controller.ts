import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { CreateKnowledgeReferenceDto } from './dto/knowledge-reference.dto';
import { KnowledgeReferencesService } from './knowledge-references.service';
import { ReferenceConnectorGuard } from './reference-connector.guard';

@Controller('connectors/references')
export class ReferenceConnectorController {
  constructor(private readonly references: KnowledgeReferencesService) {}

  @Post()
  @Public()
  @UseGuards(ReferenceConnectorGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async create(@Body() dto: CreateKnowledgeReferenceDto) {
    const reference = await this.references.create(dto, null, 'connector');
    return { id: reference.id, status: reference.status };
  }
}
