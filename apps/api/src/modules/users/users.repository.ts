import type { AccountType, Language, Role, UserDto } from '@irpc/types';

export interface UserRecord {
  id: number;
  name: string;
  phone: string;
  pinHash: string;
  role: Role;
  accountType: AccountType | null;
  language: Language;
  municipality: string | null;
  cooperative: string | null;
  consentAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export type NewUser = Omit<UserRecord, 'id' | 'isActive' | 'createdAt'>;

// Swap the in-memory implementation for Prisma once the database lands; callers don't change.
export abstract class UsersRepository {
  abstract findById(id: number): Promise<UserRecord | null>;
  abstract findByPhone(phone: string): Promise<UserRecord | null>;
  abstract create(user: NewUser): Promise<UserRecord>;
}

// The only shape that leaves the API. Never includes pinHash.
export function toUserDto(user: UserRecord): UserDto {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    accountType: user.accountType,
    language: user.language,
    municipality: user.municipality,
    cooperative: user.cooperative,
  };
}
