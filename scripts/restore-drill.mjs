import { randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';
import { BACKUP_FILES, command, sha256, validBackupName, validBackupRemote, waitForChild } from './backup-maintenance.mjs';

const MARKER = 'nexus-backup-complete.json';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function validateRestoreConfig(env) {
  const remote = env.BACKUP_RCLONE_PATH || '';
  const setName = env.RESTORE_BACKUP_SET || '';
  const identity = env.AGE_IDENTITY_FILE || '';
  if (!validBackupRemote(remote)) throw new Error('BACKUP_RCLONE_PATH inválido.');
  if (!validBackupName(setName)) throw new Error('RESTORE_BACKUP_SET inválido.');
  if (!identity || !existsSync(identity)) throw new Error('Identidade age offline indisponível.');
  const functional = env.RESTORE_VERIFY_LOGIN === 'true';
  const verifyGitea = env.RESTORE_VERIFY_GITEA === 'true';
  if (env.RESTORE_VERIFY_LOGIN && !['true', 'false'].includes(env.RESTORE_VERIFY_LOGIN)) {
    throw new Error('RESTORE_VERIFY_LOGIN inválido.');
  }
  if (env.RESTORE_VERIFY_GITEA && !['true', 'false'].includes(env.RESTORE_VERIFY_GITEA)) {
    throw new Error('RESTORE_VERIFY_GITEA inválido.');
  }
  if (functional && (!env.RESTORE_CHECK_EMAIL || !env.RESTORE_CHECK_PASSWORD ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(env.RESTORE_CHECK_SUBMISSION_ID || ''))) {
    throw new Error('Informe conta e submissão de teste para a verificação funcional.');
  }
  const name = /^(?!\.{1,2}$)[A-Za-z0-9_.-]{1,100}$/;
  const parts = (env.RESTORE_GITEA_FILE || '').split('/');
  if (verifyGitea && (!env.RESTORE_GITEA_TOKEN ||
      !name.test(env.RESTORE_GITEA_OWNER || '') || !name.test(env.RESTORE_GITEA_REPO || '') ||
      parts.length > 32 || parts.some((part) => !part || part.length > 255 || part === '.' || part === '..' || /[\u0000-\u001f\u007f\\]/.test(part)) ||
      !/^[0-9a-f]{40}$/i.test(env.RESTORE_GITEA_COMMIT || '') ||
      !/^[0-9a-f]{64}$/i.test(env.RESTORE_GITEA_FILE_SHA256 || ''))) {
    throw new Error('Informe token, repositório, arquivo, commit e hash de teste para verificar o Gitea.');
  }
  return { remote, setName, identity, functional, verifyGitea };
}

const GITEA_PROBE = `
const fs = require('node:fs');
const crypto = require('node:crypto');
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const path = input.file.split('/').map(encodeURIComponent).join('/');
  const url = 'http://127.0.0.1:3030/api/v1/repos/' + encodeURIComponent(input.owner) +
    '/' + encodeURIComponent(input.repo) + '/contents/' + path + '?ref=' + input.commit;
  let response;
  for (let i = 0; i < 90; i++) {
    try {
      response = await fetch(url, { headers: { authorization: 'token ' + input.token }, signal: AbortSignal.timeout(3000) });
      if (response.status < 500) break;
    } catch {}
    await wait(1000);
  }
  if (!response || response.status >= 500) process.exit(11);
  if (!response.ok) process.exit(12);
  const file = await response.json();
  if (file.encoding !== 'base64' || typeof file.content !== 'string' ||
      crypto.createHash('sha256').update(Buffer.from(file.content, 'base64')).digest('hex') !== input.sha256.toLowerCase()) process.exit(13);
})().catch(() => { process.exitCode = 14; });
`;

function verifyRestoredGitea({ manifest, postgresId, password, volumes, runId, env, containers }) {
  if (!/^sha256:[0-9a-f]{64}$/.test(manifest.giteaImage || '')) {
    throw new Error('Imagem do Gitea ausente ou inválida no manifesto.');
  }
  command('docker', ['image', 'inspect', manifest.giteaImage, 'node:22-alpine']);
  const id = command('docker', [
    'run', '-d', '--label', `nexus.restore.id=${runId}`,
    '--network', `container:${postgresId}`, '--user', '1000:1000',
    '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
    '-e', 'GITEA__database__DB_TYPE=postgres', '-e', 'GITEA__database__HOST=127.0.0.1:5432',
    '-e', 'GITEA__database__NAME=gitea', '-e', 'GITEA__database__USER=restore',
    '-e', `GITEA__database__PASSWD=${password}`, '-e', 'GITEA__database__SSL_MODE=disable',
    '-e', 'GITEA__server__HTTP_ADDR=127.0.0.1', '-e', 'GITEA__server__HTTP_PORT=3030',
    '-e', 'GITEA__server__ROOT_URL=http://127.0.0.1:3030/', '-e', 'GITEA__server__DISABLE_SSH=true',
    '-e', 'GITEA__mailer__ENABLED=false', '-e', 'GITEA__actions__ENABLED=false',
    '--mount', `type=volume,source=${volumes[0]},target=/data`,
    '--entrypoint', 'sh', manifest.giteaImage, '-c',
    'environment-to-ini --config /data/gitea/conf/app.ini && cd /app/gitea && exec /usr/local/bin/gitea web',
  ]).trim();
  if (!/^[0-9a-f]{64}$/.test(id)) throw new Error('Identificador de container Gitea inválido.');
  containers.push(id);
  try {
    execFileSync('docker', ['run', '--rm', '-i', '--network', `container:${postgresId}`, '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges', 'node:22-alpine', 'node', '-e', GITEA_PROBE], {
      input: JSON.stringify({
        token: env.RESTORE_GITEA_TOKEN, owner: env.RESTORE_GITEA_OWNER, repo: env.RESTORE_GITEA_REPO,
        file: env.RESTORE_GITEA_FILE, commit: env.RESTORE_GITEA_COMMIT, sha256: env.RESTORE_GITEA_FILE_SHA256,
      }),
      stdio: ['pipe', 'pipe', 'pipe'], timeout: 240_000,
    });
  } catch (error) {
    const reasons = {
      11: 'Gitea restaurado indisponível.',
      12: 'Repositório ou arquivo restaurado não acessível.',
      13: 'Conteúdo restaurado do repositório diverge do hash esperado.',
      14: 'Erro ao verificar o repositório restaurado.',
    };
    throw new Error(reasons[error.status] || 'Execução da verificação do Gitea falhou.');
  }
}

const LOGIN_PROBE = `
const fs = require('node:fs');
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  let response;
  for (let i = 0; i < 60; i++) {
    try {
      response = await fetch('http://127.0.0.1:3000/auth/login', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: input.email, password: input.password, adultConfirmed: true }),
        signal: AbortSignal.timeout(3000),
      });
      break;
    } catch { await wait(1000); }
  }
  if (!response) process.exit(11);
  if (!response.ok) process.exit(12);
  const cookies = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  if (!cookies.includes('access_token=')) process.exit(13);
  const submission = await fetch('http://127.0.0.1:3000/submissions/' + input.submissionId, {
    headers: { cookie: cookies }, signal: AbortSignal.timeout(5000),
  });
  if (!submission.ok || (await submission.json()).id !== input.submissionId) {
    process.exit(14);
  }
})().catch(() => { process.exitCode = 15; });
`;

async function verifyRestoredLogin({ manifest, postgresId, password, volumes, runId, env, containers }) {
  if (!/^sha256:[0-9a-f]{64}$/.test(manifest.apiImage || '')) {
    throw new Error('Imagem da API ausente ou inválida no manifesto.');
  }
  command('docker', ['image', 'inspect', manifest.apiImage, 'redis:7-alpine']);
  const start = (args) => {
    const id = command('docker', ['run', '-d', '--label', `nexus.restore.id=${runId}`, ...args]).trim();
    if (!/^[0-9a-f]{64}$/.test(id)) throw new Error('Identificador de container temporário inválido.');
    containers.push(id);
    return id;
  };
  start(['--network', `container:${postgresId}`, 'redis:7-alpine', 'redis-server', '--save', '', '--appendonly', 'no']);
  const secrets = () => randomUUID() + randomUUID();
  const api = start([
    '--network', `container:${postgresId}`, '--security-opt', 'no-new-privileges',
    '-e', `DATABASE_URL=postgresql://restore:${password}@127.0.0.1:5432/plataforma`,
    '-e', 'REDIS_URL=redis://127.0.0.1:6379',
    '-e', `JWT_ACCESS_SECRET=${secrets()}`, '-e', `JWT_REFRESH_SECRET=${secrets()}`,
    '-e', `CERTIFICATE_HMAC_SECRET=${secrets()}`, '-e', `BILLING_WEBHOOK_SECRET=${secrets()}`,
    '-e', 'GITEA_ENABLED=false', '-e', 'PISTON_ENABLED=false',
    '-e', 'BILLING_MODE=test', '-e', 'BILLING_PROVIDER=simulated', '-e', 'RUN_MIGRATIONS=false',
    '-e', 'KNOWLEDGE_CONTENT_DIR=/app/content', '-e', 'PIPELINE_BUDGET_DIR=/app/data',
    '--mount', `type=volume,source=${volumes[1]},target=/app/content`,
    '--mount', `type=volume,source=${volumes[2]},target=/app/data`,
    manifest.apiImage,
  ]);
  try {
    execFileSync('docker', ['exec', '-i', api, 'node', '-e', LOGIN_PROBE], {
      input: JSON.stringify({
        email: env.RESTORE_CHECK_EMAIL, password: env.RESTORE_CHECK_PASSWORD,
        submissionId: env.RESTORE_CHECK_SUBMISSION_ID,
      }),
      stdio: ['pipe', 'pipe', 'pipe'], timeout: 240_000,
    });
  } catch (error) {
    const reasons = {
      11: 'API restaurada indisponível.',
      12: 'Login na API restaurada falhou.',
      13: 'Login não retornou cookie de acesso.',
      14: 'Submissão restaurada não encontrada ou não acessível.',
      15: 'Erro ao verificar a aplicação restaurada.',
    };
    throw new Error(reasons[error.status] || 'Execução da verificação funcional falhou.');
  }
}

async function decryptInto(identity, file, args) {
  const decryptor = spawn('age', ['-d', '-i', identity, file], { stdio: ['ignore', 'pipe', 'pipe'] });
  const consumer = spawn('docker', args, { stdio: ['pipe', 'ignore', 'pipe'] });
  decryptor.stderr.resume();
  consumer.stderr.resume();
  const decryptorDone = waitForChild(decryptor);
  const consumerDone = waitForChild(consumer);
  consumerDone.catch(() => decryptor.kill());
  try {
    await Promise.all([pipeline(decryptor.stdout, consumer.stdin), decryptorDone, consumerDone]);
  } catch (error) {
    decryptor.kill();
    consumer.kill();
    await Promise.allSettled([decryptorDone, consumerDone]);
    throw new Error(`Restauração isolada falhou: ${error.message}`);
  }
}

export async function restoreVolumeArchive(identity, file, name) {
  const mount = `type=volume,source=${name},target=/restore`;
  await decryptInto(identity, file, [
    'run', '--rm', '-i', '--network', 'none', '--read-only',
    '--cap-drop', 'ALL', '--cap-add', 'CHOWN', '--cap-add', 'FOWNER',
    '--cap-add', 'DAC_OVERRIDE', '--cap-add', 'FSETID',
    '--security-opt', 'no-new-privileges', '--mount', mount,
    'node:22-alpine', 'tar', '--numeric-owner', '-xf', '-', '-C', '/restore',
  ]);
}

async function waitForPostgres(container) {
  for (let i = 0; i < 40; i++) {
    try {
      // The image's initialization server accepts socket connections before setup finishes.
      command('docker', ['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'restore', '-d', 'plataforma']);
      return;
    } catch {
      await sleep(2000);
    }
  }
  throw new Error('PostgreSQL temporário não ficou pronto.');
}

function assertHasTables(container, db) {
  const value = command('docker', [
    'exec', container, 'psql', '-U', 'restore', '-d', db, '-At',
    '-c', "SELECT count(*) FROM pg_catalog.pg_class WHERE relkind IN ('r','p') AND relnamespace = 'public'::regnamespace",
  ]).trim();
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    throw new Error(`Restauração do banco ${db} não contém tabelas públicas.`);
  }
}

export async function runRestoreDrill(env = process.env) {
  const { remote, setName, identity, functional, verifyGitea } = validateRestoreConfig(env);
  command('age', ['--version']);
  command('rclone', ['version']);
  command('docker', ['image', 'inspect', 'node:22-alpine', 'postgres:16-alpine']);
  const started = Date.now();
  const runId = randomUUID();
  const temp = mkdtempSync(join(tmpdir(), 'nexus-restore-'));
  const volumes = [];
  const containers = [];
  let postgresId = '';
  try {
    const source = `${remote}/${setName}`;
    for (const file of [MARKER, ...BACKUP_FILES]) {
      command('rclone', ['copyto', `${source}/${file}`, join(temp, file)]);
    }
    const marker = JSON.parse(readFileSync(join(temp, MARKER), 'utf8'));
    const manifest = JSON.parse(command('age', ['-d', '-i', identity, join(temp, 'manifest.json.age')]));
    if (marker.version !== 1 || marker.setName !== setName || manifest.version !== 1 ||
        manifest.setName !== setName || marker.createdAt !== manifest.createdAt) {
      throw new Error('Manifesto e marcador não identificam o mesmo backup.');
    }
    const files = BACKUP_FILES.slice(0, -1);
    if (!manifest.checksums || Object.keys(manifest.checksums).length !== files.length) {
      throw new Error('Manifesto de backup incompleto.');
    }
    for (const file of files) {
      if (!/^[0-9a-f]{64}$/.test(manifest.checksums[file] || '') ||
          await sha256(join(temp, file)) !== manifest.checksums[file]) {
        throw new Error(`Integridade inválida para ${file}.`);
      }
    }

    const password = randomUUID() + randomUUID();
    postgresId = command('docker', [
      'run', '-d', '--name', `nexus-restore-${runId}-db`, '--label', `nexus.restore.id=${runId}`, '--network', 'none',
      '-e', `POSTGRES_PASSWORD=${password}`, '-e', 'POSTGRES_USER=restore',
      '-e', 'POSTGRES_DB=plataforma', 'postgres:16-alpine',
    ]).trim();
    if (!/^[0-9a-f]{64}$/.test(postgresId)) throw new Error('Identificador do PostgreSQL temporário inválido.');
    await waitForPostgres(postgresId);
    command('docker', ['exec', postgresId, 'createdb', '-U', 'restore', 'gitea']);
    for (const [file, db] of [['plataforma.dump.age', 'plataforma'], ['gitea.dump.age', 'gitea']]) {
      await decryptInto(identity, join(temp, file), ['exec', '-i', postgresId, 'pg_restore', '--exit-on-error', '--no-owner', '--no-acl', '-U', 'restore', '-d', db]);
      assertHasTables(postgresId, db);
    }
    for (const [file, suffix] of [
      ['gitea-data.tar.age', 'gitea'], ['knowledge-content.tar.age', 'content'], ['knowledge-data.tar.age', 'data'],
    ]) {
      const name = `nexus-restore-${runId}-${suffix}`;
      const existing = command('docker', ['volume', 'ls', '--filter', `name=^${name}$`, '--format', '{{.Name}}']).trim();
      if (existing) throw new Error('Nome de volume temporário já existe.');
      command('docker', ['volume', 'create', '--label', `nexus.restore.id=${runId}`, name]);
      const info = JSON.parse(command('docker', ['volume', 'inspect', name]));
      if (info[0]?.Labels?.['nexus.restore.id'] !== runId) {
        throw new Error('Volume temporário não pertence a este teste; limpeza recusada.');
      }
      volumes.push(name);
      const mount = `type=volume,source=${name},target=/restore`;
      await restoreVolumeArchive(identity, join(temp, file), name);
      if (suffix === 'content') {
        command('docker', ['run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--mount', mount, 'node:22-alpine', 'test', '-d', '/restore/knowledge']);
      }
    }
    if (functional) {
      await verifyRestoredLogin({ manifest, postgresId, password, volumes, runId, env, containers });
    }
    if (verifyGitea) {
      verifyRestoredGitea({ manifest, postgresId, password, volumes, runId, env, containers });
    }
    return { setName, runId, seconds: Math.ceil((Date.now() - started) / 1000), createdAt: manifest.createdAt, loginAndSubmissionRead: functional, repositoryRead: verifyGitea };
  } finally {
    const errors = [];
    for (const id of containers.reverse()) {
      try { command('docker', ['rm', '-f', '-v', id]); } catch { errors.push('container funcional temporário'); }
    }
    if (/^[0-9a-f]{64}$/.test(postgresId)) {
      try { command('docker', ['rm', '-f', '-v', postgresId]); } catch { errors.push('container temporário'); }
    }
    for (const name of volumes) {
      try { command('docker', ['volume', 'rm', name]); } catch { errors.push(`volume temporário ${name}`); }
    }
    for (const file of [MARKER, ...BACKUP_FILES]) {
      const path = join(temp, file);
      if (existsSync(path)) unlinkSync(path);
    }
    rmdirSync(temp);
    if (errors.length) throw new Error(`Limpeza incompleta: ${errors.join(', ')}.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await runRestoreDrill();
    const check = result.loginAndSubmissionRead ? ' Login e leitura de uma submissão restaurada verificados.' : '';
    const repository = result.repositoryRead ? ' Leitura de arquivo do repositório verificada.' : '';
    const pending = [
      ...(!result.loginAndSubmissionRead ? ['login e leitura de submissão'] : []),
      ...(!result.repositoryRead ? ['acesso a repositório'] : []),
      'execução de submissões', 'exclusão',
    ];
    console.log(`Restauração isolada concluída em ${result.seconds}s para ${result.setName} (captura ${result.createdAt}).${check}${repository} Ainda é necessário validar: ${pending.join(', ')}.`);
  } catch (error) {
    console.error(`Teste de restauração falhou: ${error.message}`);
    process.exitCode = 1;
  }
}
