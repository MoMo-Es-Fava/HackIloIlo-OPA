import {
  ACCEPT_STATUS, canTransition, OrderStatus, OrderType, PalayCondition, PriceItem,
  ServiceType, orderRef, type CreateOrderRequest, type CurrentPrice, type OrderDto,
  type RiceTypeDto,
} from "@irpc/types";
import { currentPrice, nextOrderStatus } from "./orders";

// Demo assumption until the API exposes the plant's milling recovery setting.
export const MOCK_MILLING_RECOVERY = 0.60;

function rate(prices: CurrentPrice[], item: PriceItem, riceTypeId: number | null = null) {
  const price = currentPrice(prices, item, riceTypeId)?.pricePerKg;
  if (price === undefined) throw new Error(`Missing sample price: ${item}`);
  return price;
}

export function createMockOrder(
  request: CreateOrderRequest, id: number, prices: CurrentPrice[], riceTypes: RiceTypeDto[],
  now = new Date().toISOString(),
): OrderDto {
  const kg = Number(request.requestedKg);
  if (!Number.isFinite(kg) || kg <= 0) throw new Error("Enter a quantity above zero.");
  if (!request.contactName.trim() || !/^\+639\d{9}$/.test(request.contactPhone)) {
    throw new Error("Enter a name and a Philippine mobile number (+639…).");
  }
  if (!request.preferredDate || !Number.isFinite(Date.parse(request.preferredDate))) {
    throw new Error("Choose a preferred date.");
  }
  let estimate: number;
  if (request.type === OrderType.BUY_RICE) {
    const rice = riceTypes.find((row) => row.id === request.riceTypeId);
    if (!rice || kg > Number(rice.stockKg)) throw new Error("Not enough rice in stock.");
    estimate = kg * Number(rate(prices, PriceItem.RICE, rice.id));
  } else if (request.type === OrderType.SELL_PALAY) {
    if (!request.palayCondition) throw new Error("Choose fresh or dry palay.");
    estimate = kg * Number(rate(prices, request.palayCondition === PalayCondition.FRESH ? PriceItem.PALAY_FRESH : PriceItem.PALAY_DRY));
  } else {
    if (!request.serviceType || !Object.values(ServiceType).includes(request.serviceType)) throw new Error("Choose a service.");
    estimate = (request.serviceType !== ServiceType.MILLING ? kg * Number(rate(prices, PriceItem.DRYING_FEE)) : 0)
      + (request.serviceType !== ServiceType.DRYING ? kg * MOCK_MILLING_RECOVERY * Number(rate(prices, PriceItem.MILLING_FEE)) : 0);
  }
  return {
    id, ref: orderRef(id), type: request.type, status: OrderStatus.PENDING,
    contactName: request.contactName.trim(), contactPhone: request.contactPhone,
    requestedKg: kg.toFixed(2), preferredDate: request.preferredDate, scheduledDate: null,
    riceTypeId: request.type === OrderType.BUY_RICE ? request.riceTypeId! : null,
    palayCondition: request.type !== OrderType.BUY_RICE ? request.palayCondition ?? null : null,
    variety: request.type === OrderType.SELL_PALAY ? request.variety ?? null : null,
    deliveryMethod: request.type === OrderType.SELL_PALAY ? request.deliveryMethod ?? null : null,
    serviceType: request.type === OrderType.SERVICE ? request.serviceType! : null,
    unitPrice: null, dryingRate: null, millingRate: null, wetKg: null, dryKg: null, riceKg: null,
    weightConfirmedAt: null, estimatedAmount: estimate.toFixed(2), finalAmount: null,
    rejectReason: null, createdAt: now,
    events: [{ fromStatus: null, toStatus: OrderStatus.PENDING, kg: null, note: null, createdAt: now }],
  };
}

export interface TransitionOptions { scheduledDate?: string; reason?: string }

// The store applies this result and its stock change together. No network calls here.
export function transitionMockOrder(
  order: OrderDto, status: OrderStatus, prices: CurrentPrice[], riceTypes: RiceTypeDto[],
  options: TransitionOptions = {}, now = new Date().toISOString(),
): { order: OrderDto; riceTypes: RiceTypeDto[] } {
  if (!canTransition(order.type, order.status, status)) throw new Error("Invalid order transition.");
  if (status === OrderStatus.REJECTED && !options.reason?.trim()) throw new Error("A rejection reason is required.");
  if (order.type === OrderType.SERVICE && status !== OrderStatus.REJECTED && status !== OrderStatus.CANCELLED
    && status !== nextOrderStatus(order)) throw new Error("That step does not match the selected service.");
  if (order.type === OrderType.SELL_PALAY && status === OrderStatus.PAID && !order.weightConfirmedAt) {
    throw new Error("The farmer must confirm the weight first.");
  }
  const updated = { ...order, status };
  let stock = riceTypes;
  if (order.status === OrderStatus.PENDING && status === ACCEPT_STATUS[order.type]) {
    if (order.type === OrderType.SERVICE && !options.scheduledDate) throw new Error("A service date is required.");
    updated.scheduledDate = options.scheduledDate ?? order.preferredDate;
    if (!Number.isFinite(Date.parse(updated.scheduledDate))) throw new Error("Choose a valid service date.");
    if (order.type === OrderType.SERVICE) {
      updated.dryingRate = order.serviceType === ServiceType.MILLING ? null : rate(prices, PriceItem.DRYING_FEE);
      updated.millingRate = order.serviceType === ServiceType.DRYING ? null : rate(prices, PriceItem.MILLING_FEE);
    } else {
      const item = order.type === OrderType.BUY_RICE ? PriceItem.RICE
        : order.palayCondition === PalayCondition.FRESH ? PriceItem.PALAY_FRESH : PriceItem.PALAY_DRY;
      updated.unitPrice = rate(prices, item, order.riceTypeId);
      if (order.type === OrderType.BUY_RICE) {
        const rice = riceTypes.find((row) => row.id === order.riceTypeId);
        if (!rice || Number(rice.stockKg) < Number(order.requestedKg)) throw new Error("Not enough rice in stock.");
        stock = riceTypes.map((row) => row.id === rice.id ? { ...row, stockKg: (Number(row.stockKg) - Number(order.requestedKg)).toFixed(2) } : row);
        updated.finalAmount = (Number(order.requestedKg) * Number(updated.unitPrice)).toFixed(2);
      }
    }
  }
  if (order.type === OrderType.BUY_RICE && order.status === OrderStatus.ACCEPTED && status === OrderStatus.CANCELLED) {
    stock = riceTypes.map((row) => row.id === order.riceTypeId ? { ...row, stockKg: (Number(row.stockKg) + Number(order.requestedKg)).toFixed(2) } : row);
  }
  updated.rejectReason = status === OrderStatus.REJECTED ? options.reason!.trim() : order.rejectReason;
  updated.events = [...(order.events ?? []), {
    fromStatus: order.status, toStatus: status, kg: null,
    note: status === OrderStatus.REJECTED ? updated.rejectReason : null, createdAt: now,
  }];
  return { order: updated, riceTypes: stock };
}
