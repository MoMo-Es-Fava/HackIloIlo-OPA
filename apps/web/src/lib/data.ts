// API fixtures use the shared DTOs. Offers, price history and the profile support the demo screens.
import {
  AccountType, DeliveryMethod, OrderStatus, OrderType, PalayCondition, PriceBasis, PriceItem,
  ServiceType, type CreateOrderRequest, type CurrentPrice, type OrderDto, type RiceTypeDto,
} from "@irpc/types";
import { MOCK_MILLING_RECOVERY, createMockOrder, transitionMockOrder } from "./mock-orders";
import { orderSteps } from "./orders";
import type { Offer, DemoOrderDetails, PricePoint, BuyerProfile } from "./demo-types";

export const seedOffers: Offer[] = [
  { id: "OF-201", riceTypeId: 1, batchId: "IR-1012-019", grade: "Well-milled", kgAvailable: 1200, pricePerKg: 50.7, delivery: "Pickup at IRPC", posted: "13 Oct" },
  { id: "OF-202", riceTypeId: 2, batchId: "IR-1010-008", grade: "Regular milled", kgAvailable: 800, pricePerKg: 50.7, delivery: "Municipal drop point", posted: "13 Oct" },
  { id: "OF-203", riceTypeId: 3, batchId: "IR-1009-006", grade: "Well-milled", kgAvailable: 2000, pricePerKg: 50.7, delivery: "Pickup at IRPC", posted: "12 Oct" },
];

export const seedRiceTypes: RiceTypeDto[] = [
  { id: 1, name: "Well-milled rice", description: "Rice from batch IR-1012-019", stockKg: "1200.00", pricePerKg: "50.70" },
  { id: 2, name: "Regular milled rice", description: "Rice from batch IR-1010-008", stockKg: "800.00", pricePerKg: "50.70" },
  { id: 3, name: "Well-milled rice (Coop 2)", description: "Rice from batch IR-1009-006", stockKg: "2000.00", pricePerKg: "50.70" },
];

const effectiveAt = "2026-10-01T00:00:00.000Z";
export const seedPrices: CurrentPrice[] = [
  { item: PriceItem.PALAY_FRESH, riceTypeId: null, pricePerKg: "17.00", basis: PriceBasis.MARKET, effectiveAt },
  { item: PriceItem.PALAY_DRY, riceTypeId: null, pricePerKg: "22.00", basis: PriceBasis.MARKET, effectiveAt },
  { item: PriceItem.DRYING_FEE, riceTypeId: null, pricePerKg: "1.60", basis: PriceBasis.MARKET, effectiveAt },
  { item: PriceItem.MILLING_FEE, riceTypeId: null, pricePerKg: "3.30", basis: PriceBasis.MARKET, effectiveAt },
  ...seedRiceTypes.map((rice) => ({ item: PriceItem.RICE, riceTypeId: rice.id, pricePerKg: rice.pricePerKg, basis: PriceBasis.MARKET, effectiveAt })),
];

function sampleOrder(id: number, request: CreateOrderRequest, status: OrderStatus): OrderDto {
  let order = createMockOrder(request, id, seedPrices, seedRiceTypes, "2026-10-10T01:00:00.000Z");
  const path = status === OrderStatus.REJECTED || status === OrderStatus.CANCELLED
    ? [OrderStatus.PENDING, status] : orderSteps(order);
  const end = path.indexOf(status);
  for (const [index, step] of path.slice(1, end + 1).entries()) {
    const at = new Date(Date.UTC(2026, 9, 10 + index, 2)).toISOString();
    order = transitionMockOrder(order, step, seedPrices, seedRiceTypes, {
      scheduledDate: request.preferredDate,
      reason: step === OrderStatus.REJECTED ? "No intake capacity on the requested date." : undefined,
    }, at).order;
    if (step === OrderStatus.WEIGHED) {
      const kg = Number(order.requestedKg);
      order.wetKg = order.palayCondition === PalayCondition.FRESH ? order.requestedKg : null;
      order.dryKg = order.palayCondition === PalayCondition.DRY ? order.requestedKg : (kg * 0.84).toFixed(2);
      order.riceKg = order.type === OrderType.SERVICE && order.serviceType !== ServiceType.DRYING ? (kg * MOCK_MILLING_RECOVERY).toFixed(2) : null;
      order.finalAmount = order.type === OrderType.SELL_PALAY
        ? (kg * Number(order.unitPrice)).toFixed(2)
        : (Number(order.wetKg) * Number(order.dryingRate) + Number(order.riceKg) * Number(order.millingRate)).toFixed(2);
      order.events = order.events?.map((event) => event.toStatus === OrderStatus.WEIGHED ? { ...event, kg: order.requestedKg } : event);
    }
  }
  return order;
}

const contact = { contactName: "Sample Retailer R-07", contactPhone: "+639170000007", preferredDate: "2026-10-16" };
export const seedOrders: OrderDto[] = [
  sampleOrder(1001, { ...contact, type: OrderType.BUY_RICE, requestedKg: "300.00", riceTypeId: 1 }, OrderStatus.PENDING),
  sampleOrder(1002, { ...contact, type: OrderType.BUY_RICE, requestedKg: "400.00", riceTypeId: 3 }, OrderStatus.READY_FOR_PICKUP),
  sampleOrder(1003, { ...contact, type: OrderType.BUY_RICE, requestedKg: "700.00", riceTypeId: 2 }, OrderStatus.COMPLETED),
  sampleOrder(1004, { ...contact, type: OrderType.SELL_PALAY, requestedKg: "500.00", palayCondition: PalayCondition.FRESH, variety: "RC 160", deliveryMethod: DeliveryMethod.SELF_DELIVER }, OrderStatus.WEIGHED),
  sampleOrder(1005, { ...contact, type: OrderType.SELL_PALAY, requestedKg: "250.00", palayCondition: PalayCondition.DRY, variety: "RC 216", deliveryMethod: DeliveryMethod.IRPC_PICKUP }, OrderStatus.REJECTED),
  sampleOrder(1006, { ...contact, type: OrderType.SERVICE, requestedKg: "600.00", palayCondition: PalayCondition.DRY, serviceType: ServiceType.MILLING }, OrderStatus.SCHEDULED),
  sampleOrder(1007, { ...contact, type: OrderType.SERVICE, requestedKg: "500.00", palayCondition: PalayCondition.FRESH, serviceType: ServiceType.DRYING }, OrderStatus.DRYING),
  sampleOrder(1008, { ...contact, type: OrderType.SERVICE, requestedKg: "500.00", palayCondition: PalayCondition.FRESH, serviceType: ServiceType.DRYING_AND_MILLING }, OrderStatus.MILLING),
  sampleOrder(1009, { ...contact, type: OrderType.SERVICE, requestedKg: "300.00", palayCondition: PalayCondition.FRESH, serviceType: ServiceType.DRYING }, OrderStatus.PENDING),
];

export const seedOrderDetails: Record<number, DemoOrderDetails> = Object.fromEntries(
  seedOrders.map((order) => [order.id, { ownerId: "B-07", contactName: contact.contactName, contactPhone: contact.contactPhone }]),
);
seedOrderDetails[1001] = { ...seedOrderDetails[1001], offerId: "OF-201", batchId: "IR-1012-019" };
seedOrderDetails[1002] = { ownerId: "B-12", contactName: "Sample Trader T-02", contactPhone: "+639170000012", offerId: "OF-203", batchId: "IR-1009-006" };
seedOrderDetails[1003] = { ...seedOrderDetails[1003], offerId: "OF-202", batchId: "IR-1010-008" };

export const seedHistory: PricePoint[] = [
  { week: "Sep 8", fresh: 16, dry: 21 },
  { week: "Sep 15", fresh: 17, dry: 21 },
  { week: "Sep 22", fresh: 16, dry: 20 },
  { week: "Sep 29", fresh: 17, dry: 22 },
  { week: "Oct 6", fresh: 18, dry: 23 },
  { week: "Oct 13", fresh: 17, dry: 22 },
];

export const seedProfile: BuyerProfile = {
  id: "B-07", name: "Sample Retailer R-07", type: AccountType.BUYER, contact: "+639170000007", address: "Iloilo City",
};

// Energy and finance samples (staff)
