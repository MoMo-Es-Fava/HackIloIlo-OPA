"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { peso, fmt, kgf } from "@/lib/format";
import { Badge, Bar, Button, Card, PageHeader, Stat, TableWrap, TextField, td, th } from "@/components/ui";

const TARGET = 3.5;

export default function Costing() {
  const { energy, kwhPrice, setKwhPrice, batches } = useStore();
  const [p, setP] = useState(String(kwhPrice));
  const kwh = energy.dryers.reduce((a, d) => a + d.kwh, 0) + energy.millKwh;
  const maxD = Math.max(...energy.dryers.map((d) => d.kwh));
  const idle = energy.dryers.filter((d) => d.status === "Idle");
  const idleCost = idle.reduce((a, d) => a + d.kwh, 0) * kwhPrice;
  const active = batches.filter((b) => ["Drying", "Milling", "Stored"].includes(b.stage) && b.costPerKg > 0);
  const avg = active.length ? active.reduce((a, b) => a + b.costPerKg, 0) / active.length : 0;
  const pn = Number(p);

  return (
    <>
      <PageHeader title="Real-time costing" sub="Sample data for today. Cost per kilo is driven by energy use and idle capacity." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Average cost per kg" value={peso(avg)} hint={`Target ${peso(TARGET)}`} loss={avg > TARGET} />
        <Stat label="Energy used" value={`${fmt(kwh)} kWh`} hint={`${energy.dryers.length} dryers and the mill`} />
        <Stat label="Energy cost" value={peso(kwh * kwhPrice, 0)} hint={`At ${peso(kwhPrice)} per kWh`} />
        <Stat label="Idle dryer energy" value={peso(idleCost, 0)} hint={`${idle.length} dryers idle`} loss={idle.length >= 2} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold">Energy by dryer</h2>
          {energy.dryers.map((d) => (
            <div key={d.id} className="flex flex-col gap-1">
              <div className="flex justify-between"><span>Dryer {d.id}</span><span className="flex items-center gap-2">{fmt(d.kwh)} kWh <Badge tone={d.status === "Idle" ? "warn" : "ok"}>{d.status}</Badge></span></div>
              <Bar pct={(d.kwh / maxD) * 100} tone={d.status === "Idle" ? "idle" : d.kwh === maxD ? "bad" : "ok"} label={`Dryer ${d.id} energy`} />
            </div>
          ))}
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Electricity price</h2>
          <TextField label="Price per kWh (₱)" type="number" inputMode="decimal" min={0} step="0.01" value={p} onChange={(e) => setP(e.target.value)} error={p !== "" && !(pn > 0) ? "Enter a price above 0" : undefined} hint="Used in costing and financials" />
          <Button disabled={!(pn > 0) || pn === kwhPrice} onClick={() => setKwhPrice(pn)}>Update price</Button>
        </Card>
      </div>
      <TableWrap>
        <thead><tr><th className={th}>Batch</th><th className={th}>Weight</th><th className={th}>Stage</th><th className={th}>Cost per kg</th><th className={th}>Against target</th></tr></thead>
        <tbody>
          {active.map((b) => (
            <tr key={b.id}><td className={td}>{b.id}</td><td className={td}>{kgf(b.kg)}</td><td className={td}>{b.stage}</td><td className={td}>{peso(b.costPerKg)}</td>
              <td className={td}><Badge tone={b.costPerKg > TARGET ? "bad" : "ok"}>{b.costPerKg > TARGET ? `Over by ${peso(b.costPerKg - TARGET)}` : "On target"}</Badge></td></tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
}
