// Standalone gateway smoke test. Requires Node.js 22; no dependencies.
// Run from the repository root using the commands in docs/textbee-setup.md.
import { pathToFileURL } from 'node:url';

export async function run(args, env = process.env, fetchImpl = fetch) {
  const [command, recipient, ...words] = args;
  if (!['send', 'receive'].includes(command)) {
    throw new Error('Usage: textbee-test.mjs send +639XXXXXXXXX "message" | receive');
  }
  const apiKey = env.TEXTBEE_API_KEY?.trim();
  const deviceId = env.TEXTBEE_DEVICE_ID?.trim();
  if (!apiKey || !deviceId) throw new Error('Set TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID in apps/api/.env');

  const base = new URL(env.TEXTBEE_API_URL?.trim() || 'https://api.textbee.dev/api/v1');
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) {
    throw new Error('TEXTBEE_API_URL must be a plain HTTPS URL');
  }
  const headers = { 'x-api-key': apiKey };
  let endpoint;
  let options;
  if (command === 'send') {
    if (!/^\+[1-9]\d{7,14}$/.test(recipient ?? '')) {
      throw new Error('Use an international recipient number, for example +639171234567');
    }
    const message = words.join(' ').trim();
    if (!message) throw new Error('Provide a nonempty test message');
    endpoint = '/gateway/send-sms';
    options = {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, recipients: [recipient], message }),
    };
  } else {
    endpoint = '/gateway/messages?direction=received&limit=20';
    options = { method: 'GET', headers };
  }

  let response;
  try {
    response = await fetchImpl(base.href.replace(/\/$/, '') + endpoint, {
      ...options, redirect: 'error', signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('Network request failed or timed out. Check TextBee history before retrying a send to avoid duplicates.');
  }
  if (!response.ok) {
    // Do not print provider bodies, request headers, or credentials on errors.
    throw new Error(`TextBee returned HTTP ${response.status}. Check your API key, email verification, and account limits.`);
  }
  const result = await response.json();
  return { command, result };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv.slice(2)).then(({ command, result }) => {
    console.log(command === 'send'
      ? 'Request accepted. Verify delivery on the receiving phone and in TextBee history.'
      : 'Latest received messages across your TextBee account (not an automatic reply handler):');
    console.log(JSON.stringify(result, null, 2));
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
