import test from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../scripts/textbee-test.mjs';

const env = { TEXTBEE_API_KEY: 'test-only', TEXTBEE_DEVICE_ID: 'device-test' };

test('sends the configured device, recipient and message', async () => {
  await run(['send', '+639171234567', 'IRPC test'], env, async (url, options) => {
    assert.equal(url, 'https://api.textbee.dev/api/v1/gateway/send-sms');
    assert.equal(options.headers['x-api-key'], 'test-only');
    assert.deepEqual(JSON.parse(options.body), {
      deviceId: 'device-test', recipients: ['+639171234567'], message: 'IRPC test',
    });
    return { ok: true, json: async () => ({ smsBatchId: 'test-batch' }) };
  });
});

test('reads incoming history without sending SMS', async () => {
  await run(['receive'], env, async (url, options) => {
    assert.match(url, /gateway\/messages\?direction=received&limit=20$/);
    assert.equal(options.method, 'GET');
    assert.equal(options.body, undefined);
    return { ok: true, json: async () => ({ data: [] }) };
  });
});

test('rejects missing credentials and invalid recipients before networking', async () => {
  const unexpectedFetch = () => { assert.fail('Must not call network'); };
  await assert.rejects(run(['receive'], {}, unexpectedFetch), /Set TEXTBEE_API_KEY/);
  await assert.rejects(run(['send', '09171234567', 'test'], env, unexpectedFetch), /international/);
});

test('reports provider failure without exposing response bodies', async () => {
  await assert.rejects(run(['receive'], env, async () => ({ ok: false, status: 401 })), /HTTP 401/);
});
