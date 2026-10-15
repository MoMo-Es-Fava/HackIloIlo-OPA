"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { fmt } from "@/lib/format";
import { Badge, Bar, Card, PageHeader, TextField } from "@/components/ui";
import { IconBox } from "@/components/icons";

export default function Forecast() {
  const { plant: PLANT, forecast } = useStore();
  const weekly = PLANT.millingTonsPerDay * 7;
  const [rows, setRows] = useState(forecast.map((r) => ({ ...r, tons: String(r.tons) })));
  const edit = (i: number, v: string) => setRows(rows.map((r, j) => (j === i ? { ...r, tons: v } : r)));
  return (
    <>
      <PageHeader title="Harvest forecast" sub={`Expected incoming palay by week against milling capacity (${PLANT.millingTonsPerDay} t per day, ${fmt(weekly)} t per week). Edit the numbers to plan.`} icon={<IconBox className="h-6 w-6" />} />
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((r, i) => {
          const t = Number(r.tons) || 0;
          const pct = (t / weekly) * 100;
          const over = t > weekly;
          return (
            <Card key={r.week}>
              <div className="flex items-center justify-between"><p className="font-bold">Week of {r.week}</p><Badge tone={over ? "bad" : pct < 50 ? "warn" : "ok"}>{over ? `Over by ${fmt(t - weekly)} t` : pct < 50 ? `${fmt(weekly - t)} t idle` : "Within capacity"}</Badge></div>
              <Bar pct={pct} tone={over ? "bad" : "ok"} label={`${fmt(pct)} percent of weekly capacity`} />
              <TextField label="Expected tons" type="number" inputMode="decimal" min={0} value={r.tons} onChange={(e) => edit(i, e.target.value)} hint={`${fmt(pct)}% of capacity`} />
            </Card>
          );
        })}
      </div>
      <p className="text-sub">Weeks under half capacity are the best time to offer service bookings and fill idle capacity. Weeks over capacity need earlier slot booking or storage.</p>
    </>
  );
}
