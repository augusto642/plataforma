/**
 * KnowledgeSummarizeService (V3/V4) — resumo offline via LlmClient, nunca
 * com userId (cota de aluno), com ledger de uso §6.3.
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { KnowledgeSummarizeService } from './summarize.service';

const llmMock = (content: string) => ({
  providerId: 'gemini',
  model: 'gemini-3.5-flash-lite',
  complete: jest.fn(async () => content),
});

describe('KnowledgeSummarizeService', () => {
  it('resume via LlmClient sem userId, com ledger de uso', async () => {
    const llm = llmMock(JSON.stringify({
      summary: 'Resumo próprio curto.', topics: ['funcoes'], prerequisites: [],
      keyExamples: ['Exemplo análogo.'], difficulty: 'beginner',
    }));
    const logPath = join(mkdtempSync(join(tmpdir(), 'usage-')), 'usage.jsonl');
    const svc = new KnowledgeSummarizeService(llm as any);
    const out = await svc.summarize(
      { transcript: 'transcrição transitória da aula', fileName: 'Aula 01.mp4', courseName: 'Trilha Python' },
      { usageLogPath: logPath },
    );
    expect(out.summary).toBe('Resumo próprio curto.');
    expect(out.topics).toEqual(['funcoes']);
    const call = (llm.complete as jest.Mock).mock.calls[0][0];
    expect(call.userId).toBeUndefined();
    expect(call.purpose).toBe('knowledge-pipeline');
    const line = JSON.parse(readFileSync(logPath, 'utf8').trim());
    expect(line.purpose).toBe('knowledge-pipeline');
    expect(line.model).toBe('gemini-3.5-flash-lite');
    expect(line.fileName).toBe('Aula 01.mp4');
  });

  it('userId é rejeitado antes de qualquer chamada ao provedor', async () => {
    const llm = llmMock('{}');
    const svc = new KnowledgeSummarizeService(llm as any);
    await expect(svc.summarize(
      { transcript: 't', fileName: 'A.mp4', courseName: 'C', userId: 'aluno-1' } as any,
    )).rejects.toThrow(/userId proibido/);
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('summary > 1200 chars é rejeitado (teto do §1.5)', async () => {
    const llm = llmMock(JSON.stringify({ summary: 'x'.repeat(1201), topics: [], prerequisites: [], keyExamples: [], difficulty: 'beginner' }));
    const svc = new KnowledgeSummarizeService(llm as any);
    await expect(svc.summarize(
      { transcript: 't', fileName: 'A.mp4', courseName: 'C' },
      { usageLogPath: join(mkdtempSync(join(tmpdir(), 'usage-')), 'u.jsonl') },
    )).rejects.toThrow(/1200/);
  });
});
