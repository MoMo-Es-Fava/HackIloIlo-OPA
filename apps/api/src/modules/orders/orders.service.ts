import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ACCEPT_STATUS,
  ACTIVE_STATUSES,
  canTransition,
  estimateOrderAmount,
  OrderStatus,
  OrderType,
  PalayCondition,
  PriceItem,
  ServiceType,
  orderRef,
  type AdminOrderDto,
  type AdminSummaryDto,
  type CreateOrderRequest,
  type MoneySummaryDto,
  type OrderDto,
  type SmsLogDto,
  type UserDto,
} from '@irpc/types';
import { Prisma, SmsDirection } from '../../generated/prisma/client';
import { CatalogService } from '../catalog/catalog.service';
import { SmsService } from '../../integrations/textbee/sms.service';
import { PrismaService } from '../../database/prisma.service';
import type {
  AcceptOrderDto,
  CreateOrderDto,
  WeighInOrderDto,
} from './orders.dto';

type OrderWithEvents = Prisma.OrderGetPayload<{ include: { events: true } }>;
type OrderWithCustomer = Prisma.OrderGetPayload<{
  include: { events: true; customer: true };
}>;

const money = (value: number) => (Math.round(value * 100) / 100).toFixed(2);
const decimal = (value: Prisma.Decimal | null) => value?.toString() ?? null;

function orderDto(order: OrderWithEvents): OrderDto {
  return {
    id: order.id,
    ref: orderRef(order.id),
    type: order.type,
    status: order.status,
    contactName: order.contactName,
    contactPhone: order.contactPhone,
    requestedKg: order.requestedKg.toString(),
    preferredDate: order.preferredDate.toISOString(),
    scheduledDate: order.scheduledDate?.toISOString() ?? null,
    riceTypeId: order.riceTypeId,
    palayCondition: order.palayCondition,
    variety: order.variety,
    deliveryMethod: order.deliveryMethod,
    serviceType: order.serviceType,
    unitPrice: decimal(order.unitPrice),
    dryingRate: decimal(order.dryingRate),
    millingRate: decimal(order.millingRate),
    wetKg: decimal(order.wetKg),
    dryKg: decimal(order.dryKg),
    riceKg: decimal(order.riceKg),
    weightConfirmedAt: order.weightConfirmedAt?.toISOString() ?? null,
    estimatedAmount: order.estimatedAmount.toString(),
    finalAmount: decimal(order.finalAmount),
    rejectReason: order.rejectReason,
    createdAt: order.createdAt.toISOString(),
    events: order.events.map((event) => ({
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      kg: decimal(event.kg),
      note: event.note,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

const toUserDto = (user: OrderWithCustomer['customer']): UserDto => ({
  id: user.id,
  name: user.name,
  phone: user.phone,
  role: user.role,
  accountType: user.accountType,
  language: user.language,
  municipality: user.municipality,
  cooperative: user.cooperative,
});

function manilaDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function manilaDayBounds(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BadRequestException('Dates must use YYYY-MM-DD format.');
  }
  // Manila is UTC+8, with no daylight-saving time.
  const start = new Date(Date.UTC(year, month - 1, day) - 8 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly sms: SmsService,
  ) {}

  private async getOrder(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  async create(input: CreateOrderDto, user: UserDto): Promise<OrderDto> {
    const kg = Number(input.requestedKg);
    if (!Number.isFinite(kg) || kg <= 0) {
      throw new BadRequestException('Enter a quantity above zero.');
    }
    if (!input.contactName.trim() || !/^\+639\d{9}$/.test(input.contactPhone)) {
      throw new BadRequestException('Enter a name and a Philippine mobile number (+639…).');
    }
    const preferredDate = new Date(input.preferredDate);
    if (!Number.isFinite(preferredDate.getTime())) {
      throw new BadRequestException('Choose a preferred date.');
    }

    if (input.type === OrderType.BUY_RICE && !input.riceTypeId) {
      throw new BadRequestException('Choose a rice type.');
    }
    if (input.type === OrderType.SELL_PALAY && (!input.palayCondition || !input.deliveryMethod)) {
      throw new BadRequestException('Choose the palay condition and delivery method.');
    }
    if (input.type === OrderType.SERVICE && !input.serviceType) {
      throw new BadRequestException('Choose a service.');
    }

    const prices = await this.catalog.getPrices();
    const settings = await this.catalog.getSettings();
    if (input.type === OrderType.BUY_RICE) {
      const rice = await this.prisma.riceType.findFirst({
        where: { id: input.riceTypeId, isActive: true },
      });
      if (!rice || kg > Number(rice.stockKg)) {
        throw new BadRequestException('Not enough rice in stock.');
      }
    }
    const estimate = estimateOrderAmount(
      input as CreateOrderRequest,
      prices,
      settings,
    );
    if (estimate === null) {
      throw new BadRequestException('A price needed for this order has not been set.');
    }

    const order = await this.prisma.order.create({
      data: {
        type: input.type,
        status: OrderStatus.PENDING,
        customerId: user.id,
        contactName: input.contactName.trim(),
        contactPhone: input.contactPhone,
        requestedKg: kg.toFixed(2),
        preferredDate,
        riceTypeId: input.type === OrderType.BUY_RICE ? input.riceTypeId : null,
        palayCondition: input.type === OrderType.BUY_RICE ? null : input.palayCondition ?? null,
        variety: input.type === OrderType.SELL_PALAY ? input.variety?.trim() || null : null,
        deliveryMethod: input.type === OrderType.SELL_PALAY ? input.deliveryMethod ?? null : null,
        serviceType: input.type === OrderType.SERVICE ? input.serviceType ?? null : null,
        estimatedAmount: estimate,
        events: {
          create: {
            fromStatus: null,
            toStatus: OrderStatus.PENDING,
            actorId: user.id,
            note: 'Order placed',
          },
        },
      },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
    return orderDto(order);
  }

  async mine(userId: number, activeOnly: boolean): Promise<OrderDto[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        customerId: userId,
        ...(activeOnly ? { status: { in: ACTIVE_STATUSES } } : {}),
      },
      include: { events: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(orderDto);
  }

  async mineById(id: number, userId: number): Promise<OrderDto> {
    const order = await this.prisma.order.findFirst({
      where: { id, customerId: userId },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Order not found.');
    return orderDto(order);
  }

  async cancel(id: number, user: UserDto): Promise<OrderDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id, customerId: user.id } });
      if (!order) throw new NotFoundException('Order not found.');
      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException('Only pending orders can be cancelled.');
      }
      return tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          events: { create: { fromStatus: order.status, toStatus: OrderStatus.CANCELLED, actorId: user.id } },
        },
        include: { events: { orderBy: { createdAt: 'asc' } } },
      });
    });
    await this.notifyStatusChange(updated);
    return orderDto(updated);
  }

  async confirmWeight(id: number, user: UserDto): Promise<OrderDto> {
    const order = await this.prisma.order.findFirst({ where: { id, customerId: user.id } });
    if (!order) throw new NotFoundException('Order not found.');
    if (order.type === OrderType.BUY_RICE || order.status !== OrderStatus.WEIGHED || !order.finalAmount) {
      throw new BadRequestException('There is no weight to confirm yet.');
    }
    return orderDto(await this.prisma.order.update({
      where: { id },
      data: { weightConfirmedAt: order.weightConfirmedAt ?? new Date() },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    }));
  }

  async adminList(filters: { status?: OrderStatus; type?: OrderType }): Promise<AdminOrderDto[]> {
    const orders = await this.prisma.order.findMany({
      where: { ...(filters.status ? { status: filters.status } : {}), ...(filters.type ? { type: filters.type } : {}) },
      include: { events: { orderBy: { createdAt: 'asc' } }, customer: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((order) => ({ ...orderDto(order), customer: toUserDto(order.customer), events: orderDto(order).events! }));
  }

  async adminGet(id: number): Promise<AdminOrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { events: { orderBy: { createdAt: 'asc' } }, customer: true },
    });
    if (!order) throw new NotFoundException('Order not found.');
    return { ...orderDto(order), customer: toUserDto(order.customer), events: orderDto(order).events! };
  }

  async accept(id: number, body: AcceptOrderDto, actor: UserDto): Promise<OrderDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new NotFoundException('Order not found.');
      const nextStatus = ACCEPT_STATUS[order.type];
      if (order.status !== OrderStatus.PENDING || !canTransition(order.type, order.status, nextStatus)) {
        throw new BadRequestException('This order has already been reviewed.');
      }
      if (order.type === OrderType.SERVICE && !body.scheduledDate) {
        throw new BadRequestException('A service date is required.');
      }
      const scheduledDate = new Date(body.scheduledDate ?? order.preferredDate.toISOString());
      if (!Number.isFinite(scheduledDate.getTime())) throw new BadRequestException('Choose a valid service date.');

      const price = async (item: PriceItem, riceTypeId: number | null = null) => {
        const row = await tx.price.findFirst({
          where: { item, riceTypeId, effectiveAt: { lte: new Date() } },
          orderBy: [{ effectiveAt: 'desc' }, { id: 'desc' }],
        });
        if (!row) throw new BadRequestException('A price needed for this order has not been set.');
        return row.pricePerKg.toString();
      };

      const data: Prisma.OrderUpdateInput = {
        status: nextStatus,
        scheduledDate,
        events: { create: { fromStatus: order.status, toStatus: nextStatus, actorId: actor.id } },
      };
      if (order.type === OrderType.BUY_RICE) {
        if (order.riceTypeId === null) throw new BadRequestException('Choose a rice type.');
        const rice = await tx.riceType.findUnique({ where: { id: order.riceTypeId } });
        if (!rice || !rice.isActive || Number(rice.stockKg) < Number(order.requestedKg)) {
          throw new BadRequestException('Not enough rice in stock.');
        }
        const unitPrice = await price(PriceItem.RICE, order.riceTypeId);
        data.unitPrice = unitPrice;
        data.finalAmount = money(Number(order.requestedKg) * Number(unitPrice));
        await tx.riceType.update({ where: { id: rice.id }, data: { stockKg: (Number(rice.stockKg) - Number(order.requestedKg)).toFixed(2) } });
        await tx.stockAdjustment.create({
          data: { riceTypeId: rice.id, changeKg: (-Number(order.requestedKg)).toFixed(2), reason: `Reserved for ${orderRef(order.id)}`, orderId: order.id, actorId: actor.id },
        });
      } else if (order.type === OrderType.SELL_PALAY) {
        const item = order.palayCondition === PalayCondition.DRY ? PriceItem.PALAY_DRY : PriceItem.PALAY_FRESH;
        data.unitPrice = await price(item);
      } else {
        data.dryingRate = order.serviceType === ServiceType.MILLING ? null : await price(PriceItem.DRYING_FEE);
        data.millingRate = order.serviceType === ServiceType.DRYING ? null : await price(PriceItem.MILLING_FEE);
      }
      return tx.order.update({
        where: { id },
        data,
        include: { events: { orderBy: { createdAt: 'asc' } } },
      });
    });
    await this.notifyStatusChange(updated);
    return orderDto(updated);
  }

  async reject(id: number, reason: string, actor: UserDto): Promise<OrderDto> {
    const note = reason.trim();
    if (!note) throw new BadRequestException('A rejection reason is required.');
    const updated = await this.changeStatus(id, OrderStatus.REJECTED, actor, note, { rejectReason: note });
    await this.notifyStatusChange(updated);
    return orderDto(updated);
  }

  async updateStatus(id: number, status: OrderStatus, note: string | undefined, actor: UserDto) {
    if (status === OrderStatus.PENDING || status === OrderStatus.REJECTED || status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Use accept, reject, or cancel for this status.');
    }
    const order = await this.getOrder(id);
    if (order.status === OrderStatus.PENDING) throw new BadRequestException('Accept or reject the order first.');
    if (order.type === OrderType.SERVICE) {
      if (status === OrderStatus.DRYING && order.serviceType === ServiceType.MILLING) throw new BadRequestException('That step does not match the selected service.');
      if (status === OrderStatus.MILLING && order.serviceType === ServiceType.DRYING) throw new BadRequestException('That step does not match the selected service.');
    }
    if (order.type === OrderType.SELL_PALAY && status === OrderStatus.PAID && !order.weightConfirmedAt) {
      throw new BadRequestException('The farmer must confirm the weight first.');
    }
    const updated = await this.changeStatus(id, status, actor, note);
    await this.notifyStatusChange(updated);
    return orderDto(updated);
  }

  private async changeStatus(
    id: number,
    status: OrderStatus,
    actor: UserDto,
    note?: string,
    extra: Prisma.OrderUpdateInput = {},
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new NotFoundException('Order not found.');
      if (!canTransition(order.type, order.status, status)) throw new BadRequestException('Invalid order transition.');
      return tx.order.update({
        where: { id },
        data: {
          ...extra,
          status,
          ...(status === OrderStatus.PAID ? { paidAt: new Date() } : {}),
          events: { create: { fromStatus: order.status, toStatus: status, actorId: actor.id, note: note?.trim() || null } },
        },
        include: { events: { orderBy: { createdAt: 'asc' } } },
      });
    });
    return updated;
  }

  async weighIn(id: number, body: WeighInOrderDto, actor: UserDto): Promise<OrderDto> {
    const wetKg = body.wetKg === undefined ? null : Number(body.wetKg);
    const dryKg = body.dryKg === undefined ? null : Number(body.dryKg);
    const riceKg = body.riceKg === undefined ? null : Number(body.riceKg);
    if ([wetKg, dryKg, riceKg].some((kg) => kg !== null && (!Number.isFinite(kg) || kg <= 0))) {
      throw new BadRequestException('Enter valid weights above zero.');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new NotFoundException('Order not found.');
      if (order.type === OrderType.BUY_RICE || order.status !== OrderStatus.RECEIVED) {
        throw new BadRequestException('This order is not awaiting weigh-in.');
      }
      let finalAmount: string;
      if (order.type === OrderType.SELL_PALAY) {
        const actualKg = order.palayCondition === PalayCondition.FRESH ? wetKg : dryKg;
        if (actualKg === null || !order.unitPrice) throw new BadRequestException('Enter the actual palay weight.');
        finalAmount = money(actualKg * Number(order.unitPrice));
      } else {
        if (order.dryingRate !== null && wetKg === null) throw new BadRequestException('Enter the wet palay weight.');
        if (order.millingRate !== null && riceKg === null) throw new BadRequestException('Enter the rice output weight.');
        finalAmount = money((wetKg ?? 0) * Number(order.dryingRate ?? 0) + (riceKg ?? 0) * Number(order.millingRate ?? 0));
      }
      return tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.WEIGHED,
          wetKg: wetKg?.toFixed(2) ?? null,
          dryKg: dryKg?.toFixed(2) ?? null,
          riceKg: riceKg?.toFixed(2) ?? null,
          finalAmount,
          weightConfirmedAt: null,
          events: { create: { fromStatus: order.status, toStatus: OrderStatus.WEIGHED, actorId: actor.id, kg: (wetKg ?? dryKg ?? riceKg)?.toFixed(2) ?? null } },
        },
        include: { events: { orderBy: { createdAt: 'asc' } } },
      });
    });
    await this.notifyStatusChange(updated);
    return orderDto(updated);
  }

  async summary(): Promise<AdminSummaryDto> {
    const today = manilaDate();
    const { start, end } = manilaDayBounds(today);
    const [needsApproval, arrivingToday, inDrying, readyForPickup, dryingOrders, settings] = await Promise.all([
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({
        where: { scheduledDate: { gte: start, lt: end }, OR: [
          { type: OrderType.SELL_PALAY, status: OrderStatus.ACCEPTED },
          { type: OrderType.SERVICE, status: OrderStatus.SCHEDULED },
        ] },
      }),
      this.prisma.order.count({ where: { type: OrderType.SERVICE, status: OrderStatus.DRYING } }),
      this.prisma.order.count({ where: { status: OrderStatus.READY_FOR_PICKUP } }),
      this.prisma.order.findMany({
        where: { scheduledDate: { gte: start, lt: end }, OR: [
          { type: OrderType.SERVICE, serviceType: { in: [ServiceType.DRYING, ServiceType.DRYING_AND_MILLING] } },
          { type: OrderType.SELL_PALAY, palayCondition: PalayCondition.FRESH },
        ] },
        select: { requestedKg: true },
      }),
      this.catalog.getSettings(),
    ]);
    const dryingKgBookedToday = dryingOrders.reduce((sum, order) => sum + Number(order.requestedKg), 0);
    return {
      needsApproval,
      arrivingToday,
      inDrying,
      readyForPickup,
      dryingKgBookedToday: money(dryingKgBookedToday),
      dryingCapacityKg: settings.dryingCapacityKg,
    };
  }

  async moneySummary(from?: string, to?: string): Promise<MoneySummaryDto> {
    const today = manilaDate();
    const currentMonth = `${today.slice(0, 7)}-01`;
    const startDate = from ?? currentMonth;
    const endDate = to ?? today;
    const { start } = manilaDayBounds(startDate);
    const { end } = manilaDayBounds(endDate);
    if (start > end) throw new BadRequestException('The start date must be on or before the end date.');
    const rows = await this.prisma.order.findMany({
      where: { status: { in: [OrderStatus.PAID, OrderStatus.COMPLETED] }, paidAt: { gte: start, lt: end } },
      select: { type: true, finalAmount: true },
    });
    const totals = { boughtPalay: 0, soldRice: 0, serviceFees: 0 };
    for (const row of rows) {
      const value = Number(row.finalAmount ?? 0);
      if (row.type === OrderType.SELL_PALAY) totals.boughtPalay += value;
      else if (row.type === OrderType.BUY_RICE) totals.soldRice += value;
      else totals.serviceFees += value;
    }
    return {
      from: startDate,
      to: endDate,
      boughtPalay: money(totals.boughtPalay),
      soldRice: money(totals.soldRice),
      serviceFees: money(totals.serviceFees),
      grossProfit: money(totals.soldRice + totals.serviceFees - totals.boughtPalay),
    };
  }

  async smsLogs(): Promise<SmsLogDto[]> {
    const rows = await this.prisma.smsLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    return rows.map((row) => ({
      id: row.id,
      direction: row.direction,
      phone: row.phone,
      message: row.message,
      status: row.status,
      orderId: row.orderId,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  private async notifyStatusChange(order: OrderWithEvents) {
    const dto = orderDto(order);
    let status = 'FAILED';
    let providerId: string | undefined;
    let message = `${dto.ref}: ${dto.status.toLowerCase().replaceAll('_', ' ')}.`;
    if (dto.scheduledDate && ['ACCEPTED', 'SCHEDULED'].includes(dto.status)) {
      message += ` Confirmed date: ${dto.scheduledDate}.`;
    }
    if (dto.status === 'REJECTED' && dto.rejectReason) {
      message += ` Reason: ${dto.rejectReason}.`;
    }
    try {
      const result = await this.sms.notifyStatusChange(dto);
      status = result.status === 'mocked' ? 'MOCKED' : 'QUEUED';
      providerId = result.batchId;
    } catch (error) {
      console.error('Status SMS could not be sent:', error);
    }
    try {
      await this.prisma.smsLog.create({
        data: {
          direction: SmsDirection.OUTBOUND,
          phone: order.contactPhone,
          message,
          status,
          providerId,
          orderId: order.id,
        },
      });
    } catch (error) {
      console.error('Status SMS log could not be saved:', error);
    }
  }
}
