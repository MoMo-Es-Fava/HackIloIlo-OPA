import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransition, OrderStatus, OrderType, PalayCondition, PriceItem, Role, ServiceType,
  orderRef, type CreateOrderRequest, type OrderDto,
} from "@irpc/types";
import { seedOrders, seedPrices, seedRiceTypes, seedUsers } from "../src/lib/data";
import { createMockOrder, transitionMockOrder } from "../src/lib/mock-orders";
import { orderSteps } from "../src/lib/orders";

const request: CreateOrderRequest = {
  type: OrderType.BUY_RICE, riceTypeId: 1, requestedKg: "100.50", preferredDate: "2026-10-16",
  contactName: "Test buyer", contactPhone: "+639170000007",
};
const create = (overrides: Partial<CreateOrderRequest> = {}) => createMockOrder(
  { ...request, ...overrides }, 42, seedPrices, seedRiceTypes, "2026-10-14T00:00:00.000Z",
);

test("fixtures serialize to API records with all order types and legal event histories", () => {
  const orders: OrderDto[] = JSON.parse(JSON.stringify(seedOrders));
  assert.deepEqual(new Set(orders.map((order) => order.type)), new Set(Object.values(OrderType)));
  assert.equal(new Set(orders.map((order) => order.id)).size, orders.length);
  const decimalFields = ["requestedKg", "unitPrice", "dryingRate", "millingRate", "wetKg", "dryKg", "riceKg", "estimatedAmount", "finalAmount"] as const;
  for (const order of orders) {
    assert.equal(order.ref, orderRef(order.id));
    assert.ok(Object.values(OrderStatus).includes(order.status));
    assert.ok(!("buyerId" in order) && !("batchId" in order) && !("contactName" in order));
    for (const field of decimalFields) {
      if (order[field] !== null) assert.match(order[field]!, /^\d+\.\d{2}$/);
    }
    for (const field of ["createdAt", "preferredDate", "scheduledDate", "weightConfirmedAt"] as const) {
      if (order[field] !== null) assert.ok(Number.isFinite(Date.parse(order[field]!)));
    }
    const events = order.events!;
    assert.equal(events[0].fromStatus, null);
    assert.equal(events[0].toStatus, OrderStatus.PENDING);
    for (let index = 1; index < events.length; index++) {
      assert.equal(events[index].fromStatus, events[index - 1].toStatus);
      assert.ok(canTransition(order.type, events[index].fromStatus!, events[index].toStatus));
      assert.ok(Date.parse(events[index].createdAt) >= Date.parse(events[index - 1].createdAt));
    }
    assert.equal(events.at(-1)?.toStatus, order.status);
  }
  assert.ok(seedUsers.every((user) => Object.values(Role).includes(user.role)));
  for (const rice of seedRiceTypes) {
    assert.equal(seedPrices.find((price) => price.item === PriceItem.RICE && price.riceTypeId === rice.id)?.pricePerKg, rice.pricePerKg);
  }
});

test("pending order uses the rice-specific price, decimal quantities, and no locked price", () => {
  const before = JSON.stringify(seedRiceTypes);
  const order = create();
  assert.equal(order.ref, "IRPC-0042");
  assert.equal(order.estimatedAmount, "5095.35");
  assert.equal(order.requestedKg, "100.50");
  assert.equal(order.unitPrice, null);
  assert.equal(order.scheduledDate, null);
  assert.equal(order.finalAmount, null);
  assert.equal(JSON.stringify(seedRiceTypes), before);
  const cancelled = transitionMockOrder(order, OrderStatus.CANCELLED, seedPrices, seedRiceTypes);
  assert.deepEqual(cancelled.riceTypes, seedRiceTypes);
});

test("invalid requests cannot create sample orders", () => {
  for (const requestedKg of ["0", "-1", "Infinity", "NaN", "1200.01"]) {
    assert.throws(() => create({ requestedKg }));
  }
  assert.throws(() => create({ riceTypeId: 999 }));
  assert.throws(() => create({ contactName: " " }));
  assert.throws(() => create({ contactPhone: "09XX XXX 0007" }));
  assert.throws(() => create({ preferredDate: "" }));
});

test("acceptance locks current prices and reserves stock once without mutating input", () => {
  const pending = create();
  const changedPrices = seedPrices.map((price) => price.item === PriceItem.RICE && price.riceTypeId === 1
    ? { ...price, pricePerKg: "40.00" } : price);
  const accepted = transitionMockOrder(pending, OrderStatus.ACCEPTED, changedPrices, seedRiceTypes);
  assert.equal(accepted.order.unitPrice, "40.00");
  assert.equal(accepted.order.finalAmount, "4020.00");
  assert.equal(accepted.order.scheduledDate, request.preferredDate);
  assert.equal(accepted.riceTypes[0].stockKg, "1099.50");
  assert.equal(seedRiceTypes[0].stockKg, "1200.00");
  assert.equal(pending.status, OrderStatus.PENDING);
  assert.throws(() => transitionMockOrder(accepted.order, OrderStatus.ACCEPTED, changedPrices, accepted.riceTypes));
  const prepared = transitionMockOrder(accepted.order, OrderStatus.PREPARING, seedPrices, accepted.riceTypes);
  assert.equal(prepared.order.unitPrice, "40.00");
  const lowStock = seedRiceTypes.map((rice) => ({ ...rice, stockKg: "50.00" }));
  assert.throws(() => transitionMockOrder(pending, OrderStatus.ACCEPTED, seedPrices, lowStock));
  assert.equal(lowStock[0].stockKg, "50.00");
});

test("all service paths follow ORDER_FLOW and only include the selected service", () => {
  for (const serviceType of Object.values(ServiceType)) {
    const pending = create({ type: OrderType.SERVICE, serviceType, palayCondition: PalayCondition.FRESH });
    const steps = orderSteps(pending);
    assert.equal(steps.includes(OrderStatus.DRYING), serviceType !== ServiceType.MILLING);
    assert.equal(steps.includes(OrderStatus.MILLING), serviceType !== ServiceType.DRYING);
    for (let index = 1; index < steps.length; index++) assert.ok(canTransition(pending.type, steps[index - 1], steps[index]));
    assert.throws(() => transitionMockOrder(pending, OrderStatus.ACCEPTED, seedPrices, seedRiceTypes));
    assert.throws(() => transitionMockOrder(pending, OrderStatus.SCHEDULED, seedPrices, seedRiceTypes));
    const scheduled = transitionMockOrder(pending, OrderStatus.SCHEDULED, seedPrices, seedRiceTypes, { scheduledDate: "2026-10-17" });
    assert.equal(scheduled.order.scheduledDate, "2026-10-17");
    assert.equal(scheduled.order.dryingRate, serviceType === ServiceType.MILLING ? null : "1.60");
    assert.equal(scheduled.order.millingRate, serviceType === ServiceType.DRYING ? null : "3.30");
    assert.deepEqual(scheduled.riceTypes, seedRiceTypes);
  }
});

test("rejection needs a reason, closes the order, and records the transition", () => {
  const pending = create();
  assert.throws(() => transitionMockOrder(pending, OrderStatus.PAID, seedPrices, seedRiceTypes));
  assert.throws(() => transitionMockOrder(pending, OrderStatus.REJECTED, seedPrices, seedRiceTypes, { reason: " " }));
  const rejected = transitionMockOrder(pending, OrderStatus.REJECTED, seedPrices, seedRiceTypes, { reason: " No capacity " });
  assert.equal(rejected.order.rejectReason, "No capacity");
  assert.equal(rejected.order.unitPrice, null);
  assert.equal(rejected.order.events?.at(-1)?.fromStatus, OrderStatus.PENDING);
  assert.equal(rejected.order.events?.at(-1)?.note, "No capacity");
  assert.throws(() => transitionMockOrder(rejected.order, OrderStatus.ACCEPTED, seedPrices, seedRiceTypes));
});

test("palay payout uses its condition price and waits for farmer weight confirmation", () => {
  assert.equal(create({ type: OrderType.SELL_PALAY, requestedKg: "500", palayCondition: PalayCondition.FRESH }).estimatedAmount, "8500.00");
  assert.equal(create({ type: OrderType.SELL_PALAY, requestedKg: "500", palayCondition: PalayCondition.DRY }).estimatedAmount, "11000.00");
  const weighed = seedOrders.find((order) => order.type === OrderType.SELL_PALAY && order.status === OrderStatus.WEIGHED)!;
  assert.throws(() => transitionMockOrder(weighed, OrderStatus.PAID, seedPrices, seedRiceTypes));
  const confirmed = { ...weighed, weightConfirmedAt: "2026-10-14T00:00:00.000Z" };
  assert.equal(transitionMockOrder(confirmed, OrderStatus.PAID, seedPrices, seedRiceTypes).order.status, OrderStatus.PAID);
});
