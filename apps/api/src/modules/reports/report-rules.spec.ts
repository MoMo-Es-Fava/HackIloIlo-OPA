import { BadRequestException } from '@nestjs/common';
import { OrderType, PalayCondition, ServiceType } from '@irpc/types';
import {
  buildReport,
  manilaDayStart,
  monthsBetween,
  splitServiceFee,
  type ReportRow,
} from './report-rules';

const row = (over: Partial<ReportRow>): ReportRow => ({
  type: OrderType.SELL_PALAY,
  serviceType: null,
  palayCondition: PalayCondition.FRESH,
  finalAmount: 0,
  wetKg: null,
  dryKg: null,
  riceKg: null,
  requestedKg: 0,
  dryingRate: null,
  paidAt: new Date('2026-10-10T02:00:00Z'),
  customerId: 1,
  customerName: 'Juan Dela Cruz',
  town: 'Pototan',
  ...over,
});

describe('report rules', () => {
  it('lists every month in the range, across a year end', () => {
    expect(monthsBetween('2025-11-15', '2026-02-01')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });

  it('rejects bad dates', () => {
    expect(() => manilaDayStart('2026-02-30')).toThrow(BadRequestException);
    expect(() => manilaDayStart('15/10/2026')).toThrow(BadRequestException);
  });

  it('splits drying and milling so they add up to the fee paid', () => {
    const fee = splitServiceFee(
      row({
        type: OrderType.SERVICE,
        serviceType: ServiceType.DRYING_AND_MILLING,
        finalAmount: 9877,
        wetKg: 3100,
        dryingRate: 1.6,
      }),
    );
    expect(fee.drying).toBeCloseTo(4960);
    expect(fee.milling).toBeCloseTo(4917);
  });

  it('builds the statement by month in the Manila time zone', () => {
    const report = buildReport(
      [
        row({ finalAmount: 25500, wetKg: 1500 }), // palay bought in October
        row({
          type: OrderType.BUY_RICE,
          palayCondition: null,
          finalAmount: 5070,
          requestedKg: 100,
          customerId: 6,
          customerName: 'Iloilo Rice Retailer',
          town: 'Iloilo City',
        }),
        row({
          type: OrderType.SERVICE,
          serviceType: ServiceType.DRYING,
          finalAmount: 1600,
          // Paid 7 AM Manila on Nov 1 = Oct 31 in UTC: counts as November.
          paidAt: new Date('2026-10-31T23:00:00Z'),
        }),
      ],
      '2026-10-01',
      '2026-11-30',
    );
    expect(report.months.map((m) => m.month)).toEqual(['2026-10', '2026-11']);
    expect(report.months[0]).toMatchObject({
      rice: '5070.00',
      rawMaterials: '25500.00',
      grossProfit: '-20430.00',
    });
    expect(report.months[1]).toMatchObject({ customDrying: '1600.00' });
    expect(report.total).toMatchObject({
      rice: '5070.00',
      customDrying: '1600.00',
      customMilling: '0.00',
      totalIncome: '6670.00',
      rawMaterials: '25500.00',
      grossProfit: '-18830.00',
    });
    expect(report.farmers).toEqual([
      expect.objectContaining({
        name: 'Juan Dela Cruz',
        kg: '1500.00',
        orders: 1,
      }),
    ]);
    expect(report.buyers[0]).toMatchObject({
      name: 'Iloilo Rice Retailer',
      kg: '100.00',
    });
    expect(report.towns[0]).toMatchObject({
      town: 'Pototan',
      palayBought: '25500.00',
    });
  });
});
