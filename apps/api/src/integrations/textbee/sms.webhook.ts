import { createHmac, timingSafeEqual } from 'node:crypto';

/** Verify the original bytes, before trusting or processing the parsed JSON. */
export function verifyTextBeeSignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!secret.trim() || !signature || !/^[a-f0-9]{64}$/.test(signature))
    return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

/** Documented MESSAGE_RECEIVED payload; runtime validation belongs at the future controller boundary. */
export interface TextBeeIncomingMessage {
  smsId: string;
  message: string;
  deviceId: string;
  webhookSubscriptionId: string;
  webhookEvent: 'MESSAGE_RECEIVED';
  idempotencyKey: string;
  sender: string;
  receivedAt: string;
}
