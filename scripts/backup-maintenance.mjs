import { createHash, randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';

export const BACKUP_FILES = Object.freeze(['plataforma.dump.age', 'gitea.dump.age', 'gitea-data.tar.age', 'knowledge-content.tar.age', 'knowledge-data.tar.age', 'manifest.json.age']);
const FILES = BACKUP_FILES;

export function validBackupRemote(remote) {
  return /^[A-Za-z0-9_-]+:[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(remote);
}

export function validBackupName(name) {
  return /^nexus-backup-\d{8}T\d{6}Z-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(name);
}

export function validateBackupConfig(env) {
  const project = env.BACKUP_COMPOSE_PROJECT || '';
  const remote = env.BACKUP_RCLONE_PATH || '';
  const recipient = env.AGE_RECIPIENT || '';
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(project)) throw new Error('BACKUP_COMPOSE_PROJECT inválido.');
  if (!validBackupRemote(remote)) {
    throw new Error('BACKUP_RCLONE_PATH deve apontar para uma pasta dedicada, não a raiz do remote.');
  }
  if (!/^age1[023456789acdefghjklmnpqrstuvwxyz]{58}$/.test(recipient)) {
    throw new Error('AGE_RECIPIENT deve ser uma chave pública age válida.');
  }
  if (env.BACKUP_MAINTENANCE_CONFIRMED !== 'true' || env.BACKUP_NO_EXTERNAL_WRITERS_CONFIRMED !== 'true') {
    throw new Error('Confirme a janela de manutenção e a ausência de escritores externos antes do backup.');
  }
  return { project, remote, recipient };
}

export function command(program, args, input) {
  try {
    return execFileSync(program, args, { encoding: 'utf8', input, stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'], maxBuffer: 8 * 1024 * 1024 });
  } catch (error) {
    const status = typeof error.status === 'number' ? ` (código ${error.status})` : '';
    throw new Error(`${program} falhou${status}. Confira a configuração e os logs locais sem expor credenciais.`);
  }
}

function compose(project, args) {
  return command('docker', ['compose', '-p', project, ...args]);
}

function oneContainer(project, service) {
  const ids = compose(project, ['ps', '--all', '-q', service]).trim().split(/\s+/).filter(Boolean);
  if (ids.length !== 1) throw new Error(`Esperado exatamente um container ${service}; encontrado(s): ${ids.length}.`);
  return ids[0];
}

function inspect(id) {
  const result = JSON.parse(command('docker', ['inspect', id]));
  if (!Array.isArray(result) || result.length !== 1) throw new Error('Inspeção Docker inesperada.');
  return result[0];
}

function variable(container, key) {
  const prefix = `${key}=`;
  const item = (container.Config?.Env || []).find((entry) => entry.startsWith(prefix));
  return item ? item.slice(prefix.length) : '';
}

function volumeAt(container, target, project, logicalName) {
  const mount = (container.Mounts || []).find((item) => item.Destination === target);
  if (!mount || mount.Type !== 'volume' || !mount.Name) throw new Error(`Volume ${logicalName} ausente.`);
  const result = JSON.parse(command('docker', ['volume', 'inspect', mount.Name]));
  const labels = result[0]?.Labels || {};
  if (labels['com.docker.compose.project'] !== project || labels['com.docker.compose.volume'] !== logicalName) {
    throw new Error(`Volume ${logicalName} não pertence ao projeto selecionado.`);
  }
  return mount.Name;
}

export function waitForChild(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error(`Processo terminou com código ${code}.`)));
  });
}

async function encryptStream(source, args, destination, recipient, input) {
  const producer = source ? spawn(source, args, { stdio: ['ignore', 'pipe', 'pipe'] }) : null;
  const encryptor = spawn('age', ['-r', recipient, '-o', destination], { stdio: ['pipe', 'ignore', 'pipe'] });
  producer?.stderr.resume();
  encryptor.stderr.resume();
  const producerDone = producer ? waitForChild(producer) : Promise.resolve();
  const encryptorDone = waitForChild(encryptor);
  encryptorDone.catch(() => producer?.kill());
  try {
    await Promise.all([
      producer ? pipeline(producer.stdout, encryptor.stdin) : pipeline(input, encryptor.stdin),
      producerDone,
      encryptorDone,
    ]);
  } catch (error) {
    producer?.kill();
    encryptor.kill();
    await Promise.allSettled([producerDone, encryptorDone]);
    throw new Error(`Falha ao criar arquivo criptografado: ${error.message}`);
  }
}

export async function sha256(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

export async function runBackup(env = process.env) {
  const { project, remote, recipient } = validateBackupConfig(env);
  command('age', ['--version']);
  command('rclone', ['version']);
  command('docker', ['image', 'inspect', 'node:22-alpine']);
  const running = compose(project, ['ps', '--services', '--filter', 'status=running']).trim().split(/\s+/).filter(Boolean);
  if (running.length !== 1 || running[0] !== 'postgres') {
    throw new Error('Durante a captura somente o serviço postgres pode estar em execução neste projeto.');
  }
  const api = inspect(oneContainer(project, 'api'));
  const gitea = inspect(oneContainer(project, 'gitea'));
  const postgresId = oneContainer(project, 'postgres');
  const postgres = inspect(postgresId);
  const dbName = variable(postgres, 'POSTGRES_DB');
  const dbUser = variable(postgres, 'POSTGRES_USER');
  const dbUrl = variable(api, 'DATABASE_URL');
  let url;
  try { url = new URL(dbUrl); } catch { throw new Error('DATABASE_URL da API inválida.'); }
  if (!dbName || !dbUser || url.hostname !== 'postgres' || (url.port && url.port !== '5432') || decodeURIComponent(url.pathname.slice(1)) !== dbName) {
    throw new Error('A API não usa o banco PostgreSQL local deste projeto; backup recusado.');
  }
  if (variable(gitea, 'GITEA__database__HOST') !== 'postgres:5432' || variable(gitea, 'GITEA__database__NAME') !== 'gitea') {
    throw new Error('O Gitea não usa o banco local esperado; backup recusado.');
  }
  const volumes = [
    ['gitea-data.tar.age', volumeAt(gitea, '/data', project, 'giteadata')],
    ['knowledge-content.tar.age', volumeAt(api, '/app/content', project, 'knowledgecontent')],
    ['knowledge-data.tar.age', volumeAt(api, '/app/data', project, 'knowledgedata')],
  ];
  const now = new Date();
  const setName = `nexus-backup-${now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}-${randomUUID()}`;
  const temp = mkdtempSync(join(tmpdir(), 'nexus-backup-'));
  try {
    await encryptStream('docker', ['exec', postgresId, 'pg_dump', '-U', dbUser, '-d', dbName, '-Fc'], join(temp, FILES[0]), recipient);
    await encryptStream('docker', ['exec', postgresId, 'pg_dump', '-U', dbUser, '-d', 'gitea', '-Fc'], join(temp, FILES[1]), recipient);
    for (const [file, volume] of volumes) {
      await encryptStream('docker', ['run', '--rm', '--network', 'none', '--mount', `type=volume,source=${volume},target=/source,readonly`, 'node:22-alpine', 'tar', '-C', '/source', '-cf', '-', '.'], join(temp, file), recipient);
    }
    const checksums = {};
    for (const file of FILES.slice(0, -1)) checksums[file] = await sha256(join(temp, file));
    const { Readable } = await import('node:stream');
    const manifest = { version: 1, setName, createdAt: now.toISOString(), project, apiImage: api.Image, giteaImage: gitea.Image, checksums };
    await encryptStream(null, [], join(temp, FILES.at(-1)), recipient, Readable.from([JSON.stringify(manifest)]));
    const target = `${remote}/${setName}`;
    command('rclone', ['copy', temp, target, '--immutable']);
    command('rclone', ['check', temp, target, '--download']);
    const marker = JSON.stringify({ version: 1, setName, createdAt: now.toISOString() });
    command('rclone', ['rcat', `${target}/nexus-backup-complete.json`], marker);
    if (command('rclone', ['cat', `${target}/nexus-backup-complete.json`]) !== marker) {
      throw new Error('Não foi possível verificar o marcador do backup.');
    }
    return { setName, files: FILES.length };
  } finally {
    for (const file of FILES) {
      const path = join(temp, file);
      if (existsSync(path)) unlinkSync(path);
    }
    rmdirSync(temp);
  }
}

function backupTimestamp(name, marker) {
  const match = /^nexus-backup-(\d{8}T\d{6}Z)-([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/.exec(name);
  if (!match || marker?.version !== 1 || marker.setName !== name || typeof marker.createdAt !== 'string') return null;
  const created = new Date(marker.createdAt);
  if (!Number.isFinite(created.getTime())) return null;
  const stamp = created.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return stamp === match[1] ? created.getTime() : null;
}

export function isExpiredBackup(name, marker, now = new Date()) {
  const created = backupTimestamp(name, marker);
  return created !== null && now.getTime() - created >= 30 * 24 * 60 * 60 * 1000;
}

export function runRetention(env = process.env) {
  const { remote } = validateBackupConfig(env);
  if (env.BACKUP_RESTORE_DRILL_CONFIRMED !== 'true' || env.BACKUP_RETENTION_SCOPE_CONFIRMED !== 'true') {
    throw new Error('Retenção bloqueada: confirme restauração isolada e escopo dedicado de exclusão.');
  }
  const names = command('rclone', ['lsf', remote, '--dirs-only']).split(/\r?\n/).filter(Boolean);
  const completed = [];
  const now = new Date();
  for (const directory of names) {
    const name = directory.endsWith('/') ? directory.slice(0, -1) : directory;
    if (!/^nexus-backup-\d{8}T\d{6}Z-[0-9a-f-]{36}$/.test(name)) continue;
    const target = `${remote}/${name}`;
    const files = command('rclone', ['lsf', target, '--files-only']).split(/\r?\n/);
    if (!files.includes('nexus-backup-complete.json')) continue;
    if (!FILES.every((file) => files.includes(file))) {
      throw new Error(`Conjunto ${name} incompleto; retenção interrompida.`);
    }
    let marker;
    try { marker = JSON.parse(command('rclone', ['cat', `${target}/nexus-backup-complete.json`])); }
    catch { throw new Error(`Marcador inválido ou inacessível em ${name}; retenção interrompida.`); }
    const created = backupTimestamp(name, marker);
    if (created === null || created > now.getTime()) {
      throw new Error(`Marcador inválido em ${name}; retenção interrompida.`);
    }
    completed.push({ target, expired: isExpiredBackup(name, marker, now) });
  }
  if (!completed.some((set) => !set.expired)) {
    throw new Error('Retenção bloqueada: não há backup completo com menos de 30 dias.');
  }
  const expired = completed.filter((set) => set.expired);
  for (const set of expired) command('rclone', ['purge', set.target]);
  return expired.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.slice(2).length === 1 && process.argv[2] === '--prune') {
      console.log(`Retenção concluída: ${runRetention()} conjunto(s) expirado(s) removido(s).`);
    } else if (process.argv.length === 2) {
      const result = await runBackup();
      console.log(`Backup criptografado ${result.setName}: ${result.files} arquivos enviados e verificados. A restauração ainda precisa ser testada.`);
    } else {
      throw new Error('Uso: backup-maintenance.mjs [--prune]');
    }
  } catch (error) {
    console.error(`Backup não concluído: ${error.message}`);
    process.exitCode = 1;
  }
}
