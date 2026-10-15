import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthResponse, UserDto } from '@irpc/types';
import { CurrentUser, Public } from '../../common/auth.decorators';
import { LoginDto, RegisterDto, RequestRegistrationCodeDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('register/code')
  requestRegistrationCode(
    @Body() dto: RequestRegistrationCodeDto,
  ): Promise<{ message: string }> {
    return this.auth.requestRegistrationCode(dto.phone);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.auth.login(dto);
  }

  @Get('me')
  me(@CurrentUser() user: UserDto): UserDto {
    return user;
  }
}
