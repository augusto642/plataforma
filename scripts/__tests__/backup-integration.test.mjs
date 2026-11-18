import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runBackup, runRetention } from '../backup-maintenance.mjs';

const available = process.platform !== 'win32' &&
  ['age', 'age-keygen', 'rclone'].every((name) => spawnSync(name, ['--version']).status === 0);

test('encrypts and verifies a complete set and only prunes expired marked sets', { skip: !available }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'nexus-backup-integration-'));
  const originalDir = process.cwd();
  const originalPath = process.env.PATH;
  const originalRclone = process.env.RCLONE_CONFIG;
  try {
    const bin = join(root, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'docker'), `#!/usr/bin/env node
const a=process.argv.slice(2);
const volume={ 'v-gitea':'giteadata', 'v-content':'knowledgecontent', 'v-data':'knowledgedata' };
const out=x=>console.log(JSON.stringify(x));
if(a[0]==='image') process.exit(0);
if(a[0]==='compose') {
  if(a.includes('--services')) console.log('postgres');
  else console.log(a.at(-1));
} else if(a[0]==='volume') {
  out([{Labels:{'com.docker.compose.project':'nexus-test-a','com.docker.compose.volume':volume[a.at(-1)]}}]);
} else if(a[0]==='inspect') {
  const id=a[1];
  if(id==='api') out([{Image:'test-api',Config:{Env:['DATABASE_URL=postgresql://test:test@postgres:5432/plataforma']},Mounts:[{Type:'volume',Name:'v-content',Destination:'/app/content'},{Type:'volume',Name:'v-data',Destination:'/app/data'}]}]);
  else if(id==='gitea') out([{Image:'test-gitea',Config:{Env:['GITEA__database__HOST=postgres:5432','GITEA__database__NAME=gitea']},Mounts:[{Type:'volume',Name:'v-gitea',Destination:'/data'}]}]);
  else out([{Config:{Env:['POSTGRES_DB=plataforma','POSTGRES_USER=test']}}]);
} else if(a[0]==='exec'&&process.env.FAKE_DUMP_FAIL==='true') process.exit(7);
else if(a[0]==='exec'||a[0]==='run') process.stdout.write('synthetic backup data');
else process.exit(1);
`, { mode: 0o755 });
    const identity = join(root, 'identity.txt');
    execFileSync('age-keygen', ['-o', identity], { stdio: 'ignore' });
    const recipient = execFileSync('age-keygen', ['-y', identity], { encoding: 'utf8' }).trim();
    const config = join(root, 'rclone.conf');
    writeFileSync(config, '[backup]\ntype = local\n');
    process.chdir(root);
    process.env.PATH = `${bin}:${originalPath}`;
    process.env.RCLONE_CONFIG = config;
    const env = {
      BACKUP_COMPOSE_PROJECT: 'nexus-test-a',
      BACKUP_RCLONE_PATH: 'backup:archive',
      AGE_RECIPIENT: recipient,
      BACKUP_MAINTENANCE_CONFIRMED: 'true',
      BACKUP_NO_EXTERNAL_WRITERS_CONFIRMED: 'true',
      BACKUP_RESTORE_DRILL_CONFIRMED: 'true',
      BACKUP_RETENTION_SCOPE_CONFIRMED: 'true',
    };
    const result = await runBackup(env);
    const set = join(root, 'archive', result.setName);
    assert.equal(result.files, 6);
    const manifest = JSON.parse(execFileSync('age', ['-d', '-i', identity, join(set, 'manifest.json.age')], { encoding: 'utf8' }));
    assert.equal(Object.keys(manifest.checksums).length, 5);
    for (const [file, hash] of Object.entries(manifest.checksums)) {
      assert.equal(createHash('sha256').update(readFileSync(join(set, file))).digest('hex'), hash);
      assert.equal(execFileSync('age', ['-d', '-i', identity, join(set, file)], { encoding: 'utf8' }), 'synthetic backup data');
    }
    assert.equal(JSON.parse(readFileSync(join(set, 'nexus-backup-complete.json'), 'utf8')).setName, result.setName);
    const oldName = 'nexus-backup-20200101T000000Z-01234567-89ab-4cde-8fab-0123456789ab';
    const oldSet = join(root, 'archive', oldName);
    cpSync(set, oldSet, { recursive: true });
    writeFileSync(join(oldSet, 'nexus-backup-complete.json'), JSON.stringify({ version: 1, setName: oldName, createdAt: '2020-01-01T00:00:00.000Z' }));
    assert.equal(runRetention(env), 1);
    assert.equal(existsSync(oldSet), false);
    assert.equal(existsSync(set), true);
    process.env.FAKE_DUMP_FAIL = 'true';
    await assert.rejects(runBackup(env), /Falha ao criar arquivo criptografado/);
    assert.deepEqual(readdirSync(join(root, 'archive')), [result.setName]);
  } finally {
    process.chdir(originalDir);
    process.env.PATH = originalPath;
    if (originalRclone === undefined) delete process.env.RCLONE_CONFIG;
    else process.env.RCLONE_CONFIG = originalRclone;
    delete process.env.FAKE_DUMP_FAIL;
    rmSync(root, { recursive: true, force: true });
  }
});
