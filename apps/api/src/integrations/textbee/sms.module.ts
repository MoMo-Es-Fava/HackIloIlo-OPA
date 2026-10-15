import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaSmsLogRepository } from './prisma-sms-log.repository';
import { SmsLogRepository } from './sms-log.repository';
import { MockSmsProvider, TextBeeSmsProvider } from './sms.providers';
import { SmsProvider, SmsService } from './sms.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SmsProvider,
      inject: [ConfigService],
      useFactory: (config: ConfigService): SmsProvider => {
        const provider = config.get<string>('SMS_PROVIDER', 'mock').trim();
        if (provider === 'mock') return new MockSmsProvider();
        if (provider !== 'textbee')
          throw new Error('SMS_PROVIDER must be mock or textbee');
        return new TextBeeSmsProvider(
          config
            .get<string>('TEXTBEE_API_URL', 'https://api.textbee.dev/api/v1')
            .trim(),
          config.get<string>('TEXTBEE_API_KEY', ''),
          config.get<string>('TEXTBEE_DEVICE_ID', ''),
        );
      },
    },
    PrismaSmsLogRepository,
    { provide: SmsLogRepository, useExisting: PrismaSmsLogRepository },
    SmsService,
  ],
  exports: [SmsService],
})
export class SmsModule {}
