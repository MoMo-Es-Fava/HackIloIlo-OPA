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
  requestedKg: string;
  preferredDate: string;
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
