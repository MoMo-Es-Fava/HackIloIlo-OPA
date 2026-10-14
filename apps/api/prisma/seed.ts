import path from 'node:path';
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  Role,
  AccountType,
  OrderType,
  OrderStatus,
  PalayCondition,
  DeliveryMethod,
} from '../src/generated/prisma/client';

config({ path: path.resolve(process.cwd(), '../../.env') });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database test script...\n');

  // 1. ADD: Create a dummy Farmer user
  const farmer = await prisma.user.create({
    data: {
      name: 'Juan Dela Cruz',
      phone: '+639171234567',
      pinHash: '$2b$10$dummyhashedpin123456', // Placeholder hashed PIN
      role: Role.USER,
      accountType: AccountType.FARMER,
      municipality: 'Pototan',
      cooperative: 'Pototan Farmers Agriculture Cooperative',
    },
  });
  console.log('✅ Added User ID:', farmer.id);

  // 2. ADD: Create a "SELL_PALAY" booking for this farmer
  const newOrder = await prisma.order.create({
    data: {
      type: OrderType.SELL_PALAY,
      status: OrderStatus.PENDING,
      customerId: farmer.id,
      contactName: farmer.name,
      contactPhone: farmer.phone,
      requestedKg: 2500.00, // 2,500 kg estimated raw palay
      preferredDate: new Date('2026-10-25'),
      palayCondition: PalayCondition.FRESH,
      variety: 'NSIC Rc 222',
      deliveryMethod: DeliveryMethod.SELF_DELIVER,
      estimatedAmount: 47500.00, // Estimated payment at ₱19/kg
    },
  });
  console.log('✅ Added Order ID:', newOrder.id);

  // 3. GET: Retrieve the order with its relational customer data
  const retrievedOrder = await prisma.order.findUnique({
    where: { id: newOrder.id },
    include: {
      customer: true, // Includes the full linked User profile
    },
  });

  console.log('\n🔍 Fetched Record from Database:');
  console.dir(retrievedOrder, { depth: null });
}

main()
  .catch((error) => {
    console.error('❌ Database operation failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });