# SMS helpers

`buildStatusMessage(order, language)` and `buildOrderStatusReply(order, language)` accept `EN` (default) or `HIL` from `@irpc/types`. Dates use Asia/Manila. Prices come from the order's locked unit price or service rates, never today's price list. A drying-only pickup message refers to palay rather than rice. Rejection reasons are included as entered by staff; they are not automatically translated.

`SmsService.notifyStatusChange(order, language)` sends the built text to `contactPhone`. With `SMS_PROVIDER=mock`, the API logs the recipient and complete message without contacting TextBee.

`parseSmsCommand(text)` returns `{ type: 'prices' }`, `{ type: 'status', orderId: 42 }`, or `{ type: 'unknown' }`. It accepts PRESYO/PRICE and STATUS IRPC-0042/STATUS 42, ignoring capitalization and surrounding/repeated whitespace. IDs must be positive safe integers.

`buildPriceReply(prices, language, riceTypes?)` accepts current price rows, optionally resolving rice names; otherwise it displays the rice type ID. All helpers are independent of the database, network and clock.

## Incoming webhook research

Verified 2026-10-15 against [TextBee's official webhook documentation](https://textbee.dev/docs/webhooks).

TextBee POSTs a flat JSON object:

```json
{
  "smsId": "example-sms-id",
  "message": "STATUS IRPC-0042",
  "deviceId": "your-device-id",
  "webhookSubscriptionId": "your-subscription-id",
  "webhookEvent": "MESSAGE_RECEIVED",
  "idempotencyKey": "example-delivery-key",
  "sender": "+639171234567",
  "receivedAt": "2026-10-20T00:00:00.000Z"
}
```

`X-Signature` is a lowercase hex HMAC-SHA256 of the original body bytes using the subscription's signing secret (at least 20 characters). `verifyTextBeeSignature` checks this in constant time and rejects missing/malformed signatures. The secret is separate from the outbound API key. Configure it later as `TEXTBEE_WEBHOOK_SECRET`.

## Deferred integration

There is no inbound route or order lookup yet. When the orders module is ready:

1. Enable Nest raw-body capture and pass those exact bytes to the verifier before processing JSON. Return 401 for an invalid signature; never reserialize the body for verification.
2. Validate the event fields at runtime and require the configured device/subscription. The TypeScript interface alone does not validate requests.
3. Store `idempotencyKey` with a unique constraint to prevent duplicate replies on retries. A valid signature alone does not prevent replay.
4. Resolve the sender and authorize access to the requested order before building a reply; knowing a reference is insufficient.
5. Persist inbound messages and queue outgoing replies, then return 2xx promptly. Persist the outgoing result in SmsLog. Unknown commands should receive usage guidance.

These steps remain deferred; the helper does not expose an unauthenticated HTTP endpoint or query real orders.

Run tests from the repository root: `npm test -w api -- --runInBand`.
