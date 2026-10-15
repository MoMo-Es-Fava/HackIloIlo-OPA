import { AccountType, type CurrentPrice, type OrderDto, type RiceTypeDto } from "@irpc/types";
import { ApiError, type api, type ApiUser } from "./api";
import type { DemoWorkspace } from "./demo-types";

export interface Workspace extends DemoWorkspace {
  orders: OrderDto[]; prices: CurrentPrice[]; riceTypes: RiceTypeDto[];
}
export function emptyWorkspace(): Workspace {
  return {
    orders: [], prices: [], riceTypes: [], batches: [], offers: [], slots: [], bookings: [], history: [],
    users: [], audit: [], profile: { id: "", name: "", type: AccountType.BUYER, contact: "", address: "" },
    kwhPrice: 0, orderDetails: {}, energy: { dryers: [], millKwh: 0 }, financeDays: [], forecast: [],
    plant: { dryers: 0, millingTonsPerDay: 0, storageTons: 0 },
  };
}

export const demoOnlyRoute = (path: string) => [
  "/buyer/trace", "/staff/intake", "/staff/processing", "/staff/costing", "/staff/financials",
  "/staff/forecast", "/staff/users", "/staff/audit", "/staff/traceability",
].some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

export const requiresAuthRoute = (path: string) => path.startsWith("/staff") || path === "/buyer" ||
  /^\/buyer\/(orders|service|sell|me)(\/|$)/.test(path);

const text = (value: unknown) => typeof value === "string" ? value : "";
function profileFromUser(user: ApiUser): DemoWorkspace["profile"] {
  return { id: String(user.id ?? ""), name: text(user.name), contact: text(user.phone),
    type: Object.values(AccountType).includes(user.accountType as AccountType) ? user.accountType as AccountType : AccountType.BUYER,
    address: text(user.municipality) };
}

export async function loadWorkspace(client: typeof api, path: string, authenticated: boolean): Promise<Workspace> {
  if (path === "/login" || path === "/signup" || path === "/register") return emptyWorkspace();
  if (!client.useMock && demoOnlyRoute(path)) return emptyWorkspace();
  const demo = await client.getDemoWorkspace();
  const base = { ...emptyWorkspace(), ...demo };
  if (path === "/") return base;
  const staff = path.startsWith("/staff");
  const privatePage = requiresAuthRoute(path);
  const needsUser = client.useMock || authenticated || privatePage;
  const needsOrders = staff || path === "/buyer" && needsUser || /^\/buyer\/(orders|service)(\/|$)/.test(path);
  const detail = path.match(/^\/(?:buyer\/orders|staff\/sales)\/([^/]+)/);
  if (detail && (!Number.isSafeInteger(Number(detail[1])) || Number(detail[1]) <= 0)) throw new ApiError(400, "Invalid order ID.");
  const [prices, riceTypes, user, list, order] = await Promise.all([
    client.getPrices(), client.getRiceTypes(), needsUser ? client.getMe() : null,
    needsOrders ? staff ? client.adminListOrders() : client.getMyOrders() : [],
    detail ? staff ? client.adminGetOrder(Number(detail[1])) : client.getOrder(Number(detail[1])) : null,
  ]);
  if (!Array.isArray(prices) || !Array.isArray(riceTypes) || !Array.isArray(list)) throw new ApiError(502, "The API returned an unexpected response.");
  const orders = order ? [order, ...list.filter((row) => row.id !== order.id)] : list;
  const profile = user ? profileFromUser(user) : base.profile;
  if (user && staff && user.role === "USER") throw new ApiError(403, "This workspace is for staff accounts.");
  if (user && !staff && user.role !== "USER") throw new ApiError(403, "Staff accounts should use the staff workspace.");
  const orderDetails = { ...base.orderDetails };
  if (!client.useMock) {
    for (const row of orders) {
      const customer = "customer" in row && row.customer && typeof row.customer === "object" ? row.customer as ApiUser : null;
      if (customer) orderDetails[row.id] = { ownerId: String(customer.id ?? ""), contactName: text(customer.name), contactPhone: text(customer.phone) };
    }
  }
  // Offers are a view over /rice-types. Batch metadata is available only in the demo.
  const offers = riceTypes.map((rice) => {
    const extra = base.offers.find((offer) => offer.riceTypeId === rice.id);
    return { id: extra?.id ?? String(rice.id), riceTypeId: rice.id, grade: rice.name,
      kgAvailable: Number(rice.stockKg), pricePerKg: Number(rice.pricePerKg), batchId: extra?.batchId ?? "",
      delivery: extra?.delivery ?? "Pickup at IRPC" as const, posted: extra?.posted ?? "" };
  });
  return { ...base, orders, prices, riceTypes, profile, orderDetails, offers };
}
