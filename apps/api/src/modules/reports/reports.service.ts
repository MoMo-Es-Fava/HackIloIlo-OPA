import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, type ReportDto } from '@irpc/types';
import { PrismaService } from '../../database/prisma.service';
import {
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

  /** Defaults to January 1 of this year through today (Manila). */
  async report(from?: string, to?: string): Promise<ReportDto> {
    const today = manilaToday();
    const startDate = from || `${today.slice(0, 4)}-01-01`;
    const endDate = to || today;
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
