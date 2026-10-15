# TextBee setup

Requires Node.js 22. Use a dedicated Android phone with an active SMS SIM, SMS
credit, and internet. Create a verified account at https://app.textbee.dev, install
the official APK from https://textbee.dev/download, and register the phone by QR.
Grant SMS permissions, enable Gateway Enabled, allow background operation, and
enable Receive SMS if testing incoming messages.

Keep credentials only in `apps/api/.env` (ignored by Git):

```dotenv
SMS_PROVIDER=mock
TEXTBEE_API_URL=https://api.textbee.dev/api/v1
TEXTBEE_API_KEY=your-private-key
TEXTBEE_DEVICE_ID=your-device-id
```

`mock` is the default for the NestJS service and does not send real messages.
Set `SMS_PROVIDER=textbee` to use the registered phone; restart the API after
changing settings. Never put the key in `NEXT_PUBLIC_*` or commit it.

## Standalone phone tests

From the repository root, replace the example number with a second phone you own:

```powershell
node --env-file=apps/api/.env apps/api/scripts/textbee-test.mjs send +639171234567 "IRPC test"
node --env-file=apps/api/.env apps/api/scripts/textbee-test.mjs receive
```

The standalone `send` command always sends a real SMS, regardless of SMS_PROVIDER.
For receiving, text the gateway SIM from the second phone first. `receive` lists
account message history; it does not reply. Queue acceptance is not delivery.
Check TextBee history and the receiving phone before retrying a message.

Offline verification (no real messages sent):

```powershell
node --test apps/api/test/textbee-test.spec.mjs
npm.cmd run build:types
npm.cmd test -w api -- --runInBand
npm.cmd run build -w api
```

## NestJS integration

`SmsModule` is registered in `AppModule`. Feature modules that need notifications
import `SmsModule`, inject `SmsService`, and call:

```typescript
await smsService.notifyStatusChange(order);
```

The service uses the shared order status, reference, confirmed schedule,
rejection reason, and `contactPhone` from `OrderDto`. Send updates to the order's
contact number rather than substituting the customer's account phone.
Only call after a committed status change. SMS failures must not roll back an
order: connect a durable notification queue/outbox when the schema is ready.

Results distinguish `mocked` from `queued`; TextBee results include a batch ID and
any permission warning. No public sending endpoint is exposed. Incoming webhooks,
automatic command replies, delivery callbacks, and `SmsLog` persistence remain
separate work once the shared schema and order workflows are available.

Keep `prices-endpoints`: it contains the pricing feature. This setup requires no
branch deletion or merge into main.

Official references: [installation](https://textbee.dev/docs/getting-started/setting-up-textbee),
[sending](https://textbee.dev/docs/sending-sms),
[receiving](https://textbee.dev/docs/receiving-sms).
