import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { restoreVolumeArchive, runRestoreDrill } from '../restore-drill.mjs';

const enabled = process.env.RUN_DOCKER_RESTORE_TEST === 'true';
const functional = process.env.RUN_DOCKER_RESTORE_FUNCTIONAL_TEST === 'true';
const giteaCheck = process.env.RUN_DOCKER_RESTORE_GITEA_TEST === 'true';
const run = (program, args, opts = {}) => execFileSync(program, args, { encoding: 'utf8', ...opts });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('restores two real PostgreSQL dumps and three archives into disposable resources', { skip: !enabled, timeout: 300_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'nexus-restore-integration-'));
  const cwd = process.cwd();
  const oldConfig = process.env.RCLONE_CONFIG;
  const id = randomUUID();
  let postgres = '';
  let fixtureVolume = '';
  let giteaVolume = '';
  let giteaContainer = '';
  try {
    const identity = join(root, 'identity.txt');
    run('age-keygen', ['-o', identity], { stdio: 'ignore' });
    const recipient = run('age-keygen', ['-y', identity]).trim();
    const config = join(root, 'rclone.conf');
    writeFileSync(config, '[backup]\ntype = local\n');
    process.env.RCLONE_CONFIG = config;
    process.chdir(root);
    const setName = `nexus-backup-20261115T120000Z-${id}`;
    const set = join(root, 'archive', setName);
    mkdirSync(set, { recursive: true });
    postgres = run('docker', ['run', '-d', '--name', `nexus-fixture-${id}`, '--network', 'none', '-e', 'POSTGRES_USER=restore', '-e', 'POSTGRES_PASSWORD=validation-only', '-e', 'POSTGRES_DB=plataforma', 'postgres:16-alpine']).trim();
    let ready = false;
    for (let i = 0; i < 40; i++) {
      if (spawnSync('docker', ['exec', postgres, 'pg_isready', '-h', '127.0.0.1', '-U', 'restore', '-d', 'plataforma'], { stdio: 'ignore' }).status === 0) { ready = true; break; }
      await delay(1000);
    }
    assert.ok(ready, 'fixture database did not start');
    run('docker', ['exec', postgres, 'createdb', '-U', 'restore', 'gitea']);
    const account = { email: `${id}@example.test`, password: randomUUID(), submissionId: randomUUID() };
    let apiImage;
    let giteaImage;
    let repository;
    if (giteaCheck) {
      giteaImage = run('docker', ['image', 'inspect', '--format', '{{.Id}}', 'gitea/gitea:1.24.5']).trim();
      giteaVolume = `nexus-gitea-fixture-${id}`;
      run('docker', ['volume', 'create', '--label', `nexus.fixture.id=${id}`, giteaVolume]);
      giteaContainer = run('docker', [
        'run', '-d', '--network', `container:${postgres}`, '--mount', `type=volume,source=${giteaVolume},target=/data`,
        '-e', 'GITEA__database__DB_TYPE=postgres', '-e', 'GITEA__database__HOST=127.0.0.1:5432',
        '-e', 'GITEA__database__NAME=gitea', '-e', 'GITEA__database__USER=restore',
        '-e', 'GITEA__database__PASSWD=validation-only', '-e', 'GITEA__database__SSL_MODE=disable',
        '-e', 'GITEA__server__HTTP_ADDR=127.0.0.1', '-e', 'GITEA__server__HTTP_PORT=3030',
        '-e', 'GITEA__server__ROOT_URL=http://127.0.0.1:3030/', '-e', 'GITEA__server__DISABLE_SSH=true',
        '-e', 'GITEA__security__INSTALL_LOCK=true', '-e', `GITEA__security__SECRET_KEY=${randomUUID()}${randomUUID()}`,
        '--entrypoint', 'bash', giteaImage, '-c',
        'cd /etc/s6/gitea && source ./setup && cd /app/gitea && exec su-exec git /usr/local/bin/gitea web',
      ]).trim();
      assert.match(giteaContainer, /^[0-9a-f]{64}$/);
      let giteaReady = false;
      for (let i = 0; i < 90; i++) {
        if (spawnSync('docker', ['exec', giteaContainer, 'wget', '-q', '-O', '/dev/null', 'http://127.0.0.1:3030/api/healthz'], { stdio: 'ignore' }).status === 0) { giteaReady = true; break; }
        await delay(1000);
      }
      assert.ok(giteaReady, 'fixture Gitea did not start');
      run('docker', ['exec', '--user', '1000:1000', giteaContainer, 'gitea', 'admin', 'user', 'create',
        '--username', 'restoretest', '--email', 'restoretest@example.test', '--password', `Fixture-${id}`, '--admin']);
      const token = run('docker', ['exec', '--user', '1000:1000', giteaContainer, 'gitea', 'admin', 'user',
        'generate-access-token', '--username', 'restoretest', '--token-name', 'restore', '--scopes', 'all', '--raw']).trim();
      const createRepo = `
        const token = require('node:fs').readFileSync(0, 'utf8');
        const headers = { authorization: 'token ' + token, 'content-type': 'application/json' };
        (async () => {
          let response = await fetch('http://127.0.0.1:3030/api/v1/user/repos', {
            method: 'POST', headers, body: JSON.stringify({ name: 'fixture', private: true, auto_init: true }),
          });
          if (!response.ok) throw new Error('repository create failed ' + response.status);
          response = await fetch('http://127.0.0.1:3030/api/v1/repos/restoretest/fixture/contents/check.txt', {
            method: 'POST', headers, body: JSON.stringify({ message: 'fixture', content: Buffer.from('restored repository fixture').toString('base64') }),
          });
          if (!response.ok) throw new Error('file create failed ' + response.status);
          console.log((await response.json()).commit.sha);
        })().catch(error => { console.error(error.message); process.exitCode = 1; });
      `;
      const commit = run('docker', ['run', '--rm', '-i', '--network', `container:${postgres}`, 'node:22-alpine',
        'node', '-e', createRepo], { input: token }).trim();
      assert.match(commit, /^[0-9a-f]{40}$/);
      repository = {
        RESTORE_VERIFY_GITEA: 'true', RESTORE_GITEA_TOKEN: token, RESTORE_GITEA_OWNER: 'restoretest',
        RESTORE_GITEA_REPO: 'fixture', RESTORE_GITEA_FILE: 'check.txt', RESTORE_GITEA_COMMIT: commit,
        RESTORE_GITEA_FILE_SHA256: createHash('sha256').update('restored repository fixture').digest('hex'),
      };
      run('docker', ['rm', '-f', giteaContainer]);
      giteaContainer = '';
    }
    if (functional) {
      apiImage = run('docker', ['image', 'inspect', '--format', '{{.Id}}', 'nexus-restore-local-validation:current']).trim();
      const database = 'postgresql://restore:validation-only@127.0.0.1:5432/plataforma';
      run('docker', ['run', '--rm', '--network', `container:${postgres}`, '-e', `DATABASE_URL=${database}`,
        '--entrypoint', 'sh', apiImage, '-c', 'cd /app/apps/api && node_modules/.bin/prisma migrate deploy']);
      const seed = `
        const { PrismaService } = require('./apps/api/dist/prisma/prisma.service.js');
        const bcrypt = require('./apps/api/node_modules/bcrypt');
        const input = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
        const db = new PrismaService();
        (async () => {
          const user = await db.user.create({ data: {
            email: input.email, name: 'Restore fixture', passwordHash: await bcrypt.hash(input.password, 10),
            emailVerifiedAt: new Date(),
          } });
          const course = await db.course.create({ data: { title: 'Fixture', slug: 'fixture', instructorId: user.id } });
          const activity = await db.activity.create({ data: {
            title: 'Fixture', slug: 'fixture', description: 'Fixture',
            initialCode: '', courseId: course.id,
          } });
          await db.submission.create({ data: {
            id: input.submissionId, userId: user.id, activityId: activity.id, status: 'passed',
          } });
        })().finally(() => db.$disconnect());
      `;
      run('docker', ['run', '--rm', '-i', '--network', `container:${postgres}`, '-e', `DATABASE_URL=${database}`,
        '--entrypoint', 'node', apiImage, '-e', seed], { input: JSON.stringify(account) });
    }
    for (const [db, file] of [['plataforma', 'plataforma.dump.age'], ['gitea', 'gitea.dump.age']]) {
      run('docker', ['exec', postgres, 'psql', '-U', 'restore', '-d', db, '-c', "CREATE TABLE drill_test (value text); INSERT INTO drill_test VALUES ('fixture');"]);
      const dump = execFileSync('docker', ['exec', postgres, 'pg_dump', '-U', 'restore', '-d', db, '-Fc']);
      execFileSync('age', ['-r', recipient, '-o', join(set, file)], { input: dump });
    }
    const archive = execFileSync('docker', ['run', '--rm', '--network', 'none', 'node:22-alpine', 'sh', '-c', 'mkdir -p /tmp/fixture/knowledge && echo sample > /tmp/fixture/knowledge/sample && chown 1234:2345 /tmp/fixture/knowledge/sample && chmod 640 /tmp/fixture/knowledge/sample && tar -C /tmp/fixture -cf - .']);
    for (const file of ['knowledge-content.tar.age', 'knowledge-data.tar.age']) {
      execFileSync('age', ['-r', recipient, '-o', join(set, file)], { input: archive });
    }
    const giteaArchive = giteaCheck
      ? execFileSync('docker', ['run', '--rm', '--network', 'none', '--mount', `type=volume,source=${giteaVolume},target=/data,readonly`,
        'node:22-alpine', 'tar', '-C', '/data', '-cf', '-', '.'])
      : archive;
    execFileSync('age', ['-r', recipient, '-o', join(set, 'gitea-data.tar.age')], { input: giteaArchive });
    const checksums = {};
    for (const file of ['plataforma.dump.age', 'gitea.dump.age', 'gitea-data.tar.age', 'knowledge-content.tar.age', 'knowledge-data.tar.age']) {
      checksums[file] = createHash('sha256').update(readFileSync(join(set, file))).digest('hex');
    }
    const createdAt = '2026-11-15T12:00:00.000Z';
    execFileSync('age', ['-r', recipient, '-o', join(set, 'manifest.json.age')], {
      input: JSON.stringify({ version: 1, setName, createdAt, checksums, apiImage, giteaImage }),
    });
    writeFileSync(join(set, 'nexus-backup-complete.json'), JSON.stringify({ version: 1, setName, createdAt }));
    const volumeName = `nexus-restore-fixture-${id}`;
    assert.equal(run('docker', ['volume', 'ls', '--filter', `name=^${volumeName}$`, '--format', '{{.Name}}']).trim(), '');
    run('docker', ['volume', 'create', '--label', `nexus.fixture.id=${id}`, volumeName]);
    const volumeInfo = JSON.parse(run('docker', ['volume', 'inspect', volumeName]));
    assert.equal(volumeInfo[0]?.Labels?.['nexus.fixture.id'], id);
    fixtureVolume = volumeName;
    await restoreVolumeArchive(identity, join(set, 'knowledge-content.tar.age'), fixtureVolume);
    const metadata = run('docker', ['run', '--rm', '--network', 'none', '--read-only', '--mount', `type=volume,source=${fixtureVolume},target=/restore,readonly`, 'node:22-alpine', 'stat', '-c', '%u:%g %a', '/restore/knowledge/sample']).trim();
    assert.equal(metadata, '1234:2345 640');
    const env = {
      BACKUP_RCLONE_PATH: 'backup:archive', RESTORE_BACKUP_SET: setName, AGE_IDENTITY_FILE: identity,
      ...(functional ? {
        RESTORE_VERIFY_LOGIN: 'true', RESTORE_CHECK_EMAIL: account.email,
        RESTORE_CHECK_PASSWORD: account.password, RESTORE_CHECK_SUBMISSION_ID: account.submissionId,
      } : {}),
      ...(repository || {}),
    };
    const result = await runRestoreDrill(env);
    assert.equal(result.setName, setName);
    assert.equal(result.loginAndSubmissionRead, functional);
    assert.equal(result.repositoryRead, giteaCheck);
    assert.equal(run('docker', ['ps', '-a', '--filter', `label=nexus.restore.id=${result.runId}`, '--format', '{{.ID}}']).trim(), '');
    assert.equal(run('docker', ['volume', 'ls', '--filter', `label=nexus.restore.id=${result.runId}`, '--format', '{{.Name}}']).trim(), '');
    const resources = (type) => run('docker', type === 'container'
      ? ['ps', '-a', '--filter', 'label=nexus.restore.id', '--format', '{{.ID}}']
      : ['volume', 'ls', '--filter', 'label=nexus.restore.id', '--format', '{{.Name}}']).trim().split('\n').filter(Boolean).sort();
    if (functional) {
      const containersBefore = resources('container');
      const volumesBefore = resources('volume');
      await assert.rejects(runRestoreDrill({ ...env, RESTORE_CHECK_SUBMISSION_ID: randomUUID() }), /Submissão restaurada/);
      assert.deepEqual(resources('container'), containersBefore);
      assert.deepEqual(resources('volume'), volumesBefore);
    }
    if (giteaCheck) {
      const containersBefore = resources('container');
      const volumesBefore = resources('volume');
      await assert.rejects(runRestoreDrill({
        ...env, RESTORE_GITEA_FILE_SHA256: '0'.repeat(64),
      }), /diverge do hash/);
      assert.deepEqual(resources('container'), containersBefore);
      assert.deepEqual(resources('volume'), volumesBefore);
    }
    appendFileSync(join(set, 'gitea.dump.age'), 'tampered');
    await assert.rejects(runRestoreDrill(env), /Integridade inválida/);

    unlinkSync(join(set, 'gitea.dump.age'));
    execFileSync('age', ['-r', recipient, '-o', join(set, 'gitea.dump.age')], {
      input: execFileSync('docker', ['exec', postgres, 'pg_dump', '-U', 'restore', '-d', 'gitea', '-Fc']),
    });
    unlinkSync(join(set, 'gitea-data.tar.age'));
    execFileSync('age', ['-r', recipient, '-o', join(set, 'gitea-data.tar.age')], { input: 'not a tar archive' });
    for (const file of ['gitea.dump.age', 'gitea-data.tar.age']) {
      checksums[file] = createHash('sha256').update(readFileSync(join(set, file))).digest('hex');
    }
    unlinkSync(join(set, 'manifest.json.age'));
    execFileSync('age', ['-r', recipient, '-o', join(set, 'manifest.json.age')], {
      input: JSON.stringify({ version: 1, setName, createdAt, checksums, apiImage, giteaImage }),
    });
    const containersBefore = resources('container');
    const volumesBefore = resources('volume');
    await assert.rejects(runRestoreDrill(env), /Restauração isolada falhou/);
    assert.deepEqual(resources('container'), containersBefore);
    assert.deepEqual(resources('volume'), volumesBefore);
  } finally {
    if (/^[0-9a-f]{64}$/.test(giteaContainer)) run('docker', ['rm', '-f', giteaContainer]);
    if (/^[0-9a-f]{64}$/.test(postgres)) run('docker', ['rm', '-f', '-v', postgres]);
    if (fixtureVolume) run('docker', ['volume', 'rm', fixtureVolume]);
    if (giteaVolume) run('docker', ['volume', 'rm', giteaVolume]);
    process.chdir(cwd);
    if (oldConfig === undefined) delete process.env.RCLONE_CONFIG;
    else process.env.RCLONE_CONFIG = oldConfig;
    rmSync(root, { recursive: true, force: true });
  }
});
