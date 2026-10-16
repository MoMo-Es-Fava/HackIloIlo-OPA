import path from 'node:path';
import { config } from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AccountType,
  DeliveryMethod,
  Language,
  OrderStatus,
  OrderType,
  PalayCondition,
  PriceBasis,
  PriceItem,
  Prisma,
  PrismaClient,
  Role,
  ServiceType,
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
  { name: 'Olivia Reyes', phone: '+639170000008', role: Role.USER, accountType: AccountType.FARMER, municipality: 'Cabatuan' },
  { name: 'Roberto Fernandez', phone: '+639170000009', role: Role.USER, accountType: AccountType.FARMER, municipality: 'Barotac Nuevo' },
  { name: 'Ana Mae Villanueva', phone: '+639170000010', role: Role.USER, accountType: AccountType.FARMER, municipality: 'Zarraga' },
  { name: 'Pedro Lopez', phone: '+639170000011', role: Role.USER, accountType: AccountType.FARMER, municipality: 'New Lucena' },
  { name: 'Lorna Bautista', phone: '+639170000012', role: Role.USER, accountType: AccountType.FARMER, municipality: 'Lambunao' },
  { name: 'Carlo Mendoza', phone: '+639170000013', role: Role.USER, accountType: AccountType.FARMER, municipality: 'Passi City' },
  { name: 'Felisa Ramos', phone: '+639170000014', role: Role.USER, accountType: AccountType.FARMER, municipality: 'Mina' },
  { name: 'Nilo Garcia', phone: '+639170000015', role: Role.USER, accountType: AccountType.FARMER, municipality: 'Dingle' },
  { name: 'Iloilo Central Rice Supply', phone: '+639170000016', role: Role.USER, accountType: AccountType.BUYER, municipality: 'Iloilo City' },
  { name: 'Dumangas Market Grocer', phone: '+639170000017', role: Role.USER, accountType: AccountType.BUYER, municipality: 'Dumangas' },
  { name: 'Pototan Family Mart', phone: '+639170000018', role: Role.USER, accountType: AccountType.BUYER, municipality: 'Pototan' },
  { name: 'Passi Community Store', phone: '+639170000019', role: Role.USER, accountType: AccountType.BUYER, municipality: 'Passi City' },
  { name: 'Mina Grocery and Grains', phone: '+639170000020', role: Role.USER, accountType: AccountType.BUYER, municipality: 'Mina' },
  { name: 'Zarraga Public Market Stall', phone: '+639170000021', role: Role.USER, accountType: AccountType.BUYER, municipality: 'Zarraga' },
  { name: 'Barotac Nuevo Rice Depot', phone: '+639170000022', role: Role.USER, accountType: AccountType.BUYER, municipality: 'Barotac Nuevo' },
  { name: 'Iloilo City Neighborhood Store', phone: '+639170000023', role: Role.USER, accountType: AccountType.BUYER, municipality: 'Iloilo City' },
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

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const ORDER_SEED_PREFIX = '[seed:sample-order:';

type SeedOrder = {
  key: string;
  type: OrderType;
  status: OrderStatus;
  customerPhone: string;
  daysAgo: number;
  requestedKg: string;
  riceTypeName?: string;
  serviceType?: ServiceType;
  palayCondition?: PalayCondition;
};

const orderPaths: Record<OrderType, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  [OrderType.BUY_RICE]: {
    [OrderStatus.PENDING]: [OrderStatus.PENDING],
    [OrderStatus.ACCEPTED]: [OrderStatus.PENDING, OrderStatus.ACCEPTED],
    [OrderStatus.REJECTED]: [OrderStatus.PENDING, OrderStatus.REJECTED],
    [OrderStatus.CANCELLED]: [OrderStatus.PENDING, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING],
    [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP],
    [OrderStatus.PAID]: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP, OrderStatus.PAID],
    [OrderStatus.COMPLETED]: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP, OrderStatus.PAID, OrderStatus.COMPLETED],
  },
  [OrderType.SELL_PALAY]: {
    [OrderStatus.PENDING]: [OrderStatus.PENDING],
    [OrderStatus.ACCEPTED]: [OrderStatus.PENDING, OrderStatus.ACCEPTED],
    [OrderStatus.REJECTED]: [OrderStatus.PENDING, OrderStatus.REJECTED],
    [OrderStatus.CANCELLED]: [OrderStatus.PENDING, OrderStatus.CANCELLED],
    [OrderStatus.RECEIVED]: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.RECEIVED],
    [OrderStatus.WEIGHED]: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.RECEIVED, OrderStatus.WEIGHED],
    [OrderStatus.PAID]: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.RECEIVED, OrderStatus.WEIGHED, OrderStatus.PAID],
    [OrderStatus.COMPLETED]: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.RECEIVED, OrderStatus.WEIGHED, OrderStatus.PAID, OrderStatus.COMPLETED],
  },
  [OrderType.SERVICE]: {
    [OrderStatus.PENDING]: [OrderStatus.PENDING],
    [OrderStatus.SCHEDULED]: [OrderStatus.PENDING, OrderStatus.SCHEDULED],
    [OrderStatus.REJECTED]: [OrderStatus.PENDING, OrderStatus.REJECTED],
    [OrderStatus.CANCELLED]: [OrderStatus.PENDING, OrderStatus.CANCELLED],
    [OrderStatus.RECEIVED]: [OrderStatus.PENDING, OrderStatus.SCHEDULED, OrderStatus.RECEIVED],
    [OrderStatus.WEIGHED]: [OrderStatus.PENDING, OrderStatus.SCHEDULED, OrderStatus.RECEIVED, OrderStatus.WEIGHED],
    [OrderStatus.DRYING]: [OrderStatus.PENDING, OrderStatus.SCHEDULED, OrderStatus.RECEIVED, OrderStatus.WEIGHED, OrderStatus.DRYING],
    [OrderStatus.MILLING]: [OrderStatus.PENDING, OrderStatus.SCHEDULED, OrderStatus.RECEIVED, OrderStatus.WEIGHED, OrderStatus.MILLING],
    [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.PENDING, OrderStatus.SCHEDULED, OrderStatus.RECEIVED, OrderStatus.WEIGHED, OrderStatus.READY_FOR_PICKUP],
    [OrderStatus.PAID]: [OrderStatus.PENDING, OrderStatus.SCHEDULED, OrderStatus.RECEIVED, OrderStatus.WEIGHED, OrderStatus.READY_FOR_PICKUP, OrderStatus.PAID],
    [OrderStatus.COMPLETED]: [OrderStatus.PENDING, OrderStatus.SCHEDULED, OrderStatus.RECEIVED, OrderStatus.WEIGHED, OrderStatus.READY_FOR_PICKUP, OrderStatus.PAID, OrderStatus.COMPLETED],
  },
};

function makeOrderFixtures(): SeedOrder[] {
  const farmers = users.filter((user) => user.accountType === AccountType.FARMER || user.accountType === AccountType.COOPERATIVE);
  const buyers = users.filter((user) => user.accountType === AccountType.BUYER);
  const result: SeedOrder[] = [];
  const riceNames = riceTypes.map((rice) => rice.name);
  const quantities = ['25.00', '50.00', '75.00'];
  const palayStatuses = [
    OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.REJECTED, OrderStatus.CANCELLED,
    OrderStatus.RECEIVED, OrderStatus.WEIGHED, OrderStatus.PAID, OrderStatus.COMPLETED,
  ];
  const buyerStatuses = [
    OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.REJECTED, OrderStatus.CANCELLED,
    OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP, OrderStatus.PAID, OrderStatus.COMPLETED,
  ];

  for (let i = 0; i < 32; i++) {
    const status = palayStatuses[i % palayStatuses.length];
    result.push({
      key: `palay-${String(i + 1).padStart(2, '0')}`,
      type: OrderType.SELL_PALAY,
      status,
      customerPhone: farmers[(i * 3) % farmers.length].phone,
      daysAgo: status === OrderStatus.PENDING ? i % 4 : (i * 11) % 46,
      requestedKg: (450 + (i % 8) * 175).toFixed(2),
      palayCondition: i % 2 ? PalayCondition.DRY : PalayCondition.FRESH,
    });
  }

  const servicePlans = [
    { serviceType: ServiceType.DRYING, palayCondition: PalayCondition.FRESH, statuses: [
      OrderStatus.PENDING, OrderStatus.SCHEDULED, OrderStatus.REJECTED, OrderStatus.CANCELLED,
      OrderStatus.RECEIVED, OrderStatus.WEIGHED, OrderStatus.DRYING, OrderStatus.READY_FOR_PICKUP,
      OrderStatus.PAID, OrderStatus.COMPLETED,
    ] },
    { serviceType: ServiceType.MILLING, palayCondition: PalayCondition.DRY, statuses: [
      OrderStatus.PENDING, OrderStatus.SCHEDULED, OrderStatus.RECEIVED, OrderStatus.WEIGHED,
      OrderStatus.MILLING, OrderStatus.READY_FOR_PICKUP, OrderStatus.PAID, OrderStatus.COMPLETED,
    ] },
    { serviceType: ServiceType.DRYING_AND_MILLING, palayCondition: PalayCondition.FRESH, statuses: [
      OrderStatus.PENDING, OrderStatus.SCHEDULED, OrderStatus.RECEIVED, OrderStatus.WEIGHED,
      OrderStatus.DRYING, OrderStatus.MILLING, OrderStatus.READY_FOR_PICKUP, OrderStatus.PAID,
      OrderStatus.COMPLETED,
    ] },
  ];
  for (let i = 0; i < 30; i++) {
    const plan = servicePlans[i % servicePlans.length];
    const status = plan.statuses[Math.floor(i / servicePlans.length) % plan.statuses.length];
    result.push({
      key: `service-${String(i + 1).padStart(2, '0')}`,
      type: OrderType.SERVICE,
      status,
      customerPhone: farmers[(i * 5 + 1) % farmers.length].phone,
      daysAgo: status === OrderStatus.PENDING ? i % 4 : (i * 13 + 3) % 46,
      requestedKg: (700 + (i % 7) * 250).toFixed(2),
      serviceType: plan.serviceType,
      palayCondition: plan.palayCondition,
    });
  }

  for (let i = 0; i < 30; i++) {
    const status = buyerStatuses[i % buyerStatuses.length];
    result.push({
      key: `rice-${String(i + 1).padStart(2, '0')}`,
      type: OrderType.BUY_RICE,
      status,
      customerPhone: buyers[(i * 3) % buyers.length].phone,
      daysAgo: status === OrderStatus.PENDING ? i % 4 : (i * 17 + 1) % 46,
      requestedKg: quantities[i % quantities.length],
      riceTypeName: riceNames[i % riceNames.length],
    });
  }
  return result;
}

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

function amount(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

function workflow(fixture: SeedOrder) {
  if (fixture.type === OrderType.SERVICE && fixture.serviceType) {
    const process = [
      ...(serviceNeedsDrying(fixture.serviceType) ? [OrderStatus.DRYING] : []),
      ...(serviceNeedsMilling(fixture.serviceType) ? [OrderStatus.MILLING] : []),
    ];
    const path: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.SCHEDULED,
      OrderStatus.RECEIVED,
      OrderStatus.WEIGHED,
      ...process,
      OrderStatus.READY_FOR_PICKUP,
      OrderStatus.PAID,
      OrderStatus.COMPLETED,
    ];
    if (fixture.status === OrderStatus.REJECTED || fixture.status === OrderStatus.CANCELLED) {
      return [OrderStatus.PENDING, fixture.status];
    }
    const end = path.indexOf(fixture.status);
    if (end >= 0) return path.slice(0, end + 1);
  }
  const path = orderPaths[fixture.type][fixture.status];
  if (!path) throw new Error(`No valid ${fixture.type} workflow ends in ${fixture.status}.`);
  return path;
}

function serviceNeedsDrying(type: ServiceType) {
  return type === ServiceType.DRYING || type === ServiceType.DRYING_AND_MILLING;
}

function serviceNeedsMilling(type: ServiceType) {
  return type === ServiceType.MILLING || type === ServiceType.DRYING_AND_MILLING;
}

async function createSeedOrder(
  tx: Prisma.TransactionClient,
  fixture: SeedOrder,
  fixtureIndex: number,
  now: Date,
  savedUsers: Map<string, number>,
  riceIds: Map<string, number>,
  staffId: number,
) {
  const marker = `${ORDER_SEED_PREFIX}${fixture.key}]`;
  const path = workflow(fixture);
  const customerId = savedUsers.get(fixture.customerPhone);
  const customer = users.find((user) => user.phone === fixture.customerPhone);
  if (customerId === undefined || !customer) throw new Error(`No seeded customer for ${fixture.key}.`);
  const isBuyer = customer.accountType === AccountType.BUYER;
  if ((fixture.type === OrderType.BUY_RICE) !== isBuyer) {
    throw new Error(`Seed account ${customer.phone} cannot submit ${fixture.type}.`);
  }
  const riceTypeId = fixture.riceTypeName ? riceIds.get(fixture.riceTypeName) : undefined;
  if (fixture.type === OrderType.BUY_RICE && riceTypeId === undefined) {
    throw new Error(`Seed rice type not found for ${fixture.key}.`);
  }

  const elapsedSteps = path.length - 1;
  const daysAgo = Math.max(fixture.daysAgo, Math.ceil(elapsedSteps / 2));
  const createdAt = new Date(now.getTime() - daysAgo * DAY_MS - (fixtureIndex % 12) * HOUR_MS);
  const eventDates = path.map((_, index) => new Date(createdAt.getTime() + index * 12 * HOUR_MS));
  const requestedKg = new Prisma.Decimal(fixture.requestedKg);
  const accepted = path.includes(OrderStatus.ACCEPTED) || path.includes(OrderStatus.SCHEDULED);
  const statusReached = (status: OrderStatus) => path.includes(status);
  const palayPrice = fixture.palayCondition === PalayCondition.DRY ? 22 : 17;
  const serviceType = fixture.serviceType;
  const needsDrying = serviceType ? serviceNeedsDrying(serviceType) : false;
  const needsMilling = serviceType ? serviceNeedsMilling(serviceType) : false;
  const hasReceived = statusReached(OrderStatus.RECEIVED);
  const wetKg = fixture.type === OrderType.SELL_PALAY
    ? fixture.palayCondition === PalayCondition.FRESH && hasReceived ? requestedKg : null
    : fixture.type === OrderType.SERVICE && needsDrying && hasReceived ? requestedKg : null;
  const dryKg = fixture.type === OrderType.SELL_PALAY
    ? fixture.palayCondition === PalayCondition.DRY && hasReceived ? requestedKg : null
    : fixture.type === OrderType.SERVICE && hasReceived && (
      !needsDrying || statusReached(OrderStatus.MILLING) || statusReached(OrderStatus.READY_FOR_PICKUP) ||
      fixture.status === OrderStatus.DRYING && fixtureIndex % 2 === 0
    ) ? amount(Number(requestedKg) * (needsDrying ? 0.8 : 1)) : null;
  const riceKg = fixture.type === OrderType.SERVICE && needsMilling && statusReached(OrderStatus.READY_FOR_PICKUP)
    ? amount(Number(requestedKg) * 0.48)
    : null;

  let unitPrice: Prisma.Decimal | null = null;
  let dryingRate: Prisma.Decimal | null = null;
  let millingRate: Prisma.Decimal | null = null;
  if (accepted && fixture.type === OrderType.BUY_RICE) unitPrice = new Prisma.Decimal('50.70');
  if (accepted && fixture.type === OrderType.SELL_PALAY) unitPrice = new Prisma.Decimal(palayPrice);
  if (accepted && fixture.type === OrderType.SERVICE) {
    if (needsDrying) dryingRate = new Prisma.Decimal('1.60');
    if (needsMilling) millingRate = new Prisma.Decimal('3.30');
  }

  const estimateRate = fixture.type === OrderType.SELL_PALAY
    ? palayPrice
    : fixture.type === OrderType.BUY_RICE
      ? 50.70
      : (needsDrying ? 1.60 : 0) + (needsMilling ? 0.48 * 3.30 : 0);
  let finalAmount: Prisma.Decimal | null = null;
  if (fixture.type === OrderType.BUY_RICE && accepted) {
    finalAmount = amount(Number(requestedKg) * 50.70);
  } else if (fixture.type === OrderType.SELL_PALAY && statusReached(OrderStatus.WEIGHED)) {
    finalAmount = amount(Number(fixture.palayCondition === PalayCondition.DRY ? dryKg : wetKg) * palayPrice);
  } else if (fixture.type === OrderType.SERVICE && accepted) {
    const total = (needsDrying && wetKg ? Number(wetKg) * 1.60 : 0) +
      (needsMilling && riceKg ? Number(riceKg) * 3.30 : 0);
    if ((!needsDrying || wetKg) && (!needsMilling || riceKg)) finalAmount = amount(total);
  }

  const paidIndex = path.findIndex((status) => status === OrderStatus.PAID);
  const paidAt = paidIndex >= 0 ? eventDates[paidIndex] : null;
  const preferredDate = fixture.status === OrderStatus.PENDING
    ? new Date(now.getTime() + 2 * DAY_MS)
    : new Date(createdAt.getTime() + 2 * DAY_MS);
  const weighedIndex = path.findIndex((status) => status === OrderStatus.WEIGHED);
  let weightConfirmedAt = weighedIndex >= 0 && path.at(-1) !== OrderStatus.WEIGHED
    ? eventDates[weighedIndex]
    : null;
  if (fixture.type === OrderType.SERVICE && fixture.status === OrderStatus.DRYING && dryKg) {
    // Some service orders are waiting for the customer to confirm the dried weight.
    if (fixtureIndex % 2 === 0) weightConfirmedAt = null;
  }
  const estimatedAmount = amount(Number(requestedKg) * estimateRate);

  const order = await tx.order.create({
    data: {
      type: fixture.type,
      status: fixture.status,
      customerId,
      contactName: customer.name,
      contactPhone: customer.phone,
      requestedKg,
      preferredDate,
      scheduledDate: accepted ? new Date(createdAt.getTime() + 2 * DAY_MS) : null,
      riceTypeId: fixture.type === OrderType.BUY_RICE ? riceTypeId! : null,
      palayCondition: fixture.palayCondition ?? null,
      variety: fixture.type === OrderType.SELL_PALAY ? ['NSIC Rc 216', 'Dinorado', 'NSIC Rc 222'][fixtureIndex % 3] : null,
      deliveryMethod: fixture.type === OrderType.SELL_PALAY
        ? fixtureIndex % 2 ? DeliveryMethod.SELF_DELIVER : DeliveryMethod.IRPC_PICKUP
        : null,
      serviceType: serviceType ?? null,
      unitPrice,
      dryingRate,
      millingRate,
      wetKg,
      dryKg,
      riceKg,
      weightConfirmedAt,
      estimatedAmount,
      finalAmount,
      rejectReason: fixture.status === OrderStatus.REJECTED ? 'Seeded example: volume or schedule unavailable.' : null,
      paidAt,
      createdAt,
    },
  });

  await tx.orderEvent.createMany({
    data: path.map((status, index) => ({
      orderId: order.id,
      fromStatus: index === 0 ? null : path[index - 1],
      toStatus: status,
      actorId: index === 0 ? customerId : staffId,
      note: index === 0 ? marker : status === OrderStatus.REJECTED ? 'Seeded example: volume or schedule unavailable.' : 'Seeded workflow history.',
      kg: status === OrderStatus.WEIGHED
        ? fixture.type === OrderType.SELL_PALAY
          ? fixture.palayCondition === PalayCondition.DRY ? dryKg : wetKg
          : needsDrying ? wetKg : dryKg
        : null,
      createdAt: eventDates[index],
    })),
  });

  let stockAdjusted = false;
  if (fixture.type === OrderType.BUY_RICE && accepted) {
    const decreased = await tx.riceType.updateMany({
      where: { id: riceTypeId!, stockKg: { gte: requestedKg } },
      data: { stockKg: { decrement: requestedKg } },
    });
    if (decreased.count) {
      await tx.stockAdjustment.create({
        data: {
          riceTypeId: riceTypeId!,
          changeKg: requestedKg.neg(),
          reason: 'Seeded demo sale stock reservation',
          orderId: order.id,
          actorId: staffId,
          createdAt,
        },
      });
      stockAdjusted = true;
    }
  }
  return { stockAdjusted };
}

async function main() {
  const pinHash = await bcrypt.hash(DEMO_PIN, 10);

  const result = await prisma.$transaction(async (tx) => {
    const savedUsers = new Map<string, number>();

    for (const user of users) {
      const saved = await tx.user.upsert({
        where: { phone: user.phone },
        // Preserve PINs and profile changes, but keep seeded role/account type aligned
        // with the demo fixtures (e.g. the primary demo account must remain ADMIN).
        update: { role: user.role, accountType: user.accountType },
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

    const staffId = savedUsers.get('+639170000002');
    if (staffId === undefined) throw new Error('Seed plant staff account was not created.');
    const riceIds = new Map(savedRiceTypes.map((riceType) => [riceType.name, riceType.id]));
    const priorSeedEvents = await tx.orderEvent.findMany({
      where: { note: { startsWith: ORDER_SEED_PREFIX } },
      select: { note: true },
    });
    const priorMarkers = new Set(priorSeedEvents.map((event) => event.note));
    const fixtures = makeOrderFixtures();
    const now = new Date();
    let ordersCreated = 0;
    let stockAdjustmentsCreated = 0;
    for (const [index, fixture] of fixtures.entries()) {
      const marker = `${ORDER_SEED_PREFIX}${fixture.key}]`;
      if (priorMarkers.has(marker)) continue;
      const created = await createSeedOrder(tx, fixture, index, now, savedUsers, riceIds, staffId);
      ordersCreated++;
      if (created.stockAdjusted) stockAdjustmentsCreated++;
    }

    return {
      riceTypesCreated,
      pricesCreated,
      settingsCreated,
      ordersCreated,
      stockAdjustmentsCreated,
    };
  }, { timeout: 60_000 });

  console.log('Database seed complete:', {
    demoAccounts: users.length,
    farmerAndCooperativeAccounts: users.filter((user) => user.accountType === AccountType.FARMER || user.accountType === AccountType.COOPERATIVE).length,
    riceBuyerAccounts: users.filter((user) => user.accountType === AccountType.BUYER).length,
    riceTypesCreated: result.riceTypesCreated,
    pricesCreated: result.pricesCreated,
    settingsCreated: result.settingsCreated,
    ordersCreated: result.ordersCreated,
    stockAdjustmentsCreated: result.stockAdjustmentsCreated,
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
