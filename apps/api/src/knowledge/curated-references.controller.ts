import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

@Controller('knowledge')
export class CuratedReferencesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('references')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async search(@Query('topics') query: string) {
    if (typeof query !== 'string' || query.length > 1299) {
      throw new BadRequestException('Informe tópicos válidos.');
    }
    const topics = [...new Set(query.split(','))];
    if (!topics.length || topics.length > 20 || topics.some((topic) => !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(topic))) {
      throw new BadRequestException('Informe tópicos válidos.');
    }
    const candidates = await this.prisma.knowledgeCurationCandidate.findMany({
      where: {
        status: 'published',
        publishedAt: { not: null },
        publishedBy: { not: null },
        topics: { hasSome: topics },
        reference: { status: 'approved', reviewedAt: { not: null }, reviewedBy: { not: null }, license: { not: null } },
      },
      select: {
        id: true, topics: true, publishedAt: true,
        reference: { select: { title: true, url: true, kind: true, author: true, license: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });
    return candidates
      .sort((a, b) => b.topics.filter((topic) => topics.includes(topic)).length -
        a.topics.filter((topic) => topics.includes(topic)).length)
      .slice(0, 10)
      .map(({ id, reference, topics: matchedTopics, publishedAt }) => ({
        id, ...reference, topics: matchedTopics, publishedAt,
      }));
  }
}
