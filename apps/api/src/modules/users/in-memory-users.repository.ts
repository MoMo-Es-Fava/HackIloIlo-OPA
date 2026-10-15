import { ConflictException, Injectable } from '@nestjs/common';
import { NewUser, UserRecord, UsersRepository } from './users.repository';

// Temporary store until the Prisma schema is merged. Data is lost on restart.
@Injectable()
export class InMemoryUsersRepository extends UsersRepository {
  private readonly users: UserRecord[] = [];

  findById(id: number) {
    return Promise.resolve(this.users.find((user) => user.id === id) ?? null);
  }

  findByPhone(phone: string) {
    return Promise.resolve(
      this.users.find((user) => user.phone === phone) ?? null,
    );
  }

  create(user: NewUser) {
    if (this.users.some((existing) => existing.phone === user.phone)) {
      throw new ConflictException('This phone number is already registered.');
    }
    const record: UserRecord = {
      ...user,
      id: this.users.length + 1,
      isActive: true,
      createdAt: new Date(),
    };
    this.users.push(record);
    return Promise.resolve(record);
  }
}
