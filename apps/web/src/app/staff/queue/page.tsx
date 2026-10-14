"use client";

import { OrderStatus } from "@irpc/types";
import { serviceLabel, statusLabel } from "@/lib/orders";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { kgf, dateLabel } from "@/lib/format";
import { Badge, Bar, Button, Card, Empty, PageHeader, SelectField, TableWrap, TextField, bookingTone, orderTone, td, th } from "@/components/ui";
import type { Booking, GrainType } from "@/lib/data";

export default function Queue() {
  const { slots, bookings, serviceRequests, orderDetails, orderError, addBooking, setBookingStatus, updateOrderStatus } = useStore();
  const [slotId, setSlotId] = useState(slots[0].id);
  const [farmer, setFarmer] = useState("");
  const [farmerId, setFarmerId] = useState("");
  const [kg, setKg] = useState("");
  const [type, setType] = useState<GrainType>("Fresh");
  const [channel, setChannel] = useState<Booking["channel"]>("Walk-in");
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [dates, setDates] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState("");
  const slot = slots.find((s) => s.id === slotId);
  const full = !!slot && slot.booked >= slot.capacity;

  const submit = () => {
    const ok = addBooking({ slotId, farmer: farmer.trim(), farmerId: farmerId.trim() || "unregistered", kg: Number(kg), type, channel });
    setMsg(ok ? "Booking added." : "Could not add. Check the slot is not full and all fields are filled.");
    if (ok) { setFarmer(""); setFarmerId(""); setKg(""); }
  };

  return (
    <>
      <PageHeader title="Booking and queue" sub="Slot capacity, today's queue and walk-in or phone bookings." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {slots.map((s) => {
          const pct = (s.booked / s.capacity) * 100;
          const isFull = s.booked >= s.capacity;
          return (
            <Card key={s.id}>
              <div className="flex items-center justify-between"><p className="font-bold">{s.date}, {s.time}</p><Badge tone={isFull ? "bad" : pct >= 75 ? "warn" : "ok"}>{isFull ? "Full" : `${s.capacity - s.booked} left`}</Badge></div>
              <Bar pct={pct} tone={isFull ? "bad" : "ok"} label={`${s.booked} of ${s.capacity} booked`} />
              <p className="text-sm text-sub">{s.booked} of {s.capacity} booked</p>
            </Card>
          );
        })}
      </div>

      <Card>
        <h2 className="text-lg font-bold">Add phone or walk-in booking</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField label="Slot" value={slotId} onChange={(e) => setSlotId(e.target.value)}>
            {slots.map((s) => <option key={s.id} value={s.id} disabled={s.booked >= s.capacity}>{s.date}, {s.time}{s.booked >= s.capacity ? " (full)" : ""}</option>)}
          </SelectField>
          <TextField label="Farmer or cooperative" value={farmer} onChange={(e) => setFarmer(e.target.value)} />
          <TextField label="Farmer ID" placeholder="F-000" value={farmerId} onChange={(e) => setFarmerId(e.target.value)} />
          <TextField label="Estimated kg" type="number" inputMode="decimal" min={1} value={kg} onChange={(e) => setKg(e.target.value)} />
          <SelectField label="Grain" value={type} onChange={(e) => setType(e.target.value as GrainType)}><option>Fresh</option><option>Dry</option></SelectField>
          <SelectField label="Channel" value={channel} onChange={(e) => setChannel(e.target.value as Booking["channel"])}><option>Walk-in</option><option>Phone</option></SelectField>
        </div>
        <div className="flex items-center gap-3"><Button disabled={full || !farmer.trim() || !(Number(kg) > 0)} onClick={submit}>Add booking</Button><span aria-live="polite" className="text-sub">{full ? "This slot is full." : msg}</span></div>
      </Card>

      <h2 className="text-xl font-bold">Today&apos;s queue</h2>
      <TableWrap>
        <thead><tr><th className={th}>Booking</th><th className={th}>Farmer</th><th className={th}>Slot</th><th className={th}>Grain</th><th className={th}>Channel</th><th className={th}>Status</th><th className={th}>Action</th></tr></thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td className={td}>{b.id}</td><td className={td}>{b.farmer} ({b.farmerId})</td>
              <td className={td}>{slots.find((s) => s.id === b.slotId)?.time}</td><td className={td}>{kgf(b.kg)} {b.type.toLowerCase()}</td><td className={td}>{b.channel}</td>
              <td className={td}><Badge tone={bookingTone(b.status)}>{b.status}</Badge></td>
              <td className={td}>
                {b.status === "Confirmed" && <div className="flex gap-2"><Button className="min-h-11" onClick={() => setBookingStatus(b.id, "Checked in")}>Check in</Button><Button variant="danger" className="min-h-11" onClick={() => setBookingStatus(b.id, "No show")}>No show</Button></div>}
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <h2 className="text-xl font-bold">Service requests</h2>
      {orderError && <p role="alert" className="text-clay">{orderError}</p>}
      {serviceRequests.length === 0 && <Empty>No service requests.</Empty>}
      <div className="grid gap-3 md:grid-cols-2">
        {serviceRequests.map((s) => (
          <Card key={s.id}>
            <div className="flex items-center justify-between"><p className="font-bold">{s.serviceType ? serviceLabel[s.serviceType] : "Service"}: {kgf(s.requestedKg)}</p><Badge tone={orderTone(s.status)}>{statusLabel[s.status]}</Badge></div>
            <p className="text-sm text-sub">{s.ref} · {orderDetails[s.id]?.contactName ?? "Customer"}. Preferred {dateLabel(s.preferredDate)}</p>
            {s.scheduledDate && <p>Confirmed: {dateLabel(s.scheduledDate)}</p>}
            {s.rejectReason && <p>{s.rejectReason}</p>}
            {s.status === OrderStatus.PENDING && <>
              <TextField label="Confirmed service date" type="date" value={dates[s.id] ?? s.preferredDate.slice(0, 10)} onChange={(e) => setDates({ ...dates, [s.id]: e.target.value })} />
              <TextField label="Reason for rejection" value={reasons[s.id] ?? ""} onChange={(e) => setReasons({ ...reasons, [s.id]: e.target.value })} />
              <div className="flex gap-2">
                <Button className="min-h-11" disabled={!(dates[s.id] ?? s.preferredDate)} onClick={() => updateOrderStatus(s.id, OrderStatus.SCHEDULED, { scheduledDate: dates[s.id] ?? s.preferredDate })}>Accept</Button>
                <Button variant="danger" className="min-h-11" disabled={!reasons[s.id]?.trim()} onClick={() => updateOrderStatus(s.id, OrderStatus.REJECTED, { reason: reasons[s.id] })}>Reject</Button>
              </div>
            </>}
          </Card>
        ))}
      </div>
    </>
  );
}
