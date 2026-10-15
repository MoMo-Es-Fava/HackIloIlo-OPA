import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Language } from '@irpc/types';
import { buildStatusMessage } from './sms.messages';
import type { SmsOrder } from './sms.messages';

export interface SmsResult {
  status: 'mocked' | 'queued';
  batchId?: string;
  warning?: string;
}

export abstract class SmsProvider {
  abstract send(to: string, message: string): Promise<SmsResult>;
}

// Use the order's contact number, which may differ from the account's phone.
export type NotificationOrder = SmsOrder & { contactPhone: string };

@Injectable()
export class SmsService {
  constructor(@Inject(SmsProvider) private readonly provider: SmsProvider) {}

  send(to: string, message: string): Promise<SmsResult> {
    if (!/^\+[1-9]\d{7,14}$/.test(to)) {
      throw new BadRequestException(
        'SMS recipient must use international phone format',
      );
    }
    if (!message.trim())
      throw new BadRequestException('SMS message cannot be empty');
    return this.provider.send(to, message);
  }

  notifyStatusChange(
    order: NotificationOrder,
    language: Language = Language.EN,
  ): Promise<SmsResult> {
    return this.send(order.contactPhone, buildStatusMessage(order, language));
  }
}
