"use client";

import { useStore } from "@/lib/store";
import { peso } from "@/lib/format";
import PriceChart from "@/components/PriceChart";
import { Badge, Card, PageHeader, Stat, TableWrap, cn, td, th } from "@/components/ui";
import { IconChart } from "@/components/icons";

export default function Prices() {
  const { palayPrices: prices, history } = useStore();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Prices"
        sub={`Updated ${prices.updated}. Prices change about every week.`}
        icon={<IconChart className="h-6 w-6" />}
        actions={<Badge tone="info">Basis: {prices.basis}</Badge>}
      />
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Fresh palay" value={`${peso(prices.fresh, 0)} per kg`} />
        <Stat label="Dry palay" value={`${peso(prices.dry, 0)} per kg`} />
      </div>
      {history.length > 0 && <>
      <div className="grid gap-4 2xl:grid-cols-2">
        <Card className="min-w-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Weekly trend</h2>
            <p className="text-sm text-sub">Fresh and dry palay prices per kilogram.</p>
          </div>
          <PriceChart data={history} />
        </Card>
        <section className="min-w-0" aria-label="Weekly price history">
          <TableWrap>
            <thead>
              <tr>
                <th className={th}>Week</th>
                <th className={th}>Fresh</th>
                <th className={th}>Dry</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.week} className="transition-colors hover:bg-mist/50">
                  <td className={td}>{h.week}</td>
                  <td className={cn(td, "tnum")}>{peso(h.fresh, 0)}</td>
                  <td className={cn(td, "tnum")}>{peso(h.dry, 0)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </section>
      </div>
      </>}
    </div>
  );
}
