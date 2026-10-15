import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { OrderDto } from '@irpc/types';

export interface SmsResult {
  status: 'mocked' | 'queued';
  batchId?: string;
  warning?: string;
}

export abstract class SmsProvider {
  abstract send(to: string, message: string): Promise<SmsResult>;
}

// Use the order's contact number, which may differ from the account's phone.
export type NotificationOrder = Pick<
  OrderDto,
  'ref' | 'status' | 'scheduledDate' | 'rejectReason' | 'contactPhone'
>;

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

  notifyStatusChange(order: NotificationOrder): Promise<SmsResult> {
    const status = order.status.replaceAll('_', ' ').toLowerCase();
    let message = `${order.ref}: ${status}.`;
    if (
      order.scheduledDate &&
      ['ACCEPTED', 'SCHEDULED'].includes(order.status)
    ) {
      message += ` Confirmed date: ${order.scheduledDate}.`;
    }
    if (order.status === 'REJECTED' && order.rejectReason) {
      message += ` Reason: ${order.rejectReason}.`;
    }
    return this.send(order.contactPhone, message);
  }
}
