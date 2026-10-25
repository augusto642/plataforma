/**
 * Pipeline CLI do conhecimento (V3) — ponto de entrada do resumo offline.
 * Uso (após `nest build`, que compila todo o src para dist/):
 *   echo '{"transcript":"...","fileName":"Aula 01.mp4","courseName":"Trilha Python"}' \
 *     | node dist/knowledge/pipeline/main.js
 * Saída: JSON do resumo em stdout; erro em stderr + exit 1.
 * É este CLI que o `knowledge-extract.mjs` usa como adaptador de resumo em
 * produção (via `summarizeWithPipeline`) — nenhum `fetch` a provedor de LLM
 * existe em `scripts/`. A execução real segue bloqueada por Q1 (credencial
 * Drive) e Q4 (ASR) no extrator; este CLI só resolve o passo de resumo.
 */
import { NestFactory } from '@nestjs/core';
import { KnowledgePipelineModule } from './pipeline.module';
import { KnowledgeSummarizeService } from '../summarize.service';

async function main(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const input = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  const app = await NestFactory.createApplicationContext(KnowledgePipelineModule, { logger: false });
  try {
    const service = app.get(KnowledgeSummarizeService);
    const out = await service.summarize({
      transcript: input.transcript,
      fileName: input.fileName,
      courseName: input.courseName,
    });
    process.stdout.write(`${JSON.stringify(out)}\n`);
  } finally {
    await app.close();
  }
}

main().catch((err: Error) => {
  process.stderr.write(`knowledge-pipeline: FALHOU: ${err.message}\n`);
  process.exit(1);
});
