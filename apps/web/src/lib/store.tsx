"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import {
  OrderStatus, OrderType, PalayCondition, PriceBasis, PriceItem, ServiceType,
  type CurrentPrice, type OrderDto, type RiceTypeDto, type Role,
} from "@irpc/types";
import { createMockOrder, transitionMockOrder, type TransitionOptions } from "./mock-orders";
import { currentPrice } from "./orders";
import { dateLabel } from "./format";
import {
  seedAudit, seedBatches, seedBookings, seedHistory, seedKwhPrice, seedOffers, seedOrders,
  seedPrices, seedProfile, seedRiceTypes, seedOrderDetails, seedSlots, seedUsers, STAGES,
  type AuditEntry, type Batch, type Booking, type BookingStatus, type BuyerProfile, type Delivery,
  type GrainType, type Offer, type PricePoint, type DemoOrderDetails, type Slot, type User,
} from "./data";

const stamp = () => new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
const STAFF = "Plant operator";

interface Store {
  batches: Batch[]; offers: Offer[]; orders: OrderDto[]; slots: Slot[]; bookings: Booking[];
  prices: CurrentPrice[]; riceTypes: RiceTypeDto[];
  palayPrices: { fresh: number; dry: number; basis: PriceBasis; updated: string };
  orderDetails: Record<number, DemoOrderDetails>; orderError: string | null; history: PricePoint[]; users: User[]; audit: AuditEntry[];
  serviceRequests: OrderDto[]; profile: BuyerProfile; kwhPrice: number;
  reserveOffer: (offerId: string, kg: number, preferredDate: string) => number | null;
  cancelOrder: (id: number) => void;
  updateOrderStatus: (id: number, status: OrderStatus, options?: TransitionOptions) => void;
  createOffer: (batchId: string, kg: number, pricePerKg: number, delivery: Delivery) => boolean;
  weighIn: (bookingId: string, kg: number, type: GrainType) => string | null;
  addBooking: (b: { slotId: string; farmer: string; farmerId: string; kg: number; type: GrainType; channel: Booking["channel"] }) => boolean;
  setBookingStatus: (id: string, status: BookingStatus) => void;
  advanceBatch: (id: string) => void;
  setPrices: (fresh: number, dry: number, basis: PriceBasis) => void;
  setKwhPrice: (p: number) => void;
  addUser: (name: string, role: Role, contact: string) => void;
  toggleUser: (id: string) => void;
  addServiceRequest: (service: ServiceType, kg: number, date: string) => number | null;
  updateProfile: (p: BuyerProfile) => void;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [batches, setBatches] = useState(seedBatches);
  const [offerRecords, setOffers] = useState(seedOffers);
  const [orderState, setOrderState] = useState({
    orders: seedOrders, riceTypes: seedRiceTypes, orderDetails: seedOrderDetails, error: null as string | null,
  });
  const { orders, riceTypes, orderDetails, error: orderError } = orderState;
  const nextId = useRef(Math.max(...seedOrders.map((order) => order.id)) + 1);
  const offers = offerRecords.map((offer) => {
    const rice = riceTypes.find((row) => row.id === offer.riceTypeId);
    return { ...offer, kgAvailable: Number(rice?.stockKg ?? 0), pricePerKg: Number(rice?.pricePerKg ?? 0) };
  });
  const [slots, setSlots] = useState(seedSlots);
  const [bookings, setBookings] = useState(seedBookings);
  const [prices, setPricesState] = useState(seedPrices);
  const [history, setHistory] = useState(seedHistory);
  const [users, setUsers] = useState(seedUsers);
  const [audit, setAudit] = useState(seedAudit);
  const serviceRequests = orders.filter((order) => order.type === OrderType.SERVICE);
  const [profile, setProfile] = useState(seedProfile);
  const [kwhPrice, setKwh] = useState(seedKwhPrice);

  const log = (actor: string, action: string, target: string) =>
    setAudit((a) => [{ id: `AU-${Date.now()}-${a.length}`, at: stamp(), actor, action, target }, ...a]);

  const rememberOrder = (order: OrderDto, details: DemoOrderDetails) => {
    setOrderState((state) => ({ ...state, orders: [order, ...state.orders],
      orderDetails: { ...state.orderDetails, [order.id]: details }, error: null }));
  };

  const reserveOffer: Store["reserveOffer"] = (offerId, kg, preferredDate) => {
    const offer = offers.find((row) => row.id === offerId);
    if (!offer) return null;
    try {
      const order = createMockOrder({
        type: OrderType.BUY_RICE, riceTypeId: offer.riceTypeId, requestedKg: String(kg), preferredDate,
        contactName: profile.name, contactPhone: profile.contact,
      }, nextId.current++, prices, riceTypes);
      rememberOrder(order, { ownerId: profile.id, contactName: profile.name, contactPhone: profile.contact,
        offerId, batchId: offer.batchId });
      log(profile.name, "Submitted rice order", order.ref);
      return order.id;
    } catch (error) {
      setOrderState((state) => ({ ...state, error: (error as Error).message }));
      return null;
    }
  };

  const updateOrderStatus: Store["updateOrderStatus"] = (id, status, options) => {
    setOrderState((state) => {
      const order = state.orders.find((row) => row.id === id);
      if (!order) return state;
      try {
        const result = transitionMockOrder(order, status, prices, state.riceTypes, options);
        return { ...state, orders: state.orders.map((row) => row.id === id ? result.order : row),
          riceTypes: result.riceTypes, error: null };
      } catch (error) {
        return { ...state, error: (error as Error).message };
      }
    });
  };

  const cancelOrder: Store["cancelOrder"] = (id) => {
    const order = orders.find((row) => row.id === id);
    if (order?.status === OrderStatus.PENDING && orderDetails[id]?.ownerId === profile.id) {
      updateOrderStatus(id, OrderStatus.CANCELLED);
    }
  };

  const createOffer: Store["createOffer"] = (batchId, kg, pricePerKg, delivery) => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch || batch.stage !== "Stored" || !Number.isFinite(kg) || kg <= 0 || kg > batch.kg || !Number.isFinite(pricePerKg) || pricePerKg <= 0) return false;
    const id = `OF-${201 + offers.length}`;
    const riceTypeId = Math.max(0, ...riceTypes.map((row) => row.id)) + 1;
    setOrderState((state) => ({ ...state, riceTypes: [...state.riceTypes, {
      id: riceTypeId, name: `Well-milled rice (${batchId})`, description: `Rice from batch ${batchId}`,
      stockKg: kg.toFixed(2), pricePerKg: pricePerKg.toFixed(2),
    }] }));
    setPricesState((rows) => [...rows, { item: PriceItem.RICE, riceTypeId, pricePerKg: pricePerKg.toFixed(2),
      basis: PriceBasis.MARKET, effectiveAt: new Date().toISOString() }]);
    setOffers((o) => [{ id, riceTypeId, batchId, grade: "Well-milled", kgAvailable: kg, pricePerKg, delivery, posted: stamp() }, ...o]);
    log(STAFF, "Posted sale offer", `${id} from ${batchId}`);
    return true;
  };

  const weighIn: Store["weighIn"] = (bookingId, kg, type) => {
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

  const addBooking: Store["addBooking"] = (b) => {
    const slot = slots.find((s) => s.id === b.slotId);
    if (!slot || slot.booked >= slot.capacity || !b.farmer.trim() || !(b.kg > 0)) return false;
    setBookings((bs) => [{ id: `BK-${301 + bs.length}`, status: "Confirmed", ...b }, ...bs]);
    setSlots((ss) => ss.map((s) => (s.id === b.slotId ? { ...s, booked: s.booked + 1 } : s)));
    log(STAFF, `Added ${b.channel.toLowerCase()} booking`, `${b.farmer}, ${slot.date} ${slot.time}`);
    return true;
  };

  const setBookingStatus: Store["setBookingStatus"] = (id, status) => {
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b)));
    log(STAFF, `Booking ${status.toLowerCase()}`, id);
  };

  const advanceBatch: Store["advanceBatch"] = (id) => {
    const b = batches.find((x) => x.id === id);
    if (!b) return;
    const next = STAGES[STAGES.indexOf(b.stage) + 1];
    if (!next || next === "Sold") return;
    const dryer = next === "Drying" ? (batches.filter((x) => x.stage === "Drying").length % 5) + 1 : b.dryer;
    const note = next === "Drying" ? `Dryer ${dryer}` : next === "Milling" ? "Milling line" : "Moved to storage";
    setBatches((bs) => bs.map((x) => (x.id === id ? { ...x, stage: next, dryer, events: [...x.events, { stage: next, at: stamp(), note }] } : x)));
    log(STAFF, `Batch moved to ${next.toLowerCase()}`, id);
  };

  const setPrices: Store["setPrices"] = (fresh, dry, basis) => {
    setHistory((h) => [...h.slice(-5), { week: "This week", fresh, dry }]);
    const effectiveAt = new Date().toISOString();
    setPricesState((rows) => rows.map((row) => row.item === PriceItem.PALAY_FRESH || row.item === PriceItem.PALAY_DRY
      ? { ...row, pricePerKg: (row.item === PriceItem.PALAY_FRESH ? fresh : dry).toFixed(2), basis, effectiveAt } : row));
    log(STAFF, "Updated prices", `Fresh ${fresh}, Dry ${dry} (${basis})`);
  };

  const addUser: Store["addUser"] = (name, role, contact) => {
    setUsers((u) => [...u, { id: `U-${String(u.length + 1).padStart(2, "0")}`, name, role, contact, active: true }]);
    log("System admin", "Added user", `${name} (${role})`);
  };

  const toggleUser: Store["toggleUser"] = (id) => {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    setUsers((us) => us.map((x) => (x.id === id ? { ...x, active: !x.active } : x)));
    log("System admin", u.active ? "Deactivated user" : "Activated user", u.name);
  };

  const addServiceRequest: Store["addServiceRequest"] = (serviceType, kg, preferredDate) => {
    try {
      const order = createMockOrder({ type: OrderType.SERVICE, serviceType, requestedKg: String(kg), preferredDate,
        palayCondition: serviceType === ServiceType.MILLING ? PalayCondition.DRY : PalayCondition.FRESH,
        contactName: profile.name, contactPhone: profile.contact,
      }, nextId.current++, prices, riceTypes);
      rememberOrder(order, { ownerId: profile.id, contactName: profile.name, contactPhone: profile.contact });
      log(profile.name, "Requested service", order.ref);
      return order.id;
    } catch (error) {
      setOrderState((state) => ({ ...state, error: (error as Error).message }));
      return null;
    }
  };

  const fresh = currentPrice(prices, PriceItem.PALAY_FRESH)!;
  const dry = currentPrice(prices, PriceItem.PALAY_DRY)!;
  const palayPrices = { fresh: Number(fresh.pricePerKg), dry: Number(dry.pricePerKg),
    basis: fresh.basis, updated: dateLabel(fresh.effectiveAt) };

  const value: Store = {
    batches, offers, orders, slots, bookings, prices, riceTypes, palayPrices, orderDetails, orderError, history, users, audit, serviceRequests, profile, kwhPrice,
    reserveOffer, cancelOrder, updateOrderStatus, createOffer, weighIn, addBooking, setBookingStatus, advanceBatch,
    setPrices, setKwhPrice: (p) => { setKwh(p); log(STAFF, "Updated electricity price", `₱${p}/kWh`); },
    addUser, toggleUser, addServiceRequest,
    updateProfile: (p) => { setProfile(p); log(p.name, "Updated profile", p.id); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
