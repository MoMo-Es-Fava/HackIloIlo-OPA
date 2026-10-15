"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { OrderStatus, OrderType, PalayCondition, ServiceType, type OrderDto } from "@irpc/types";
import { api, ApiError } from "@/lib/api";
import { dateLabel, kgf, peso } from "@/lib/format";
import { orderAmount, serviceLabel, statusLabel } from "@/lib/orders";
import { Badge, Bar, Button, Card, Empty, Notice, PageHeader, TextField, cn, orderTone } from "@/components/ui";
import { IconArrowRight } from "@/components/icons";

type Tab = "review" | "progress" | "done";
const DONE: OrderStatus[] = [OrderStatus.COMPLETED, OrderStatus.REJECTED, OrderStatus.CANCELLED];
const tabOf = (o: OrderDto): Tab =>
  o.status === OrderStatus.PENDING ? "review" : DONE.includes(o.status) ? "done" : "progress";
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
const SACK_KG = 50;
const sacks = (kg: string) => Math.round(Number(kg) / SACK_KG);
// 5 dryers × 10 t + 1 × 6 t. TODO: read from the dryingCapacityKg setting once it is exposed.
const DRYING_CAPACITY_KG = 56_000;
const NOT_YET_DRIED: OrderStatus[] = [OrderStatus.ACCEPTED, OrderStatus.SCHEDULED, OrderStatus.RECEIVED, OrderStatus.WEIGHED];

/** Fresh palay that will go through the dryers: IRPC's own purchases and drying bookings. */
const needsDryer = (o: OrderDto) =>
  o.type === OrderType.SELL_PALAY
    ? o.palayCondition === PalayCondition.FRESH
    : o.type === OrderType.SERVICE && (o.serviceType === ServiceType.DRYING || o.serviceType === ServiceType.DRYING_AND_MILLING);

/** Kg already booked for the dryers on a date (from accepted orders not yet dried). */
function dryerLoad(all: OrderDto[], date: string) {
  return all
    .filter((o) => needsDryer(o) && NOT_YET_DRIED.includes(o.status) && o.scheduledDate?.slice(0, 10) === date)
    .reduce((kg, o) => kg + Number(o.wetKg ?? o.requestedKg), 0);
}

function CapacityCheck({ order, all, date }: { order: OrderDto; all: OrderDto[]; date: string }) {
  if (!date || !needsDryer(order)) return null;
  const booked = dryerLoad(all, date);
  const after = booked + Number(order.requestedKg);
  const pct = (after / DRYING_CAPACITY_KG) * 100;
  const full = after > DRYING_CAPACITY_KG;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line/80 p-3" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold tracking-tight">Dryers on {dateLabel(date)}</p>
        <Badge tone={full ? "bad" : pct >= 75 ? "warn" : "ok"}>{full ? "Over capacity" : `${kgf(DRYING_CAPACITY_KG - after)} left`}</Badge>
      </div>
      <Bar pct={pct} tone={full ? "bad" : "ok"} label={`${kgf(after)} of ${kgf(DRYING_CAPACITY_KG)} booked`} />
      <p className="tnum text-sm text-sub">{kgf(booked)} booked + {kgf(order.requestedKg)} {order.type === OrderType.SELL_PALAY ? "this offer" : "this request"}, of {kgf(DRYING_CAPACITY_KG)} a day</p>
      {full && <p className="text-sm text-clay">Pick another date, or accept if the plant can run longer.</p>}
    </div>
  );
}

/** Which weight staff record at this step, or null if none. */
function weightStep(o: OrderDto): { field: "wetKg" | "dryKg" | "riceKg"; label: string } | null {
  if (o.status === OrderStatus.RECEIVED) {
    const dry = o.type === OrderType.SELL_PALAY ? o.palayCondition === PalayCondition.DRY : o.serviceType === ServiceType.MILLING;
    return dry ? { field: "dryKg", label: "Weight of dry palay (kg)" } : { field: "wetKg", label: "Weight of fresh palay (kg)" };
  }
  if (o.status === OrderStatus.DRYING && !o.dryKg) return { field: "dryKg", label: "Weight after drying (kg)" };
  if (o.status === OrderStatus.MILLING && !o.riceKg) return { field: "riceKg", label: "Weight of milled rice (kg)" };
  return null;
}

const awaitingConfirmation = (o: OrderDto) =>
  (o.status === OrderStatus.WEIGHED || (o.status === OrderStatus.DRYING && !!o.dryKg)) && !o.weightConfirmedAt;

/** The single next status button, once any weight/confirmation for this step is done. */
function nextMove(o: OrderDto): { to: OrderStatus; label: string } | null {
  const drying = o.serviceType === ServiceType.DRYING || o.serviceType === ServiceType.DRYING_AND_MILLING;
  const milling = o.serviceType === ServiceType.MILLING || o.serviceType === ServiceType.DRYING_AND_MILLING;
  switch (o.status) {
    case OrderStatus.ACCEPTED:
    case OrderStatus.SCHEDULED:
      return { to: OrderStatus.RECEIVED, label: "Palay received" };
    case OrderStatus.WEIGHED:
      if (o.type === OrderType.SELL_PALAY) return { to: OrderStatus.PAID, label: "Paid in cash" };
      return drying ? { to: OrderStatus.DRYING, label: "Start drying" } : { to: OrderStatus.MILLING, label: "Start milling" };
    case OrderStatus.DRYING:
      return milling ? { to: OrderStatus.MILLING, label: "Start milling" } : { to: OrderStatus.READY_FOR_PICKUP, label: "Ready for pickup" };
    case OrderStatus.MILLING:
      return { to: OrderStatus.READY_FOR_PICKUP, label: "Ready for pickup" };
    case OrderStatus.READY_FOR_PICKUP:
      return { to: OrderStatus.PAID, label: "Paid in cash" };
    case OrderStatus.PAID:
      return { to: OrderStatus.COMPLETED, label: "Complete" };
    default:
      return null;
  }
}

function OrderCard({ order, all, onChanged }: { order: OrderDto; all: OrderDto[]; onChanged: () => Promise<void> }) {
  const [date, setDate] = useState(order.preferredDate.slice(0, 10) < today() ? today() : order.preferredDate.slice(0, 10));
  const [reason, setReason] = useState("");
  const [kg, setKg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const weigh = weightStep(order);
  // Service customers can be buyers or cooperatives, not only farmers.
  const who = order.type === OrderType.SELL_PALAY ? "farmer" : "customer";
  const move = nextMove(order);

  async function act(run: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await run();
      setKg("");
      await onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const what = order.type === OrderType.SELL_PALAY
    ? `${order.palayCondition === PalayCondition.DRY ? "Dry" : "Fresh"} palay${order.variety ? ` · ${order.variety}` : ""}`
    : `${order.serviceType ? serviceLabel[order.serviceType] : "Service"} · ${order.palayCondition === PalayCondition.DRY ? "dry" : "fresh"} palay`;
  const weights = [
    order.wetKg && `fresh ${kgf(order.wetKg)}`,
    order.dryKg && `dry ${kgf(order.dryKg)}`,
    order.riceKg && `rice ${kgf(order.riceKg)}`,
  ].filter(Boolean).join(" · ");

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold tracking-tight">{order.contactName}</p>
        <Badge tone={orderTone(order.status)}>{statusLabel[order.status]}</Badge>
      </div>
      <p className="text-sm text-sub">{order.ref} · {order.contactPhone}</p>
      <p>{what}: <span className="tnum">about {sacks(order.requestedKg)} sacks ({kgf(order.requestedKg)})</span></p>
      <p className="tnum">
        {order.finalAmount === null ? "Estimate " : <b>Final </b>}
        {peso(orderAmount(order))}
        {order.unitPrice && <span className="text-sub"> · ₱{order.unitPrice}/kg locked</span>}
      </p>
      <p className="text-sm text-sub">{order.scheduledDate ? `Confirmed: ${dateLabel(order.scheduledDate)}` : `Asked for ${dateLabel(order.preferredDate)}`}</p>
      {weights && <p className="tnum">Weighed: {weights}</p>}
      {order.rejectReason && <p>{order.rejectReason}</p>}

      {order.status === OrderStatus.PENDING && (
        <>
          <TextField label={order.type === OrderType.SELL_PALAY ? "Delivery date" : "Service date"} type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} />
          <CapacityCheck order={order} all={all} date={date} />
          <TextField label="Reason for rejection" placeholder="e.g. Dryers are full this week" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <Button className="min-h-11" disabled={busy || !date} onClick={() => act(() => api.acceptOrder(order.id, date))}>Accept</Button>
            <Button variant="danger" className="min-h-11" disabled={busy || reason.trim().length < 3} onClick={() => act(() => api.rejectOrder(order.id, reason.trim()))}>Reject</Button>
          </div>
        </>
      )}

      {weigh && (
        <>
          <TextField label={weigh.label} type="number" inputMode="decimal" min={1} step="any" value={kg} onChange={(e) => setKg(e.target.value)}
            error={kg !== "" && !(Number(kg) > 0) ? "Enter a weight above 0" : undefined} />
          <div className="flex gap-2">
            <Button className="min-h-11" disabled={busy || !(Number(kg) > 0)} onClick={() => act(() => api.weighInOrder(order.id, { [weigh.field]: kg }))}>Record weight</Button>
          </div>
        </>
      )}

      {awaitingConfirmation(order) && (
        <>
          <Notice tone="warn"><p className="font-bold">Waiting for the {who} to agree to this weight.</p></Notice>
          <div className="flex gap-2">
            <Button className="min-h-11" disabled={busy} onClick={() => act(() => api.staffConfirmWeight(order.id))}>{who === "farmer" ? "Farmer" : "Customer"} confirmed at the scale</Button>
          </div>
        </>
      )}

      {!weigh && !awaitingConfirmation(order) && move && order.status !== OrderStatus.PENDING && (
        <div className="flex gap-2">
          <Button className="min-h-11" arrow disabled={busy} onClick={() => act(() => api.updateOrderStatus(order.id, move.to))}>{move.label}</Button>
        </div>
      )}

      {error && <p role="alert" className="text-clay">{error}</p>}
    </Card>
  );
}

export default function StaffOrderBoard({ type, title, sub, icon, action }: {
  type: OrderType; title: string; sub: string; icon?: ReactNode; action?: { href: string; label: string };
}) {
  const [orders, setOrders] = useState<OrderDto[] | null>(null);
  const [tab, setTab] = useState<Tab>("review");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOrders(await api.adminListOrders());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load orders.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const mine = orders?.filter((o) => o.type === type) ?? [];
  const count = (t: Tab) => mine.filter((o) => tabOf(o) === t).length;
  const list = mine.filter((o) => tabOf(o) === tab);
  const tabs: { id: Tab; label: string }[] = [
    { id: "review", label: `Needs review (${count("review")})` },
    { id: "progress", label: `In progress (${count("progress")})` },
    { id: "done", label: `Done (${count("done")})` },
  ];

  return (
    <>
      <PageHeader title={title} sub={sub} icon={icon} actions={action && (
        <Link href={action.href}
          className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-paddy-d px-5 text-[15px] font-bold tracking-tight text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_6px_16px_-8px_rgba(32,76,54,0.7)] transition-colors hover:bg-paddy">
          {action.label}
          <IconArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
        </Link>
      )} />
      <div className="flex gap-1 rounded-xl border border-line/80 bg-white p-1 shadow-card sm:w-fit" role="group" aria-label="Filter orders">
        {tabs.map((t) => (
          <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}
            className={cn("min-h-11 flex-1 whitespace-nowrap rounded-lg px-2 text-sm font-bold transition-colors sm:flex-none sm:px-4",
              tab === t.id ? "bg-paddy-d text-white shadow-sm" : "text-sub hover:bg-mist hover:text-ink")}>
            {t.label}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-clay">{error}</p>}
      {orders === null && !error && <p className="text-sub">Loading…</p>}
      {orders !== null && list.length === 0 && <Empty>Nothing here right now.</Empty>}
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((o) => <OrderCard key={`${o.id}-${o.status}-${o.weightConfirmedAt ?? ""}-${o.dryKg ?? ""}`} order={o} all={orders ?? []} onChanged={load} />)}
      </div>
    </>
  );
}
