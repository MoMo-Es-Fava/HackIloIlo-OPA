"use client";

import { useStore } from "@/lib/store";
import { financeDays } from "@/lib/data";
import { peso, fmt } from "@/lib/format";
import { Badge, Card, PageHeader, Stat, TableWrap, cn, td, th } from "@/components/ui";
import { IconChart } from "@/components/icons";

export default function Financials() {
  const { kwhPrice } = useStore();
  const rows = financeDays.map((d) => {
    const energyCost = d.kwh * kwhPrice;
    return { ...d, energyCost, profit: d.revenue - d.otherCost - energyCost };
  });
  const total = rows.reduce((a, r) => a + r.profit, 0);
  const energyShare = rows.reduce((a, r) => a + r.energyCost, 0);
  const revenue = rows.reduce((a, r) => a + r.revenue, 0);
  const max = Math.max(...rows.map((r) => Math.abs(r.profit)), 1);
  return (
    <>
      <PageHeader title="Financials and energy" sub={`Last 7 days, sample data. Electricity at ${peso(kwhPrice)} per kWh (change it in Real-time costing).`} icon={<IconChart className="h-6 w-6" />} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Revenue" value={peso(revenue, 0)} />
        <Stat label="Energy cost" value={peso(energyShare, 0)} hint={`${fmt((energyShare / revenue) * 100, 1)}% of revenue`} />
        <Stat label={total >= 0 ? "Profit" : "Loss"} value={peso(total, 0)} loss={total < 0} />
      </div>
      <Card>
        <h2 className="text-lg font-bold">Daily profit or loss</h2>
        <div className="flex h-40 items-end gap-3" role="img" aria-label="Daily profit or loss bars">
          {rows.map((r) => (
            <div key={r.day} className="flex h-full flex-1 flex-col justify-end gap-1">
              <div className={`rounded-t ${r.profit < 0 ? "bg-clay" : "bg-paddy"}`} style={{ height: `${(Math.abs(r.profit) / max) * 100}%`, minHeight: 4 }} />
              <p className="text-center text-xs text-sub">{r.day}</p>
            </div>
          ))}
        </div>
      </Card>
      <TableWrap>
        <thead><tr><th className={th}>Day</th><th className={th}>Revenue</th><th className={th}>Other costs</th><th className={th}>Energy (kWh)</th><th className={th}>Energy cost</th><th className={th}>Result</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.day} className="transition-colors hover:bg-mist/50"><td className={td}>{r.day}</td><td className={cn(td, "tnum")}>{peso(r.revenue, 0)}</td><td className={cn(td, "tnum")}>{peso(r.otherCost, 0)}</td><td className={cn(td, "tnum")}>{fmt(r.kwh)}</td><td className={cn(td, "tnum")}>{peso(r.energyCost, 0)}</td>
              <td className={td}><Badge tone={r.profit < 0 ? "bad" : "ok"}>{r.profit < 0 ? "Loss" : "Profit"} {peso(Math.abs(r.profit), 0)}</Badge></td></tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
}
