import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NewUser, UserRecord, UsersRepository } from './users.repository';

@Injectable()
export class PrismaUsersRepository extends UsersRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findById(id: number): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByPhone(phone: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async create(user: NewUser): Promise<UserRecord> {
    try {
      return await this.prisma.user.create({ data: user });
    } catch (error) {
      // The phone column is unique, so two sign-ups racing on one number end here.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('This phone number is already registered.');
      }
      throw error;
    }
  }
}
