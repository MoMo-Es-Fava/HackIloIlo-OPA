import path from 'node:path';
import { config } from 'dotenv';
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

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

// Development-only credential placeholder. Replace with a real password/PIN hash
// if authentication is added to the seed workflow.
const SEEDED_PIN_HASH = 'seeded-demo-pin';
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

async function createPriceIfMissing(
  tx: Prisma.TransactionClient,
  where: {
    item: PriceItem;
    riceTypeId: number | null;
  },
  data: {
    item: PriceItem;
    riceTypeId: number | null;
    pricePerKg: string;
    basis: PriceBasis;
    effectiveAt: Date;
    createdById: number;
  },
) {
  const existing = await tx.price.findFirst({ where });
  if (!existing) await tx.price.create({ data });
}

async function main() {
  await prisma.$transaction(async (tx) => {
    const seededUsers = new Map<string, number>();

    for (const user of users) {
      const saved = await tx.user.upsert({
        where: { phone: user.phone },
        update: {
          name: user.name,
          role: user.role,
          accountType: user.accountType,
          language: Language.HIL,
          municipality: 'municipality' in user ? user.municipality : null,
          cooperative: 'cooperative' in user ? user.cooperative : null,
          isActive: true,
        },
        create: {
          ...user,
          pinHash: SEEDED_PIN_HASH,
          language: Language.HIL,
        },
      });
      seededUsers.set(user.phone, saved.id);
    }

    const adminId = seededUsers.get('+639170000001')!;

    const savedRiceTypes = [];
    for (const riceType of riceTypes) {
      savedRiceTypes.push(
        await tx.riceType.upsert({
          where: { name: riceType.name },
          update: { ...riceType, isActive: true },
          create: riceType,
        }),
      );
    }

    for (const price of sharedPrices) {
      await createPriceIfMissing(
        tx,
        {
          item: price.item,
          riceTypeId: null,
        },
        {
          ...price,
          riceTypeId: null,
          basis: PriceBasis.MARKET,
          effectiveAt: EFFECTIVE_AT,
          createdById: adminId,
        },
      );
    }

    for (const riceType of savedRiceTypes) {
      await createPriceIfMissing(
        tx,
        {
          item: PriceItem.RICE,
          riceTypeId: riceType.id,
        },
        {
          item: PriceItem.RICE,
          riceTypeId: riceType.id,
          pricePerKg: '50.70',
          basis: PriceBasis.MARKET,
          effectiveAt: EFFECTIVE_AT,
          createdById: adminId,
        },
      );
    }

    for (const [key, value] of Object.entries({
      millingRecovery: 0.6,
      dryingRecovery: 0.8,
      sackKg: 50,
      dryingCapacityKg: 56000,
    })) {
      await tx.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    console.log(
      `Seeded ${users.length} users, ${savedRiceTypes.length} rice types, prices, and settings.`,
    );
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
