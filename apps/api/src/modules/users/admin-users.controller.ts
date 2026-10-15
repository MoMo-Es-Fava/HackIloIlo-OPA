import {
  BadRequestException,
  ConflictException,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Injectable,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  CanActivate,
  createParamDecorator,
  Body,
} from '@nestjs/common';
import { AccountType, Language, Role, normalizePhPhone, PIN_PATTERN } from '@irpc/types';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import type { AuthedRequest } from '../../common/auth.decorators';
import { UsersRepository, UserRecord, UserUpdate } from './users.repository';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
const normalizePhone = ({ value }: { value: unknown }) => typeof value === 'string' ? (normalizePhPhone(value) ?? value) : value;

export class CreateManagedUserDto {
  @Transform(trim) @IsString() @Length(2, 100)
  name!: string;

  @Transform(normalizePhone) @IsString() @Matches(/^\+639\d{9}$/)
  phone!: string;

  @IsString() @Matches(PIN_PATTERN)
  pin!: string;

  @IsIn(Object.values(Role))
  role!: Role;

  @IsOptional() @IsIn(Object.values(AccountType))
  accountType?: AccountType;

  @IsOptional() @IsIn(Object.values(Language))
  language?: Language;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(100)
  municipality?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(100)
  cooperative?: string;
}

export class UpdateManagedUserDto {
  @IsOptional() @Transform(trim) @IsString() @Length(2, 100)
  name?: string;

  @IsOptional() @Transform(normalizePhone) @IsString() @Matches(/^\+639\d{9}$/)
  phone?: string;

  @IsOptional() @IsString() @Matches(PIN_PATTERN)
  pin?: string;

  @IsOptional() @IsIn(Object.values(Role))
  role?: Role;

  @IsOptional() @IsIn(Object.values(AccountType))
  accountType?: AccountType | null;

  @IsOptional() @IsIn(Object.values(Language))
  language?: Language;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(100)
  municipality?: string | null;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(100)
  cooperative?: string | null;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

@Injectable()
export class StrictAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const user = context.switchToHttp().getRequest<AuthedRequest>().user;
    if (!user) throw new ForbiddenException('You do not have access to this action.');
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Only an admin can manage user accounts.');
    return true;
  }
}

const safeUser = (user: UserRecord) => ({
  ...(({ pinHash: _pinHash, ...rest }) => rest)(user),
});

@Controller('admin/users')
@UseGuards(StrictAdminGuard)
export class AdminUsersController {
  constructor(private readonly users: UsersRepository) {}

  @Get()
  async list() {
    return (await this.users.findAll()).map(safeUser);
  }

  @Post()
  async create(@Body() dto: CreateManagedUserDto) {
    this.assertAccountType(dto.role, dto.accountType ?? null);
    const user = await this.users.create({
      name: dto.name,
      phone: dto.phone,
      pinHash: await bcrypt.hash(dto.pin, 10),
      role: dto.role,
      accountType: dto.role === Role.USER ? dto.accountType! : null,
      language: dto.language ?? Language.HIL,
      municipality: dto.municipality || null,
      cooperative: dto.cooperative || null,
      // Admin-created accounts did not necessarily provide their own privacy consent.
      consentAt: null,
    });
    return safeUser(user);
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateManagedUserDto) {
    const current = await this.users.findById(id);
    if (!current) throw new NotFoundException('User not found.');
    const role = dto.role ?? current.role;
    const accountType = dto.accountType === undefined ? current.accountType : dto.accountType;
    this.assertAccountType(role, accountType);

    const changes: UserUpdate = {
      ...(dto.name === undefined ? {} : { name: dto.name }),
      ...(dto.phone === undefined ? {} : { phone: dto.phone }),
      ...(dto.role === undefined ? {} : { role: dto.role }),
      ...(dto.accountType === undefined ? {} : { accountType: dto.accountType }),
      ...(dto.language === undefined ? {} : { language: dto.language }),
      ...(dto.municipality === undefined ? {} : { municipality: dto.municipality || null }),
      ...(dto.cooperative === undefined ? {} : { cooperative: dto.cooperative || null }),
      ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
    };
    if (dto.pin) changes.pinHash = await bcrypt.hash(dto.pin, 10);

    if (current.role === Role.ADMIN && (changes.role !== undefined && changes.role !== Role.ADMIN || changes.isActive === false)) {
      const admins = (await this.users.findAll()).filter((item) => item.role === Role.ADMIN && item.isActive);
      if (current.isActive && admins.length <= 1) throw new ConflictException('At least one active admin account must remain.');
    }
    return safeUser(await this.users.update(id, changes));
  }

  private assertAccountType(role: Role, accountType: AccountType | null) {
    if (role === Role.USER && !accountType) throw new BadRequestException('Farmer and buyer accounts need an account type.');
    if (role !== Role.USER && accountType) throw new BadRequestException('Staff and admin accounts cannot have a farmer or buyer account type.');
  }
}
