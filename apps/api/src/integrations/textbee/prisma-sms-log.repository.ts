import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SmsDirection } from '../../generated/prisma/enums';
import { NewOutboundSmsLog, SmsLogRepository } from './sms-log.repository';

@Injectable()
export class PrismaSmsLogRepository extends SmsLogRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createOutbound(log: NewOutboundSmsLog): Promise<number> {
    const row = await this.prisma.smsLog.create({
      data: {
        direction: SmsDirection.OUTBOUND,
        phone: log.phone,
        message: log.message,
        status: 'PENDING',
        orderId: log.orderId,
      },
      select: { id: true },
    });
    return row.id;
  }

  async updateStatus(
    id: number,
    status: 'MOCKED' | 'QUEUED' | 'FAILED',
    providerId?: string,
  ): Promise<void> {
    await this.prisma.smsLog.update({
      where: { id },
      data: { status, providerId: providerId ?? null },
    });
  }
}
