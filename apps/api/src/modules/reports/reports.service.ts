import { BadRequestException, Injectable } from '@nestjs/common';
import {
  OrderStatus,
  OrderType,
  type AnswerStatsDto,
  type ReportDto,
} from '@irpc/types';
import { PrismaService } from '../../database/prisma.service';
import {
  buildAnswerStats,
  buildReport,
  manilaDayStart,
  manilaToday,
  type ReportRow,
} from './report-rules';

const DAY_MS = 24 * 60 * 60 * 1000;
const num = (v: { toString(): string } | null) =>
  v === null ? null : Number(v.toString());

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Validates the period and returns its Manila day bounds. */
  private period(defaultFrom: string, from?: string, to?: string) {
    const startDate = from || defaultFrom;
    const endDate = to || manilaToday();
    const start = manilaDayStart(startDate);
    const end = new Date(manilaDayStart(endDate).getTime() + DAY_MS);
    if (start >= end) {
      throw new BadRequestException(
        'The start date must be on or before the end date.',
      );
    }
    if (end.getTime() - start.getTime() > 3 * 366 * DAY_MS) {
      throw new BadRequestException('Choose a period of 3 years or less.');
    }
    return { startDate, endDate, start, end };
  }

  /**
   * How fast IRPC answers palay offers, for offers that came in during the period
   * (defaults to this month). An answer is the first accept or reject.
   */
  async answers(from?: string, to?: string): Promise<AnswerStatsDto> {
    const { startDate, endDate, start, end } = this.period(
      `${manilaToday().slice(0, 7)}-01`,
      from,
      to,
    );
    const offers = await this.prisma.order.findMany({
      where: {
        type: OrderType.SELL_PALAY,
        createdAt: { gte: start, lt: end },
      },
      select: {
        status: true,
        createdAt: true,
        events: {
          where: {
            fromStatus: OrderStatus.PENDING,
            toStatus: { in: [OrderStatus.ACCEPTED, OrderStatus.REJECTED] },
          },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });
    const timings = offers
      // Cancelled by the farmer before IRPC answered: not IRPC's delay to count.
      .filter((o) => o.status !== OrderStatus.CANCELLED || o.events.length)
      .map((o) => ({
        createdAt: o.createdAt,
        answeredAt: o.events[0]?.createdAt ?? null,
        pending: o.status === OrderStatus.PENDING,
      }));
    return buildAnswerStats(timings, startDate, endDate);
  }

  /** Defaults to January 1 of this year through today (Manila). */
  async report(from?: string, to?: string): Promise<ReportDto> {
    const { startDate, endDate, start, end } = this.period(
      `${manilaToday().slice(0, 4)}-01-01`,
      from,
      to,
    );

    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.COMPLETED] },
        paidAt: { gte: start, lt: end },
      },
      select: {
        type: true,
        serviceType: true,
        palayCondition: true,
        finalAmount: true,
        wetKg: true,
        dryKg: true,
        riceKg: true,
        requestedKg: true,
        dryingRate: true,
        paidAt: true,
        customerId: true,
        contactName: true,
        customer: { select: { name: true, municipality: true } },
      },
    });

    const rows: ReportRow[] = orders.map((o) => ({
      type: o.type,
      serviceType: o.serviceType,
      palayCondition: o.palayCondition,
      finalAmount: num(o.finalAmount) ?? 0,
      wetKg: num(o.wetKg),
      dryKg: num(o.dryKg),
      riceKg: num(o.riceKg),
      requestedKg: num(o.requestedKg) ?? 0,
      dryingRate: num(o.dryingRate),
      paidAt: o.paidAt!,
      customerId: o.customerId,
      customerName: o.customer?.name ?? o.contactName,
      town: o.customer?.municipality ?? null,
    }));
    return buildReport(rows, startDate, endDate);
  }
}
