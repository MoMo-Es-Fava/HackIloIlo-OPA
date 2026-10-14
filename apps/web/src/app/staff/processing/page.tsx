"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { kgf } from "@/lib/format";
import { STAGES, type Stage } from "@/lib/data";
import { Badge, Button, PageHeader, TableWrap, stageTone, td, th } from "@/components/ui";

const next = (s: Stage) => (s === "Weighed" ? "Start drying" : s === "Drying" ? "Start milling" : s === "Milling" ? "Move to storage" : null);

export default function Processing() {
  const { batches, advanceBatch } = useStore();
  const [f, setF] = useState<Stage | "All">("All");
  const list = batches.filter((b) => f === "All" || b.stage === f);
  return (
    <>
      <PageHeader title="Drying and milling" sub="Move each batch one step at a time. Every step is logged on the batch." />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by stage">
        {(["All", ...STAGES] as const).map((s) => <Button key={s} variant={f === s ? "primary" : "ghost"} aria-pressed={f === s} className="min-h-11" onClick={() => setF(s)}>{s}</Button>)}
      </div>
      <TableWrap>
        <thead><tr><th className={th}>Batch</th><th className={th}>Source</th><th className={th}>Weight</th><th className={th}>Stage</th><th className={th}>Dryer</th><th className={th}>Action</th></tr></thead>
        <tbody>
          {list.map((b) => (
            <tr key={b.id}>
              <td className={td}><Link href={`/staff/traceability/${b.id}`} className="font-bold underline">{b.id}</Link></td>
              <td className={td}>{b.farmer} ({b.farmerId})</td><td className={td}>{kgf(b.kg)} {b.type.toLowerCase()}</td>
              <td className={td}><Badge tone={stageTone(b.stage)}>{b.stage}</Badge></td><td className={td}>{b.dryer ?? "None"}</td>
              <td className={td}>{next(b.stage) ? <Button className="min-h-11" onClick={() => advanceBatch(b.id)}>{next(b.stage)}</Button> : <span className="text-sub">{b.stage === "Stored" ? "Ready to sell" : "Done"}</span>}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
}
