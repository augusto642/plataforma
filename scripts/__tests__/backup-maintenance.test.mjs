import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isExpiredBackup, runRetention, validateBackupConfig } from '../backup-maintenance.mjs';

const valid = {
  BACKUP_COMPOSE_PROJECT: 'nexus-test-a',
  BACKUP_RCLONE_PATH: 'drive:backups/nexus',
  AGE_RECIPIENT: `age1${'q'.repeat(58)}`,
  BACKUP_MAINTENANCE_CONFIRMED: 'true',
  BACKUP_NO_EXTERNAL_WRITERS_CONFIRMED: 'true',
};

test('requires a dedicated remote folder and explicit maintenance confirmation', () => {
  assert.equal(validateBackupConfig(valid).remote, 'drive:backups/nexus');
  for (const path of ['drive:', 'drive:/', 'drive:backups/../production', ':local:backups']) {
    assert.throws(() => validateBackupConfig({ ...valid, BACKUP_RCLONE_PATH: path }));
  }
  assert.throws(() => validateBackupConfig({ ...valid, BACKUP_MAINTENANCE_CONFIRMED: 'false' }));
  assert.throws(() => validateBackupConfig({ ...valid, BACKUP_NO_EXTERNAL_WRITERS_CONFIRMED: 'false' }));
});

test('rejects invalid project names and encryption recipients', () => {
  assert.throws(() => validateBackupConfig({ ...valid, BACKUP_COMPOSE_PROJECT: '../other' }));
  assert.throws(() => validateBackupConfig({ ...valid, AGE_RECIPIENT: 'AGE-SECRET-KEY-1secret' }));
});

test('only completed, correctly named sets expire after 30 days', () => {
  const name = 'nexus-backup-20260101T120000Z-01234567-89ab-4cde-8fab-0123456789ab';
  const marker = { version: 1, setName: name, createdAt: '2026-01-01T12:00:00.000Z' };
  assert.equal(isExpiredBackup(name, marker, new Date('2026-01-31T12:00:00Z')), true);
  assert.equal(isExpiredBackup(name, marker, new Date('2026-01-31T11:59:59Z')), false);
  assert.equal(isExpiredBackup(name, { ...marker, setName: 'other' }, new Date('2026-04-01')), false);
  assert.equal(isExpiredBackup('../other', marker, new Date('2026-04-01')), false);
  assert.equal(isExpiredBackup(name, { ...marker, createdAt: '2025-01-01' }, new Date('2026-04-01')), false);
});

test('retention cannot run without explicit restore and scope confirmations', () => {
  assert.throws(() => runRetention(valid), /Retenção bloqueada/);
});
