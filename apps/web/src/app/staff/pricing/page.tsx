"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { peso } from "@/lib/format";
import PriceChart from "@/components/PriceChart";
import { Badge, Button, Card, PageHeader, SelectField, TableWrap, TextField, td, th } from "@/components/ui";
import { PriceBasis } from "@irpc/types";

export default function Pricing() {
  const { palayPrices: prices, history, orderError, setPrices } = useStore();
  const [fresh, setFresh] = useState(prices.fresh?.toString() ?? "");
  const [dry, setDry] = useState(prices.dry?.toString() ?? "");
  const [basis, setBasis] = useState<PriceBasis>(prices.basis);
  const f = Number(fresh), d = Number(dry);
  const big = prices.fresh !== null && Math.abs(f - prices.fresh) > 2 || prices.dry !== null && Math.abs(d - prices.dry) > 2;
  const bad = !(f > 0) || !(d > 0) || d < f;
  return (
    <>
      <PageHeader title="Pricing and rates" sub={`Current: fresh ${peso(prices.fresh, 0)}, dry ${peso(prices.dry, 0)} per kg (${prices.basis}). Updated ${prices.updated}.`} />
      <Card>
        <h2 className="text-lg font-bold">Set this week&apos;s prices</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <TextField label="Fresh (₱ per kg)" type="number" inputMode="decimal" step="0.5" value={fresh} onChange={(e) => setFresh(e.target.value)} />
          <TextField label="Dry (₱ per kg)" type="number" inputMode="decimal" step="0.5" value={dry} onChange={(e) => setDry(e.target.value)} error={d < f && dry !== "" ? "Dry price should not be below fresh" : undefined} />
          <SelectField label="Price basis" value={basis} onChange={(e) => setBasis(e.target.value as PriceBasis)}><option value={PriceBasis.MARKET}>Market</option><option value={PriceBasis.NFA}>NFA</option></SelectField>
        </div>
        {big && !bad && <p><Badge tone="warn">Check</Badge> This is more than ₱2 from the current price. Weekly changes are usually ₱1 to ₱2.</p>}
        <p className="text-sm text-sub">Publishing updates the buyer price page and is written to the audit log.</p>
        <div><Button disabled={bad} onClick={() => setPrices(f, d, basis)}>Publish prices</Button></div>
      </Card>
      {orderError && <p role="alert" className="text-clay">{orderError}</p>}
      {history.length > 0 && <>
      <Card><h2 className="text-lg font-bold">History</h2><PriceChart data={history} /></Card>
      <TableWrap>
        <thead><tr><th className={th}>Week</th><th className={th}>Fresh</th><th className={th}>Dry</th></tr></thead>
        <tbody>{history.map((h) => <tr key={h.week}><td className={td}>{h.week}</td><td className={td}>{peso(h.fresh, 0)}</td><td className={td}>{peso(h.dry, 0)}</td></tr>)}</tbody>
      </TableWrap>
      </>}
    </>
  );
}
