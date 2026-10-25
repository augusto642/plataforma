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
 *
 * Resumo em produção (V3): `summarizeWithPipeline` delega ao CLI Nest
 * `apps/api/dist/knowledge/pipeline/main.js` (KnowledgeSummarizeService sobre
 * o LlmClient, sem userId, com ledger §6.3). NENHUM fetch direto a provedor
 * de LLM existe em scripts/: o script só orquestra (download→ASR→resumo→
 * lição) e o resumo vive no serviço da API.
 */
import { loadBudget, resolveBudgetDir } from './pipeline-budget.mjs';
import { execFileSync, execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { validateKnowledge } from './validate-knowledge.mjs';
import { createDriveClient, parseServiceAccountCredentials } from './drive-client.mjs';

export function slugifyFileName(name) {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\.mp4$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

/**
 * Casa a amostra com as CÓPIAS de uma pasta (plano do checkpoint 25/10:
 * os originais vivem num drive compartilhado que bloqueia conta externa,
 * então o Augusto copia os 15 vídeos para o Drive pessoal e compartilha a
 * pasta nova com a conta de serviço). O Drive prefixa cópias com
 * "Cópia de " — o casamento é pelo título normalizado, sem o prefixo.
 * Devolve as entradas com o driveFileId DA CÓPIA (nunca o do sample.json)
 * e o fileName canônico da amostra (o título da lição não leva o prefixo).
 * Falha fail-closed se faltar alguma cópia ou se houver duplicata.
 * A medição vale igual: cópia tem o mesmo conteúdo e duração do original.
 */
export function normalizeTitle(name) {
  // Ordem importa: o prefixo sai ANTES de remover os acentos (NFD tira o
  // acento de "Cópia" e o regex /cópia/ deixaria de casar).
  return (name || '').replace(/^cópia de\s+/i, '')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\.mp4$/i, '').replace(/\s+/g, ' ').trim();
}

export function matchSampleToCopies(sampleVideos, children) {
  const byTitle = new Map();
  const duplicates = [];
  for (const child of children) {
    const key = normalizeTitle(child.name);
    if (byTitle.has(key)) duplicates.push(child.name);
    else byTitle.set(key, child);
  }
  const entries = [];
  const missing = [];
  const sizeMismatches = [];
  for (const v of sampleVideos) {
    const child = byTitle.get(normalizeTitle(v.fileName));
    if (!child) { missing.push(v.fileName); continue; }
    if (v.sizeBytes !== undefined && child.size !== undefined && Number(child.size) !== v.sizeBytes) {
      sizeMismatches.push({ fileName: v.fileName, sampleSize: v.sizeBytes, copySize: Number(child.size) });
    }
    entries.push({ ...v, driveFileId: child.id, sizeBytes: child.size !== undefined ? Number(child.size) : v.sizeBytes });
  }
  return { entries, missing, duplicates, sizeMismatches };
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
    // M1 — o registro DEIXA de ser parâmetro morto: após extração validada,
    // o registro do arquivo é atualizado (status + lessonId + summaryHash).
    // entrySlugs[] (D14) NÃO é tocado aqui: só o merge o preenche, quando a
    // lição alimenta uma entrada. Falha na atualização do registro preserva
    // o estado anterior (escrita atômica; erro reportado, não silenciado).
    let registryUpdated = false;
    let registryError = null;
    if (registryPath && existsSync(registryPath)) {
      try {
        const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
        const rec = (registry.records || []).find((r) => r.driveFileId === entry.driveFileId);
        if (rec) {
          rec.status = 'extracted';
          rec.lessonId = lesson.id;
          rec.summaryHash = `sha256:${createHash('sha256').update(readFileSync(dest)).digest('hex')}`;
          if (!Array.isArray(rec.entrySlugs)) rec.entrySlugs = rec.entrySlugs ?? [];
          registry.generatedAt = new Date().toISOString();
          const rtmp = `${registryPath}.tmp`;
          writeFileSync(rtmp, `${JSON.stringify(registry, null, 2)}\n`);
          renameSync(rtmp, registryPath);
          registryUpdated = true;
        }
      } catch (err) { registryError = err.message; }
    }
    return { lesson, dest, asrDurationSeconds: asr.durationSeconds, registryUpdated, registryError };
  } finally {
    rmSync(work, { recursive: true, force: true }); // transcrição descartada
  }
}

/**
 * Adaptador de resumo em produção (V3): executa o pipeline CLI Nest com o
 * texto da transcrição em stdin e devolve o JSON do resumo em stdout.
 * `pipelineMain` é o caminho do main compilado (default: dist relativo a
 * este script). A transcrição transitória vai só para o stdin do processo
 * filho — nunca para arquivo versionado.
 */
export function summarizeWithPipeline(asrText, entry, { pipelineMain } = {}) {
  const main = pipelineMain || resolve(new URL('../apps/api/dist/knowledge/pipeline/main.js', import.meta.url).pathname);
  return new Promise((resolvePromise, reject) => {
    const child = execFile('node', [main], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) { reject(new Error(`pipeline de resumo falhou: ${stderr || err.message}`)); return; }
      try { resolvePromise(JSON.parse(stdout)); }
      catch { reject(new Error(`pipeline de resumo devolveu saída inválida: ${stdout.slice(0, 200)}`)); }
    });
    child.stdin.end(JSON.stringify({ transcript: asrText, fileName: entry.fileName, courseName: entry.courseName || entry.courseSlug }));
  });
}

export function checkAsrAvailable(pythonBin = 'python3') {
  try {
    execFileSync(pythonBin, ['-c', 'import faster_whisper'], { stdio: 'ignore', timeout: 30000 });
    return { available: true, engine: 'faster-whisper' };
  } catch {
    return { available: false, engine: null, reason: 'faster-whisper não instalado/utilizável neste ambiente (Q4: medir RTF em CPU ou aprovar API)' };
  }
}

/**
 * Adaptador ASR real: chama o venv do faster-whisper (ASR_PYTHON) com
 * scripts/transcribe.py. Devolve { text, durationSeconds } + o tempo gasto
 * (o chamador mede RTF = transcribeSeconds / durationSeconds).
 * O binário do venv é o caminho PEP 668: nunca --break-system-packages.
 */
export function transcribeWithFasterWhisper(videoPath, { pythonBin = 'python3', model = 'small' } = {}) {
  const script = resolve(new URL('./transcribe.py', import.meta.url).pathname);
  return new Promise((resolvePromise, reject) => {
    const started = Date.now();
    execFile(pythonBin, [script, '--video', videoPath, '--model', model], { maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) { reject(new Error(`ASR falhou: ${stderr?.toString().slice(0, 300) || err.message}`)); return; }
      try {
        const out = JSON.parse(stdout);
        resolvePromise({ text: out.text, durationSeconds: out.durationSeconds, transcribeSeconds: (Date.now() - started) / 1000 });
      } catch { reject(new Error(`ASR devolveu saída inválida: ${String(stdout).slice(0, 200)}`)); }
    });
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log([
      'Uso: node scripts/knowledge-extract.mjs --sample <json> [--folder <folderId>] [--only <driveFileId>] [--limit N] [--model small] [--asr-python <bin>]',
      'Extração idempotente por registro: amostra (checkpoint) ou registro pending/changed.',
      'Sem Q1 (credencial Drive) ou Q4 (ASR) o comando recusa fail-closed e NENHUM vídeo é baixado.',
      'Extração em massa proibida antes de D3: rode sempre com --sample (checkpoint) ou --only.',
      '--folder: usa as CÓPIAS da pasta (Drive pessoal) em vez dos ids do sample.json, casando por título.',
      'Nota: o diretório de trabalho transitório é os.tmpdir() — rode com TMPDIR fora de /tmp',
      '(tmpfs de 512MB nesta VM) para vídeos grandes, ex.: TMPDIR=$HOME/workspace/extract-tmp.',
    ].join('\n'));
    process.exit(0);
  }
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const repoRoot = resolve(new URL('..', import.meta.url).pathname);
  const lessonsDir = join(repoRoot, 'content/knowledge/lessons');
  const registryPath = join(repoRoot, 'content/knowledge/extraction-registry.json');
  try {
    // R4 (rodada 3, complemento): o orçamento do pipeline é consultado
    // ANTES de qualquer bloqueador (Q1/Q4) — teto esgotado ⇒ PAUSA com
    // saída 0 e relatório, sem extrair, sem furar cota de aluno. Retomar
    // = rodar de novo após o teto renovar (o registro pula o já feito).
    const budget = loadBudget(resolveBudgetDir());
    if (budget.used >= budget.cap) {
      console.log(`knowledge-extract: PAUSADO — orçamento do pipeline esgotado (${budget.used}/${budget.cap} chamadas em ${budget.date}); nada extraído, nenhuma cota de aluno usada. Retome após o teto renovar ou ser aprovado novo teto (Q7).`);
      process.exit(0);
    }
    if (!process.env.GOOGLE_DRIVE_CREDENTIALS) {
      throw new Error('BLOQUEADOR Q1: GOOGLE_DRIVE_CREDENTIALS ausente — download do Drive impossível sem credencial fornecida pelo Augusto. Nenhum vídeo foi baixado, nenhuma credencial foi improvisada.');
    }
    const credentials = parseServiceAccountCredentials(process.env.GOOGLE_DRIVE_CREDENTIALS);
    const drive = createDriveClient(credentials);
    const pythonBin = process.env.ASR_PYTHON || get('--asr-python') || 'python3';
    const model = get('--model') || 'small';
    const asr = checkAsrAvailable(pythonBin);
    if (!asr.available) throw new Error(`BLOQUEADOR Q4: ${asr.reason}`);
    const samplePath = get('--sample');
    if (!samplePath) {
      throw new Error('sem --sample: extração em massa proibida antes de D3 — passe --sample <json> (checkpoint) ou --only <driveFileId>');
    }
    const sample = JSON.parse(readFileSync(resolve(samplePath), 'utf8'));
    let entries = (sample.videos || []).map((v) => ({ ...v, courseName: sample.course || v.courseSlug }));
    const folderId = get('--folder');
    if (folderId) {
      const children = await drive.listFolderChildren(folderId);
      const m = matchSampleToCopies(entries, children);
      if (m.duplicates.length > 0) {
        throw new Error(`cópias duplicadas na pasta (resolver antes de rodar): ${m.duplicates.join(' | ')}`);
      }
      if (m.missing.length > 0) {
        throw new Error(`faltam ${m.missing.length} cópias na pasta (copiar antes de rodar): ${m.missing.join(' | ')}`);
      }
      for (const w of m.sizeMismatches) {
        console.error(`AVISO tamanho divergente (cópia ≠ amostra, segue com a cópia): ${w.fileName} amostra=${w.sampleSize} cópia=${w.copySize}`);
      }
      console.log(`--folder: ${m.entries.length}/${entries.length} cópias casadas por título (${children.length} arquivos na pasta)`);
      entries = m.entries;
    }
    const only = get('--only');
    if (only) entries = entries.filter((e) => e.driveFileId === only);
    const limit = get('--limit');
    if (limit) entries = entries.slice(0, Number(limit));
    if (entries.length === 0) throw new Error('amostra vazia após filtros (--only/--limit)');
    // Semeia o registro com as entradas da amostra ainda ausentes (pending,
    // a partir dos metadados da amostra; md5/modifiedTime desconhecidos =>
    // unverified). Sem isso, extractOne não teria registro para atualizar.
    const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
    const byId = new Map((registry.records || []).map((r) => [r.driveFileId, r]));
    let seeded = 0;
    for (const e of entries) {
      if (!byId.has(e.driveFileId)) {
        const rec = {
          driveFileId: e.driveFileId, drivePath: e.drivePath || e.fileName, fileName: e.fileName,
          mimeType: 'video/mp4', sizeBytes: e.sizeBytes ?? null, md5Checksum: null,
          modifiedTime: null, hashStatus: 'unverified',
          status: 'pending', statusChangedAt: new Date().toISOString(),
          extractorVersion: 'knowledge-extractor@1', lessonId: null, summaryHash: null,
          attempts: 0, lastError: null, reviewStatus: 'draft',
        };
        byId.set(e.driveFileId, rec);
        seeded++;
      }
    }
    if (seeded > 0) {
      registry.records = [...byId.values()].sort((a, b) => (a.driveFileId < b.driveFileId ? -1 : 1));
      registry.generatedAt = new Date().toISOString();
      const rtmp = `${registryPath}.tmp`;
      writeFileSync(rtmp, `${JSON.stringify(registry, null, 2)}\n`);
      renameSync(rtmp, registryPath);
    }
    const results = [];
    for (const entry of entries) {
      const rec = byId.get(entry.driveFileId);
      if (rec && rec.status === 'extracted') {
        console.log(`SKIP ${entry.driveFileId} (já extraído: ${rec.lessonId})`);
        results.push({ entry, skipped: true });
        continue;
      }
      const started = Date.now();
      try {
        let asrTiming = null;
        const download = async (e, work) => {
          const dest = join(work, 'video.mp4');
          await drive.downloadFile(e.driveFileId, dest, e.sizeBytes ?? null);
          return dest;
        };
        const transcribe = async (videoPath) => {
          const out = await transcribeWithFasterWhisper(videoPath, { pythonBin, model });
          asrTiming = { transcribeSeconds: out.transcribeSeconds, durationSeconds: out.durationSeconds };
          return { text: out.text, durationSeconds: out.durationSeconds };
        };
        const summarize = (text, e) => summarizeWithPipeline(text, e);
        const r = await extractOne(entry, { download, transcribe, summarize, lessonsDir, registryPath });
        const totalSeconds = (Date.now() - started) / 1000;
        const transcribeSeconds = asrTiming?.transcribeSeconds ?? null;
        const rtf = transcribeSeconds !== null && r.asrDurationSeconds > 0
          ? transcribeSeconds / r.asrDurationSeconds : null;
        const line = {
          driveFileId: entry.driveFileId, fileName: entry.fileName,
          sizeBytes: entry.sizeBytes ?? null, durationSeconds: r.asrDurationSeconds,
          transcribeSeconds, rtf: rtf !== null ? Number(rtf.toFixed(3)) : null,
          totalSeconds: Number(totalSeconds.toFixed(1)), lesson: r.dest, registryUpdated: r.registryUpdated,
        };
        console.log(`OK ${JSON.stringify(line)}`);
        results.push({ entry, ...line });
      } catch (err) {
        console.error(`FALHOU ${entry.driveFileId} (${entry.fileName}): ${err.message}`);
        results.push({ entry, failed: true, error: err.message });
      }
    }
    const done = results.filter((r) => !r.failed && !r.skipped);
    const failed = results.filter((r) => r.failed);
    const totalDuration = done.reduce((s, r) => s + (r.durationSeconds || 0), 0);
    const totalTime = done.reduce((s, r) => s + (r.totalSeconds || 0), 0);
    console.log(`knowledge-extract: concluídos=${done.length} falhos=${failed.length} ignorados=${results.filter((r) => r.skipped).length} duraçãoTotal=${totalDuration.toFixed(1)}s tempoTotal=${totalTime.toFixed(1)}s`);
    // Validação final da base (lições + registro); falhas não apagam o feito.
    try {
      const v = validateKnowledge();
      console.log(`validate-knowledge: falhas=${v.failures.length} avisos=${v.warnings.length}`);
      if (v.failures.length > 0) {
        for (const f of v.failures.slice(0, 20)) console.error(`  VALIDAÇÃO: ${f}`);
        process.exit(1);
      }
    } catch (err) {
      console.error(`validate-knowledge não executou: ${err.message}`);
    }
    if (failed.length > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error(`knowledge-extract: ${err.message}`);
    process.exit(2);
  }
}
