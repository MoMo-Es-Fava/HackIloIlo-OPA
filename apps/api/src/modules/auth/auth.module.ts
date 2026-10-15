import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { SmsModule } from '../../integrations/textbee/sms.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminGuard, JwtAuthGuard, RolesGuard } from './guards';
import { LoginAttempts } from './login-attempts';

@Module({
  imports: [
    UsersModule,
    SmsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET', '').trim();
        if (secret.length < 32) {
          throw new Error(
            'JWT_SECRET must be set to at least 32 random characters (see .env.example).',
          );
        }
        return { secret, signOptions: { expiresIn: '7d' } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LoginAttempts,
    AdminGuard,
    // Order matters: authenticate first, then check roles.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AdminGuard, UsersModule],
})
export class AuthModule {}
