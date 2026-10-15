"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { peso, kgf } from "@/lib/format";
import { ORDER_FLOW, type Delivery } from "@/lib/data";
import { Badge, Button, Card, PageHeader, SelectField, TableWrap, TextField, orderTone, cn, td, th } from "@/components/ui";
import { IconReceipt } from "@/components/icons";

export default function Sales() {
  const { orders, offers, batches, createOffer, updateOrderStatus } = useStore();
  const stored = batches.filter((b) => b.stage === "Stored");
  const [batchId, setBatchId] = useState("");
  const [kg, setKg] = useState("");
  const [price, setPrice] = useState("");
  const [delivery, setDelivery] = useState<Delivery>("Pickup at IRPC");
  const [msg, setMsg] = useState("");
  const b = stored.find((x) => x.id === batchId);
  const kgErr = b && kg !== "" && (!(Number(kg) > 0) || Number(kg) > b.kg) ? `Enter 1 to ${b.kg} kg` : undefined;

  const post = () => {
    const ok = createOffer(batchId, Number(kg), Number(price), delivery);
    setMsg(ok ? "Offer posted. Buyers can see it now." : "Could not post the offer.");
    if (ok) { setBatchId(""); setKg(""); setPrice(""); }
  };

  return (
    <>
      <PageHeader title="Sales and receipts" sub="Post offers from stored batches and move orders through payment to delivery." />
      <Card>
        <h2 className="text-lg font-bold tracking-tight">Post a sale offer</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <SelectField label="Stored batch" value={batchId} onChange={(e) => { setBatchId(e.target.value); const s = stored.find((x) => x.id === e.target.value); setKg(s ? String(s.kg) : ""); }}>
            <option value="">Choose a batch</option>{stored.map((s) => <option key={s.id} value={s.id}>{s.id} ({kgf(s.kg)})</option>)}
          </SelectField>
          <TextField label="Quantity (kg)" type="number" inputMode="decimal" value={kg} error={kgErr} onChange={(e) => setKg(e.target.value)} />
          <TextField label="Price per kg (₱)" type="number" inputMode="decimal" step="0.5" value={price} onChange={(e) => setPrice(e.target.value)} />
          <SelectField label="Delivery" value={delivery} onChange={(e) => setDelivery(e.target.value as Delivery)}><option>Pickup at IRPC</option><option>Municipal drop point</option></SelectField>
        </div>
        <div className="flex items-center gap-3"><Button arrow disabled={!b || !!kgErr || !(Number(kg) > 0) || !(Number(price) > 0)} onClick={post}>Post offer</Button><span aria-live="polite" className="text-sub">{msg}</span></div>
      </Card>

      <h2 className="text-xl font-bold tracking-tight">Open offers</h2>
      <TableWrap>
        <thead><tr><th className={th}>Offer</th><th className={th}>Batch</th><th className={th}>Available</th><th className={th}>Price</th><th className={th}>Delivery</th></tr></thead>
        <tbody>{offers.map((o) => <tr key={o.id} className="transition-colors hover:bg-mist/50"><td className={td}>{o.id}</td><td className={td}>{o.batchId}</td><td className={cn(td, "tnum")}>{kgf(o.kgAvailable)}</td><td className={cn(td, "tnum")}>{peso(o.pricePerKg)}</td><td className={td}>{o.delivery}</td></tr>)}</tbody>
      </TableWrap>

      <h2 className="text-xl font-bold tracking-tight">Orders</h2>
      <TableWrap>
        <thead><tr><th className={th}>Order</th><th className={th}>Buyer</th><th className={th}>Quantity</th><th className={th}>Total</th><th className={th}>Status</th><th className={th}>Action</th></tr></thead>
        <tbody>
          {orders.map((o) => {
            const i = ORDER_FLOW.indexOf(o.status);
            const nextS = i >= 0 && i < ORDER_FLOW.length - 1 ? ORDER_FLOW[i + 1] : null;
            return (
              <tr key={o.id} className="transition-colors hover:bg-mist/50">
                <td className={td}><Link className="font-bold text-paddy-d hover:underline" href={`/staff/sales/${o.id}`}>{o.id}</Link></td><td className={td}>{o.buyer}</td><td className={cn(td, "tnum")}>{kgf(o.kg)}</td><td className={cn(td, "tnum")}>{peso(o.kg * o.pricePerKg)}</td>
                <td className={td}><Badge tone={orderTone(o.status)}>{o.status}</Badge></td>
                <td className={td}>{nextS ? <Button className="min-h-11" onClick={() => updateOrderStatus(o.id, nextS)}>Mark {nextS.toLowerCase()}</Button> : <span className="text-sub">{o.status === "Delivered" ? "Complete" : "Closed"}</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
    </>
  );
}
