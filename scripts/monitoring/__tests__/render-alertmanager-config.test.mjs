import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAlertmanagerConfig } from '../render-alertmanager-config.mjs';

const template = [
  'receivers:',
  '  - name: nexus-alpha-webhook',
  '    webhook_configs:',
  '      - url: __ALERTMANAGER_WEBHOOK_URL__',
].join('\n');

test('renders a quoted HTTPS webhook URL without altering query tokens', () => {
  const config = renderAlertmanagerConfig(
    template,
    'https://alerts.example.com/incoming?token=private-value',
  );

  assert.match(
    config,
    /url: "https:\/\/alerts\.example\.com\/incoming\?token=private-value"/,
  );
  assert.equal(config.includes('__ALERTMANAGER_WEBHOOK_URL__'), false);
});

test('rejects insecure, credential-bearing, and malformed webhook URLs', () => {
  for (const url of [
    'http://alerts.example.com/incoming',
    'https://user:password@alerts.example.com/incoming',
    'https://alerts.example.com/incoming#fragment',
    'not a URL',
    '',
  ]) {
    assert.throws(() => renderAlertmanagerConfig(template, url));
  }
});

test('rejects templates with missing or duplicate webhook placeholders', () => {
  assert.throws(() => renderAlertmanagerConfig('receivers: []', 'https://alerts.example.com'));
  assert.throws(() =>
    renderAlertmanagerConfig(
      `${template}\n      - url: __ALERTMANAGER_WEBHOOK_URL__`,
      'https://alerts.example.com',
    ),
  );
});
