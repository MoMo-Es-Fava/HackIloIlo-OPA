// Shared vocabulary for apps/web and apps/api.
// Keep these values identical to the enums in apps/api/prisma/schema.prisma.

export const Role = {
  USER: 'USER', // farmers and buyers share one dashboard
  PLANT_STAFF: 'PLANT_STAFF',
  ADMIN: 'ADMIN',
  MAO_STAFF: 'MAO_STAFF',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const AccountType = {
  FARMER: 'FARMER',
  COOPERATIVE: 'COOPERATIVE',
  BUYER: 'BUYER',
  INSTITUTION: 'INSTITUTION',
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const Language = { HIL: 'HIL', EN: 'EN' } as const;
export type Language = (typeof Language)[keyof typeof Language];

export const OrderType = {
  BUY_RICE: 'BUY_RICE',
  SELL_PALAY: 'SELL_PALAY',
  SERVICE: 'SERVICE',
} as const;
export type OrderType = (typeof OrderType)[keyof typeof OrderType];

export const OrderStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  SCHEDULED: 'SCHEDULED',
  PREPARING: 'PREPARING',
  RECEIVED: 'RECEIVED',
  WEIGHED: 'WEIGHED',
  DRYING: 'DRYING',
  MILLING: 'MILLING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  PAID: 'PAID',
  COMPLETED: 'COMPLETED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PalayCondition = { FRESH: 'FRESH', DRY: 'DRY' } as const;
export type PalayCondition = (typeof PalayCondition)[keyof typeof PalayCondition];

export const ServiceType = {
  DRYING: 'DRYING',
  MILLING: 'MILLING',
  DRYING_AND_MILLING: 'DRYING_AND_MILLING',
} as const;
export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

export const DeliveryMethod = {
  SELF_DELIVER: 'SELF_DELIVER',
  IRPC_PICKUP: 'IRPC_PICKUP',
} as const;
export type DeliveryMethod = (typeof DeliveryMethod)[keyof typeof DeliveryMethod];

export const PriceItem = {
  PALAY_FRESH: 'PALAY_FRESH',
  PALAY_DRY: 'PALAY_DRY',
  RICE: 'RICE',
  DRYING_FEE: 'DRYING_FEE',
  MILLING_FEE: 'MILLING_FEE',
} as const;
export type PriceItem = (typeof PriceItem)[keyof typeof PriceItem];

export const PriceBasis = { MARKET: 'MARKET', NFA: 'NFA' } as const;
export type PriceBasis = (typeof PriceBasis)[keyof typeof PriceBasis];

const S = OrderStatus;

// Allowed next statuses per order type. The API rejects any other transition.
// Extra checks live in the API (e.g. WEIGHED -> PAID needs the farmer's weight confirmation).
export const ORDER_FLOW: Record<OrderType, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  BUY_RICE: {
    PENDING: [S.ACCEPTED, S.REJECTED, S.CANCELLED],
    ACCEPTED: [S.PREPARING, S.CANCELLED],
    PREPARING: [S.READY_FOR_PICKUP],
    READY_FOR_PICKUP: [S.PAID],
    PAID: [S.COMPLETED],
  },
  SELL_PALAY: {
    PENDING: [S.ACCEPTED, S.REJECTED, S.CANCELLED],
    ACCEPTED: [S.RECEIVED, S.CANCELLED],
    RECEIVED: [S.WEIGHED],
    WEIGHED: [S.PAID],
    PAID: [S.COMPLETED],
  },
  SERVICE: {
    PENDING: [S.SCHEDULED, S.REJECTED, S.CANCELLED],
    SCHEDULED: [S.RECEIVED, S.CANCELLED],
    RECEIVED: [S.WEIGHED],
    WEIGHED: [S.DRYING, S.MILLING],
    DRYING: [S.MILLING, S.READY_FOR_PICKUP],
    MILLING: [S.READY_FOR_PICKUP],
    READY_FOR_PICKUP: [S.PAID],
    PAID: [S.COMPLETED],
  },
};

// Status an order moves to when an admin accepts it (prices are locked in the same step).
export const ACCEPT_STATUS: Record<OrderType, OrderStatus> = {
  BUY_RICE: S.ACCEPTED,
  SELL_PALAY: S.ACCEPTED,
  SERVICE: S.SCHEDULED,
};

export function canTransition(type: OrderType, from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_FLOW[type][from]?.includes(to) ?? false;
}

// Statuses that still show on the user's home page as "active".
export const ACTIVE_STATUSES: OrderStatus[] = [
  S.PENDING, S.ACCEPTED, S.SCHEDULED, S.PREPARING, S.RECEIVED,
  S.WEIGHED, S.DRYING, S.MILLING, S.READY_FOR_PICKUP, S.PAID,
];

// Accepts how people type PH mobile numbers ("0917 123 4567", "+63 917-123-4567", "639171234567")
// and returns "+639171234567", or null if it is not a PH mobile number.
export function normalizePhPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, '');
  const match = /^(?:\+?63|0)(9\d{9})$/.exec(digits);
  return match ? `+63${match[1]}` : null;
}

export const PIN_PATTERN = /^\d{4,6}$/;

// "IRPC-0042" style reference shown to users and used in SMS.
export function orderRef(id: number): string {
  return `IRPC-${String(id).padStart(4, '0')}`;
}

// ───────────── API shapes (amounts and kg are decimal strings, e.g. "1234.50") ─────────────

export interface CurrentPrice {
  item: PriceItem;
  riceTypeId: number | null;
  pricePerKg: string;
  basis: PriceBasis;
  effectiveAt: string; // ISO date
}

export interface RiceTypeDto {
  id: number;
  name: string;
  description: string | null;
  stockKg: string;
  pricePerKg: string;
}

export interface CreateOrderRequest {
  type: OrderType;
  requestedKg: string;
  preferredDate: string; // ISO date
  contactName: string;
  contactPhone: string; // +639XXXXXXXXX
  riceTypeId?: number; // BUY_RICE
  palayCondition?: PalayCondition; // SELL_PALAY, SERVICE
  variety?: string; // SELL_PALAY
  deliveryMethod?: DeliveryMethod; // SELL_PALAY
  serviceType?: ServiceType; // SERVICE
}

export interface OrderEventDto {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  kg: string | null;
  note: string | null;
  createdAt: string;
}

export interface OrderDto {
  id: number;
  ref: string;
  type: OrderType;
  status: OrderStatus;
  contactName: string;
  contactPhone: string; // +639XXXXXXXXX, receives the SMS updates
  requestedKg: string;
  preferredDate: string; // date the customer asked for
  scheduledDate: string | null; // date confirmed by IRPC on acceptance; null while PENDING or if rejected
  riceTypeId: number | null;
  palayCondition: PalayCondition | null;
  variety: string | null;
  deliveryMethod: DeliveryMethod | null;
  serviceType: ServiceType | null;
  unitPrice: string | null;
  dryingRate: string | null;
  millingRate: string | null;
  wetKg: string | null;
  dryKg: string | null;
  riceKg: string | null;
  weightConfirmedAt: string | null;
  estimatedAmount: string;
  finalAmount: string | null;
  rejectReason: string | null;
  createdAt: string;
  events?: OrderEventDto[];
}

// ───────────── Users and auth ─────────────

// Never includes the PIN or its hash.
export interface UserDto {
  id: number;
  name: string;
  phone: string; // +639XXXXXXXXX
  role: Role;
  accountType: AccountType | null; // null for staff accounts
  language: Language;
  municipality: string | null;
  cooperative: string | null;
}

export interface RegisterRequest {
  name: string;
  phone: string; // +639XXXXXXXXX
  pin: string; // 4–6 digits
  accountType: AccountType;
  language: Language;
  municipality?: string;
  cooperative?: string;
  verificationCode: string;
  consent: true; // Data Privacy Act consent; registration is refused without it
}

export interface LoginRequest {
  phone: string;
  pin: string;
}

export interface AuthResponse {
  token: string;
  user: UserDto;
}

// ───────────── Admin ─────────────

export interface AdminOrderDto extends OrderDto {
  customer: UserDto;
  events: OrderEventDto[];
}

// Counts for the admin "Today" page. "Today" is the Asia/Manila calendar date.
export interface AdminSummaryDto {
  needsApproval: number; // PENDING orders
  arrivingToday: number; // SELL_PALAY ACCEPTED and SERVICE SCHEDULED with scheduledDate today
  inDrying: number; // SERVICE orders in DRYING
  readyForPickup: number; // orders in READY_FOR_PICKUP
  dryingKgBookedToday: string; // see docs/API.md for which orders count
  dryingCapacityKg: string; // setting, default "56000.00"
}

export interface MoneySummaryDto {
  from: string; // ISO date, inclusive
  to: string; // ISO date, inclusive
  boughtPalay: string; // SELL_PALAY finalAmount
  soldRice: string; // BUY_RICE finalAmount
  serviceFees: string; // SERVICE finalAmount
  grossProfit: string; // soldRice + serviceFees - boughtPalay
}

export interface SmsLogDto {
  id: number;
  direction: 'OUTBOUND' | 'INBOUND';
  phone: string;
  message: string;
  status: string; // QUEUED / SENT / DELIVERED / FAILED / RECEIVED
  orderId: number | null;
  createdAt: string;
}

// ───────────── Settings and estimates ─────────────

// Returned by the public GET /settings. Ratios are decimal strings ("0.60").
export interface PublicSettingsDto {
  dryingRecovery: string; // dry kg ÷ wet kg, default "0.80"
  millingRecovery: string; // rice kg ÷ dry palay kg, default "0.60"
  sackKg: string; // default "50"
  dryingCapacityKg: string; // default "56000"
}

export interface EstimateInput {
  type: OrderType;
  requestedKg: string;
  riceTypeId?: number;
  palayCondition?: PalayCondition;
  serviceType?: ServiceType;
}

const toCents = (value: number) => Math.round(value * 100) / 100;

// Estimated rice output for a service order, from the palay kg the customer brings.
export function estimateServiceRiceKg(
  input: Pick<EstimateInput, 'requestedKg' | 'serviceType'>,
  settings: Pick<PublicSettingsDto, 'dryingRecovery' | 'millingRecovery'>,
): number {
  if (input.serviceType === ServiceType.DRYING) return 0;
  const palayKg = Number(input.requestedKg);
  const dried = input.serviceType === ServiceType.DRYING_AND_MILLING
    ? palayKg * Number(settings.dryingRecovery)
    : palayKg;
  return toCents(dried * Number(settings.millingRecovery));
}

// Same formula on the web (checkout preview) and in the API (stored estimatedAmount).
// Returns null when a needed price is missing. The API's stored value is authoritative.
export function estimateOrderAmount(
  input: EstimateInput,
  prices: CurrentPrice[],
  settings: Pick<PublicSettingsDto, 'dryingRecovery' | 'millingRecovery'>,
): string | null {
  const price = (item: PriceItem, riceTypeId: number | null = null) => {
    const row = prices.find((p) => p.item === item && p.riceTypeId === riceTypeId);
    return row ? Number(row.pricePerKg) : null;
  };
  const kg = Number(input.requestedKg);
  if (!Number.isFinite(kg) || kg <= 0) return null;

  let amount: number | null = null;
  if (input.type === OrderType.BUY_RICE) {
    const rice = input.riceTypeId ? price(PriceItem.RICE, input.riceTypeId) : null;
    amount = rice === null ? null : kg * rice;
  } else if (input.type === OrderType.SELL_PALAY) {
    const palay = price(input.palayCondition === PalayCondition.DRY ? PriceItem.PALAY_DRY : PriceItem.PALAY_FRESH);
    amount = palay === null ? null : kg * palay;
  } else {
    const drying = input.serviceType === ServiceType.MILLING ? 0 : price(PriceItem.DRYING_FEE);
    const milling = input.serviceType === ServiceType.DRYING ? 0 : price(PriceItem.MILLING_FEE);
    amount = drying === null || milling === null
      ? null
      : kg * drying + estimateServiceRiceKg(input, settings) * milling;
  }
  return amount === null ? null : toCents(amount).toFixed(2);
}


export * from './report';
