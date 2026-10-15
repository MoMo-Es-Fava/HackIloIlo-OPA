import type { AccountType, Role } from "@irpc/types";

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
  id: string; riceTypeId: number; batchId: string; grade: string; kgAvailable: number;
  pricePerKg: number; delivery: Delivery; posted: string;
}

// Kept outside OrderDto: these fields are absent from the current API contract.
export interface DemoOrderDetails {
  ownerId: string;
  contactName: string;
  contactPhone: string;
  offerId?: string;
  batchId?: string;
}

export interface Slot { id: string; date: string; time: string; capacity: number; booked: number }
export type BookingStatus = "Confirmed" | "Checked in" | "Done" | "No show";
export interface Booking {
  id: string; slotId: string; farmer: string; farmerId: string;
  kg: number; type: GrainType; status: BookingStatus; channel: "App" | "Phone" | "Walk-in";
}

export interface PricePoint { week: string; fresh: number; dry: number }

export interface User { id: string; name: string; role: Role; contact: string; active: boolean }

export interface AuditEntry { id: string; at: string; actor: string; action: string; target: string }

export interface BuyerProfile {
  id: string; name: string; type: AccountType; contact: string; address: string;
}


export interface DemoWorkspace {
  batches: Batch[]; offers: Offer[]; slots: Slot[]; bookings: Booking[];
  history: PricePoint[]; users: User[]; audit: AuditEntry[];
  profile: BuyerProfile; kwhPrice: number; orderDetails: Record<number, DemoOrderDetails>;
  energy: { dryers: { id: number; kwh: number; status: string }[]; millKwh: number };
  financeDays: { day: string; revenue: number; otherCost: number; kwh: number }[];
  forecast: { week: string; tons: number }[];
  plant: { dryers: number; millingTonsPerDay: number; storageTons: number };
}

export interface DemoActions {
  createOffer: (batchId: string, kg: number, pricePerKg: number, delivery: Delivery) => boolean;
  weighIn: (bookingId: string, kg: number, type: GrainType) => string | null;
  addBooking: (booking: { slotId: string; farmer: string; farmerId: string; kg: number; type: GrainType; channel: Booking["channel"] }) => boolean;
  setBookingStatus: (id: string, status: BookingStatus) => void;
  advanceBatch: (id: string) => void;
  setKwhPrice: (price: number) => void;
  addUser: (name: string, role: Role, contact: string) => void;
  toggleUser: (id: string) => void;
  updateProfile: (profile: BuyerProfile) => void;
}
