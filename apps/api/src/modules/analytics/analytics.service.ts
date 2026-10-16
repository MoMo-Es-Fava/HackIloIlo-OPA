import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, OrderType, PriceItem } from '@irpc/types';
import { PrismaService } from '../../database/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const money = (value: number) => (Math.round(value * 100) / 100).toFixed(2);
const dateKey = (date: Date) =>
  new Date(date.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10);
const manilaToday = () => dateKey(new Date());

function dateStart(date: string) {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) - MANILA_OFFSET_MS);
}

function period(daysText?: string) {
  const days = daysText === undefined ? 14 : Number(daysText);
  if (!Number.isSafeInteger(days) || days < 1 || days > 366) {
    throw new BadRequestException('days must be a whole number from 1 to 366.');
  }
  const to = manilaToday();
  const end = dateStart(to).getTime();
  const from = dateKey(new Date(end - (days - 1) * DAY_MS));
  return {
    from,
    to,
    start: dateStart(from),
    end: new Date(end + DAY_MS),
    dates: Array.from({ length: days }, (_, i) =>
      new Date(Date.parse(`${from}T00:00:00.000Z`) + i * DAY_MS)
        .toISOString()
        .slice(0, 10),
    ),
  };
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async operations(daysText?: string) {
    const range = period(daysText);
    const [orders, events] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: range.start, lt: range.end } },
        select: { type: true, createdAt: true },
      }),
      this.prisma.orderEvent.findMany({
        where: {
          createdAt: { gte: range.start, lt: range.end },
          OR: [
            { fromStatus: OrderStatus.PENDING, toStatus: { in: [OrderStatus.ACCEPTED, OrderStatus.REJECTED] } },
            { toStatus: { in: [OrderStatus.WEIGHED, OrderStatus.DRYING, OrderStatus.READY_FOR_PICKUP] } },
          ],
        },
        select: { fromStatus: true, toStatus: true, createdAt: true },
      }),
    ]);
    const daily = new Map(range.dates.map((date) => [date, {
      date, palayOffers: 0, riceOrders: 0, serviceRequests: 0, answered: 0,
      weightsToConfirm: 0, inDrying: 0, readyForPickup: 0,
    }]));
    for (const order of orders) {
      const row = daily.get(dateKey(order.createdAt));
      if (!row) continue;
      if (order.type === OrderType.SELL_PALAY) row.palayOffers++;
      else if (order.type === OrderType.BUY_RICE) row.riceOrders++;
      else row.serviceRequests++;
    }
    for (const event of events) {
      const row = daily.get(dateKey(event.createdAt));
      if (!row) continue;
      if (event.fromStatus === OrderStatus.PENDING && (event.toStatus === OrderStatus.ACCEPTED || event.toStatus === OrderStatus.REJECTED)) row.answered++;
      if (event.toStatus === OrderStatus.WEIGHED) row.weightsToConfirm++;
      if (event.toStatus === OrderStatus.DRYING) row.inDrying++;
      if (event.toStatus === OrderStatus.READY_FOR_PICKUP) row.readyForPickup++;
    }
    return { from: range.from, to: range.to, daily: [...daily.values()] };
  }

  async finance(daysText?: string) {
    const range = period(daysText);
    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.COMPLETED] },
        paidAt: { gte: range.start, lt: range.end },
      },
      select: { type: true, finalAmount: true, paidAt: true },
    });
    const daily = new Map(range.dates.map((date) => [date, {
      date, boughtPalay: 0, soldRice: 0, serviceFees: 0,
    }]));
    for (const order of orders) {
      if (!order.paidAt) continue;
      const row = daily.get(dateKey(order.paidAt));
      if (!row) continue;
      const amount = Number(order.finalAmount ?? 0);
      if (order.type === OrderType.SELL_PALAY) row.boughtPalay += amount;
      else if (order.type === OrderType.BUY_RICE) row.soldRice += amount;
      else row.serviceFees += amount;
    }
    return {
      from: range.from,
      to: range.to,
      daily: [...daily.values()].map((row) => ({
        date: row.date,
        boughtPalay: money(row.boughtPalay),
        soldRice: money(row.soldRice),
        serviceFees: money(row.serviceFees),
        grossProfit: money(row.soldRice + row.serviceFees - row.boughtPalay),
      })),
    };
  }

  async catalog(daysText?: string) {
    const range = period(daysText);
    const [riceTypes, prices, adjustments] = await Promise.all([
      this.prisma.riceType.findMany({ where: { isActive: true }, orderBy: { id: 'asc' }, select: { id: true, name: true, stockKg: true } }),
      this.prisma.price.findMany({
        where: { effectiveAt: { lt: range.end } },
        orderBy: [{ effectiveAt: 'asc' }, { id: 'asc' }],
        select: { item: true, riceTypeId: true, pricePerKg: true, effectiveAt: true },
      }),
      this.prisma.stockAdjustment.findMany({
        where: { createdAt: { lt: range.end } },
        orderBy: { createdAt: 'asc' },
        select: { riceTypeId: true, changeKg: true, createdAt: true },
      }),
    ]);
    const priceKeys = new Map<string, { item: PriceItem; riceTypeId: number | null; label: string }>();
    for (const price of prices) {
      const rice = riceTypes.find((item) => item.id === price.riceTypeId);
      const label = price.item === PriceItem.RICE ? rice?.name ?? 'Rice' : ({
        [PriceItem.PALAY_FRESH]: 'Fresh palay', [PriceItem.PALAY_DRY]: 'Dry palay',
        [PriceItem.DRYING_FEE]: 'Drying', [PriceItem.MILLING_FEE]: 'Milling',
        [PriceItem.RICE]: rice?.name ?? 'Rice',
      }[price.item]);
      priceKeys.set(`${price.item}:${price.riceTypeId ?? ''}`, { item: price.item, riceTypeId: price.riceTypeId, label });
    }
    const priceSeries = [...priceKeys.entries()].map(([key, meta]) => {
      const rows = prices.filter((row) => row.item === meta.item && row.riceTypeId === meta.riceTypeId);
      let index = 0;
      let current: string | null = null;
      const values = range.dates.map((date) => {
        const boundary = dateStart(date).getTime() + DAY_MS;
        while (index < rows.length && rows[index].effectiveAt.getTime() < boundary) {
          current = rows[index++].pricePerKg.toString();
        }
        return current;
      });
      return { key, label: meta.label, item: meta.item, values };
    });
    const stockSeries = riceTypes.map((rice) => {
      const changes = adjustments.filter((row) => row.riceTypeId === rice.id);
      const totalChange = changes.reduce((sum, row) => sum + Number(row.changeKg), 0);
      let stock = Number(rice.stockKg) - totalChange;
      let index = 0;
      const values = range.dates.map((date) => {
        const boundary = dateStart(date).getTime() + DAY_MS;
        while (index < changes.length && changes[index].createdAt.getTime() < boundary) {
          stock += Number(changes[index++].changeKg);
        }
        return money(stock);
      });
      return { key: `rice-${rice.id}`, label: rice.name, values };
    });
    return { dates: range.dates, prices: priceSeries, stock: stockSeries };
  }

  async logs(daysText?: string) {
    const range = period(daysText);
    const where = { createdAt: { gte: range.start, lt: range.end } };
    const [orders, batches, damages, inventory, sms, prices] = await Promise.all([
      this.prisma.orderEvent.findMany({ where, select: { createdAt: true } }),
      this.prisma.batchEvent.findMany({ where, select: { createdAt: true } }),
      this.prisma.batchDamage.findMany({ where: { occurredAt: { gte: range.start, lt: range.end } }, select: { occurredAt: true } }),
      this.prisma.stockAdjustment.findMany({ where, select: { createdAt: true } }),
      this.prisma.smsLog.findMany({ where, select: { createdAt: true } }),
      this.prisma.price.findMany({ where: { effectiveAt: { gte: range.start, lt: range.end } }, select: { effectiveAt: true } }),
    ]);
    const daily = new Map(range.dates.map((date) => [date, { date, order: 0, batch: 0, inventory: 0, sms: 0, pricing: 0 }]));
    const add = (rows: { date: Date }[], key: 'order' | 'batch' | 'inventory' | 'sms' | 'pricing') => {
      for (const row of rows) {
        const day = daily.get(dateKey(row.date));
        if (day) day[key]++;
      }
    };
    add(orders.map((row) => ({ date: row.createdAt })), 'order');
    add(batches.map((row) => ({ date: row.createdAt })), 'batch');
    add(damages.map((row) => ({ date: row.occurredAt })), 'batch');
    add(inventory.map((row) => ({ date: row.createdAt })), 'inventory');
    add(sms.map((row) => ({ date: row.createdAt })), 'sms');
    add(prices.map((row) => ({ date: row.effectiveAt })), 'pricing');
    return { from: range.from, to: range.to, daily: [...daily.values()] };
  }
}
