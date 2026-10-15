import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, type AuthResponse } from '@irpc/types';
import * as bcrypt from 'bcryptjs';
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
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
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
