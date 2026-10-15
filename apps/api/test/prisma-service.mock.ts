import type { NewUser, UserRecord } from '../src/modules/users/users.repository';

export function createPrismaServiceMock() {
  const users: UserRecord[] = [];

  return {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: {
      findUnique: jest.fn(
        async ({ where }: { where: { id?: number; phone?: string } }) =>
          users.find(
            (user) =>
              (where.id !== undefined && user.id === where.id) ||
              (where.phone !== undefined && user.phone === where.phone),
          ) ?? null,
      ),
      create: jest.fn(async ({ data }: { data: NewUser }) => {
        if (users.some((user) => user.phone === data.phone)) {
          throw Object.assign(new Error('Unique constraint failed'), {
            code: 'P2002',
          });
        }

        const user: UserRecord = {
          ...data,
          id: users.length + 1,
          isActive: true,
          createdAt: new Date(),
        };
        users.push(user);
        return user;
      }),
    },
  };
}
