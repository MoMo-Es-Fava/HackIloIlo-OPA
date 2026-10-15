import type { NewUser, UserRecord } from '../src/modules/users/users.repository';

export function createPrismaServiceMock() {
  const users: UserRecord[] = [];
  const verifications = new Map<string, {
    phone: string; codeHash: string; expiresAt: Date;
    attempts: number; sentAt: Date; updatedAt: Date;
  }>();
  const now = () => new Date();

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
    smsLog: {
      create: jest.fn(async () => ({ id: 1 })),
      update: jest.fn(),
    },
    phoneVerification: {
      findUnique: jest.fn(async ({ where }: { where: { phone: string } }) =>
        verifications.get(where.phone) ?? null,
      ),
      upsert: jest.fn(async ({
        where,
        create,
        update,
      }: {
        where: { phone: string };
        create: { phone: string; codeHash: string; expiresAt: Date; attempts?: number };
        update: { codeHash: string; expiresAt: Date; attempts: number; sentAt: Date };
      }) => {
        const old = verifications.get(where.phone);
        const row = old
          ? { ...old, ...update, updatedAt: now() }
          : { ...create, attempts: create.attempts ?? 0, sentAt: now(), updatedAt: now() };
        verifications.set(where.phone, row);
        return row;
      }),
      update: jest.fn(async ({
        where,
        data,
      }: {
        where: { phone: string };
        data: { attempts: { increment: number } };
      }) => {
        const old = verifications.get(where.phone);
        if (!old) throw new Error('Phone verification not found');
        const row = { ...old, attempts: old.attempts + data.attempts.increment, updatedAt: now() };
        verifications.set(where.phone, row);
        return row;
      }),
      deleteMany: jest.fn(async ({ where }: { where: { phone: string } }) => ({
        count: Number(verifications.delete(where.phone)),
      })),
    },
  };
}
