import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { SmsProvider } from './sms.service';
import type { SmsResult } from './sms.service';

export class MockSmsProvider extends SmsProvider {
  private readonly logger = new Logger(MockSmsProvider.name);

  send(to: string, message: string): Promise<SmsResult> {
    this.logger.log(`[MOCK SMS] To: ${to} Message: ${message}`);
    return Promise.resolve({ status: 'mocked' });
  }
}

export class TextBeeSmsProvider extends SmsProvider {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly apiKey: string,
    private readonly deviceId: string,
  ) {
    super();
    const url = new URL(baseUrl);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error('TEXTBEE_API_URL must be a plain HTTPS URL');
    }
    if (!apiKey.trim() || !deviceId.trim()) {
      throw new Error('TextBee requires TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID');
    }
    this.baseUrl = url.href.replace(/\/$/, '');
  }

  async send(to: string, message: string): Promise<SmsResult> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/gateway/send-sms`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: this.deviceId.trim(),
          recipients: [to],
          message,
        }),
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      });
    } catch {
      throw new ServiceUnavailableException(
        'SMS request failed or timed out. Check message history before retrying.',
      );
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `TextBee returned HTTP ${response.status}`,
      );
    }
    let body: {
      data?: {
        success?: boolean;
        smsBatchId?: string;
        warning?: { message?: string };
      };
    };
    try {
      body = (await response.json()) as typeof body;
    } catch {
      throw new ServiceUnavailableException(
        'TextBee returned an invalid response',
      );
    }
    if (
      body.data?.success !== true ||
      typeof body.data.smsBatchId !== 'string'
    ) {
      throw new ServiceUnavailableException(
        'TextBee did not confirm queue acceptance',
      );
    }
    return {
      status: 'queued',
      batchId: body.data.smsBatchId,
      ...(body.data.warning?.message
        ? { warning: body.data.warning.message }
        : {}),
    };
  }
}
