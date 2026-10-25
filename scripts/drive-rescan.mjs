#!/usr/bin/env node
/**
 * Revarredura do Drive (DESIGN §2, decisão D3) — CLI externo + cron do SO.
 * NÃO extrai nada: só descobre arquivos novos/alterados e marca
 * pending/changed no registro versionado.
 *
 * Uso:
 *   node scripts/drive-rescan.mjs --scope python [--fixture <json>] [--state <path>]
 *   node scripts/drive-rescan.mjs --scope python --drive-client ./meu-client.mjs
 *
 * Fail-closed: qualquer erro na listagem ou na gravação => cursor NÃO avança,
 * registro NÃO é gravado parcialmente, saída ≠ 0. A próxima execução reprocessa
 * do mesmo ponto (idempotência por driveFileId).
 *
 * Agendamento (documentado, não instalado por este script):
 *   0 3 * * * cd <repo> && node scripts/drive-rescan.mjs --scope python >> data/drive-rescan.log 2>&1
 *   (diário, 03h00 America/Sao_Paulo). O cron NÃO faz commit nem push: o
 *   operador revisa o diff do registro e commita quando aprovar.
 *
 * Sem credencial Drive (Q1 pendente), rode com --fixture: o cliente real
 * (Google Drive API, files.list com q="modifiedTime > watermark and trashed=false")
 * só é instanciado quando GOOGLE_DRIVE_CREDENTIALS existir; sem ela, o script
 * falha com mensagem explícita em vez de fingir uma varredura.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export function fingerprint(f) {
  // D2: md5Checksum primário; sem ele, (modifiedTime, size) + flag unverified.
  if (f.md5Checksum) return `md5:${f.md5Checksum}`;
  return `meta:${f.modifiedTime}:${f.size}`;
}
export function hashStatus(f) {
  return f.md5Checksum ? 'verified' : 'unverified';
}

/**
 * Reconciliação pura (testável sem Drive): recebe o registro e a lista de
 * arquivos do Drive e devolve o registro atualizado + relatório.
 * Nunca apaga registros: arquivo some do Drive => relatório de órfãos.
 */
export function reconcile(registry, files) {
  const byId = new Map((registry.records || []).map((r) => [r.driveFileId, r]));
  let discovered = 0, changed = 0, ignored = 0;
  const seen = new Set();
  for (const f of files) {
    if (f.trashed) continue;
    seen.add(f.id);
    const fp = fingerprint(f);
    const rec = byId.get(f.id);
    if (!rec) {
      byId.set(f.id, {
        driveFileId: f.id, drivePath: f.path || f.name, fileName: f.name,
        mimeType: f.mimeType, sizeBytes: f.size, md5Checksum: f.md5Checksum || null,
        modifiedTime: f.modifiedTime, hashStatus: hashStatus(f),
        status: 'pending', statusChangedAt: new Date().toISOString(),
        extractorVersion: 'knowledge-extractor@1', lessonId: null, summaryHash: null,
        attempts: 0, lastError: null, reviewStatus: 'draft',
      });
      discovered++;
    } else if (rec.status === 'extracted' && (rec.md5Checksum !== (f.md5Checksum || null) || rec.modifiedTime !== f.modifiedTime || rec.sizeBytes !== f.size)) {
      // Fingerprint diferente => changed; lição antiga preservada até a nova validar (§1.4).
      rec.status = 'changed'; rec.statusChangedAt = new Date().toISOString();
      rec.md5Checksum = f.md5Checksum || null; rec.modifiedTime = f.modifiedTime; rec.sizeBytes = f.size;
      rec.hashStatus = hashStatus(f); rec.drivePath = f.path || rec.drivePath;
      changed++;
    } else {
      ignored++;
    }
  }
  const orphans = [...byId.keys()].filter((id) => !seen.has(id));
  const records = [...byId.values()].sort((a, b) => (a.driveFileId < b.driveFileId ? -1 : 1));
  return { registry: { ...registry, generatedAt: new Date().toISOString(), records }, report: { discovered, changed, ignored, orphans: orphans.length, orphanIds: orphans } };
}

export function loadState(path) {
  if (!existsSync(path)) return { scope: 'python', lastScanAt: null, driveWatermark: '1970-01-01T00:00:00.000Z', lastPageToken: null, lastRun: null };
  return JSON.parse(readFileSync(path, 'utf8'));
}
export function atomicWrite(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log([
      'Uso: node scripts/drive-rescan.mjs --scope python [--state <json>] [--registry <json>] [--fixture <json>]',
      'Revarredura fail-closed: descobre novos/alterados, NUNCA extrai; erro no meio = cursor não avança.',
    ].join('\n'));
    process.exit(0);
  }
  const get = (flag, dflt) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : dflt; };
  const repoRoot = resolve(new URL('..', import.meta.url).pathname);
  const scope = get('--scope', 'python');
  const statePath = resolve(get('--state', join(repoRoot, 'data/drive-scan-state.json')));
  const registryPath = resolve(get('--registry', join(repoRoot, 'content/knowledge/extraction-registry.json')));
  const fixturePath = get('--fixture', null);
  try {
    const state = loadState(statePath);
    let files;
    if (fixturePath) {
      // Fixture: { files: DriveFileMeta[], failAt?: number } — failAt simula erro no meio da listagem.
      const fixture = JSON.parse(readFileSync(resolve(fixturePath), 'utf8'));
      if (typeof fixture.failAt === 'number') {
        throw new Error(`fixture: erro simulado na listagem após ${fixture.failAt} arquivos (fail-closed: cursor não avança)`);
      }
      files = fixture.files || [];
    } else if (process.env.GOOGLE_DRIVE_CREDENTIALS) {
      throw new Error('cliente Drive real ainda não implementado nesta branch: GOOGLE_DRIVE_CREDENTIALS presente mas o DriveClient HTTP (files.list) é trabalho da Q1 — sem cliente real, sem varredura fingida');
    } else {
      throw new Error('sem credencial Drive (GOOGLE_DRIVE_CREDENTIALS ausente — Q1 pendente). Rode com --fixture para teste, ou forneça a credencial quando a Q1 for decidida.');
    }
    const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
    const { registry: next, report } = reconcile(registry, files);
    // Ordem D3: gravar registro PRIMEIRO, só então avançar o watermark.
    atomicWrite(registryPath, `${JSON.stringify(next, null, 2)}\n`);
    const watermark = files.reduce((max, f) => (f.modifiedTime > max ? f.modifiedTime : max), state.driveWatermark);
    const nextState = { scope, lastScanAt: new Date().toISOString(), driveWatermark: watermark, lastPageToken: null, lastRun: { status: 'ok', ...report, orphanIds: undefined } };
    atomicWrite(statePath, `${JSON.stringify(nextState, null, 2)}\n`);
    console.log(`drive-rescan: novos=${report.discovered} alterados=${report.changed} ignorados=${report.ignored} órfãos=${report.orphans}`);
  } catch (err) {
    console.error(`drive-rescan: FALHOU (fail-closed, cursor não avançou): ${err.message}`);
    process.exit(1);
  }
}
