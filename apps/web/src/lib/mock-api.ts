import {
  ACCEPT_STATUS, ACTIVE_STATUSES, AccountType, OrderStatus, OrderType, PriceBasis, PriceItem, Role, buildReport,
  type CreateOrderRequest, type CurrentPrice, type OrderDto, type RiceTypeDto,
} from "@irpc/types";
import { ApiError, type PriceRequest, type RegisterRequest } from "./api";
import type { Batch, DemoActions, DemoWorkspace } from "./demo-types";
import { STAGES } from "./demo-types";
import {
  seedOrders, seedPrices, seedRiceTypes, seedBatches, seedOffers, seedSlots, seedBookings,
  seedHistory, seedUsers, seedAudit, seedProfile, seedKwhPrice, seedOrderDetails,
  energy, financeDays, seedForecast, PLANT,
} from "./data";
import { createMockOrder, transitionMockOrder } from "./mock-orders";

const copy = <T,>(value: T): T => structuredClone(value);
const stamp = () => new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });
const STAFF = "Plant operator";

export function createMockApi() {
  let orders = copy(seedOrders);
  let prices = copy(seedPrices);
  let riceTypes = copy(seedRiceTypes);
  let priceHistory = copy(seedPrices);
  let nextId = Math.max(...orders.map((order) => order.id)) + 1;
  let pin = "1234";
  const workspace: DemoWorkspace = copy({
    batches: seedBatches, offers: seedOffers, slots: seedSlots, bookings: seedBookings,
    history: seedHistory, users: seedUsers, audit: seedAudit, profile: seedProfile, kwhPrice: seedKwhPrice,
    orderDetails: seedOrderDetails, energy, financeDays, forecast: seedForecast, plant: PLANT,
  });
  const setField = <K extends keyof DemoWorkspace>(key: K, update: (value: DemoWorkspace[K]) => DemoWorkspace[K]) => { workspace[key] = update(workspace[key]); };
  const setBatches = (update: (value: DemoWorkspace["batches"]) => DemoWorkspace["batches"]) => setField("batches", update);
  const setOffers = (update: (value: DemoWorkspace["offers"]) => DemoWorkspace["offers"]) => setField("offers", update);
  const setSlots = (update: (value: DemoWorkspace["slots"]) => DemoWorkspace["slots"]) => setField("slots", update);
  const setBookings = (update: (value: DemoWorkspace["bookings"]) => DemoWorkspace["bookings"]) => setField("bookings", update);
  const setUsers = (update: (value: DemoWorkspace["users"]) => DemoWorkspace["users"]) => setField("users", update);
  const setRiceTypes = (update: (value: RiceTypeDto[]) => RiceTypeDto[]) => { riceTypes = update(riceTypes); };
  const setPricesState = (update: (value: CurrentPrice[]) => CurrentPrice[]) => { prices = update(prices); };
  const log = (actor: string, action: string, target: string) => {
    workspace.audit.unshift({ id: `AU-${Date.now()}-${workspace.audit.length}`, at: stamp(), actor, action, target });
  };
  function legacyActions(): DemoActions {
    const { batches, offers, bookings, slots, users } = workspace;
    const createOffer: DemoActions["createOffer"] = (batchId, kg, pricePerKg, delivery) => {
      const batch = batches.find((b) => b.id === batchId);
      if (!batch || batch.stage !== "Stored" || !Number.isFinite(kg) || kg <= 0 || kg > batch.kg || !Number.isFinite(pricePerKg) || pricePerKg <= 0) return false;
      const id = `OF-${201 + offers.length}`;
      const riceTypeId = Math.max(0, ...riceTypes.map((row) => row.id)) + 1;
      setRiceTypes((rows) => [...rows, {
        id: riceTypeId, name: `Well-milled rice (${batchId})`, description: `Rice from batch ${batchId}`,
        stockKg: kg.toFixed(2), pricePerKg: pricePerKg.toFixed(2),
      }]);
      setPricesState((rows) => [...rows, { item: PriceItem.RICE, riceTypeId, pricePerKg: pricePerKg.toFixed(2),
        basis: PriceBasis.MARKET, effectiveAt: new Date().toISOString() }]);
      setOffers((o) => [{ id, riceTypeId, batchId, grade: "Well-milled", kgAvailable: kg, pricePerKg, delivery, posted: stamp() }, ...o]);
      log(STAFF, "Posted sale offer", `${id} from ${batchId}`);
      return true;
    };

    const weighIn: DemoActions["weighIn"] = (bookingId, kg, type) => {
      const bk = bookings.find((b) => b.id === bookingId);
      if (!bk || !(kg > 0)) return null;
      const id = `IR-1016-${String(30 + batches.length).padStart(3, "0")}`;
      const at = stamp();
      const batch: Batch = {
        id, farmer: bk.farmer, farmerId: bk.farmerId, kg, type, stage: "Weighed", dryer: null, costPerKg: 0,
        soldTo: null, destination: null,
        events: [
          { stage: "Received", at, note: `${bk.id}, ${bk.farmerId} validated` },
          { stage: "Weighed", at, note: `${kg} kg ${type.toLowerCase()}, ${Math.ceil(kg / 50)} bag slips` },
        ],
      };
      setBatches((bs) => [batch, ...bs]);
      setBookings((bs) => bs.map((b) => (b.id === bookingId ? { ...b, status: "Done" } : b)));
      log(STAFF, "Weighed in batch", `${id} (${kg} kg)`);
      return id;
    };

    const addBooking: DemoActions["addBooking"] = (b) => {
      const slot = slots.find((s) => s.id === b.slotId);
      if (!slot || slot.booked >= slot.capacity || !b.farmer.trim() || !(b.kg > 0)) return false;
      setBookings((bs) => [{ id: `BK-${301 + bs.length}`, status: "Confirmed", ...b }, ...bs]);
      setSlots((ss) => ss.map((s) => (s.id === b.slotId ? { ...s, booked: s.booked + 1 } : s)));
      log(STAFF, `Added ${b.channel.toLowerCase()} booking`, `${b.farmer}, ${slot.date} ${slot.time}`);
      return true;
    };

    const setBookingStatus: DemoActions["setBookingStatus"] = (id, status) => {
      setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b)));
      log(STAFF, `Booking ${status.toLowerCase()}`, id);
    };

    const advanceBatch: DemoActions["advanceBatch"] = (id) => {
      const b = batches.find((x) => x.id === id);
      if (!b) return;
      const next = STAGES[STAGES.indexOf(b.stage) + 1];
      if (!next || next === "Sold") return;
      const dryer = next === "Drying" ? (batches.filter((x) => x.stage === "Drying").length % 5) + 1 : b.dryer;
      const note = next === "Drying" ? `Dryer ${dryer}` : next === "Milling" ? "Milling line" : "Moved to storage";
      setBatches((bs) => bs.map((x) => (x.id === id ? { ...x, stage: next, dryer, events: [...x.events, { stage: next, at: stamp(), note }] } : x)));
      log(STAFF, `Batch moved to ${next.toLowerCase()}`, id);
    };

    const addUser: DemoActions["addUser"] = (name, role, contact) => {
      setUsers((u) => [...u, { id: `U-${String(u.length + 1).padStart(2, "0")}`, name, role, contact, active: true }]);
      log("System admin", "Added user", `${name} (${role})`);
    };

    const toggleUser: DemoActions["toggleUser"] = (id) => {
      const u = users.find((x) => x.id === id);
      if (!u) return;
      setUsers((us) => us.map((x) => (x.id === id ? { ...x, active: !x.active } : x)));
      log("System admin", u.active ? "Deactivated user" : "Activated user", u.name);
    };


    return { createOffer, weighIn, addBooking, setBookingStatus, advanceBatch, addUser, toggleUser,
      setKwhPrice: (price) => { workspace.kwhPrice = price; },
      updateProfile: (profile) => { workspace.profile = copy(profile); },
    };
  }

  const user = () => ({ id: workspace.profile.id, name: workspace.profile.name, phone: workspace.profile.contact,
    accountType: workspace.profile.type, role: Role.USER, language: "EN", municipality: workspace.profile.address });
  const findOrder = (id: number, own = false) => {
    const order = orders.find((row) => row.id === id);
    if (!order || (own && workspace.orderDetails[id]?.ownerId !== workspace.profile.id)) throw new ApiError(404, "Order not found.");
    return order;
  };
  const adminOrder = (order: OrderDto) => ({ ...order, customer: {
    id: workspace.orderDetails[order.id]?.ownerId,
    name: workspace.orderDetails[order.id]?.contactName,
    phone: workspace.orderDetails[order.id]?.contactPhone,
  } });
  function transition(order: OrderDto, status: OrderStatus, options: { scheduledDate?: string; reason?: string } = {}) {
    const result = transitionMockOrder(order, status, prices, riceTypes, options);
    orders = orders.map((row) => row.id === order.id ? result.order : row);
    riceTypes = result.riceTypes;
    log(STAFF, `Order ${status.toLowerCase()}`, order.ref);
    return result.order;
  }

  function dispatch(path: string, method: string, body: unknown): unknown {
    const url = new URL(path, "http://mock.local");
    const route = url.pathname;
    if (route === "/auth/me" && method === "GET") return user();
    if (route === "/auth/login" && method === "POST") {
      const input = body as { phone: string; pin: string };
      if (input.phone !== workspace.profile.contact || input.pin !== pin) throw new ApiError(401, "Incorrect phone or PIN.");
      return { token: "mock-session", user: user() };
    }
    if (route === "/auth/register" && method === "POST") {
      const input = body as RegisterRequest;
      if (!input.name?.trim() || !/^\+639\d{9}$/.test(input.phone) || !input.pin || input.consent !== true) throw new ApiError(400, "Complete the registration details.");
      workspace.profile = { id: `demo-${Date.now()}`, name: input.name, contact: input.phone, type: input.accountType ?? AccountType.BUYER, address: input.municipality ?? "" };
      pin = input.pin;
      return { token: "mock-session", user: user() };
    }
    if (route === "/prices" && method === "GET") return prices;
    if (route === "/rice-types" && method === "GET") return riceTypes;
    if (route === "/settings" && method === "GET") return {
      dryingRecovery: "0.80", millingRecovery: "0.60", sackKg: "50", dryingCapacityKg: "56000.00",
    };
    if (route === "/orders/mine" && method === "GET") return orders.filter((order) =>
      workspace.orderDetails[order.id]?.ownerId === workspace.profile.id && (url.searchParams.get("active") !== "true" || ACTIVE_STATUSES.includes(order.status)));
    if (route === "/orders" && method === "POST") {
      const input = body as CreateOrderRequest;
      const order = createMockOrder(input, nextId++, prices, riceTypes);
      const offer = workspace.offers.find((row) => row.riceTypeId === order.riceTypeId);
      orders.unshift(order);
      workspace.orderDetails[order.id] = { ownerId: workspace.profile.id, contactName: input.contactName,
        contactPhone: input.contactPhone, ...(offer ? { offerId: offer.id, batchId: offer.batchId } : {}) };
      return order;
    }
    if (route === "/admin/orders" && method === "POST") {
      const input = body as CreateOrderRequest & { consent?: boolean };
      if (input.consent !== true) throw new ApiError(400, "Ask the customer if IRPC may store their details and text them updates.");
      const order = createMockOrder(input, nextId++, prices, riceTypes);
      orders.unshift(order);
      workspace.orderDetails[order.id] = { ownerId: `walk-in-${input.contactPhone}`, contactName: input.contactName, contactPhone: input.contactPhone };
      return order;
    }
    if (route === "/admin/orders" && method === "GET") return orders.filter((order) =>
      (!url.searchParams.get("status") || order.status === url.searchParams.get("status")) &&
      (!url.searchParams.get("type") || order.type === url.searchParams.get("type"))).map(adminOrder);
    const match = route.match(/^\/(admin\/)?orders\/(\d+)(?:\/(.+))?$/);
    if (match) {
      const order = findOrder(Number(match[2]), !match[1]);
      const action = match[3];
      if (!action && method === "GET") return match[1] ? adminOrder(order) : order;
      if (!match[1] && method === "POST") {
        if (action === "cancel") {
          if (order.status !== OrderStatus.PENDING) throw new ApiError(409, "Only pending orders can be cancelled.");
          return transition(order, OrderStatus.CANCELLED);
        }
        if (action === "confirm-weight") {
          if (order.type === OrderType.BUY_RICE || order.status !== OrderStatus.WEIGHED || order.finalAmount === null) throw new ApiError(409, "There is no weight to confirm yet.");
          const updated = { ...order, weightConfirmedAt: order.weightConfirmedAt ?? new Date().toISOString() };
          orders = orders.map((row) => row.id === order.id ? updated : row);
          return updated;
        }
      }
      if (match[1] && method === "PATCH") {
        const input = body as { scheduledDate?: string; reason?: string; status?: OrderStatus; note?: string };
        if (action === "accept" || action === "reject") {
          if (order.status !== OrderStatus.PENDING) throw new ApiError(409, "This order has already been reviewed.");
          return transition(order, action === "accept" ? ACCEPT_STATUS[order.type] : OrderStatus.REJECTED, input);
        }
        if (action === "status") {
          if (order.status === OrderStatus.PENDING) throw new ApiError(409, "Accept or reject the order first.");
          if (!input.status) throw new ApiError(400, "Choose the next status.");
          const updated = transition(order, input.status);
          if (input.note && updated.events?.length) updated.events[updated.events.length - 1].note = input.note;
          return updated;
        }
      }
      if (match[1] && action === "confirm-weight" && method === "POST") {
        const awaiting = (order.status === OrderStatus.WEIGHED || (order.status === OrderStatus.DRYING && order.dryKg)) && !order.weightConfirmedAt;
        if (!awaiting) throw new ApiError(409, "There is no weight waiting for confirmation.");
        const updated = { ...order, weightConfirmedAt: new Date().toISOString() };
        orders = orders.map((row) => row.id === order.id ? updated : row);
        return updated;
      }
      // After drying / milling the order stays in its step; only the weight is recorded.
      if (match[1] && action === "weigh-in" && method === "POST" && (order.status === OrderStatus.DRYING || order.status === OrderStatus.MILLING)) {
        const input = body as { dryKg?: string; riceKg?: string };
        const kg = order.status === OrderStatus.DRYING ? input.dryKg : input.riceKg;
        if (!kg || !(Number(kg) > 0)) throw new ApiError(400, "Enter the weight for this step.");
        const updated = order.status === OrderStatus.DRYING
          ? { ...order, dryKg: Number(kg).toFixed(2), weightConfirmedAt: null }
          : { ...order, riceKg: Number(kg).toFixed(2),
              finalAmount: ((order.wetKg ? Number(order.wetKg) * Number(order.dryingRate ?? 0) : 0) + Number(kg) * Number(order.millingRate ?? 0)).toFixed(2) };
        orders = orders.map((row) => row.id === order.id ? updated : row);
        return updated;
      }
      if (match[1] && action === "weigh-in" && method === "POST") {
        if (order.type === OrderType.BUY_RICE || order.status !== OrderStatus.RECEIVED) throw new ApiError(409, "This order is not awaiting weigh-in.");
        const input = body as { wetKg?: string; dryKg?: string; riceKg?: string };
        const values = Object.values(input);
        if (!values.length || values.some((weight) => !Number.isFinite(Number(weight)) || Number(weight) <= 0)) throw new ApiError(400, "Enter a valid weight.");
        const weighed = { ...order, ...input, weightConfirmedAt: null };
        if (order.type === OrderType.SELL_PALAY) {
          const kg = order.palayCondition === "FRESH" ? weighed.wetKg : weighed.dryKg;
          if (!kg) throw new ApiError(400, "Enter the weight for this palay condition.");
          weighed.finalAmount = (Number(kg) * Number(order.unitPrice)).toFixed(2);
        } else weighed.finalAmount = (Number(weighed.wetKg) * Number(order.dryingRate) + Number(weighed.riceKg) * Number(order.millingRate)).toFixed(2);
        return transition(weighed, OrderStatus.WEIGHED);
      }
    }
    if (route === "/admin/prices" && method === "POST") {
      const input = body as PriceRequest;
      if (!Number.isFinite(Number(input.pricePerKg)) || Number(input.pricePerKg) <= 0) throw new ApiError(400, "Enter a price above zero.");
      if (input.item === PriceItem.RICE && !riceTypes.some((rice) => rice.id === input.riceTypeId)) throw new ApiError(400, "Choose a rice type.");
      const row: CurrentPrice = { item: input.item, riceTypeId: input.item === PriceItem.RICE ? input.riceTypeId! : null,
        pricePerKg: Number(input.pricePerKg).toFixed(2), basis: input.basis, effectiveAt: new Date().toISOString() };
      priceHistory.unshift(row);
      prices = [...prices.filter((price) => price.item !== row.item || price.riceTypeId !== row.riceTypeId), row];
      if (row.item === PriceItem.RICE) riceTypes = riceTypes.map((rice) => rice.id === row.riceTypeId ? { ...rice, pricePerKg: row.pricePerKg } : rice);
      log(STAFF, "Updated price", `${row.item}: ${row.pricePerKg}`);
      return row;
    }
    if (route === "/admin/prices/history" && method === "GET") return priceHistory.filter((price) => !url.searchParams.get("item") || price.item === url.searchParams.get("item"));
    const stockMatch = route.match(/^\/admin\/rice-types\/(\d+)\/stock$/);
    if (stockMatch && method === "POST") {
      const rice = riceTypes.find((row) => row.id === Number(stockMatch[1]));
      if (!rice) throw new ApiError(404, "Rice type not found.");
      const input = body as { changeKg: string; reason: string };
      const stockKg = Number(rice.stockKg) + Number(input.changeKg);
      if (!input.reason?.trim() || !Number.isFinite(stockKg) || stockKg < 0) throw new ApiError(400, "Enter a reason and a valid stock change.");
      const updated = { ...rice, stockKg: stockKg.toFixed(2) };
      riceTypes = riceTypes.map((row) => row.id === rice.id ? updated : row);
      return updated;
    }
    if (route === "/admin/summary" && method === "GET") return {
      needsApproval: orders.filter((order) => order.status === OrderStatus.PENDING).length,
      arrivingToday: orders.filter((order) => order.scheduledDate?.slice(0, 10) === new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date())).length,
      inDrying: orders.filter((order) => order.status === OrderStatus.DRYING).length,
      readyForPickup: orders.filter((order) => order.status === OrderStatus.READY_FOR_PICKUP).length,
      // Same rule as the API: fresh palay bought, plus drying bookings, scheduled for today.
      dryingKgBookedToday: orders.filter((order) => order.scheduledDate?.slice(0, 10) === new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date())
        && (order.type === OrderType.SELL_PALAY ? order.palayCondition === "FRESH" : order.serviceType === "DRYING" || order.serviceType === "DRYING_AND_MILLING"))
        .reduce((total, order) => total + Number(order.requestedKg), 0).toFixed(2),
      dryingCapacityKg: "56000",
    };
    if (route === "/admin/money" && method === "GET") {
      const from = url.searchParams.get("from") ?? "0000-01-01";
      const to = url.searchParams.get("to") ?? "9999-12-31";
      const paid = orders.filter((order) => (order.status === OrderStatus.PAID || order.status === OrderStatus.COMPLETED)
        && order.finalAmount !== null && order.createdAt.slice(0, 10) >= from && order.createdAt.slice(0, 10) <= to);
      const sum = (type: OrderType) => paid.filter((order) => order.type === type).reduce((total, order) => total + Number(order.finalAmount), 0);
      const boughtPalay = sum(OrderType.SELL_PALAY), soldRice = sum(OrderType.BUY_RICE), serviceFees = sum(OrderType.SERVICE);
      return { from, to, boughtPalay: boughtPalay.toFixed(2), soldRice: soldRice.toFixed(2), serviceFees: serviceFees.toFixed(2),
        grossProfit: (soldRice + serviceFees - boughtPalay).toFixed(2) };
    }
    if (route === "/admin/report" && method === "GET") {
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
      const from = url.searchParams.get("from") || `${today.slice(0, 4)}-01-01`;
      const to = url.searchParams.get("to") || today;
      // Demo orders have no paidAt, so the order date stands in for it.
      const owners = new Map<string, number>();
      const rows = orders.filter((order) => (order.status === OrderStatus.PAID || order.status === OrderStatus.COMPLETED) && order.finalAmount !== null
        && order.createdAt.slice(0, 10) >= from && order.createdAt.slice(0, 10) <= to).map((order) => {
        const owner = workspace.orderDetails[order.id]?.ownerId ?? order.contactName;
        if (!owners.has(owner)) owners.set(owner, owners.size + 1);
        const n = (v: string | null) => v === null ? null : Number(v);
        return { type: order.type, serviceType: order.serviceType, palayCondition: order.palayCondition, finalAmount: Number(order.finalAmount),
          wetKg: n(order.wetKg), dryKg: n(order.dryKg), riceKg: n(order.riceKg), requestedKg: Number(order.requestedKg), dryingRate: n(order.dryingRate),
          paidAt: new Date(order.createdAt), customerId: owners.get(owner)!, customerName: workspace.orderDetails[order.id]?.contactName ?? order.contactName, town: "Pototan" };
      });
      return buildReport(rows, from, to);
    }
    if (route === "/admin/sms-logs" && method === "GET") return [];
    throw new ApiError(501, "This feature is not connected yet.");
  }

  return {
    request: async <T,>(path: string, method: string, body?: unknown): Promise<T> => {
      try { return copy(dispatch(path, method, body)) as T; }
      catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(400, error instanceof Error ? error.message : "Invalid request."); }
    },
    getWorkspace: () => copy(workspace),
    demoAction: <K extends keyof DemoActions>(name: K, ...args: Parameters<DemoActions[K]>): ReturnType<DemoActions[K]> => {
      const action = legacyActions()[name] as unknown as (...args: Parameters<DemoActions[K]>) => ReturnType<DemoActions[K]>;
      return copy(action(...args));
    },
  };
}
