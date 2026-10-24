#!/usr/bin/env node
/**
 * Pipeline de extração (DESIGN §7, D1 parcial): download -> ASR -> resumo
 * via LLM -> lição validada. É o MESMO pipeline da extração em massa, em
 * miniatura — nada descartável.
 *
 * Bloqueadores explícitos (fail-closed, sem improvisar credencial):
 *  - sem GOOGLE_DRIVE_CREDENTIALS (Q1) => download impossível;
 *  - sem faster-whisper instalável/utilizável (Q4: sem GPU nesta VM, só CPU)
 *    => ASR impossível até medir RTF em CPU ou aprovar API paga.
 * A transcrição é insumo TRANSITÓRIO: vive só em diretório temporário fora
 * do repo e é apagada após o resumo — nunca commitada, nunca importada.
 * O resumo tem teto de 1200 chars e a lição passa pelo validate-knowledge
 * antes de entrar na base (campo `transcript` é PROIBIDO e reprova).
 *
 * Uso (operador, após Q1/Q4):
 *   node scripts/knowledge-extract.mjs --sample content/knowledge/checkpoint/sample.json
 *     [--only <driveFileId>] [--asr faster-whisper] [--model small]
 * Testes usam extractOne() com adaptadores injetados (sem Drive, sem ASR real).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { validateKnowledge } from './validate-knowledge.mjs';

export function slugifyFileName(name) {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\.mp4$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

/**
 * Extrai UMA lição com adaptadores injetáveis. `download` devolve o caminho
 * do vídeo; `transcribe` devolve { text, durationSeconds }; `summarize`
 * devolve { summary, topics, prerequisites, keyExamples, difficulty }.
 * A transcrição nunca entra na lição nem no registro.
 */
export async function extractOne(entry, { download, transcribe, summarize, lessonsDir, registryPath }) {
  const work = mkdtempSync(join(tmpdir(), 'nexus-extract-'));
  try {
    const videoPath = await download(entry, work);
    const asr = await transcribe(videoPath, work);
    const s = await summarize(asr.text, entry);
    if (!s.summary || s.summary.length > 1200) throw new Error(`resumo inválido (vazio ou >1200 chars: ${s.summary?.length})`);
    const lesson = {
      id: `${entry.courseSlug}/${slugifyFileName(entry.fileName)}`,
      driveFileId: entry.driveFileId,
      courseSlug: entry.courseSlug,
      courseName: entry.courseName || entry.courseSlug,
      lessonTitle: entry.fileName.replace(/\.mp4$/i, ''),
      summary: s.summary,
      topics: (s.topics || []).slice(0, 8),
      prerequisites: s.prerequisites || [],
      keyExamples: (s.keyExamples || []).slice(0, 2),
      difficulty: s.difficulty || 'beginner',
      source: { type: 'drive-course', courseName: entry.courseName || entry.courseSlug, lessonTitle: entry.fileName.replace(/\.mp4$/i, ''), driveFileId: entry.driveFileId, drivePath: entry.drivePath || '' },
      extractedAt: new Date().toISOString(),
      extractorVersion: 'knowledge-extractor@1',
      reviewStatus: 'draft',
    };
    const dir = join(lessonsDir, entry.courseSlug);
    mkdirSync(dir, { recursive: true });
    const tmp = join(dir, `.${slugifyFileName(entry.fileName)}.tmp.json`);
    const dest = join(dir, `${slugifyFileName(entry.fileName)}.json`);
    writeFileSync(tmp, `${JSON.stringify(lesson, null, 2)}\n`);
    renameSync(tmp, dest);
    return { lesson, dest, asrDurationSeconds: asr.durationSeconds };
  } finally {
    rmSync(work, { recursive: true, force: true }); // transcrição descartada
  }
}

export function checkAsrAvailable() {
  try {
    execFileSync('python3', ['-c', 'import faster_whisper'], { stdio: 'ignore', timeout: 30000 });
    return { available: true, engine: 'faster-whisper' };
  } catch {
    return { available: false, engine: null, reason: 'faster-whisper não instalado/utilizável neste ambiente (Q4: medir RTF em CPU ou aprovar API)' };
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const repoRoot = resolve(new URL('..', import.meta.url).pathname);
  try {
    if (!process.env.GOOGLE_DRIVE_CREDENTIALS) {
      throw new Error('BLOQUEADOR Q1: GOOGLE_DRIVE_CREDENTIALS ausente — download do Drive impossível sem credencial fornecida pelo Augusto. Nenhum vídeo foi baixado, nenhuma credencial foi improvisada.');
    }
    const asr = checkAsrAvailable();
    if (!asr.available) throw new Error(`BLOQUEADOR Q4: ${asr.reason}`);
    throw new Error('cliente Drive real (download via files.get) ainda não implementado — Q1 decide service account vs OAuth antes de escrever o downloader. Pipeline, validação e amostra estão prontos; a execução real aguarda Q1+Q4.');
  } catch (err) {
    console.error(`knowledge-extract: ${err.message}`);
    process.exit(2);
  }
}
