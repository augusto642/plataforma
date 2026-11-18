import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { validateRestoreConfig } from '../restore-drill.mjs';

test('requires a scoped remote, a valid set name and an existing offline identity', () => {
  const valid = {
    BACKUP_RCLONE_PATH: 'drive:backups/nexus',
    RESTORE_BACKUP_SET: 'nexus-backup-20260101T120000Z-01234567-89ab-4cde-8fab-0123456789ab',
    AGE_IDENTITY_FILE: fileURLToPath(import.meta.url),
  };
  assert.equal(validateRestoreConfig(valid).setName, valid.RESTORE_BACKUP_SET);
  assert.throws(() => validateRestoreConfig({ ...valid, BACKUP_RCLONE_PATH: 'drive:' }));
  assert.throws(() => validateRestoreConfig({ ...valid, RESTORE_BACKUP_SET: '../other' }));
  assert.throws(() => validateRestoreConfig({ ...valid, AGE_IDENTITY_FILE: '' }));
  assert.throws(() => validateRestoreConfig({ ...valid, RESTORE_VERIFY_LOGIN: 'yes' }));
  assert.throws(() => validateRestoreConfig({ ...valid, RESTORE_VERIFY_LOGIN: 'true' }));
  assert.equal(validateRestoreConfig({
    ...valid, RESTORE_VERIFY_LOGIN: 'true', RESTORE_CHECK_EMAIL: 'test@example.test',
    RESTORE_CHECK_PASSWORD: 'fixture', RESTORE_CHECK_SUBMISSION_ID: '01234567-89ab-4cde-8fab-0123456789ab',
  }).functional, true);
  assert.throws(() => validateRestoreConfig({ ...valid, RESTORE_VERIFY_GITEA: 'true' }));
  const git = {
    ...valid, RESTORE_VERIFY_GITEA: 'true', RESTORE_GITEA_TOKEN: 'fixture',
    RESTORE_GITEA_OWNER: 'student', RESTORE_GITEA_REPO: 'example',
    RESTORE_GITEA_FILE: 'src/example.js', RESTORE_GITEA_COMMIT: 'a'.repeat(40),
    RESTORE_GITEA_FILE_SHA256: 'b'.repeat(64),
  };
  assert.equal(validateRestoreConfig(git).verifyGitea, true);
  assert.throws(() => validateRestoreConfig({ ...git, RESTORE_GITEA_FILE: '../example.js' }));
});
