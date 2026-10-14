import path from 'node:path';
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

config({ path: path.resolve(process.cwd(), '../../.env'), quiet: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SEED_PHONE = '+639171234567'; // same phone used in seed.ts
const WIPE_ALL = process.argv.includes('--all');

async function deleteSeedData() {
  const user = await prisma.user.findUnique({ where: { phone: SEED_PHONE } });

  if (!user) {
    console.log('ℹ️  Seed user not found, nothing to delete.');
    return;
  }

  const orders = await prisma.order.findMany({
    where: { customerId: user.id },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);

  // Children first, because the relations have no onDelete cascade
  const smsLogs = await prisma.smsLog.deleteMany({
    where: { orderId: { in: orderIds } },
  });
  const events = await prisma.orderEvent.deleteMany({
    where: { OR: [{ orderId: { in: orderIds } }, { actorId: user.id }] },
  });
  const stock = await prisma.stockAdjustment.deleteMany({
    where: { actorId: user.id },
  });
  const prices = await prisma.price.deleteMany({
    where: { createdById: user.id },
  });
  const deletedOrders = await prisma.order.deleteMany({
    where: { customerId: user.id },
  });
  await prisma.user.delete({ where: { id: user.id } });

  console.log(
    `🗑️  Deleted seed user ${user.id}, ${deletedOrders.count} order(s), ` +
      `${events.count} event(s), ${smsLogs.count} SMS log(s), ` +
      `${stock.count} stock adjustment(s), ${prices.count} price(s).`,
  );
}

async function deleteAllData() {
  // FK-safe order: children before parents
  await prisma.smsLog.deleteMany();
  await prisma.orderEvent.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  await prisma.price.deleteMany();
  await prisma.order.deleteMany();
  await prisma.riceType.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.user.deleteMany();
  console.log('🗑️  Wiped ALL tables.');
}

async function main() {
  console.log(WIPE_ALL ? '⚠️  Wiping all data...\n' : '🧹 Removing seed data...\n');
  if (WIPE_ALL) await deleteAllData();
  else await deleteSeedData();
}

main()
  .catch((error) => {
    console.error('❌ Delete failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });