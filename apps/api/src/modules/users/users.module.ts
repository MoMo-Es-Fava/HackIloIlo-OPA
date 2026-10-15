import { Module } from '@nestjs/common';
import { PrismaUsersRepository } from './prisma-users.repository';
import { UsersRepository } from './users.repository';
import { AdminUsersController, StrictAdminGuard } from './admin-users.controller';

// PrismaService comes from the global DatabaseModule.
// Tests swap in InMemoryUsersRepository so they don't need a database.
@Module({
  controllers: [AdminUsersController],
  providers: [
    { provide: UsersRepository, useClass: PrismaUsersRepository },
    StrictAdminGuard,
  ],
  exports: [UsersRepository],
})
export class UsersModule {}
