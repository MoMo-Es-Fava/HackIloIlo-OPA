import path from 'node:path';
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';

config({ path: path.resolve(process.cwd(), '../../.env'), quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Check the repository root .env file.');
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });
const SEEDED_PHONES = [
  '+639170000001', // admin
  '+639170000002', // plant staff
  '+639170000003', // farmer
  '+639170000004', // farmer
  '+639170000005', // cooperative
  '+639170000006', // buyer
  '+639170000007', // buyer
] as const;
const SEEDED_RICE_TYPES = [
  'Well-milled rice',
  'Regular milled rice',
  'Well-milled rice (Coop 2)',
] as const;
const SEEDED_SETTINGS = [
  'millingRecovery',
  'dryingRecovery',
  'sackKg',
  'dryingCapacityKg',
] as const;
const WIPE_ALL = process.argv.includes('--all');

async function clearPhoneVerifications(
  tx: Prisma.TransactionClient,
  phones?: readonly string[],
) {
  const result = phones?.length
    ? await tx.phoneVerification.deleteMany({
        where: { phone: { in: [...phones] } },
      })
    : await tx.phoneVerification.deleteMany();
  return result.count;
}

async function wipeAll() {
  const counts = await prisma.$transaction(async (tx) => {
    const phoneVerifications = await clearPhoneVerifications(tx);
    const smsLogs = await tx.smsLog.deleteMany();
    const events = await tx.orderEvent.deleteMany();
    const stockAdjustments = await tx.stockAdjustment.deleteMany();
    const batchEvents = await tx.batchEvent.deleteMany();
    const batchDamages = await tx.batchDamage.deleteMany();
    const batchSales = await tx.batchSale.deleteMany();
    const batchItems = await tx.batchItem.deleteMany();
    const batchRecords = await tx.batchRecord.deleteMany();
    const prices = await tx.price.deleteMany();
    const orders = await tx.order.deleteMany();
    const riceTypes = await tx.riceType.deleteMany();
    const settings = await tx.setting.deleteMany();
    const users = await tx.user.deleteMany();
    return {
      smsLogs: smsLogs.count,
      events: events.count,
      stockAdjustments: stockAdjustments.count,
      batchEvents: batchEvents.count,
      batchDamages: batchDamages.count,
      batchSales: batchSales.count,
      batchItems: batchItems.count,
      batchRecords: batchRecords.count,
      prices: prices.count,
      orders: orders.count,
      riceTypes: riceTypes.count,
      settings: settings.count,
      users: users.count,
      phoneVerifications,
    };
  });
  console.log('Wiped every application table:', counts);
}

async function removeSeededData() {
  const counts = await prisma.$transaction(async (tx) => {
    const phoneVerifications = await clearPhoneVerifications(tx, SEEDED_PHONES);
    const users = await tx.user.findMany({
      where: { phone: { in: [...SEEDED_PHONES] } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    const riceTypes = await tx.riceType.findMany({
      where: { name: { in: [...SEEDED_RICE_TYPES] } },
      select: { id: true, name: true },
    });
    const riceTypeIds = riceTypes.map((rice) => rice.id);
    const seededOrders = userIds.length
      ? await tx.order.findMany({
          where: { customerId: { in: userIds } },
          select: { id: true },
        })
      : [];
    const orderIds = seededOrders.map((order) => order.id);
    const batchedOrders = orderIds.length
      ? await tx.batchItem.findMany({
          where: { orderId: { in: orderIds } },
          select: { orderId: true },
        })
      : [];
    const retainedOrderIds = new Set(batchedOrders.map((item) => item.orderId));
    const removableOrderIds = orderIds.filter((id) => !retainedOrderIds.has(id));

    const smsLogs = await tx.smsLog.deleteMany({
      where: {
        OR: [
          { orderId: { in: removableOrderIds } },
          { phone: { in: [...SEEDED_PHONES] } },
        ],
      },
    });
    const events = await tx.orderEvent.deleteMany({
      where: {
          OR: [{ orderId: { in: removableOrderIds } }, { actorId: { in: userIds } }],
      },
    });
    const stockAdjustments = await tx.stockAdjustment.deleteMany({
      where: {
        OR: [{ orderId: { in: removableOrderIds } }, { actorId: { in: userIds } }],
      },
    });
    const prices = await tx.price.deleteMany({
      where: {
        OR: [
          { createdById: { in: userIds } },
          { riceTypeId: { in: riceTypeIds } },
        ],
      },
    });
    const batchSales = await tx.batchSale.deleteMany({
      where: {
        OR: [
          { buyerId: { in: userIds } },
          { orderId: { in: removableOrderIds } },
        ],
      },
    });
    const orders = userIds.length
      ? await tx.order.deleteMany({ where: { id: { in: removableOrderIds } } })
      : { count: 0 };
    const usersWithRetainedOrders = await tx.order.findMany({
      where: { customerId: { in: userIds } },
      select: { customerId: true },
      distinct: ['customerId'],
    });
    const retainedUserIds = usersWithRetainedOrders.map((order) => order.customerId);
    const deletedUsers = userIds.length
      ? await tx.user.deleteMany({
          where: { id: { in: userIds, notIn: retainedUserIds } },
        })
      : { count: 0 };

    let deletedRiceTypes = 0;
    const retainedRiceTypes: string[] = [];
    for (const riceType of riceTypes) {
      const orderCount = await tx.order.count({
        where: { riceTypeId: riceType.id },
      });
      if (orderCount > 0) {
        retainedRiceTypes.push(riceType.name);
        continue;
      }
      await tx.stockAdjustment.deleteMany({
        where: { riceTypeId: riceType.id },
      });
      const deleted = await tx.riceType.delete({
        where: { id: riceType.id },
      });
      if (deleted) deletedRiceTypes++;
    }
    const settings = await tx.setting.deleteMany({
      where: { key: { in: [...SEEDED_SETTINGS] } },
    });

    return {
      users: deletedUsers.count,
      orders: orders.count,
      events: events.count,
      smsLogs: smsLogs.count,
      stockAdjustments: stockAdjustments.count,
      prices: prices.count,
      riceTypes: deletedRiceTypes,
      settings: settings.count,
      retainedRiceTypes,
      phoneVerifications,
      retainedOrders: retainedOrderIds.size,
      retainedUsers: retainedUserIds.length,
      batchSales: batchSales.count,
    };
  });
  console.log('Removed seeded demo data:', counts);
}

async function main() {
  if (WIPE_ALL) {
    console.log('Removing all application data...');
    await wipeAll();
    return;
  }
  console.log('Removing records associated with the seven seeded demo accounts...');
  await removeSeededData();
}

main()
  .catch((error) => {
    console.error('Database cleanup failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
