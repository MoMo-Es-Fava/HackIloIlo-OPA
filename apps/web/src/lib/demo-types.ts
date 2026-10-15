import type { AccountType } from "@irpc/types";

export type Delivery = "Pickup at IRPC" | "Municipal drop point";

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

export interface PricePoint { week: string; fresh: number; dry: number }

export interface BuyerProfile {
  id: string; name: string; type: AccountType; contact: string; address: string;
}

export interface DemoWorkspace {
  offers: Offer[]; history: PricePoint[]; profile: BuyerProfile; orderDetails: Record<number, DemoOrderDetails>;
}

export interface DemoActions {
  updateProfile: (profile: BuyerProfile) => void;
}
