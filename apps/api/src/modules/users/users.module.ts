import { Module } from '@nestjs/common';
import { PrismaUsersRepository } from './prisma-users.repository';
import { UsersRepository } from './users.repository';

// PrismaService comes from the global DatabaseModule.
// Tests swap in InMemoryUsersRepository so they don't need a database.
@Module({
  providers: [{ provide: UsersRepository, useClass: PrismaUsersRepository }],
  exports: [UsersRepository],
})
export class UsersModule {}
