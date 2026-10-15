import type { NewUser, UserRecord } from '../src/modules/users/users.repository';

export function createPrismaServiceMock() {
  const users: UserRecord[] = [];
  const verifications = new Map<string, {
    phone: string; codeHash: string; expiresAt: Date;
    attempts: number; sentAt: Date; updatedAt: Date;
  }>();

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
    $queryRawUnsafe: jest.fn(async (_query: string, phone: string) => {
      const row = verifications.get(phone);
      return row ? [row] : [];
    }),
    $executeRawUnsafe: jest.fn(async (query: string, phone: string, codeHash?: string, expiresAt?: Date) => {
      if (query.startsWith('INSERT')) {
        verifications.set(phone, {
          phone,
          codeHash: codeHash!,
          expiresAt: expiresAt!,
          attempts: 0,
          sentAt: new Date(),
          updatedAt: new Date(),
        });
      } else if (query.startsWith('UPDATE')) {
        const row = verifications.get(phone);
        if (row) verifications.set(phone, { ...row, attempts: row.attempts + 1, updatedAt: new Date() });
      } else if (query.startsWith('DELETE')) {
        verifications.delete(phone);
      }
      return 1;
    }),
  };
}
