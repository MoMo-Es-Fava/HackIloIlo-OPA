"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { OrderStatus, OrderType, PalayCondition, type AdminSummaryDto, type AnswerStatsDto, type MoneySummaryDto, type OrderDto } from "@irpc/types";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";
import { kgf, peso, pesoAccounting } from "@/lib/format";
import { serviceLabel } from "@/lib/orders";
import { Badge, Bar, Card, Empty, PageHeader, Stat } from "@/components/ui";
import { IconArrowRight, IconChart, IconClock, IconFlame, IconLeaf, IconScale, IconBox } from "@/components/icons";

const SACK_KG = 50;
const MANILA = "Asia/Manila";
const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: MANILA });
const monthStart = () => `${todayIso().slice(0, 8)}01`;
const shortDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00+08:00`).toLocaleDateString("en-PH", { timeZone: MANILA, month: "short", day: "numeric" });
const timeLabel = (d: Date) => d.toLocaleTimeString("en-PH", { timeZone: MANILA, hour: "numeric", minute: "2-digit" });

// Where each kind of order is handled.
const boardFor: Record<OrderType, string> = {
  [OrderType.SELL_PALAY]: "/staff/palay",
  [OrderType.SERVICE]: "/staff/services",
  [OrderType.BUY_RICE]: "/staff/rice-sales",
};

const awaitingConfirmation = (o: OrderDto) =>
  (o.status === OrderStatus.WEIGHED || (o.status === OrderStatus.DRYING && !!o.dryKg)) && !o.weightConfirmedAt;

/** "Waiting 2 h 10 min" — the bottleneck is answering farmers the same day. */
function waitingFor(createdAt: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60_000));
  if (minutes < 60) return { text: `Waiting ${minutes} min`, late: false };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { text: `Waiting ${hours} h ${minutes % 60} min`, late: hours >= 4 };
  return { text: `Waiting since ${new Date(createdAt).toLocaleDateString("en-PH", { timeZone: MANILA, month: "short", day: "numeric" })}`, late: true };
}

function describe(o: OrderDto) {
  const qty = `about ${Math.round(Number(o.requestedKg) / SACK_KG)} sacks (${kgf(o.requestedKg)})`;
  if (o.type === OrderType.SELL_PALAY) return `${o.palayCondition === PalayCondition.DRY ? "Dry" : "Fresh"} palay, ${qty}`;
  if (o.type === OrderType.SERVICE) return `${o.serviceType ? serviceLabel[o.serviceType] : "Service"}, ${qty}`;
  return `Rice order, ${kgf(o.requestedKg)}`;
}

type Task = { id: number; title: string; detail: string; href: string; action: string; wait?: ReturnType<typeof waitingFor> };

function tasksFrom(orders: OrderDto[]): Task[] {
  // Palay offers first (the bottleneck), then the oldest of everything else.
  const rank = (o: OrderDto) => (o.type === OrderType.SELL_PALAY ? 0 : 1);
  const answer = orders
    .filter((o) => o.status === OrderStatus.PENDING)
    .sort((a, b) => rank(a) - rank(b) || a.createdAt.localeCompare(b.createdAt))
    .map((o): Task => ({
      id: o.id,
      title: o.type === OrderType.SELL_PALAY ? `Answer ${o.contactName}'s palay offer` : o.type === OrderType.SERVICE ? `Answer ${o.contactName}'s request` : `Answer ${o.contactName}'s rice order`,
      detail: `${o.ref} · ${describe(o)}`,
      href: boardFor[o.type],
      action: "Answer",
      wait: waitingFor(o.createdAt),
    }));
  const confirm = orders.filter(awaitingConfirmation).map((o): Task => ({
    id: o.id,
    title: `Confirm the weight with ${o.contactName}`,
    detail: `${o.ref} · ${describe(o)} · weighed, waiting for the customer to agree`,
    href: boardFor[o.type],
    action: "Open",
  }));
  const pickup = orders.filter((o) => o.status === OrderStatus.READY_FOR_PICKUP).map((o): Task => ({
    id: o.id,
    title: `Hand over ${o.ref} to ${o.contactName}`,
    detail: `${describe(o)} · ready for pickup, collect payment in cash`,
    href: boardFor[o.type],
    action: "Open",
  }));
  return [...answer, ...confirm, ...pickup];
}

const SHOWN = 6;

export default function Today() {
  const { palayPrices: prices } = useStore();
  const [orders, setOrders] = useState<OrderDto[] | null>(null);
  const [summary, setSummary] = useState<AdminSummaryDto | null>(null);
  const [money, setMoney] = useState<MoneySummaryDto | null>(null);
  const [answers, setAnswers] = useState<AnswerStatsDto | null>(null);
  const [trend, setTrend] = useState<Awaited<ReturnType<typeof api.getOperationsTrend>> | null>(null);
  const [financeTrend, setFinanceTrend] = useState<Awaited<ReturnType<typeof api.getFinanceTrend>> | null>(null);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [financeTrendError, setFinanceTrendError] = useState<string | null>(null);
  // Money totals are admin-only; plant staff simply don't see that section.
  const [canSeeMoney, setCanSeeMoney] = useState(true);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [o, s, m, a] = await Promise.allSettled([
      api.adminListOrders(),
      api.getAdminSummary(),
      api.getMoney(monthStart(), todayIso()),
      api.getAnswerStats(monthStart(), todayIso()),
    ]);
    if (a.status === "fulfilled") setAnswers(a.value);
    if (o.status === "fulfilled") setOrders(o.value);
    if (s.status === "fulfilled") setSummary(s.value);
    if (m.status === "fulfilled") setMoney(m.value);
    if (t.status === "fulfilled" && t.value) {
      setTrend(t.value);
      setTrendError(null);
    } else if (t.status === "rejected") {
      setTrendError("Daily operations trends are temporarily unavailable.");
    }
    if (f.status === "fulfilled" && f.value) {
      setFinanceTrend(f.value);
      setFinanceTrendError(null);
    } else if (f.status === "rejected") {
      setFinanceTrendError("Daily financial trends are temporarily unavailable.");
    }
    const forbidden = m.status === "rejected" && m.reason instanceof ApiError && m.reason.status === 403;
    setCanSeeMoney(!forbidden);
    const failed = [o, s, a, forbidden ? null : m].find((r) => r?.status === "rejected");
    setError(failed ? "Some dashboard details could not be loaded. Please refresh to try again." : null);
    setUpdated(new Date());
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 60_000); // stay current while the page is open
    return () => clearInterval(timer);
  }, [load]);

  const tasks = orders ? tasksFrom(orders) : [];
  const count = (pred: (o: OrderDto) => boolean) => orders?.filter(pred).length ?? 0;
  const palayToAnswer = count((o) => o.type === OrderType.SELL_PALAY && o.status === OrderStatus.PENDING);
  const allToAnswer = count((o) => o.status === OrderStatus.PENDING);
  const toConfirm = count(awaitingConfirmation);
  const ready = count((o) => o.status === OrderStatus.READY_FOR_PICKUP);

  const booked = Number(summary?.dryingKgBookedToday ?? 0);
  const capacity = Number(summary?.dryingCapacityKg ?? 0);
  const pct = capacity > 0 ? (booked / capacity) * 100 : 0;
  const full = capacity > 0 && booked > capacity;
  const profit = money ? Number(money.grossProfit) : null;

  return (
    <>
      <PageHeader
        title="Today"
        sub="What needs your attention now. Answer palay offers first so farmers don't sell to traders."
        icon={<IconClock className="h-6 w-6" />}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-bold text-sub shadow-card" aria-live="polite">
            <span className="h-2 w-2 rounded-full bg-paddy" aria-hidden />
            {new Date().toLocaleDateString("en-PH", { timeZone: MANILA, weekday: "short", month: "short", day: "numeric" })}
            {updated && ` · updated ${timeLabel(updated)}`}
          </span>
        }
      />
      {error && <p role="alert" className="text-clay">{error}</p>}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Today at a glance">
        <Link href="/staff/palay" className="rounded-2xl outline-offset-4">
          <Stat label="Palay offers to answer" value={orders ? String(palayToAnswer) : "–"} hint={allToAnswer > palayToAnswer ? `${allToAnswer} requests in all` : "Answer the same day"} icon={<IconLeaf className="h-4 w-4" />} />
        </Link>
        <Stat label="Answered same day" value={answers?.sameDayPct != null ? `${answers.sameDayPct}%` : "–"}
          hint={answers ? (answers.offers ? `${answers.answeredSameDay} of ${answers.offers} palay offers this month` : "No palay offers yet this month") : "Palay offers this month"}
          icon={<IconClock className="h-4 w-4" />} />
        <Stat label="Weights to confirm" value={orders ? String(toConfirm) : "–"} hint="Customer must agree before paying" icon={<IconScale className="h-4 w-4" />} />
        <Stat label="Ready for pickup" value={orders ? String(ready) : "–"} hint="Collect payment in cash" icon={<IconBox className="h-4 w-4" />} />
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">To do now</h2>
              <p className="text-sm text-sub">Palay offers first, then the oldest. Each item opens the board where you handle it.</p>
            </div>
            {tasks.length > 0 && <Badge tone="warn">{tasks.length} {tasks.length === 1 ? "task" : "tasks"}</Badge>}
          </div>
          {orders === null && !error && <p className="text-sub">Loading…</p>}
          {orders !== null && tasks.length === 0 && <Empty>You&apos;re all caught up. New offers and requests will appear here.</Empty>}
          {tasks.length > 0 && (
            <ul className="divide-y divide-line">
              {tasks.slice(0, SHOWN).map((task) => (
                <li key={`${task.action}-${task.id}`} className="flex flex-col justify-between gap-3 py-4 first:pt-1 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-bold tracking-tight">{task.title}</p>
                    <p className="text-sm text-sub">{task.detail}</p>
                    {task.wait && <p className="mt-1"><Badge tone={task.wait.late ? "bad" : "neutral"}>{task.wait.text}</Badge></p>}
                  </div>
                  <Link href={task.href} className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 font-bold text-paddy-d hover:gap-2.5">
                    {task.action}
                    <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {tasks.length > SHOWN && <p className="text-sm text-sub">And {tasks.length - SHOWN} more. Open each board to see all of them.</p>}
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-mist text-paddy-d">
                <IconFlame className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Dryers today</h2>
                <p className="text-sm text-sub">Fresh palay booked for today against drying capacity.</p>
              </div>
            </div>
            {summary && capacity > 0 ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="tnum font-bold">{kgf(booked)} of {kgf(capacity)}</p>
                  <Badge tone={full ? "bad" : pct >= 75 ? "warn" : "ok"}>{full ? "Over capacity" : `${kgf(capacity - booked)} left`}</Badge>
                </div>
                <Bar pct={pct} tone={full ? "bad" : "ok"} label={`${Math.round(pct)}% of drying capacity booked`} />
                <p className="tnum text-sm text-sub">{Math.round(pct)}% booked · {summary.arrivingToday} arriving today{summary.inDrying ? ` · ${summary.inDrying} drying now` : ""}</p>
              </>
            ) : (
              <p className="text-sub">{summary ? "Drying capacity is not set." : "Loading…"}</p>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-mist text-paddy-d">
                <IconChart className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Price board</h2>
                <p className="text-sm text-sub">Palay buying prices · {prices.basis} basis</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-line/60 bg-mist/70 p-4">
              <p>Fresh <span className="tnum font-bold">{prices.fresh === null ? "not set" : `${peso(prices.fresh, 0)}/kg`}</span></p>
              <p>Dry <span className="tnum font-bold">{prices.dry === null ? "not set" : `${peso(prices.dry, 0)}/kg`}</span></p>
            </div>
            <p className="text-sm text-sub">Last updated {prices.updated}.</p>
            <Link href="/staff/pricing" className="group inline-flex min-h-11 items-center gap-1.5 font-bold text-paddy-d hover:gap-2.5">
              Review or change prices <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Card>
        </div>
      </div>

      <Card>
        {api.useMock ? (
          <p className="rounded-xl bg-mist px-4 py-5 text-sm text-sub">
            Daily trends are available when connected to the live database. The dashboard is currently showing demo data.
          </p>
        ) : trend ? <>
          <LineChart
            title="Daily operations"
            description="Requests created each day and requests answered over the last 14 days."
            points={trend.daily.map((point) => ({
              key: point.date,
              label: new Date(`${point.date}T00:00:00+08:00`).toLocaleDateString("en-PH", { timeZone: MANILA, month: "short", day: "numeric" }),
            }))}
            series={[
              { key: "palayOffers", label: "Palay offers", color: "var(--color-paddy-d)", values: trend.daily.map((point) => point.palayOffers) },
              { key: "riceOrders", label: "Rice orders", color: "var(--color-sky-d)", values: trend.daily.map((point) => point.riceOrders), dash: "7 5" },
              { key: "serviceRequests", label: "Service requests", color: "#806319", values: trend.daily.map((point) => point.serviceRequests), dash: "2 5" },
              { key: "answered", label: "Requests answered", color: "var(--color-clay)", values: trend.daily.map((point) => point.answered) },
            ]}
            formatValue={(value) => Math.round(value).toString()}
          />
          <div className="mt-5 border-t border-line/80 pt-5">
            <LineChart
              title="Processing milestones"
              description="Daily requests for customer weight confirmation and orders entering drying or ready for pickup."
              points={trend.daily.map((point) => ({
                key: point.date,
                label: new Date(`${point.date}T00:00:00+08:00`).toLocaleDateString("en-PH", { timeZone: MANILA, month: "short", day: "numeric" }),
              }))}
              series={[
                { key: "weightsToConfirm", label: "Weights to confirm", color: "var(--color-sky-d)", values: trend.daily.map((point) => point.weightsToConfirm) },
                { key: "inDrying", label: "Entered drying", color: "#70528f", values: trend.daily.map((point) => point.inDrying), dash: "7 5" },
                { key: "readyForPickup", label: "Ready for pickup", color: "var(--color-clay)", values: trend.daily.map((point) => point.readyForPickup), dash: "2 5" },
              ]}
              formatValue={(value) => Math.round(value).toString()}
            />
          </div>
        </> : (
          <p role={trendError ? "alert" : "status"} className="rounded-xl bg-mist px-4 py-5 text-sm text-sub">
            {trendError ?? "Loading daily operations trends…"}
          </p>
        )}
      </Card>

      {canSeeMoney && <Card>
        {api.useMock ? (
          <p className="rounded-xl bg-mist px-4 py-5 text-sm text-sub">
            Daily financial trends are available when connected to the live database. The dashboard is currently showing demo data.
          </p>
        ) : financeTrend ? (
          <LineChart
            title="Daily financial activity"
            description="Paid and completed orders by payment date over the last 14 days."
            points={financeTrend.daily.map((point) => ({
              key: point.date,
              label: new Date(`${point.date}T00:00:00+08:00`).toLocaleDateString("en-PH", { timeZone: MANILA, month: "short", day: "numeric" }),
            }))}
            series={[
              { key: "soldRice", label: "Rice sales", color: "var(--color-paddy-d)", values: financeTrend.daily.map((point) => Number(point.soldRice)) },
              { key: "serviceFees", label: "Service fees", color: "var(--color-sky-d)", values: financeTrend.daily.map((point) => Number(point.serviceFees)), dash: "7 5" },
              { key: "boughtPalay", label: "Palay paid", color: "#806319", values: financeTrend.daily.map((point) => Number(point.boughtPalay)), dash: "2 5" },
              { key: "grossProfit", label: "Gross profit", color: "var(--color-clay)", values: financeTrend.daily.map((point) => Number(point.grossProfit)) },
            ]}
            formatValue={(value) => pesoAccounting(value)}
          />
        ) : (
          <p role={financeTrendError ? "alert" : "status"} className="rounded-xl bg-mist px-4 py-5 text-sm text-sub">
            {financeTrendError ?? "Loading daily financial trends…"}
          </p>
        )}
      </Card>}

      {canSeeMoney && <section className="flex flex-col gap-3">
        <PageHeader level={2} title="This month" sub={money ? `${shortDate(money.from)} to ${shortDate(money.to)}, ${money.to.slice(0, 4)}. Counts paid and completed orders only.` : "Paid and completed orders only."} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Palay bought" value={money ? peso(money.boughtPalay, 0) : "–"} hint="Paid to farmers in cash" icon={<IconLeaf className="h-4 w-4" />} />
          <Stat label="Rice sales" value={money ? peso(money.soldRice, 0) : "–"} hint="From rice buyers" icon={<IconBox className="h-4 w-4" />} />
          <Stat label="Service fees" value={money ? peso(money.serviceFees, 0) : "–"} hint="Drying and milling" icon={<IconFlame className="h-4 w-4" />} />
          <Stat label="Gross profit" value={money ? pesoAccounting(money.grossProfit) : "–"}
            hint={profit !== null && profit < 0 ? "In parentheses: a loss. More spent on palay than earned" : "Rice sales + service fees − palay bought"}
            loss={profit !== null && profit < 0} icon={<IconChart className="h-4 w-4" />} />
        </div>
      </section>}
    </>
  );
}
