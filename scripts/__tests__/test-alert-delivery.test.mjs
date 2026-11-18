import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendTestAlert } from '../test-alert-delivery.mjs';

test('sends a bounded synthetic alert to the local Alertmanager only', async () => {
  let request;
  const id = await sendTestAlert('1234', async (url, opts) => {
    request = { url, opts };
    return { ok: true };
  });
  assert.equal(request.url, 'http://127.0.0.1:1234/api/v2/alerts');
  const [alert] = JSON.parse(request.opts.body);
  assert.equal(alert.labels.alertname, 'NexusDeliveryTest');
  assert.equal(alert.labels.job, `manual-${id}`);
  assert.equal(Date.parse(alert.endsAt) - Date.parse(alert.startsAt), 300000);
});

test('rejects invalid ports and failed Alertmanager responses', async () => {
  await assert.rejects(sendTestAlert('invalid'), /Porta/);
  await assert.rejects(sendTestAlert(9093, async () => ({ ok: false, status: 503 })), /HTTP 503/);
});
