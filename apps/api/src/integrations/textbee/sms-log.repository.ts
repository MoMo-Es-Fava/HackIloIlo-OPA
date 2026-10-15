export interface NewOutboundSmsLog {
  phone: string;
  message: string;
  orderId: number | null;
}

export abstract class SmsLogRepository {
  abstract createOutbound(log: NewOutboundSmsLog): Promise<number>;
  abstract updateStatus(
    id: number,
    status: 'MOCKED' | 'QUEUED' | 'FAILED',
    providerId?: string,
  ): Promise<void>;
}
