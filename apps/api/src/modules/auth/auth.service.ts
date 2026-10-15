import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, type AuthResponse } from '@irpc/types';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { SmsService } from '../../integrations/textbee/sms.service';
import {
  toUserDto,
  UserRecord,
  UsersRepository,
} from '../users/users.repository';
import { LoginDto, RegisterDto } from './auth.dto';
import { LoginAttempts } from './login-attempts';

const BCRYPT_ROUNDS = 10;
// Compared against when the phone is unknown, so response time doesn't reveal which numbers exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-pin', BCRYPT_ROUNDS);
const WRONG_LOGIN = 'Wrong phone number or PIN.';
const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_RESEND_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

export interface JwtPayload {
  sub: number;
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly jwt: JwtService,
    private readonly attempts: LoginAttempts,
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
  ) {}

  async requestRegistrationCode(phone: string): Promise<{ message: string }> {
    if (await this.users.findByPhone(phone)) {
      throw new ConflictException('This phone number is already registered.');
    }

    const previous = await this.prisma.phoneVerification.findUnique({
      where: { phone },
    });
    if (previous && Date.now() - previous.sentAt.getTime() < CODE_RESEND_MS) {
      throw new HttpException(
        'Wait one minute before requesting another code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = String(randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 8);
    await this.prisma.phoneVerification.upsert({
      where: { phone },
      create: {
        phone,
        codeHash,
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
      update: {
        codeHash,
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
        attempts: 0,
        sentAt: new Date(),
      },
    });

    try {
      await this.sms.send(
        phone,
        `Your IRPC verification code is ${code}. It expires in 10 minutes. Do not share this code.`,
      );
    } catch (error) {
      await this.prisma.phoneVerification.delete({ where: { phone } });
      throw error;
    }
    return { message: 'Verification code sent.' };
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const verification = await this.prisma.phoneVerification.findUnique({
      where: { phone: dto.phone },
    });
    if (
      !verification ||
      verification.expiresAt.getTime() < Date.now() ||
      verification.attempts >= MAX_CODE_ATTEMPTS
    ) {
      throw new BadRequestException(
        'Request a new verification code before creating your account.',
      );
    }
    if (!(await bcrypt.compare(dto.verificationCode, verification.codeHash))) {
      await this.prisma.phoneVerification.update({
        where: { phone: dto.phone },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('The verification code is incorrect.');
    }

    const user = await this.users.create({
      name: dto.name,
      phone: dto.phone,
      pinHash: await bcrypt.hash(dto.pin, BCRYPT_ROUNDS),
      role: Role.USER, // staff accounts are created by an admin, never by sign-up
      accountType: dto.accountType,
      language: dto.language,
      municipality: dto.municipality ?? null,
      cooperative: dto.cooperative ?? null,
      consentAt: new Date(),
    });
    await this.prisma.phoneVerification.delete({ where: { phone: dto.phone } });
    return this.issue(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    this.attempts.assertNotLocked(dto.phone);
    const user = await this.users.findByPhone(dto.phone);
    const pinMatches = await bcrypt.compare(
      dto.pin,
      user?.pinHash ?? DUMMY_HASH,
    );
    if (!user || !user.isActive || !pinMatches) {
      this.attempts.recordFailure(dto.phone);
      throw new UnauthorizedException(WRONG_LOGIN);
    }
    this.attempts.reset(dto.phone);
    return this.issue(user);
  }

  private async issue(user: UserRecord): Promise<AuthResponse> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return { token: await this.jwt.signAsync(payload), user: toUserDto(user) };
  }
}
