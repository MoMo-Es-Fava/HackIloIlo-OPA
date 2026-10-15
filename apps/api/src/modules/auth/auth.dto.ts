import {
  AccountType,
  Language,
  normalizePhPhone,
  PIN_PATTERN,
  type LoginRequest,
  type RegisterRequest,
} from '@irpc/types';
import { Transform } from 'class-transformer';
import {
  Equals,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

const PHONE_MESSAGE = 'Enter a Philippine mobile number, e.g. 0917 123 4567.';
const PIN_MESSAGE = 'PIN must be 4 to 6 digits.';

// "0917 123 4567" -> "+639171234567"; anything else is left as-is so @Matches rejects it.
const toPhone = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? (normalizePhPhone(value) ?? value) : value;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto implements RegisterRequest {
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  name!: string;

  @Transform(toPhone)
  @IsString()
  @Matches(/^\+639\d{9}$/, { message: PHONE_MESSAGE })
  phone!: string;

  @IsString()
  @Matches(PIN_PATTERN, { message: PIN_MESSAGE })
  pin!: string;

  @IsIn(Object.values(AccountType))
  accountType!: AccountType;

  @IsIn(Object.values(Language))
  language!: Language;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  municipality?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  cooperative?: string;

  @Equals(true, {
    message: 'You must agree to the data privacy notice to register.',
  })
  consent!: true;
}

export class LoginDto implements LoginRequest {
  @Transform(toPhone)
  @IsString()
  @Matches(/^\+639\d{9}$/, { message: PHONE_MESSAGE })
  phone!: string;

  @IsString()
  @Matches(PIN_PATTERN, { message: PIN_MESSAGE })
  pin!: string;
}
