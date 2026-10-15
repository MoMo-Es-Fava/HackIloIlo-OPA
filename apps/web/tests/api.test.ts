import assert from "node:assert/strict";
import test from "node:test";
import { OrderStatus, OrderType, PalayCondition, PriceBasis, PriceItem, ServiceType, type CreateOrderRequest } from "@irpc/types";
import { ApiError, createApiClient } from "../src/lib/api";
import { loadWorkspace } from "../src/lib/workspace";

const buy: CreateOrderRequest = {
  type: OrderType.BUY_RICE, requestedKg: "100.00", riceTypeId: 1, preferredDate: "2026-10-18",
  contactName: "Test buyer", contactPhone: "+639170000007",
};
const mockClient = () => createApiClient({ useMock: true, baseUrl: "http://api.test", fetcher: async () => { throw new Error("Mock request leaked to HTTP"); } });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

test("mock order lifecycle persists across reads and reserves stock only on acceptance", async () => {
  const client = mockClient();
  const stock = (await client.getRiceTypes())[0].stockKg;
  const order = await client.createOrder(buy);
  assert.equal(order.status, OrderStatus.PENDING);
  assert.equal((await client.getRiceTypes())[0].stockKg, stock);
  assert.ok((await client.getMyOrders(true)).some((row) => row.id === order.id));
  const accepted = await client.acceptOrder(order.id);
  assert.equal(accepted.status, OrderStatus.ACCEPTED);
  assert.equal(accepted.unitPrice, "50.70");
  assert.equal((await client.getRiceTypes())[0].stockKg, (Number(stock) - 100).toFixed(2));
  assert.equal((await client.getOrder(order.id)).status, OrderStatus.ACCEPTED);
  assert.equal((await client.adminListOrders({ status: OrderStatus.ACCEPTED, type: OrderType.BUY_RICE })).some((row) => row.id === order.id), true);
  await assert.rejects(client.cancelOrder(order.id), (error: ApiError) => error.status === 409);
  await assert.rejects(client.acceptOrder(order.id));
  const prepared = await client.updateOrderStatus(order.id, OrderStatus.PREPARING, "Packing rice");
  assert.equal(prepared.events?.at(-1)?.note, "Packing rice");
  const freshRead = await client.getOrder(order.id);
  freshRead.status = OrderStatus.COMPLETED;
  assert.equal((await client.getOrder(order.id)).status, OrderStatus.PREPARING, "responses must not expose mutable mock state");
});

test("mock ownership, rejection, cancellation, and weight confirmation follow separate endpoints", async () => {
  const client = mockClient();
  await assert.rejects(client.getOrder(1002), (error: ApiError) => error.status === 404);
  assert.equal((await client.getMyOrders()).some((row) => row.id === 1002), false);
  assert.equal((await client.adminGetOrder(1002)).customer?.name, "Sample Trader T-02");
  const pending = await client.createOrder(buy);
  await assert.rejects(client.updateOrderStatus(pending.id, OrderStatus.ACCEPTED));
  await assert.rejects(client.rejectOrder(pending.id, " "));
  assert.equal((await client.rejectOrder(pending.id, "No capacity")).rejectReason, "No capacity");
  assert.equal((await client.getMyOrders(true)).some((row) => row.id === pending.id), false);
  const other = await client.createOrder(buy);
  assert.equal((await client.cancelOrder(other.id)).status, OrderStatus.CANCELLED);
  await assert.rejects(client.confirmWeight(other.id));
  assert.ok((await client.confirmWeight(1004)).weightConfirmedAt);
  assert.equal((await client.updateOrderStatus(1004, OrderStatus.PAID)).status, OrderStatus.PAID);
});

test("mock service acceptance requires a date and retains rates after prices change", async () => {
  const client = mockClient();
  const order = await client.createOrder({ ...buy, type: OrderType.SERVICE, serviceType: ServiceType.DRYING_AND_MILLING, palayCondition: PalayCondition.FRESH });
  await assert.rejects(client.acceptOrder(order.id));
  const scheduled = await client.acceptOrder(order.id, "2026-10-19");
  assert.equal(scheduled.status, OrderStatus.SCHEDULED);
  assert.equal(scheduled.dryingRate, "1.60");
  assert.equal(scheduled.millingRate, "3.30");
  await client.createPrice({ item: PriceItem.DRYING_FEE, pricePerKg: "2.00", basis: PriceBasis.MARKET, notifyUsers: false });
  assert.equal((await client.getOrder(order.id)).dryingRate, "1.60");
  assert.equal((await client.getPrices()).find((row) => row.item === PriceItem.DRYING_FEE)?.pricePerKg, "2.00");
  assert.equal((await client.getPriceHistory(PriceItem.DRYING_FEE)).length, 2);
});

test("concurrent mock acceptances cannot oversell a rice type", async () => {
  const client = mockClient();
  const first = await client.createOrder({ ...buy, requestedKg: "800.00" });
  const second = await client.createOrder({ ...buy, requestedKg: "800.00" });
  const results = await Promise.allSettled([client.acceptOrder(first.id), client.acceptOrder(second.id)]);
  assert.equal(results.filter((row) => row.status === "fulfilled").length, 1);
  assert.equal((await client.getRiceTypes())[0].stockKg, "400.00");
});

test("HTTP mode uses contract routes, query filters, methods, JSON bodies, and JWT headers", async () => {
  const requests: { url: string; init?: RequestInit }[] = [];
  const client = createApiClient({ useMock: false, baseUrl: "http://api.test/", getToken: () => "test-jwt",
    fetcher: async (url, init) => { requests.push({ url: String(url), init }); return json({}); } });
  await client.getPrices(); await client.getRiceTypes(); await client.createOrder(buy);
  await client.getMyOrders(true); await client.getOrder(42); await client.confirmWeight(42);
  await client.adminListOrders({ status: OrderStatus.PENDING, type: OrderType.SERVICE });
  await client.acceptOrder(42, "2026-10-19"); await client.rejectOrder(42, "No capacity");
  await client.cancelOrder(42); await client.adminGetOrder(42);
  await client.updateOrderStatus(42, OrderStatus.PREPARING);
  assert.deepEqual(requests.map((row) => [row.init?.method, new URL(row.url).pathname + new URL(row.url).search]), [
    ["GET", "/prices"], ["GET", "/rice-types"], ["POST", "/orders"], ["GET", "/orders/mine?active=true"],
    ["GET", "/orders/42"], ["POST", "/orders/42/confirm-weight"], ["GET", "/admin/orders?status=PENDING&type=SERVICE"],
    ["PATCH", "/admin/orders/42/accept"], ["PATCH", "/admin/orders/42/reject"], ["POST", "/orders/42/cancel"],
    ["GET", "/admin/orders/42"], ["PATCH", "/admin/orders/42/status"],
  ]);
  assert.equal(new Headers(requests[0].init?.headers).get("Authorization"), null);
  assert.equal(new Headers(requests[2].init?.headers).get("Authorization"), "Bearer test-jwt");
  assert.equal(new Headers(requests[2].init?.headers).get("Content-Type"), "application/json");
  assert.deepEqual(JSON.parse(requests[2].init?.body as string), buy);
  assert.deepEqual(JSON.parse(requests[7].init?.body as string), { scheduledDate: "2026-10-19" });
  assert.deepEqual(JSON.parse(requests[8].init?.body as string), { reason: "No capacity" });
  assert.throws(() => client.getOrder(NaN), (error: ApiError) => error.status === 400);
});

test("HTTP failures stay failures instead of falling back to sample data", async () => {
  for (const status of [401, 403, 404, 500]) {
    const client = createApiClient({ useMock: false, baseUrl: "http://api.test", fetcher: async () => json({ message: "Backend error" }, status) });
    await assert.rejects(client.getPrices(), (error: ApiError) => error.status === status && error.message === "Backend error");
  }
  const validation = createApiClient({ useMock: false, baseUrl: "http://api.test", getToken: () => "jwt", fetcher: async () => json({ message: ["Invalid quantity", "Name required"] }, 400) });
  await assert.rejects(validation.createOrder(buy), /Invalid quantity Name required/);
  const malformed = createApiClient({ useMock: false, baseUrl: "http://api.test", fetcher: async () => new Response("not json") });
  await assert.rejects(malformed.getPrices(), (error: ApiError) => error.status === 502);
  const offline = createApiClient({ useMock: false, baseUrl: "http://api.test", fetcher: async () => { throw new TypeError("fetch failed"); } });
  await assert.rejects(offline.getPrices(), (error: ApiError) => error.status === 0);
  const noAuth = createApiClient({ useMock: false, baseUrl: "http://api.test", getToken: () => null, fetcher: async () => { assert.fail("Protected request sent without a token"); } });
  await assert.rejects(noAuth.getMyOrders(), (error: ApiError) => error.status === 401);
});

test("HTTP requests time out and /health always reaches the real server", async () => {
  const slow = createApiClient({ useMock: false, baseUrl: "http://api.test", timeoutMs: 5,
    fetcher: (_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))) });
  await assert.rejects(slow.getPrices(), /timed out/);
  let calls = 0;
  const client = createApiClient({ useMock: true, baseUrl: "http://api.test", fetcher: async (url, init) => {
    calls++; assert.equal(String(url), "http://api.test/health");
    assert.equal(new Headers(init?.headers).get("Authorization"), null);
    return json({ status: "ok", time: "2026-10-14T00:00:00.000Z" });
  } });
  assert.equal((await client.getHealth()).status, "ok");
  assert.equal(calls, 1);
});

test("workspace reads switch to HTTP without fixture ownership fields or legacy data", async () => {
  const source = mockClient();
  const riceTypes = await source.getRiceTypes();
  const prices = await source.getPrices();
  const example = await source.getOrder(1001);
  const realOrder = { ...example, id: 9001, ref: "IRPC-9001" };
  const calls: string[] = [];
  const client = createApiClient({ useMock: false, baseUrl: "http://api.test", getToken: () => "jwt", fetcher: async (url) => {
    const path = new URL(String(url)).pathname; calls.push(path);
    if (path === "/prices") return json(prices);
    if (path === "/rice-types") return json(riceTypes);
    if (path === "/auth/me") return json({ id: 77, name: "API Buyer", phone: "+639171234567", accountType: "BUYER" });
    if (path === "/orders/mine") return json([]);
    if (path === "/orders/9001") return json(realOrder);
    return json({ message: "Not found" }, 404);
  } });
  const data = await loadWorkspace(client, "/buyer/orders/9001", true);
  assert.deepEqual(data.orders, [realOrder]);
  assert.ok(calls.includes("/orders/9001"));
  assert.equal(data.profile.name, "API Buyer");
  assert.deepEqual(data.batches, []);
  assert.deepEqual(data.orderDetails, {});
  assert.equal(data.offers[0].id, "1");
  assert.equal(data.offers[0].batchId, "");
  assert.equal(await client.getDemoWorkspace(), null);
  await assert.rejects(client.demoAction("setKwhPrice", 10), (error: ApiError) => error.status === 501);
  calls.length = 0;
  await loadWorkspace(client, "/buyer/prices", false);
  assert.deepEqual(calls.sort(), ["/prices", "/rice-types"]);
  calls.length = 0;
  await loadWorkspace(client, "/staff/forecast", true);
  assert.deepEqual(calls, []);
});

test("authentication routes load without depending on workspace API availability", async () => {
  const calls: string[] = [];
  const client = createApiClient({
    useMock: false,
    baseUrl: "http://api.test",
    fetcher: async (url) => {
      calls.push(String(url));
      throw new Error("Authentication routes must not load workspace data");
    },
  });

  for (const path of ["/login", "/signup", "/register"]) {
    const data = await loadWorkspace(client, path, false);
    assert.deepEqual(data.orders, []);
    assert.deepEqual(data.prices, []);
    assert.deepEqual(data.riceTypes, []);
  }
  assert.deepEqual(calls, []);
});

test("mock workspace survives navigation while independent clients remain isolated", async () => {
  const client = mockClient();
  const created = await client.createOrder(buy);
  assert.ok((await loadWorkspace(client, "/buyer/orders", false)).orders.some((row) => row.id === created.id));
  assert.ok((await loadWorkspace(client, "/staff/sales", false)).orders.some((row) => row.id === created.id));
  await client.demoAction("setKwhPrice", 20);
  assert.equal((await client.getDemoWorkspace())?.kwhPrice, 20);
  assert.equal((await mockClient().getMyOrders()).some((row) => row.id === created.id), false);
});
