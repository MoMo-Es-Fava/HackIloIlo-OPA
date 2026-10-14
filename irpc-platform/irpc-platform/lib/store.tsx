"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  seedAudit, seedBatches, seedBookings, seedHistory, seedKwhPrice, seedOffers, seedOrders,
  seedPrices, seedProfile, seedServiceRequests, seedSlots, seedUsers, STAGES,
  type AuditEntry, type Batch, type Booking, type BookingStatus, type BuyerProfile, type Delivery,
  type GrainType, type Offer, type Order, type OrderStatus, type PricePoint, type PriceRate,
  type Role, type ServiceKind, type ServiceRequest, type Slot, type User,
} from "./data";

const stamp = () => new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
const STAFF = "Plant operator";

interface Store {
  batches: Batch[]; offers: Offer[]; orders: Order[]; slots: Slot[]; bookings: Booking[];
  prices: PriceRate; history: PricePoint[]; users: User[]; audit: AuditEntry[];
  serviceRequests: ServiceRequest[]; profile: BuyerProfile; kwhPrice: number;
  reserveOffer: (offerId: string, kg: number) => string | null;
  cancelOrder: (id: string) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  createOffer: (batchId: string, kg: number, pricePerKg: number, delivery: Delivery) => boolean;
  weighIn: (bookingId: string, kg: number, type: GrainType) => string | null;
  addBooking: (b: { slotId: string; farmer: string; farmerId: string; kg: number; type: GrainType; channel: Booking["channel"] }) => boolean;
  setBookingStatus: (id: string, status: BookingStatus) => void;
  advanceBatch: (id: string) => void;
  setPrices: (fresh: number, dry: number, basis: PriceRate["basis"]) => void;
  setKwhPrice: (p: number) => void;
  addUser: (name: string, role: Role, contact: string) => void;
  toggleUser: (id: string) => void;
  addServiceRequest: (service: ServiceKind, kg: number, date: string, notes: string) => string;
  setServiceStatus: (id: string, status: ServiceRequest["status"]) => void;
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
  const [offers, setOffers] = useState(seedOffers);
  const [orders, setOrders] = useState(seedOrders);
  const [slots, setSlots] = useState(seedSlots);
  const [bookings, setBookings] = useState(seedBookings);
  const [prices, setPricesState] = useState(seedPrices);
  const [history, setHistory] = useState(seedHistory);
  const [users, setUsers] = useState(seedUsers);
  const [audit, setAudit] = useState(seedAudit);
  const [serviceRequests, setServiceRequests] = useState(seedServiceRequests);
  const [profile, setProfile] = useState(seedProfile);
  const [kwhPrice, setKwh] = useState(seedKwhPrice);

  const log = (actor: string, action: string, target: string) =>
    setAudit((a) => [{ id: `AU-${Date.now()}-${a.length}`, at: stamp(), actor, action, target }, ...a]);

  const reserveOffer: Store["reserveOffer"] = (offerId, kg) => {
    const offer = offers.find((o) => o.id === offerId);
    if (!offer || !(kg > 0) || kg > offer.kgAvailable) return null;
    const id = `OR-${1001 + orders.length}`;
    setOrders((o) => [{ id, offerId, batchId: offer.batchId, buyerId: profile.id, buyer: profile.name, kg, pricePerKg: offer.pricePerKg, status: "Reserved", createdAt: stamp() }, ...o]);
    setOffers((os) => os.map((x) => (x.id === offerId ? { ...x, kgAvailable: x.kgAvailable - kg } : x)));
    log(profile.name, "Reserved offer", `${offerId} (${kg} kg)`);
    return id;
  };

  const cancelOrder: Store["cancelOrder"] = (id) => {
    const order = orders.find((o) => o.id === id);
    if (!order || order.status !== "Reserved") return;
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status: "Cancelled" } : o)));
    setOffers((os) => os.map((x) => (x.id === order.offerId ? { ...x, kgAvailable: x.kgAvailable + order.kg } : x)));
    log(order.buyer, "Cancelled order", id);
  };

  const updateOrderStatus: Store["updateOrderStatus"] = (id, status) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
    if (status === "Delivered") {
      const delivery = offers.find((o) => o.id === order.offerId)?.delivery ?? "Pickup at IRPC";
      setBatches((bs) =>
        bs.map((b) =>
          b.id === order.batchId
            ? { ...b, stage: "Sold", soldTo: order.buyer, destination: delivery, events: [...b.events, { stage: "Sold", at: stamp(), note: `Sold to ${order.buyer}` }] }
            : b,
        ),
      );
    }
    log(STAFF, `Order marked ${status.toLowerCase()}`, id);
  };

  const createOffer: Store["createOffer"] = (batchId, kg, pricePerKg, delivery) => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch || batch.stage !== "Stored" || !(kg > 0) || !(pricePerKg > 0)) return false;
    const id = `OF-${201 + offers.length}`;
    setOffers((o) => [{ id, batchId, grade: "Well-milled", kgAvailable: kg, pricePerKg, delivery, posted: stamp() }, ...o]);
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
    setPricesState({ fresh, dry, basis, updated: stamp() });
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

  const addServiceRequest: Store["addServiceRequest"] = (service, kg, date, notes) => {
    const id = `SV-${String(serviceRequests.length + 1).padStart(2, "0")}`;
    setServiceRequests((s) => [{ id, buyerId: profile.id, buyer: profile.name, service, kg, date, notes, status: "Pending" }, ...s]);
    log(profile.name, "Requested service", `${service}, ${kg} kg`);
    return id;
  };

  const setServiceStatus: Store["setServiceStatus"] = (id, status) => {
    setServiceRequests((s) => s.map((x) => (x.id === id ? { ...x, status } : x)));
    log(STAFF, `Service request ${status.toLowerCase()}`, id);
  };

  const value: Store = {
    batches, offers, orders, slots, bookings, prices, history, users, audit, serviceRequests, profile, kwhPrice,
    reserveOffer, cancelOrder, updateOrderStatus, createOffer, weighIn, addBooking, setBookingStatus, advanceBatch,
    setPrices, setKwhPrice: (p) => { setKwh(p); log(STAFF, "Updated electricity price", `₱${p}/kWh`); },
    addUser, toggleUser, addServiceRequest, setServiceStatus,
    updateProfile: (p) => { setProfile(p); log(p.name, "Updated profile", p.id); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
