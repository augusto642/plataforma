/**
 * Pipeline CLI do conhecimento (V3) — módulo mínimo para o contexto
 * standalone do `pipeline/main.ts`. NÃO é o AppModule: só Config + LlmClient
 * + KnowledgeSummarizeService. Sem Prisma, sem Redis, sem rotas — o pipeline
 * offline não precisa (nem deve) subir a API inteira para resumir uma aula.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmClient } from '../../ai/llm-client';
import { KnowledgeSummarizeService } from '../summarize.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env', '../.env'],
    }),
  ],
  providers: [LlmClient, KnowledgeSummarizeService],
  exports: [KnowledgeSummarizeService],
})
export class KnowledgePipelineModule {}
