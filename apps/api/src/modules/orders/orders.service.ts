import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ACCEPT_STATUS,
  ACTIVE_STATUSES,
  AccountType,
  Role,
  OrderStatus,
  OrderType,
  PalayCondition,
  PriceItem,
  ServiceType,
  canTransition,
  estimateOrderAmount,
  orderRef,
  type AdminSummaryDto,
  type AdminOrderDto,
  type CurrentPrice,
  type MoneySummaryDto,
  type OrderDto,
  type SmsLogDto,
  type UserDto,
} from '@irpc/types';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SmsService } from '../../integrations/textbee/sms.service';
import { toUserDto } from '../users/users.repository';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import {
  AcceptOrderDto,
  StaffCreateOrderDto,
  AdminOrdersQuery,
  CreateOrderDto,
  WeighInDto,
} from './orders.dto';
import {
  finalAmount,
  needsDrying,
  needsMilling,
  planWeighIn,
  recoveryWarning,
  serviceProblem,
  toOrderDto,
  transitionProblem,
  type OrderRow,
} from './order-rules';
import { PricingLookup } from './pricing.lookup';

type Tx = Prisma.TransactionClient;
const D = (value: string | number | Prisma.Decimal) =>
  new Prisma.Decimal(value);
const EVENTS = { orderBy: { createdAt: 'asc' as const } };
const formatMoney = (value: number) =>
  (Math.round(value * 100) / 100).toFixed(2);
const manilaDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
function manilaDayBounds(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BadRequestException('Dates must use YYYY-MM-DD format.');
  }
  const [year, month, day] = date.split('-').map(Number);
  if (
    new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !== date
  ) {
    throw new BadRequestException('Choose a valid calendar date.');
  }
  const start = new Date(Date.UTC(year, month - 1, day) - 8 * 60 * 60 * 1000);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
// A random PIN nobody knows: staff-created customers can't log in until they set their own PIN.
const UNUSABLE_PIN_HASH = bcrypt.hashSync(randomBytes(24).toString('hex'), 10);
const STALE =
  'This order was just updated by someone else. Reload and try again.';

const manilaToday = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

@Injectable()
export class OrdersService {
  private readonly log = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingLookup,
    private readonly sms: SmsService,
  ) {}

  // ───────────── Customer actions ─────────────

  /** `actorId` is who entered it: the customer, or IRPC staff for walk-ins and calls. */
  async create(
    user: UserDto,
    dto: CreateOrderDto,
    actorId = user.id,
    note: string | null = null,
  ): Promise<OrderDto> {
    if (dto.preferredDate.slice(0, 10) < manilaToday()) {
      throw new BadRequestException('Choose today or a future date.');
    }
    if (dto.type === OrderType.SERVICE) {
      const problem = serviceProblem(dto.serviceType!, dto.palayCondition!);
      if (problem) throw new BadRequestException(problem);
    }
    if (dto.type === OrderType.BUY_RICE) {
      const rice = await this.prisma.riceType.findUnique({
        where: { id: dto.riceTypeId },
      });
      if (!rice || !rice.isActive)
        throw new BadRequestException('This rice type is not available.');
      if (D(dto.requestedKg).gt(rice.stockKg)) {
        throw new BadRequestException(
          `Only ${rice.stockKg.toFixed(2)} kg of this rice is in stock.`,
        );
      }
    }

    const [prices, settings] = await Promise.all([
      this.pricing.currentPrices(),
      this.pricing.settings(),
    ]);
    const estimate = estimateOrderAmount(dto, prices, settings);
    if (estimate === null) {
      throw new ConflictException(
        'Prices are not set yet. Please try again later.',
      );
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          type: dto.type,
          customerId: user.id,
          contactName: dto.contactName,
          contactPhone: dto.contactPhone,
          requestedKg: dto.requestedKg,
          preferredDate: new Date(dto.preferredDate),
          riceTypeId: dto.type === OrderType.BUY_RICE ? dto.riceTypeId : null,
          palayCondition:
            dto.type === OrderType.BUY_RICE ? null : dto.palayCondition,
          variety:
            dto.type === OrderType.SELL_PALAY ? (dto.variety ?? null) : null,
          deliveryMethod:
            dto.type === OrderType.SELL_PALAY ? dto.deliveryMethod : null,
          serviceType: dto.type === OrderType.SERVICE ? dto.serviceType : null,
          estimatedAmount: estimate,
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId: created.id,
          fromStatus: null,
          toStatus: OrderStatus.PENDING,
          actorId,
          note,
        },
      });
      return created;
    });
    void this.notify(order);
    return this.withEvents(order.id);
  }

  async listMine(userId: number, active?: boolean): Promise<OrderDto[]> {
    const rows = await this.prisma.order.findMany({
      where: {
        customerId: userId,
        ...(active ? { status: { in: ACTIVE_STATUSES } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toOrderDto(row as OrderRow));
  }

  async getMine(userId: number, id: number): Promise<OrderDto> {
    await this.ownOrder(userId, id);
    return this.withEvents(id);
  }

  async cancel(user: UserDto, id: number): Promise<OrderDto> {
    const order = await this.ownOrder(user.id, id);
    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictException(
        'Only orders still waiting for IRPC can be cancelled.',
      );
    }
    return this.change(order, OrderStatus.CANCELLED, user.id, {
      note: 'Cancelled by customer',
    });
  }

  async confirmWeight(user: UserDto, id: number): Promise<OrderDto> {
    const order = await this.ownOrder(user.id, id);
    return this.recordConfirmation(
      order,
      user.id,
      'Customer confirmed the weight',
    );
  }

  // ───────────── Staff actions ─────────────

  /**
   * Staff enter an order for a walk-in or phone customer. The customer is found by phone,
   * or added (they can't log in until they set a PIN; their consent is confirmed by staff).
   */
  async staffCreate(
    actor: UserDto,
    dto: StaffCreateOrderDto,
  ): Promise<OrderDto> {
    let customer = await this.prisma.user.findUnique({
      where: { phone: dto.contactPhone },
    });
    if (customer && customer.role !== Role.USER) {
      throw new ConflictException(
        'This phone number belongs to a staff account.',
      );
    }
    if (customer && !customer.isActive) {
      throw new ConflictException('This customer account is deactivated.');
    }
    customer ??= await this.prisma.user.create({
      data: {
        name: dto.contactName,
        phone: dto.contactPhone,
        pinHash: UNUSABLE_PIN_HASH,
        role: Role.USER,
        accountType: dto.accountType ?? AccountType.FARMER,
        municipality: dto.municipality ?? null,
        consentAt: new Date(),
      },
    });
    return this.create(
      toUserDto(customer),
      dto,
      actor.id,
      'Entered by IRPC staff (walk-in or phone)',
    );
  }

  /** Staff record that the customer confirmed the weight in person at the scale. */
  async staffConfirmWeight(actor: UserDto, id: number): Promise<OrderDto> {
    const order = await this.findOrder(id);
    return this.recordConfirmation(
      order,
      actor.id,
      'Customer confirmed the weight at the scale',
    );
  }

  private async recordConfirmation(
    order: OrderRow,
    actorId: number,
    note: string,
  ): Promise<OrderDto> {
    const id = order.id;
    const awaiting =
      (order.status === OrderStatus.WEIGHED ||
        (order.status === OrderStatus.DRYING && order.dryKg)) &&
      !order.weightConfirmedAt;
    if (!awaiting)
      throw new ConflictException(
        'There is no weight waiting for your confirmation.',
      );
    await this.prisma.$transaction(async (tx) => {
      const done = await tx.order.updateMany({
        where: { id, status: order.status, weightConfirmedAt: null },
        data: { weightConfirmedAt: new Date() },
      });
      if (done.count === 0) throw new ConflictException(STALE);
      await tx.orderEvent.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: order.status,
          actorId,
          note,
        },
      });
    });
    return this.withEvents(id);
  }

  async adminList(query: AdminOrdersQuery): Promise<OrderDto[]> {
    const rows = await this.prisma.order.findMany({
      where: { status: query.status, type: query.type },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toOrderDto(row as OrderRow));
  }

  async adminGet(id: number): Promise<AdminOrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { events: EVENTS, customer: true },
    });
    if (!order) throw new NotFoundException('Order not found.');
    const dto = toOrderDto(order, order.events);
    return {
      ...dto,
      events: dto.events ?? [],
      customer: toUserDto(order.customer),
    };
  }

  async summary(): Promise<AdminSummaryDto> {
    const { start, end } = manilaDayBounds(manilaDate());
    const [
      needsApproval,
      arrivingToday,
      inDrying,
      readyForPickup,
      dryingOrders,
      settings,
    ] = await Promise.all([
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({
        where: {
          scheduledDate: { gte: start, lt: end },
          OR: [
            { type: OrderType.SELL_PALAY, status: OrderStatus.ACCEPTED },
            { type: OrderType.SERVICE, status: OrderStatus.SCHEDULED },
          ],
        },
      }),
      this.prisma.order.count({
        where: { type: OrderType.SERVICE, status: OrderStatus.DRYING },
      }),
      this.prisma.order.count({
        where: { status: OrderStatus.READY_FOR_PICKUP },
      }),
      this.prisma.order.findMany({
        where: {
          scheduledDate: { gte: start, lt: end },
          OR: [
            {
              type: OrderType.SERVICE,
              serviceType: {
                in: [ServiceType.DRYING, ServiceType.DRYING_AND_MILLING],
              },
            },
            {
              type: OrderType.SELL_PALAY,
              palayCondition: PalayCondition.FRESH,
            },
          ],
        },
        select: { requestedKg: true },
      }),
      this.pricing.settings(),
    ]);
    const dryingKgBookedToday = dryingOrders.reduce(
      (sum, order) => sum + Number(order.requestedKg),
      0,
    );
    return {
      needsApproval,
      arrivingToday,
      inDrying,
      readyForPickup,
      dryingKgBookedToday: formatMoney(dryingKgBookedToday),
      dryingCapacityKg: settings.dryingCapacityKg,
    };
  }

  async moneySummary(from?: string, to?: string): Promise<MoneySummaryDto> {
    const today = manilaDate();
    const startDate = from ?? `${today.slice(0, 7)}-01`;
    const endDate = to ?? today;
    const { start } = manilaDayBounds(startDate);
    const { end } = manilaDayBounds(endDate);
    if (start > end)
      throw new BadRequestException(
        'The start date must be on or before the end date.',
      );
    const rows = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.COMPLETED] },
        paidAt: { gte: start, lt: end },
      },
      select: { type: true, finalAmount: true },
    });
    const totals = { boughtPalay: 0, soldRice: 0, serviceFees: 0 };
    for (const row of rows) {
      const amount = Number(row.finalAmount ?? 0);
      if (row.type === OrderType.SELL_PALAY) totals.boughtPalay += amount;
      else if (row.type === OrderType.BUY_RICE) totals.soldRice += amount;
      else totals.serviceFees += amount;
    }
    return {
      from: startDate,
      to: endDate,
      boughtPalay: formatMoney(totals.boughtPalay),
      soldRice: formatMoney(totals.soldRice),
      serviceFees: formatMoney(totals.serviceFees),
      grossProfit: formatMoney(
        totals.soldRice + totals.serviceFees - totals.boughtPalay,
      ),
    };
  }

  async smsLogs(): Promise<SmsLogDto[]> {
    const rows = await this.prisma.smsLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
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

  async accept(
    actor: UserDto,
    id: number,
    dto: AcceptOrderDto,
  ): Promise<OrderDto> {
    const order = await this.findOrder(id);
    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictException(
        'Only orders waiting for review can be accepted.',
      );
    }
    if (order.type === OrderType.SERVICE && !dto.scheduledDate) {
      throw new BadRequestException('Choose the service date.');
    }
    const scheduledDate = dto.scheduledDate
      ? new Date(dto.scheduledDate)
      : order.preferredDate;
    const locked = this.lockPrices(order, await this.pricing.currentPrices());
    const priced: OrderRow = { ...order, ...locked };
    const total =
      order.type === OrderType.BUY_RICE ? finalAmount(priced) : null;
    const note = locked.unitPrice
      ? `Accepted. Price locked at ₱${locked.unitPrice.toFixed(2)}/kg`
      : 'Accepted. Service fees locked';

    return this.change(order, ACCEPT_STATUS[order.type], actor.id, {
      data: {
        ...locked,
        scheduledDate,
        ...(total ? { finalAmount: total } : {}),
      },
      note,
      inTx: (tx) =>
        order.type === OrderType.BUY_RICE
          ? this.reserveRice(tx, order, actor.id)
          : Promise.resolve(),
    });
  }

  async reject(actor: UserDto, id: number, reason: string): Promise<OrderDto> {
    const order = await this.findOrder(id);
    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictException(
        'Only orders waiting for review can be rejected.',
      );
    }
    return this.change(order, OrderStatus.REJECTED, actor.id, {
      data: { rejectReason: reason },
      note: reason,
    });
  }

  async setStatus(
    actor: UserDto,
    id: number,
    to: OrderStatus,
    note?: string,
  ): Promise<OrderDto> {
    const order = await this.findOrder(id);
    if (order.status === OrderStatus.PENDING) {
      throw new BadRequestException(
        'Use accept or reject for orders waiting for review.',
      );
    }
    if (!canTransition(order.type, order.status, to)) {
      throw new BadRequestException(
        `An order cannot go from ${order.status} to ${to}.`,
      );
    }
    const problem = transitionProblem(order, to);
    if (problem) throw new ConflictException(problem);

    const total = finalAmount(order);
    return this.change(order, to, actor.id, {
      data: {
        ...(to === OrderStatus.PAID ? { paidAt: new Date() } : {}),
        ...(total ? { finalAmount: total } : {}),
      },
      note,
      inTx: (tx) =>
        order.type === OrderType.BUY_RICE && to === OrderStatus.CANCELLED
          ? this.releaseRice(tx, order, actor.id)
          : Promise.resolve(),
    });
  }

  async weighIn(
    actor: UserDto,
    id: number,
    weights: WeighInDto,
  ): Promise<OrderDto> {
    const order = await this.findOrder(id);
    const plan = planWeighIn(order, weights);
    if (typeof plan === 'string') throw new BadRequestException(plan);
    const updated: OrderRow = { ...order, ...plan.data };
    const total = finalAmount(updated);
    const warning = recoveryWarning(updated);
    const note = [
      plan.needsConfirmation
        ? 'Waiting for customer to confirm the weight'
        : null,
      warning,
    ]
      .filter(Boolean)
      .join('. ');

    return this.change(order, plan.nextStatus, actor.id, {
      data: {
        ...plan.data,
        ...(plan.needsConfirmation ? { weightConfirmedAt: null } : {}),
        ...(total ? { finalAmount: total } : {}),
      },
      note: note || null,
      kg: plan.kg,
      notify: true,
    });
  }

  // ───────────── Helpers ─────────────

  /** Moves an order to `to` (or records a step in place) with an event, guarding against stale updates. */
  private async change(
    order: OrderRow,
    to: OrderStatus,
    actorId: number,
    opts: {
      data?: Prisma.OrderUpdateManyMutationInput;
      note?: string | null;
      kg?: Prisma.Decimal;
      inTx?: (tx: Tx) => Promise<unknown>;
      notify?: boolean;
    } = {},
  ): Promise<OrderDto> {
    await this.prisma.$transaction(async (tx) => {
      const done = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { ...opts.data, status: to },
      });
      if (done.count === 0) throw new ConflictException(STALE);
      await opts.inTx?.(tx);
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: to,
          actorId,
          note: opts.note ?? null,
          kg: opts.kg ?? null,
        },
      });
    });
    const dto = await this.withEvents(order.id);
    if (to !== order.status || opts.notify)
      void this.notify(await this.findOrder(order.id));
    return dto;
  }

  /** Copies the current prices onto the order so later price changes don't affect it. */
  private lockPrices(order: OrderRow, prices: CurrentPrice[]) {
    const price = (item: PriceItem, riceTypeId: number | null = null) => {
      const row = prices.find(
        (p) => p.item === item && p.riceTypeId === riceTypeId,
      );
      if (!row)
        throw new ConflictException(
          'Set the current prices before accepting orders.',
        );
      return D(row.pricePerKg);
    };
    if (order.type === OrderType.BUY_RICE)
      return { unitPrice: price(PriceItem.RICE, order.riceTypeId) };
    if (order.type === OrderType.SELL_PALAY) {
      return {
        unitPrice: price(
          order.palayCondition === PalayCondition.DRY
            ? PriceItem.PALAY_DRY
            : PriceItem.PALAY_FRESH,
        ),
      };
    }
    return {
      dryingRate: needsDrying(order) ? price(PriceItem.DRYING_FEE) : null,
      millingRate: needsMilling(order) ? price(PriceItem.MILLING_FEE) : null,
    };
  }

  /** Takes the ordered rice out of stock. Fails if another order took it first. */
  private async reserveRice(tx: Tx, order: OrderRow, actorId: number) {
    const taken = await tx.riceType.updateMany({
      where: { id: order.riceTypeId!, stockKg: { gte: order.requestedKg } },
      data: { stockKg: { decrement: order.requestedKg } },
    });
    if (taken.count === 0)
      throw new ConflictException(
        'Not enough rice in stock to accept this order.',
      );
    await tx.stockAdjustment.create({
      data: {
        riceTypeId: order.riceTypeId!,
        changeKg: order.requestedKg.neg(),
        reason: `Reserved for ${orderRef(order.id)}`,
        orderId: order.id,
        actorId,
      },
    });
  }

  /** Puts reserved rice back when an accepted order is cancelled. */
  private async releaseRice(tx: Tx, order: OrderRow, actorId: number) {
    await tx.riceType.update({
      where: { id: order.riceTypeId! },
      data: { stockKg: { increment: order.requestedKg } },
    });
    await tx.stockAdjustment.create({
      data: {
        riceTypeId: order.riceTypeId!,
        changeKg: order.requestedKg,
        reason: `Released from cancelled ${orderRef(order.id)}`,
        orderId: order.id,
        actorId,
      },
    });
  }

  private async findOrder(id: number): Promise<OrderRow> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  private async ownOrder(userId: number, id: number): Promise<OrderRow> {
    const order = await this.findOrder(id);
    // Same message as "not found", so other people's order numbers can't be probed.
    if (order.customerId !== userId)
      throw new NotFoundException('Order not found.');
    return order;
  }

  private async withEvents(id: number): Promise<OrderDto> {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: { events: EVENTS },
    });
    return toOrderDto(order, order.events);
  }

  /** Texts the customer. A failed SMS never blocks or undoes the order change. */
  private async notify(order: OrderRow) {
    try {
      // Texts go out in the customer's chosen language (Hiligaynon or English).
      const customer = await this.prisma.user.findUnique({
        where: { id: order.customerId },
        select: { language: true },
      });
      await this.sms.notifyStatusChange(
        { ...toOrderDto(order), contactPhone: order.contactPhone },
        customer?.language,
      );
    } catch (error) {
      this.log.warn(
        `SMS for ${orderRef(order.id)} failed: ${(error as Error).message}`,
      );
    }
  }
}
