"use client";

import { useStore } from "@/lib/store";
import { peso } from "@/lib/format";
import PriceChart from "@/components/PriceChart";
import { Badge, Card, PageHeader, Stat, TableWrap, td, th } from "@/components/ui";

export default function Prices() {
  const { prices, history } = useStore();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Prices" sub={`Updated ${prices.updated}. Prices change about every week.`} actions={<Badge tone="info">Basis: {prices.basis}</Badge>} />
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Fresh palay" value={`${peso(prices.fresh, 0)} per kg`} />
        <Stat label="Dry palay" value={`${peso(prices.dry, 0)} per kg`} />
      </div>
      <Card><h2 className="text-lg font-bold">Weekly trend</h2><PriceChart data={history} /></Card>
      <TableWrap>
        <thead><tr><th className={th}>Week</th><th className={th}>Fresh</th><th className={th}>Dry</th></tr></thead>
        <tbody>{history.map((h) => <tr key={h.week}><td className={td}>{h.week}</td><td className={td}>{peso(h.fresh, 0)}</td><td className={td}>{peso(h.dry, 0)}</td></tr>)}</tbody>
      </TableWrap>
    </div>
  );
}
