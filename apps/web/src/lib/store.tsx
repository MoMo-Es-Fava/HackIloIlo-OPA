"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ACCEPT_STATUS, OrderStatus, OrderType, PalayCondition, PriceBasis, PriceItem, ServiceType, type DeliveryMethod } from "@irpc/types";
import { api, ApiError, getAuthToken, setAuthToken } from "./api";
import type { DemoActions } from "./demo-types";
import type { TransitionOptions } from "./mock-orders";
import { currentPrice } from "./orders";
import { dateLabel } from "./format";
import { demoOnlyRoute, emptyWorkspace, loadWorkspace, requiresAuthRoute, type Workspace } from "./workspace";

export interface SellPalayInput {
  condition: PalayCondition; kg: number; variety: string; preferredDate: string; deliveryMethod: DeliveryMethod;
}
type AsyncDemoActions = { [K in keyof DemoActions]: (...args: Parameters<DemoActions[K]>) => Promise<ReturnType<DemoActions[K]> | null> };
interface Store extends Workspace, AsyncDemoActions {
  isMock: boolean; busy: boolean; orderError: string | null;
  serviceRequests: Workspace["orders"];
  palayPrices: { fresh: number | null; dry: number | null; basis: PriceBasis; updated: string };
  reserveOffer: (offerId: string, kg: number, preferredDate: string) => Promise<number | null>;
  addServiceRequest: (service: ServiceType, kg: number, preferredDate: string) => Promise<number | null>;
  sellPalay: (input: SellPalayInput) => Promise<number | null>;
  cancelOrder: (id: number) => Promise<boolean>;
  confirmWeight: (id: number) => Promise<boolean>;
  updateOrderStatus: (id: number, status: OrderStatus, options?: TransitionOptions) => Promise<boolean>;
  setPrices: (fresh: number, dry: number, basis: PriceBasis) => Promise<boolean>;
}
const Ctx = createContext<Store | null>(null);
export function useStore(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}
const message = (error: unknown) => error instanceof ApiError ? error.message : "Could not load this information. Please try again.";

export function StoreProvider({ children }: { children: ReactNode }) {
  const path = usePathname();
  const pathRef = useRef(path);
  pathRef.current = path;
  const generation = useRef(0);
  const pending = useRef(false);
  const [data, setData] = useState(emptyWorkspace);
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const selectedPath = pathRef.current;
    const request = ++generation.current;
    if (!api.useMock && requiresAuthRoute(selectedPath) && !getAuthToken()) {
      const next = `${selectedPath}${window.location.search}`;
      window.location.replace(`/login?next=${encodeURIComponent(next)}`);
      return true;
    }
    try {
      const next = await loadWorkspace(api, selectedPath, Boolean(getAuthToken()));
      if (request === generation.current) {
        setData(next); setLoadedPath(selectedPath); setLoadError(null);
      }
      return true;
    } catch (error) {
      if (!api.useMock && error instanceof ApiError && error.status === 401) {
        setAuthToken(null);
        window.location.replace(`/login?next=${encodeURIComponent(`${selectedPath}${window.location.search}`)}`);
        return false;
      }
      if (!api.useMock && error instanceof ApiError && error.status === 403) {
        window.location.replace(selectedPath.startsWith("/staff") ? "/buyer" : "/staff");
        return false;
      }
      if (request === generation.current) {
        setData(emptyWorkspace()); setLoadedPath(selectedPath); setLoadError(message(error));
      }
      return false;
    }
  }, []);

  const invalidate = useCallback(() => { generation.current++; }, []);
  useEffect(() => {
    setOrderError(null);
    void reload();
    return invalidate;
  }, [path, reload, invalidate]);
  useEffect(() => {
    const changed = () => { setLoadedPath(null); void reload(); };
    window.addEventListener("irpc-auth-change", changed);
    return () => window.removeEventListener("irpc-auth-change", changed);
  }, [reload]);

  async function run<T>(action: () => Promise<T>, fallback: T): Promise<T> {
    if (pending.current) return fallback;
    pending.current = true; setBusy(true); setOrderError(null);
    try {
      const result = await action();
      // A successful mutation stays successful even if its follow-up read fails.
      if (!await reload()) setOrderError("Saved, but the latest information could not be loaded. Please refresh.");
      return result;
    } catch (error) {
      setOrderError(message(error));
      return fallback;
    } finally { pending.current = false; setBusy(false); }
  }
  const demoAction = <K extends keyof DemoActions>(name: K, ...args: Parameters<DemoActions[K]>) =>
    run<ReturnType<DemoActions[K]> | null>(() => api.demoAction(name, ...args), null);

  const fresh = currentPrice(data.prices, PriceItem.PALAY_FRESH);
  const dry = currentPrice(data.prices, PriceItem.PALAY_DRY);
  const value: Store = {
    ...data, isMock: api.useMock, busy, orderError,
    serviceRequests: data.orders.filter((order) => order.type === OrderType.SERVICE),
    palayPrices: { fresh: fresh ? Number(fresh.pricePerKg) : null, dry: dry ? Number(dry.pricePerKg) : null,
      basis: fresh?.basis ?? PriceBasis.MARKET, updated: fresh ? dateLabel(fresh.effectiveAt) : "Not available" },
    reserveOffer: (offerId, kg, preferredDate) => run(async () => {
      const offer = data.offers.find((row) => row.id === offerId);
      if (!offer) throw new ApiError(404, "Rice type not found.");
      const order = await api.createOrder({ type: OrderType.BUY_RICE, riceTypeId: offer.riceTypeId,
        requestedKg: String(kg), preferredDate, contactName: data.profile.name, contactPhone: data.profile.contact });
      return order.id;
    }, null),
    addServiceRequest: (serviceType, kg, preferredDate) => run(async () => {
      const order = await api.createOrder({ type: OrderType.SERVICE, serviceType, requestedKg: String(kg), preferredDate,
        palayCondition: serviceType === ServiceType.MILLING ? PalayCondition.DRY : PalayCondition.FRESH,
        contactName: data.profile.name, contactPhone: data.profile.contact });
      return order.id;
    }, null),
    sellPalay: (input) => run(async () => {
      const order = await api.createOrder({ type: OrderType.SELL_PALAY, palayCondition: input.condition,
        requestedKg: String(input.kg), variety: input.variety.trim(), deliveryMethod: input.deliveryMethod,
        preferredDate: input.preferredDate, contactName: data.profile.name, contactPhone: data.profile.contact });
      return order.id;
    }, null),
    cancelOrder: (id) => run(async () => { await api.cancelOrder(id); return true; }, false),
    confirmWeight: (id) => run(async () => { await api.confirmWeight(id); return true; }, false),
    updateOrderStatus: (id, status, options = {}) => run(async () => {
      const order = data.orders.find((row) => row.id === id);
      if (!order) throw new ApiError(404, "Order not found.");
      if (order.status === OrderStatus.PENDING) {
        if (status === OrderStatus.REJECTED) await api.rejectOrder(id, options.reason ?? "");
        else if (status === ACCEPT_STATUS[order.type]) await api.acceptOrder(id, options.scheduledDate);
        else throw new ApiError(400, "Accept or reject the order first.");
      } else await api.updateOrderStatus(id, status);
      return true;
    }, false),
    setPrices: (freshPrice, dryPrice, basis) => run(async () => {
      // The contract accepts one price per request; attempt each independently so errors are explicit.
      const results = await Promise.allSettled([
        api.createPrice({ item: PriceItem.PALAY_FRESH, pricePerKg: String(freshPrice), basis, notifyUsers: false }),
        api.createPrice({ item: PriceItem.PALAY_DRY, pricePerKg: String(dryPrice), basis, notifyUsers: false }),
      ]);
      if (results.some((result) => result.status === "rejected")) {
        await reload();
        throw new ApiError(400, results.some((result) => result.status === "fulfilled")
          ? "Only one price was saved. Check the current prices before retrying."
          : "Prices could not be saved. Please try again.");
      }
      return true;
    }, false),
    createOffer: (...args) => demoAction("createOffer", ...args),
    weighIn: (...args) => demoAction("weighIn", ...args),
    addBooking: (...args) => demoAction("addBooking", ...args),
    setBookingStatus: (...args) => demoAction("setBookingStatus", ...args),
    advanceBatch: (...args) => demoAction("advanceBatch", ...args),
    setKwhPrice: (...args) => demoAction("setKwhPrice", ...args),
    addUser: (...args) => demoAction("addUser", ...args),
    toggleUser: (...args) => demoAction("toggleUser", ...args),
    updateProfile: (...args) => demoAction("updateProfile", ...args),
  };

  let content = children;
  if (!api.useMock && demoOnlyRoute(path)) {
    content = <main className="mx-auto max-w-xl p-6"><h1 className="text-2xl font-bold">This view is not connected yet</h1><p className="my-4">It will be available when the required service is ready.</p><Link className="font-bold underline" href={path.startsWith("/staff") ? "/staff/sales" : "/buyer"}>Back to orders</Link></main>;
  } else if (loadedPath !== path) {
    content = <main className="mx-auto max-w-xl p-6" role="status">Loading…</main>;
  } else if (loadError) {
    content = <main className="mx-auto max-w-xl p-6"><h1 className="text-2xl font-bold">Unable to load this page</h1><p role="alert" className="my-4">{orderError ?? loadError}</p><button className="min-h-12 rounded-xl bg-paddy-d px-5 font-bold text-white" onClick={() => { setLoadedPath(null); void reload(); }}>Try again</button><Link className="ml-4 font-bold underline" href="/">Home</Link></main>;
  }
  return <Ctx.Provider value={value}><div aria-busy={busy}>{content}</div></Ctx.Provider>;
}
