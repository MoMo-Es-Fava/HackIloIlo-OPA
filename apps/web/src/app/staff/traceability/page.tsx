"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { kgf } from "@/lib/format";
import { Badge, Empty, PageHeader, TableWrap, TextField, stageTone, td, th } from "@/components/ui";

export default function Traceability() {
  const { batches } = useStore();
  const [q, setQ] = useState("");
  const list = batches.filter((b) => `${b.id} ${b.farmer} ${b.farmerId} ${b.soldTo ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="Batch search" sub="Find any batch by ID, farmer or buyer and open its full thread." />
      <TextField label="Search" placeholder="Batch ID, farmer ID or buyer" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.length === 0 ? <Empty>No batches match.</Empty> : (
        <TableWrap>
          <thead><tr><th className={th}>Batch</th><th className={th}>Sold by (source)</th><th className={th}>Weight</th><th className={th}>Stage</th><th className={th}>Sold to</th></tr></thead>
          <tbody>{list.map((b) => <tr key={b.id}><td className={td}><Link className="font-bold underline" href={`/staff/traceability/${b.id}`}>{b.id}</Link></td><td className={td}>{b.farmer} ({b.farmerId})</td><td className={td}>{kgf(b.kg)}</td><td className={td}><Badge tone={stageTone(b.stage)}>{b.stage}</Badge></td><td className={td}>{b.soldTo ?? "Not sold"}</td></tr>)}</tbody>
        </TableWrap>
      )}
    </>
  );
}
