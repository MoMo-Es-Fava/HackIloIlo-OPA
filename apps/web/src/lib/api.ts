import type {
  AccountType, AdminSummaryDto, AuthResponse as SharedAuthResponse, CreateOrderRequest, CurrentPrice, Language, MoneySummaryDto, ReportDto,
  OrderDto, OrderStatus, OrderType, PriceBasis, PriceItem, PublicSettingsDto, RiceTypeDto, SmsLogDto, UserDto,
} from "@irpc/types";
import type { DemoActions, DemoWorkspace } from "./demo-types";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "ApiError"; }
}

export type StaffOrderRequest = CreateOrderRequest & {
  consent: true; accountType?: AccountType; municipality?: string;
};
export interface AdminOrderFilters { status?: OrderStatus; type?: OrderType }
export interface PriceRequest {
  item: PriceItem; riceTypeId?: number; pricePerKg: string; basis: PriceBasis; notifyUsers: boolean;
}
export interface RegisterRequest {
  name: string; phone: string; pin: string; accountType: AccountType; language: Language;
  municipality?: string; consent: true;
}
// These response shapes are not yet specified in the shared package.
export type ApiUser = UserDto;
export type AuthResponse = SharedAuthResponse;
export interface HealthResponse { status: string; time: string }
export type AdminOrder = OrderDto & { customer?: ApiUser };

const TOKEN_KEY = "irpc.auth.token";
export function getAuthToken() {
  return typeof window === "undefined" ? null : window.sessionStorage.getItem(TOKEN_KEY);
}
export function setAuthToken(token: string | null, notify = true) {
  if (typeof window === "undefined") return;
  if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
  else window.sessionStorage.removeItem(TOKEN_KEY);
  if (notify) window.dispatchEvent(new Event("irpc-auth-change"));
}

export interface ApiClientOptions {
  useMock: boolean;
  baseUrl: string;
  fetcher?: typeof fetch;
  getToken?: () => string | null;
  saveToken?: (token: string | null) => void;
  timeoutMs?: number;
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const token = options.getToken ?? getAuthToken;
  let mock: Promise<ReturnType<typeof import("./mock-api").createMockApi>> | undefined;
  const getMock = () => mock ??= import("./mock-api").then((module) => module.createMockApi());

  async function request<T>(path: string, method = "GET", body?: unknown, auth = true, forceHttp = false): Promise<T> {
    if (options.useMock && !forceHttp) return (await getMock()).request<T>(path, method, body);
    if (!/^https?:\/\//.test(baseUrl)) throw new ApiError(0, "The API address is not configured.");
    const jwt = token();
    if (auth && !jwt) throw new ApiError(401, "Sign in to continue.");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);
    try {
      const response = await (options.fetcher ?? fetch)(`${baseUrl}${path}`, {
        method, cache: "no-store", signal: controller.signal,
        headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(auth && jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const raw = await response.text();
      let payload: unknown;
      try { payload = raw ? JSON.parse(raw) : undefined; } catch { /* HTTP errors may contain HTML. */ }
      if (!response.ok) {
        const message = payload && typeof payload === "object" && "message" in payload ? payload.message : undefined;
        const fallback = response.status === 401 ? "Sign in to continue."
          : response.status === 403 ? "You do not have access to this action."
          : response.status === 404 ? "This information is not available yet."
          : "The request could not be completed. Please try again.";
        throw new ApiError(response.status, typeof message === "string" ? message
          : Array.isArray(message) && message.every((part) => typeof part === "string") ? message.join(" ") : fallback);
      }
      if (response.status !== 204 && payload === undefined) throw new ApiError(502, "The API returned an unreadable response.");
      return payload as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, controller.signal.aborted ? "The request timed out. Please try again." : "Could not connect to IRPC. Please try again.");
    } finally { clearTimeout(timeout); }
  }
  const query = (values: object) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== "") params.set(key, String(value));
    return params.size ? `?${params}` : "";
  };
  const idPath = (id: number) => {
    if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError(400, "Invalid record ID.");
    return String(id);
  };
  async function authenticate(path: string, body: unknown) {
    // Login and sign-up always use the real API so accounts persist in PostgreSQL.
    const result = await request<AuthResponse>(path, "POST", body, false, true);
    (options.saveToken ?? setAuthToken)(result.token);
    return result;
  }

  return {
    useMock: options.useMock,
    // Health always probes the real server, including while the UI uses mocks.
    getHealth: () => request<HealthResponse>("/health", "GET", undefined, false, true),
    register: (body: RegisterRequest) => authenticate("/auth/register", body),
    login: (phone: string, pin: string) => authenticate("/auth/login", { phone, pin }),
    getMe: () => request<ApiUser>("/auth/me"),
    getPrices: () => request<CurrentPrice[]>("/prices", "GET", undefined, false),
    getRiceTypes: () => request<RiceTypeDto[]>("/rice-types", "GET", undefined, false),
    getSettings: () => request<PublicSettingsDto>("/settings", "GET", undefined, false),
    createOrder: (body: CreateOrderRequest) => request<OrderDto>("/orders", "POST", body),
    getMyOrders: (active?: boolean) => request<OrderDto[]>(`/orders/mine${query({ active })}`),
    getOrder: (id: number) => request<OrderDto>(`/orders/${idPath(id)}`),
    confirmWeight: (id: number) => request<OrderDto>(`/orders/${idPath(id)}/confirm-weight`, "POST"),
    cancelOrder: (id: number) => request<OrderDto>(`/orders/${idPath(id)}/cancel`, "POST"),
    adminListOrders: (filters: AdminOrderFilters = {}) => request<AdminOrder[]>(`/admin/orders${query(filters)}`),
    adminGetOrder: (id: number) => request<AdminOrder>(`/admin/orders/${idPath(id)}`),
    acceptOrder: (id: number, scheduledDate?: string) => request<OrderDto>(`/admin/orders/${idPath(id)}/accept`, "PATCH", { scheduledDate }),
    rejectOrder: (id: number, reason: string) => request<OrderDto>(`/admin/orders/${idPath(id)}/reject`, "PATCH", { reason }),
    updateOrderStatus: (id: number, status: OrderStatus, note?: string) => request<OrderDto>(`/admin/orders/${idPath(id)}/status`, "PATCH", { status, note }),
    weighInOrder: (id: number, weights: { wetKg?: string; dryKg?: string; riceKg?: string }) => request<OrderDto>(`/admin/orders/${idPath(id)}/weigh-in`, "POST", weights),
    getAdminSummary: () => request<AdminSummaryDto>("/admin/summary"),
    // Staff entering an order for a walk-in or phone customer (consent confirmed by staff).
    staffCreateOrder: (body: StaffOrderRequest) => request<OrderDto>("/admin/orders", "POST", body),
    // Staff recording that the customer confirmed the weight in person at the scale.
    staffConfirmWeight: (id: number) => request<OrderDto>(`/admin/orders/${idPath(id)}/confirm-weight`, "POST"),
    createPrice: (body: PriceRequest) => request<CurrentPrice>("/admin/prices", "POST", body),
    getPriceHistory: (item?: PriceItem) => request<CurrentPrice[]>(`/admin/prices/history${query({ item })}`),
    updateStock: (id: number, changeKg: string, reason: string) => request<RiceTypeDto>(`/admin/rice-types/${idPath(id)}/stock`, "POST", { changeKg, reason }),
    getMoney: (from?: string, to?: string) => request<MoneySummaryDto>(`/admin/money${query({ from, to })}`),
    getReport: (from?: string, to?: string) => request<ReportDto>(`/admin/report${query({ from, to })}`),
    getSmsLogs: () => request<SmsLogDto[]>("/admin/sms-logs"),
    // Ancillary prototype screens have no API routes. They are explicitly mock-only.
    getDemoWorkspace: async (): Promise<DemoWorkspace | null> => options.useMock ? (await getMock()).getWorkspace() : null,
    demoAction: async <K extends keyof DemoActions>(name: K, ...args: Parameters<DemoActions[K]>): Promise<ReturnType<DemoActions[K]>> => {
      if (!options.useMock) throw new ApiError(501, "This feature is not connected yet.");
      return (await getMock()).demoAction(name, ...args);
    },
  };
}

export const api = createApiClient({
  useMock: process.env.NEXT_PUBLIC_USE_MOCK === "true",
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
});
export const {
  getHealth, getMe, register, login, getPrices, getRiceTypes, getSettings, createOrder, getMyOrders,
  getOrder, confirmWeight, cancelOrder, adminListOrders, adminGetOrder, acceptOrder, rejectOrder,
  updateOrderStatus, weighInOrder, staffCreateOrder, staffConfirmWeight, getAdminSummary, createPrice, getPriceHistory, updateStock,
  getMoney, getReport, getSmsLogs,
} = api;
