import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module';
import { SmsModule } from './integrations/textbee/sms.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HealthModule, SmsModule],
})
export class AppModule {}
