import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { SmsModule } from './integrations/textbee/sms.module';

@Module({
  imports: [
    // The repository-root .env is shared with Prisma and Docker; apps/api/.env still works locally.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    SmsModule,
  ],
})
export class AppModule {}
