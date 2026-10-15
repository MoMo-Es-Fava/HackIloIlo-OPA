"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { kgf } from "@/lib/format";
import { STAGES, type Stage } from "@/lib/data";
import { Badge, Button, PageHeader, TableWrap, stageTone, cn, td, th } from "@/components/ui";
import { IconFlame } from "@/components/icons";

const next = (s: Stage) => (s === "Weighed" ? "Start drying" : s === "Drying" ? "Start milling" : s === "Milling" ? "Move to storage" : null);

export default function Processing() {
  const { batches, advanceBatch } = useStore();
  const [f, setF] = useState<Stage | "All">("All");
  const list = batches.filter((b) => f === "All" || b.stage === f);
  return (
    <>
      <PageHeader title="Drying and milling" sub="Move each batch one step at a time. Every step is logged on the batch." icon={<IconFlame className="h-6 w-6" />} />
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-line/80 bg-white p-1.5 shadow-card" role="group" aria-label="Filter by stage">
        {(["All", ...STAGES] as const).map((s) => (
          <button
            key={s}
            aria-pressed={f === s}
            onClick={() => setF(s)}
            className={cn(
              "min-h-10 rounded-lg px-3.5 text-sm font-bold transition-colors",
              f === s ? "bg-paddy-d text-white shadow-sm" : "text-sub hover:bg-mist hover:text-ink",
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <TableWrap>
        <thead>
          <tr>
            <th className={th}>Batch</th><th className={th}>Source</th><th className={th}>Weight</th><th className={th}>Stage</th><th className={th}>Dryer</th><th className={th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {list.map((b) => (
            <tr key={b.id} className="transition-colors hover:bg-mist/50">
              <td className={td}><Link href={`/staff/traceability/${b.id}`} className="font-bold text-paddy-d hover:underline">{b.id}</Link></td>
              <td className={td}>{b.farmer} ({b.farmerId})</td><td className={cn(td, "tnum")}>{kgf(b.kg)} {b.type.toLowerCase()}</td>
              <td className={td}><Badge tone={stageTone(b.stage)}>{b.stage}</Badge></td><td className={cn(td, "tnum")}>{b.dryer ?? "None"}</td>
              <td className={td}>{next(b.stage) ? <Button className="min-h-11" onClick={() => advanceBatch(b.id)}>{next(b.stage)}</Button> : <span className="text-sub">{b.stage === "Stored" ? "Ready to sell" : "Done"}</span>}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
}
