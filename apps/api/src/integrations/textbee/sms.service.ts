import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Language } from '@irpc/types';
import { SmsLogRepository } from './sms-log.repository';
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
export type NotificationOrder = SmsOrder & {
  id: number;
  contactPhone: string;
};

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    @Inject(SmsProvider) private readonly provider: SmsProvider,
    @Inject(SmsLogRepository) private readonly logs: SmsLogRepository,
  ) {}

  send(
    to: string,
    message: string,
    orderId: number | null = null,
  ): Promise<SmsResult> {
    if (!/^\+[1-9]\d{7,14}$/.test(to)) {
      throw new BadRequestException(
        'SMS recipient must use international phone format',
      );
    }
    if (!message.trim())
      throw new BadRequestException('SMS message cannot be empty');
    return this.sendAndLog(to, message, orderId);
  }

  notifyStatusChange(
    order: NotificationOrder,
    language: Language = Language.EN,
  ): Promise<SmsResult> {
    return this.send(
      order.contactPhone,
      buildStatusMessage(order, language),
      order.id,
    );
  }

  private async sendAndLog(
    to: string,
    message: string,
    orderId: number | null,
  ): Promise<SmsResult> {
    const logId = await this.logs.createOutbound({
      phone: to,
      message,
      orderId,
    });
    try {
      const result = await this.provider.send(to, message);
      if (result.status === 'queued') {
        this.logger.log(`TextBee accepted SMS batch ${result.batchId ?? '(no batch ID)'}.`);
        if (result.warning) this.logger.warn(`TextBee warning: ${result.warning}`);
      }
      await this.updateLog(
        logId,
        result.status === 'queued' ? 'QUEUED' : 'MOCKED',
        result.batchId,
      );
      return result;
    } catch (error) {
      await this.updateLog(logId, 'FAILED');
      throw error;
    }
  }

  private async updateLog(
    id: number,
    status: 'MOCKED' | 'QUEUED' | 'FAILED',
    providerId?: string,
  ): Promise<void> {
    try {
      await this.logs.updateStatus(id, status, providerId);
    } catch {
      // The initial PENDING row remains evidence that the send was attempted.
      this.logger.error(`Could not update SMS log ${id} to ${status}`);
    }
  }
}
