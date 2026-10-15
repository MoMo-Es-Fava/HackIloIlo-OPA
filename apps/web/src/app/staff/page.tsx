"use client";

import { OrderStatus, OrderType } from "@irpc/types";
import { serviceLabel } from "@/lib/orders";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { fmt, peso, dateLabel } from "@/lib/format";
import { Badge, Card, Empty, PageHeader, Stat } from "@/components/ui";
import { IconClock, IconFlame, IconScale, IconBox, IconChevronRight, IconArrowRight, IconBolt, IconChart, IconClipboard, IconTrace } from "@/components/icons";

type Task = { id: string; title: string; detail: string; href: string; action: string };

export default function Dashboard() {
  const { isMock, energy, plant: PLANT, slots, bookings, batches, orders, orderDetails, serviceRequests, kwhPrice, palayPrices: prices } = useStore();
  if (!isMock) return (
    <>
      <PageHeader title="Today's orders" sub="Current orders received by IRPC." />
      <section className="grid gap-3 sm:grid-cols-2">
        <Stat label="Needs approval" value={String(orders.filter((order) => order.status === OrderStatus.PENDING).length)} />
        <Stat label="Ready for pickup" value={String(orders.filter((order) => order.status === OrderStatus.READY_FOR_PICKUP).length)} />
      </section>
      <Link className="min-h-12 font-bold underline" href="/staff/sales">Rice orders</Link>
      <Link className="min-h-12 font-bold underline" href="/staff/queue">Service requests</Link>
    </>
  );
  const todaySlots = slots.filter((slot) => slot.date === "Thu 16 Oct");
  const capacity = todaySlots.reduce((total, slot) => total + slot.capacity, 0);
  const booked = todaySlots.reduce((total, slot) => total + slot.booked, 0);
  const todaySlotIds = new Set(todaySlots.map((slot) => slot.id));
  const arrivals = bookings.filter((booking) => todaySlotIds.has(booking.slotId) && booking.status === "Confirmed");
  const waitingForWeighIn = bookings.filter((booking) => booking.status === "Checked in");
  const inProcess = batches.filter((batch) => ["Weighed", "Drying", "Milling"].includes(batch.stage));
  const stored = batches.filter((batch) => batch.stage === "Stored");
  const kwh = energy.dryers.reduce((total, dryer) => total + dryer.kwh, 0) + energy.millKwh;
  const idleDryers = energy.dryers.filter((dryer) => dryer.status === "Idle").length;
  const readyOrders = orders.filter((order) => order.type === OrderType.BUY_RICE && order.status === OrderStatus.ACCEPTED);
  const pendingServices = serviceRequests.filter((request) => request.status === OrderStatus.PENDING);

  const tasks: Task[] = [
    ...arrivals.slice(0, 3).map((booking) => ({
      id: booking.id,
      title: `Check in ${booking.farmer}`,
      detail: `${booking.id} · ${booking.kg.toLocaleString()} kg estimated · ${booking.type.toLowerCase()} palay`,
      href: "/staff/queue",
      action: "Open queue",
    })),
    ...waitingForWeighIn.slice(0, 2).map((booking) => ({
      id: booking.id,
      title: `Record weight for ${booking.farmer}`,
      detail: `${booking.id} · Farmer is checked in and waiting at the gate`,
      href: "/staff/intake",
      action: "Weigh in",
    })),
    ...readyOrders.slice(0, 2).map((order) => ({
      id: order.ref,
      title: `Prepare order ${order.ref}`,
      detail: `${orderDetails[order.id]?.contactName ?? "Customer"} · ${Number(order.requestedKg).toLocaleString()} kg · accepted`,
      href: "/staff/sales",
      action: "Open sales",
    })),
    ...pendingServices.slice(0, 2).map((request) => ({
      id: request.ref,
      title: `Review ${request.serviceType ? serviceLabel[request.serviceType].toLowerCase() : "service"} request`,
      detail: `${orderDetails[request.id]?.contactName ?? "Customer"} · ${Number(request.requestedKg).toLocaleString()} kg · requested ${dateLabel(request.preferredDate)}`,
      href: "/staff/queue",
      action: "Review request",
    })),
  ].slice(0, 6);

  return (
    <>
      <PageHeader
        title="Today's operations"
        sub="A live view of the queue, processing floor, and work that needs attention."
        icon={<IconClock className="h-6 w-6" />}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-bold text-sub shadow-card">
            <span className="h-2 w-2 rounded-full bg-paddy" aria-hidden />
            Thu 16 Oct · Demo
          </span>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Today's operations summary">
        <Link href="/staff/queue" className="rounded-2xl outline-offset-4">
          <Stat label="Arriving today" value={String(arrivals.length)} hint={`${booked} of ${capacity} appointment places booked`} icon={<IconClock className="h-4 w-4" />} />
        </Link>
        <Link href="/staff/processing" className="rounded-2xl outline-offset-4">
          <Stat label="In processing" value={String(inProcess.length)} hint="Weighed, drying, or milling" icon={<IconFlame className="h-4 w-4" />} />
        </Link>
        <Link href="/staff/intake" className="rounded-2xl outline-offset-4">
          <Stat label="Waiting for weigh-in" value={String(waitingForWeighIn.length)} hint="Checked in at the gate" icon={<IconScale className="h-4 w-4" />} />
        </Link>
        <Link href="/staff/sales" className="rounded-2xl outline-offset-4">
          <Stat label="Ready for sale" value={String(stored.length)} hint={`${stored.reduce((total, batch) => total + batch.kg, 0).toLocaleString()} kg in stored batches`} icon={<IconBox className="h-4 w-4" />} />
        </Link>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Today&apos;s to-do list</h2>
              <p className="text-sm text-sub">Work in the order it arrives. Each item opens the right workspace.</p>
            </div>
            {tasks.length > 0 && <Badge tone="warn">{tasks.length} {tasks.length === 1 ? "task" : "tasks"}</Badge>}
          </div>
          {tasks.length === 0 ? (
            <Empty>You&apos;re all caught up. New bookings and service requests will appear here.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {tasks.map((task) => (
                <li key={task.id} className="flex flex-col justify-between gap-3 py-4 first:pt-1 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-bold tracking-tight">{task.title}</p>
                    <p className="text-sm text-sub">{task.detail}</p>
                  </div>
                  <Link href={task.href} className="group inline-flex min-h-10 shrink-0 items-center gap-1.5 font-bold text-paddy-d hover:gap-2.5">
                    {task.action}
                    <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-mist text-paddy-d">
                <IconFlame className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Plant snapshot</h2>
                <p className="text-sm text-sub">Capacity and operating costs for today.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line/60 bg-mist/70 p-4">
                <p className="text-[13px] text-sub">Dryers running idle</p>
                <p className="tnum mt-1 text-2xl font-bold tracking-tight">{idleDryers}<span className="text-base font-normal text-sub"> / {PLANT.dryers}</span></p>
              </div>
              <div className="rounded-xl border border-line/60 bg-mist/70 p-4">
                <p className="text-[13px] text-sub">Electricity so far</p>
                <p className="tnum mt-1 text-2xl font-bold tracking-tight">{peso(kwh * kwhPrice, 0)}</p>
              </div>
            </div>
            <p className="tnum text-sm text-sub">{fmt(kwh)} kWh at {peso(kwhPrice)}/kWh.</p>
            <Link href="/staff/financials" className="group inline-flex min-h-10 items-center gap-1.5 font-bold text-paddy-d hover:gap-2.5">
              View energy and costs <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
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
              <p>Fresh <span className="tnum font-bold">{peso(prices.fresh, 0)}/kg</span></p>
              <p>Dry <span className="tnum font-bold">{peso(prices.dry, 0)}/kg</span></p>
            </div>
            <p className="text-sm text-sub">Last updated {prices.updated}.</p>
            <Link href="/staff/pricing" className="group inline-flex min-h-10 items-center gap-1.5 font-bold text-paddy-d hover:gap-2.5">
              Review or change prices <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Card>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <PageHeader level={2} title="Go to a workspace" sub="Jump straight to a common task." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { href: "/staff/queue", Icon: IconClipboard, label: "Manage arrivals", description: "Bookings, walk-ins, and service requests" },
            { href: "/staff/intake", Icon: IconScale, label: "Record a weigh-in", description: "Check in a farmer and create a batch" },
            { href: "/staff/processing", Icon: IconFlame, label: "Move a batch", description: "Update drying and milling progress" },
            { href: "/staff/traceability", Icon: IconTrace, label: "Find a batch", description: "Look up source and processing history" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="group flex flex-col rounded-2xl border border-line/80 bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-paddy/50 hover:shadow-raised">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-mist text-paddy-d">
                <item.Icon className="h-5 w-5" />
              </span>
              <p className="mt-3 font-bold tracking-tight">{item.label}</p>
              <p className="mt-1 text-sm text-sub">{item.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-paddy-d">
                Open <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
