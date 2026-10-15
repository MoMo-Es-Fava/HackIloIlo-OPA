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
    phoneVerification: {
      findUnique: jest.fn(async ({ where }: { where: { phone: string } }) =>
        verifications.get(where.phone) ?? null),
      upsert: jest.fn(async ({ where, create, update }: {
        where: { phone: string };
        create: { phone: string; codeHash: string; expiresAt: Date };
        update: { codeHash: string; expiresAt: Date; attempts: number; sentAt: Date };
      }) => {
        const existing = verifications.get(where.phone);
        const row = existing
          ? { ...existing, ...update, updatedAt: new Date() }
          : { ...create, attempts: 0, sentAt: new Date(), updatedAt: new Date() };
        verifications.set(where.phone, row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: {
        where: { phone: string }; data: { attempts: { increment: number } };
      }) => {
        const row = verifications.get(where.phone);
        if (!row) throw new Error('Verification not found');
        const updated = {
          ...row,
          attempts: row.attempts + data.attempts.increment,
          updatedAt: new Date(),
        };
        verifications.set(where.phone, updated);
        return updated;
      }),
      delete: jest.fn(async ({ where }: { where: { phone: string } }) => {
        const row = verifications.get(where.phone);
        verifications.delete(where.phone);
        return row;
      }),
    },
  };
}
