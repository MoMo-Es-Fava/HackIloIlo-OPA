// Sample data only. Replace with real IRPC records or an API later.

export const PLANT = { dryers: 5, millingTonsPerDay: 50, storageTons: 1100 };

export type Stage = "Received" | "Weighed" | "Drying" | "Milling" | "Stored" | "Sold";
export const STAGES: Stage[] = ["Received", "Weighed", "Drying", "Milling", "Stored", "Sold"];
export type GrainType = "Fresh" | "Dry";
export type Delivery = "Pickup at IRPC" | "Municipal drop point";

export interface BatchEvent { stage: Stage; at: string; note: string }
export interface Batch {
  id: string; farmer: string; farmerId: string; kg: number; type: GrainType;
  stage: Stage; dryer: number | null; costPerKg: number;
  soldTo: string | null; destination: string | null; events: BatchEvent[];
}

export interface Offer {
  id: string; batchId: string; grade: string; kgAvailable: number;
  pricePerKg: number; delivery: Delivery; posted: string;
}

export type OrderStatus = "Reserved" | "Paid" | "Ready" | "Delivered" | "Cancelled";
export const ORDER_FLOW: OrderStatus[] = ["Reserved", "Paid", "Ready", "Delivered"];
export interface Order {
  id: string; offerId: string; batchId: string; buyerId: string; buyer: string;
  kg: number; pricePerKg: number; status: OrderStatus; createdAt: string;
}

export interface Slot { id: string; date: string; time: string; capacity: number; booked: number }
export type BookingStatus = "Confirmed" | "Checked in" | "Done" | "No show";
export interface Booking {
  id: string; slotId: string; farmer: string; farmerId: string;
  kg: number; type: GrainType; status: BookingStatus; channel: "App" | "Phone" | "Walk-in";
}

export interface PriceRate { fresh: number; dry: number; basis: "Market" | "NFA"; updated: string }
export interface PricePoint { week: string; fresh: number; dry: number }

export type Role = "Farmer" | "Cooperative" | "Retailer" | "Trader" | "Household" | "Staff" | "Admin";
export interface User { id: string; name: string; role: Role; contact: string; active: boolean }

export interface AuditEntry { id: string; at: string; actor: string; action: string; target: string }

export type ServiceKind = "Drying" | "Milling" | "Storage";
export interface ServiceRequest {
  id: string; buyerId: string; buyer: string; service: ServiceKind; kg: number;
  date: string; notes: string; status: "Pending" | "Approved" | "Declined";
}

export interface BuyerProfile {
  id: string; name: string; type: "Retailer" | "Trader" | "Cooperative"; contact: string; address: string;
}

const ev = (stage: Stage, at: string, note: string): BatchEvent => ({ stage, at, note });

export const seedBatches: Batch[] = [
  {
    id: "IR-1014-027", farmer: "Farmer A", farmerId: "F-014", kg: 412, type: "Fresh", stage: "Drying", dryer: 3,
    costPerKg: 3.6, soldTo: null, destination: null,
    events: [ev("Received", "14 Oct, 7:40 AM", "Booking BK-301, farmer validated"), ev("Weighed", "14 Oct, 8:05 AM", "412 kg fresh, 9 bag slips"), ev("Drying", "14 Oct, 9:30 AM", "Dryer 3")],
  },
  {
    id: "IR-1014-028", farmer: "Farmer B", farmerId: "F-021", kg: 600, type: "Fresh", stage: "Milling", dryer: 2,
    costPerKg: 4.1, soldTo: null, destination: null,
    events: [ev("Received", "14 Oct, 8:10 AM", "Booking BK-305, farmer validated"), ev("Weighed", "14 Oct, 8:30 AM", "600 kg fresh, 12 bag slips"), ev("Drying", "14 Oct, 10:00 AM", "Dryer 2"), ev("Milling", "14 Oct, 2:15 PM", "Milling line")],
  },
  {
    id: "IR-1012-019", farmer: "Coop 1", farmerId: "C-003", kg: 1800, type: "Dry", stage: "Stored", dryer: null,
    costPerKg: 3.4, soldTo: null, destination: null,
    events: [ev("Received", "12 Oct, 7:30 AM", "Phone booking, cooperative validated"), ev("Weighed", "12 Oct, 8:00 AM", "1,800 kg dry, 36 bag slips"), ev("Milling", "12 Oct, 11:00 AM", "Milling line"), ev("Stored", "12 Oct, 4:00 PM", "Moved to storage")],
  },
  {
    id: "IR-1010-008", farmer: "Farmer C", farmerId: "F-007", kg: 950, type: "Dry", stage: "Stored", dryer: null,
    costPerKg: 3.55, soldTo: null, destination: null,
    events: [ev("Received", "10 Oct, 9:00 AM", "Walk-in, farmer validated"), ev("Weighed", "10 Oct, 9:20 AM", "950 kg dry, 19 bag slips"), ev("Milling", "10 Oct, 1:00 PM", "Milling line"), ev("Stored", "10 Oct, 5:00 PM", "Moved to storage")],
  },
  {
    id: "IR-1009-006", farmer: "Coop 2", farmerId: "C-009", kg: 2400, type: "Dry", stage: "Stored", dryer: null,
    costPerKg: 3.3, soldTo: null, destination: null,
    events: [ev("Received", "9 Oct, 7:45 AM", "Phone booking, cooperative validated"), ev("Weighed", "9 Oct, 8:15 AM", "2,400 kg dry, 48 bag slips"), ev("Milling", "9 Oct, 11:30 AM", "Milling line"), ev("Stored", "9 Oct, 5:30 PM", "Moved to storage")],
  },
  {
    id: "IR-1008-004", farmer: "Farmer D", farmerId: "F-033", kg: 700, type: "Fresh", stage: "Sold", dryer: null,
    costPerKg: 3.9, soldTo: "Sample Retailer R-07", destination: "Pickup at IRPC",
    events: [ev("Received", "8 Oct, 8:00 AM", "Booking, farmer validated"), ev("Weighed", "8 Oct, 8:20 AM", "700 kg fresh, 14 bag slips"), ev("Drying", "8 Oct, 9:30 AM", "Dryer 1"), ev("Milling", "8 Oct, 2:00 PM", "Milling line"), ev("Stored", "8 Oct, 5:00 PM", "Moved to storage"), ev("Sold", "9 Oct, 10:00 AM", "Sold to Sample Retailer R-07")],
  },
];

export const seedOffers: Offer[] = [
  { id: "OF-201", batchId: "IR-1012-019", grade: "Well-milled", kgAvailable: 1200, pricePerKg: 38, delivery: "Pickup at IRPC", posted: "13 Oct" },
  { id: "OF-202", batchId: "IR-1010-008", grade: "Regular milled", kgAvailable: 800, pricePerKg: 40, delivery: "Municipal drop point", posted: "13 Oct" },
  { id: "OF-203", batchId: "IR-1009-006", grade: "Well-milled", kgAvailable: 2000, pricePerKg: 37, delivery: "Pickup at IRPC", posted: "12 Oct" },
];

export const seedOrders: Order[] = [
  { id: "OR-1001", offerId: "OF-201", batchId: "IR-1012-019", buyerId: "B-07", buyer: "Sample Retailer R-07", kg: 300, pricePerKg: 38, status: "Paid", createdAt: "12 Oct, 3:10 PM" },
  { id: "OR-1002", offerId: "OF-203", batchId: "IR-1009-006", buyerId: "B-12", buyer: "Sample Trader T-02", kg: 400, pricePerKg: 37, status: "Reserved", createdAt: "13 Oct, 9:45 AM" },
  { id: "OR-1003", offerId: "OF-199", batchId: "IR-1008-004", buyerId: "B-07", buyer: "Sample Retailer R-07", kg: 700, pricePerKg: 39, status: "Delivered", createdAt: "9 Oct, 9:30 AM" },
];

export const seedSlots: Slot[] = [
  { id: "S1", date: "Thu 16 Oct", time: "8:00 to 9:00 AM", capacity: 8, booked: 5 },
  { id: "S2", date: "Thu 16 Oct", time: "9:00 to 10:00 AM", capacity: 8, booked: 6 },
  { id: "S3", date: "Thu 16 Oct", time: "10:00 to 11:00 AM", capacity: 8, booked: 8 },
  { id: "S4", date: "Thu 16 Oct", time: "1:00 to 2:00 PM", capacity: 8, booked: 2 },
  { id: "S5", date: "Fri 17 Oct", time: "8:00 to 9:00 AM", capacity: 8, booked: 1 },
];

export const seedBookings: Booking[] = [
  { id: "BK-301", slotId: "S1", farmer: "Farmer A", farmerId: "F-014", kg: 412, type: "Fresh", status: "Done", channel: "App" },
  { id: "BK-302", slotId: "S2", farmer: "Farmer E", farmerId: "F-040", kg: 520, type: "Fresh", status: "Confirmed", channel: "App" },
  { id: "BK-303", slotId: "S2", farmer: "Coop 3", farmerId: "C-011", kg: 1500, type: "Dry", status: "Confirmed", channel: "Phone" },
  { id: "BK-304", slotId: "S4", farmer: "Farmer F", farmerId: "F-052", kg: 300, type: "Dry", status: "Confirmed", channel: "App" },
  { id: "BK-305", slotId: "S1", farmer: "Farmer B", farmerId: "F-021", kg: 600, type: "Fresh", status: "Done", channel: "Walk-in" },
];

export const seedPrices: PriceRate = { fresh: 17, dry: 22, basis: "Market", updated: "Mon 13 Oct" };
export const seedHistory: PricePoint[] = [
  { week: "Sep 8", fresh: 16, dry: 21 },
  { week: "Sep 15", fresh: 17, dry: 21 },
  { week: "Sep 22", fresh: 16, dry: 20 },
  { week: "Sep 29", fresh: 17, dry: 22 },
  { week: "Oct 6", fresh: 18, dry: 23 },
  { week: "Oct 13", fresh: 17, dry: 22 },
];

export const seedUsers: User[] = [
  { id: "U-01", name: "Farmer A (F-014)", role: "Farmer", contact: "09XX XXX 0014", active: true },
  { id: "U-02", name: "Coop 1 (C-003)", role: "Cooperative", contact: "09XX XXX 0003", active: true },
  { id: "U-03", name: "Sample Retailer R-07", role: "Retailer", contact: "09XX XXX 0007", active: true },
  { id: "U-04", name: "Sample Trader T-02", role: "Trader", contact: "09XX XXX 0002", active: true },
  { id: "U-05", name: "Plant operator", role: "Staff", contact: "09XX XXX 0100", active: true },
  { id: "U-06", name: "System admin", role: "Admin", contact: "09XX XXX 0101", active: true },
];

export const seedAudit: AuditEntry[] = [
  { id: "AU-5", at: "13 Oct, 8:00 AM", actor: "Plant operator", action: "Updated prices", target: "Fresh 17, Dry 22 (Market)" },
  { id: "AU-4", at: "13 Oct, 9:45 AM", actor: "Sample Trader T-02", action: "Reserved offer", target: "OF-203 (400 kg)" },
  { id: "AU-3", at: "12 Oct, 4:00 PM", actor: "Plant operator", action: "Moved batch to storage", target: "IR-1012-019" },
  { id: "AU-2", at: "12 Oct, 3:10 PM", actor: "Sample Retailer R-07", action: "Reserved offer", target: "OF-201 (300 kg)" },
  { id: "AU-1", at: "9 Oct, 10:00 AM", actor: "Plant operator", action: "Marked order delivered", target: "OR-1003" },
];

export const seedServiceRequests: ServiceRequest[] = [
  { id: "SV-01", buyerId: "B-07", buyer: "Sample Retailer R-07", service: "Storage", kg: 1000, date: "Mon 20 Oct", notes: "Short-term storage", status: "Approved" },
];

export const seedProfile: BuyerProfile = {
  id: "B-07", name: "Sample Retailer R-07", type: "Retailer", contact: "09XX XXX 0007", address: "Iloilo City",
};

// Energy and finance samples (staff)
export const energy = {
  dryers: [
    { id: 1, kwh: 210, status: "Running" },
    { id: 2, kwh: 250, status: "Running" },
    { id: 3, kwh: 340, status: "Running" },
    { id: 4, kwh: 60, status: "Idle" },
    { id: 5, kwh: 40, status: "Idle" },
  ],
  millKwh: 360,
};

export const seedKwhPrice = 12.4;

export const financeDays = [
  { day: "Mon 6", revenue: 52000, otherCost: 21000, kwh: 1180 },
  { day: "Tue 7", revenue: 48000, otherCost: 20500, kwh: 1250 },
  { day: "Wed 8", revenue: 61000, otherCost: 23000, kwh: 1300 },
  { day: "Thu 9", revenue: 39000, otherCost: 19500, kwh: 1210 },
  { day: "Fri 10", revenue: 44000, otherCost: 20000, kwh: 1240 },
  { day: "Sat 11", revenue: 30000, otherCost: 18500, kwh: 1100 },
  { day: "Sun 12", revenue: 21000, otherCost: 17000, kwh: 1050 },
];

export const seedForecast = [
  { week: "Oct 13", tons: 180 },
  { week: "Oct 20", tons: 260 },
  { week: "Oct 27", tons: 410 },
  { week: "Nov 3", tons: 520 },
  { week: "Nov 10", tons: 300 },
  { week: "Nov 17", tons: 150 },
];
