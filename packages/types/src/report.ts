// ── Report: IRPC's Statement of Financial Performance ──────────
// Same rule as MoneySummaryDto: PAID or COMPLETED orders, by the Manila day they were paid.
export interface StatementLinesDto {
  rice: string; // BUY_RICE income
  customMilling: string; // milling part of SERVICE fees
  customDrying: string; // drying part of SERVICE fees
  totalIncome: string; // rice + customMilling + customDrying
  rawMaterials: string; // palay bought (SELL_PALAY)
  grossProfit: string; // totalIncome - rawMaterials
}

export interface ReportMonthDto extends StatementLinesDto {
  month: string; // "2026-10"
}

export interface ReportPartyDto {
  customerId: number;
  name: string;
  town: string | null;
  orders: number;
  kg: string; // palay paid for (farmers) or rice sold (buyers)
  amount: string;
}

export interface ReportTownDto {
  town: string | null;
  palayKg: string;
  palayBought: string;
  income: string; // rice + service fees from customers in this town
}

export interface ReportDto {
  from: string; // YYYY-MM-DD, inclusive
  to: string; // YYYY-MM-DD, inclusive
  months: ReportMonthDto[]; // every month in the range, oldest first
  total: StatementLinesDto;
  farmers: ReportPartyDto[]; // who IRPC bought palay from, largest first
  buyers: ReportPartyDto[]; // who bought rice, largest first
  towns: ReportTownDto[];
}

export interface OperationsTrendPoint {
  date: string;
  palayOffers: number;
  riceOrders: number;
  serviceRequests: number;
  answered: number;
  weightsToConfirm: number;
  inDrying: number;
  readyForPickup: number;
}

export interface OperationsTrendDto {
  from: string;
  to: string;
  daily: OperationsTrendPoint[];
}

export interface FinanceTrendPoint {
  date: string;
  boughtPalay: string;
  soldRice: string;
  serviceFees: string;
  grossProfit: string;
}

export interface FinanceTrendDto {
  from: string;
  to: string;
  daily: FinanceTrendPoint[];
}

export interface CatalogPriceTrend {
  key: string;
  label: string;
  item: PriceItem;
  values: (string | null)[];
}

export interface CatalogStockTrend {
  key: string;
  label: string;
  values: string[];
}

export interface CatalogAnalyticsDto {
  dates: string[];
  prices: CatalogPriceTrend[];
  stock: CatalogStockTrend[];
}

export interface LogTrendPoint {
  date: string;
  order: number;
  batch: number;
  inventory: number;
  sms: number;
  pricing: number;
}

export interface LogTrendDto {
  from: string;
  to: string;
  daily: LogTrendPoint[];
}

// Shared by the API (GET /admin/report) and the web demo data, so both compute the same numbers.
// Type-only imports: index.ts re-exports this file, so a value import would be circular.
import type { OrderType, PalayCondition, PriceItem, ServiceType } from './index';

/** One paid order, with only the fields the report needs. */
export interface ReportRow {
  type: OrderType;
  serviceType: ServiceType | null;
  palayCondition: PalayCondition | null;
  finalAmount: number;
  wetKg: number | null;
  dryKg: number | null;
  riceKg: number | null;
  requestedKg: number;
  dryingRate: number | null;
  paidAt: Date;
  customerId: number;
  customerName: string;
  town: string | null;
}

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const reportMoney = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
const manilaMonth = (at: Date) => new Date(at.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 7);

/** Every "YYYY-MM" from the month of `from` to the month of `to`. */
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  let [year, month] = from.slice(0, 7).split('-').map(Number);
  const last = to.slice(0, 7);
  for (;;) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    months.push(key);
    if (key >= last) return months;
    month += 1;
    if (month > 12) [year, month] = [year + 1, 1];
  }
}

/**
 * Splits a service fee into drying and milling. Drying is wet kg × the locked drying rate;
 * milling is the rest, so the two always add up to the fee that was paid.
 */
export function splitServiceFee(row: Pick<ReportRow, 'serviceType' | 'finalAmount' | 'wetKg' | 'dryingRate'>) {
  if (row.serviceType === 'MILLING') return { drying: 0, milling: row.finalAmount };
  if (row.serviceType === 'DRYING') return { drying: row.finalAmount, milling: 0 };
  const drying = Math.min(row.finalAmount, (row.wetKg ?? 0) * (row.dryingRate ?? 0));
  return { drying, milling: row.finalAmount - drying };
}

/** Kg the farmer was paid for, or kg of rice the buyer took. */
function paidKg(row: ReportRow): number {
  if (row.type === 'SELL_PALAY') return (row.palayCondition === 'DRY' ? row.dryKg : row.wetKg) ?? row.requestedKg;
  return row.riceKg ?? row.requestedKg;
}

type Lines = { rice: number; milling: number; drying: number; palay: number };
const emptyLines = (): Lines => ({ rice: 0, milling: 0, drying: 0, palay: 0 });

function toStatement(l: Lines): StatementLinesDto {
  const income = l.rice + l.milling + l.drying;
  return {
    rice: reportMoney(l.rice),
    customMilling: reportMoney(l.milling),
    customDrying: reportMoney(l.drying),
    totalIncome: reportMoney(income),
    rawMaterials: reportMoney(l.palay),
    grossProfit: reportMoney(income - l.palay),
  };
}

export function buildReport(rows: ReportRow[], from: string, to: string): ReportDto {
  const byMonth = new Map(monthsBetween(from, to).map((m) => [m, emptyLines()]));
  const total = emptyLines();
  const parties = new Map<string, { customerId: number; name: string; town: string | null; orders: number; kg: number; amount: number }>();
  const towns = new Map<string | null, { kg: number; bought: number; income: number }>();

  for (const row of rows) {
    const lines = byMonth.get(manilaMonth(row.paidAt));
    const add = (key: keyof Lines, amount: number) => {
      total[key] += amount;
      if (lines) lines[key] += amount;
    };
    const town = towns.get(row.town) ?? { kg: 0, bought: 0, income: 0 };
    towns.set(row.town, town);

    if (row.type === 'SELL_PALAY') {
      add('palay', row.finalAmount);
      town.kg += paidKg(row);
      town.bought += row.finalAmount;
    } else if (row.type === 'BUY_RICE') {
      add('rice', row.finalAmount);
      town.income += row.finalAmount;
    } else {
      const { drying, milling } = splitServiceFee(row);
      add('drying', drying);
      add('milling', milling);
      town.income += row.finalAmount;
    }

    if (row.type !== 'SERVICE') {
      const key = `${row.type}:${row.customerId}`;
      const party = parties.get(key) ?? { customerId: row.customerId, name: row.customerName, town: row.town, orders: 0, kg: 0, amount: 0 };
      party.orders += 1;
      party.kg += paidKg(row);
      party.amount += row.finalAmount;
      parties.set(key, party);
    }
  }

  const list = (type: OrderType): ReportPartyDto[] =>
    [...parties.entries()]
      .filter(([key]) => key.startsWith(`${type}:`))
      .map(([, p]) => ({ ...p, kg: reportMoney(p.kg), amount: reportMoney(p.amount) }))
      .sort((a, b) => Number(b.amount) - Number(a.amount));

  return {
    from,
    to,
    months: [...byMonth.entries()].map(([month, l]) => ({ month, ...toStatement(l) })),
    total: toStatement(total),
    farmers: list('SELL_PALAY'),
    buyers: list('BUY_RICE'),
    towns: [...towns.entries()]
      .map(([town, t]) => ({ town, palayKg: reportMoney(t.kg), palayBought: reportMoney(t.bought), income: reportMoney(t.income) }))
      .sort((a, b) => Number(b.palayBought) - Number(a.palayBought)),
  };
}

// ── How fast IRPC answers palay offers (the bottleneck) ─────────
export interface AnswerStatsDto {
  from: string;
  to: string;
  offers: number; // palay offers that came in, excluding ones the farmer cancelled before an answer
  answered: number; // accepted or rejected
  answeredSameDay: number; // answered on the same Manila day the offer came in
  sameDayPct: number | null; // answeredSameDay ÷ offers × 100, null when there were no offers
  averageHours: string | null; // mean time from offer to answer, null when nothing was answered
  waiting: number; // still pending
  oldestWaitingSince: string | null; // ISO time of the oldest offer still pending
}

/** One palay offer: when it came in, and when IRPC first accepted or rejected it. */
export interface OfferTiming {
  createdAt: Date;
  answeredAt: Date | null;
  pending: boolean;
}

const manilaDay = (at: Date) => new Date(at.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10);

export function buildAnswerStats(offers: OfferTiming[], from: string, to: string): AnswerStatsDto {
  const answered = offers.filter((o) => o.answeredAt);
  const sameDay = answered.filter((o) => manilaDay(o.createdAt) === manilaDay(o.answeredAt!));
  const waiting = offers.filter((o) => o.pending).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const hours = answered.reduce((sum, o) => sum + (o.answeredAt!.getTime() - o.createdAt.getTime()) / 3_600_000, 0);
  return {
    from,
    to,
    offers: offers.length,
    answered: answered.length,
    answeredSameDay: sameDay.length,
    sameDayPct: offers.length ? Math.round((sameDay.length / offers.length) * 100) : null,
    averageHours: answered.length ? (hours / answered.length).toFixed(1) : null,
    waiting: waiting.length,
    oldestWaitingSince: waiting[0]?.createdAt.toISOString() ?? null,
  };
}
