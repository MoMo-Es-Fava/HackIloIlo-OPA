import path from 'node:path';
import { config } from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AccountType,
  Language,
  PriceBasis,
  PriceItem,
  Prisma,
  PrismaClient,
  Role,
} from '../src/generated/prisma/client';

config({ path: path.resolve(process.cwd(), '../../.env'), quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Check the repository root .env file.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

// Demo credentials only. Set SEED_DEMO_PIN in the root .env to change the PIN
// used when a seeded account is first created. Reruns do not reset account PINs.
const DEMO_PIN = process.env.SEED_DEMO_PIN?.trim() || '1234';
if (!/^\d{4,6}$/.test(DEMO_PIN)) {
  throw new Error('SEED_DEMO_PIN must be 4 to 6 digits.');
}

const EFFECTIVE_AT = new Date('2026-10-01T00:00:00.000Z');

const users = [
  {
    name: 'IRPC Administrator',
    phone: '+639170000001',
    role: Role.ADMIN,
    accountType: null,
  },
  {
    name: 'IRPC Plant Staff',
    phone: '+639170000002',
    role: Role.PLANT_STAFF,
    accountType: null,
  },
  {
    name: 'Juan Dela Cruz',
    phone: '+639170000003',
    role: Role.USER,
    accountType: AccountType.FARMER,
    municipality: 'Pototan',
  },
  {
    name: 'Maria Santos',
    phone: '+639170000004',
    role: Role.USER,
    accountType: AccountType.FARMER,
    municipality: 'Dumangas',
  },
  {
    name: 'Pototan Farmers Cooperative',
    phone: '+639170000005',
    role: Role.USER,
    accountType: AccountType.COOPERATIVE,
    municipality: 'Pototan',
    cooperative: 'Pototan Farmers Cooperative',
  },
  {
    name: 'Iloilo Rice Retailer',
    phone: '+639170000006',
    role: Role.USER,
    accountType: AccountType.BUYER,
    municipality: 'Iloilo City',
  },
  {
    name: 'Western Visayas Food Services',
    phone: '+639170000007',
    role: Role.USER,
    accountType: AccountType.BUYER,
    municipality: 'Iloilo City',
  },
] as const;

const riceTypes = [
  {
    name: 'Well-milled rice',
    description: 'Starting inventory for well-milled rice',
    stockKg: '1200.00',
  },
  {
    name: 'Regular milled rice',
    description: 'Starting inventory for regular milled rice',
    stockKg: '800.00',
  },
  {
    name: 'Well-milled rice (Coop 2)',
    description: 'Starting inventory for cooperative well-milled rice',
    stockKg: '2000.00',
  },
] as const;

const sharedPrices = [
  { item: PriceItem.PALAY_FRESH, pricePerKg: '17.00' },
  { item: PriceItem.PALAY_DRY, pricePerKg: '22.00' },
  { item: PriceItem.DRYING_FEE, pricePerKg: '1.60' },
  { item: PriceItem.MILLING_FEE, pricePerKg: '3.30' },
] as const;

type SeedPrice = {
  item: PriceItem;
  riceTypeId: number | null;
  pricePerKg: string;
  createdById: number;
};

async function createPriceIfMissing(
  tx: Prisma.TransactionClient,
  price: SeedPrice,
) {
  const existing = await tx.price.findFirst({
    where: { item: price.item, riceTypeId: price.riceTypeId },
    select: { id: true },
  });
  if (existing) return false;

  await tx.price.create({
    data: {
      ...price,
      basis: PriceBasis.MARKET,
      effectiveAt: EFFECTIVE_AT,
    },
  });
  return true;
}

async function main() {
  const pinHash = await bcrypt.hash(DEMO_PIN, 10);

  const result = await prisma.$transaction(async (tx) => {
    const savedUsers = new Map<string, number>();

    for (const user of users) {
      const saved = await tx.user.upsert({
        where: { phone: user.phone },
        // Preserve PINs and profile changes made after the initial seed.
        update: {},
        create: {
          ...user,
          pinHash,
          language: Language.HIL,
          consentAt: new Date(),
        },
      });
      savedUsers.set(user.phone, saved.id);
    }

    const adminId = savedUsers.get('+639170000001');
    if (adminId === undefined) throw new Error('Seed administrator was not created.');

    let riceTypesCreated = 0;
    const savedRiceTypes = [];
    for (const riceType of riceTypes) {
      const existed = await tx.riceType.findUnique({
        where: { name: riceType.name },
        select: { id: true },
      });
      const saved = await tx.riceType.upsert({
        where: { name: riceType.name },
        // In particular, do not reset current stock when this seed is rerun.
        update: {},
        create: riceType,
      });
      if (!existed) riceTypesCreated++;
      savedRiceTypes.push(saved);
    }

    let pricesCreated = 0;
    for (const price of sharedPrices) {
      if (await createPriceIfMissing(tx, { ...price, riceTypeId: null, createdById: adminId })) {
        pricesCreated++;
      }
    }
    for (const riceType of savedRiceTypes) {
      if (await createPriceIfMissing(tx, {
        item: PriceItem.RICE,
        riceTypeId: riceType.id,
        pricePerKg: '50.70',
        createdById: adminId,
      })) {
        pricesCreated++;
      }
    }

    let settingsCreated = 0;
    for (const [key, value] of Object.entries({
      millingRecovery: 0.6,
      dryingRecovery: 0.8,
      sackKg: 50,
      dryingCapacityKg: 56000,
    })) {
      const existed = await tx.setting.findUnique({ where: { key }, select: { key: true } });
      await tx.setting.upsert({
        where: { key },
        // Preserve settings an administrator has changed since the first seed.
        update: {},
        create: { key, value },
      });
      if (!existed) settingsCreated++;
    }

    return {
      riceTypesCreated,
      pricesCreated,
      settingsCreated,
    };
  });

  console.log('Database seed complete:', {
    demoAccounts: users.length,
    riceTypesCreated: result.riceTypesCreated,
    pricesCreated: result.pricesCreated,
    settingsCreated: result.settingsCreated,
    demoPin: DEMO_PIN,
  });
}

main()
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
