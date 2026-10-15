import type {
  NewUser,
  UserRecord,
} from '../src/modules/users/users.repository';

type Verification = {
  phone: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  sentAt: Date;
};

// In-memory stand-in for the Prisma calls the auth e2e tests reach.
export function createPrismaServiceMock() {
  const users: UserRecord[] = [];
  const verifications = new Map<string, Verification>();

  return {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: {
      findUnique: jest.fn(
        ({ where }: { where: { id?: number; phone?: string } }) =>
          Promise.resolve(
            users.find(
              (user) =>
                (where.id !== undefined && user.id === where.id) ||
                (where.phone !== undefined && user.phone === where.phone),
            ) ?? null,
          ),
      ),
      create: jest.fn(({ data }: { data: NewUser }) => {
        if (users.some((user) => user.phone === data.phone)) {
          return Promise.reject(
            Object.assign(new Error('Unique constraint failed'), {
              code: 'P2002',
            }),
          );
        }
        const user: UserRecord = {
          ...data,
          id: users.length + 1,
          isActive: true,
          createdAt: new Date(),
        };
        users.push(user);
        return Promise.resolve(user);
      }),
    },
    smsLog: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn(),
    },
    phoneVerification: {
      findUnique: jest.fn(({ where }: { where: { phone: string } }) =>
        Promise.resolve(verifications.get(where.phone) ?? null),
      ),
      upsert: jest.fn(
        ({
          where,
          update,
        }: {
          where: { phone: string };
          update: Omit<Verification, 'phone'>;
        }) => {
          verifications.set(where.phone, { phone: where.phone, ...update });
          return Promise.resolve(verifications.get(where.phone));
        },
      ),
      update: jest.fn(({ where }: { where: { phone: string } }) => {
        const row = verifications.get(where.phone);
        if (row) row.attempts += 1;
        return Promise.resolve(row);
      }),
      deleteMany: jest.fn(({ where }: { where: { phone: string } }) =>
        Promise.resolve({ count: Number(verifications.delete(where.phone)) }),
      ),
    },
  };
}
