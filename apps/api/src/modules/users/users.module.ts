import { Module } from '@nestjs/common';
import { InMemoryUsersRepository } from './in-memory-users.repository';
import { UsersRepository } from './users.repository';

@Module({
  providers: [{ provide: UsersRepository, useClass: InMemoryUsersRepository }],
  exports: [UsersRepository],
})
export class UsersModule {}
