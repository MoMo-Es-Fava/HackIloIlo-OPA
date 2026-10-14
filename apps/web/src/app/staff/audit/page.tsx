"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Empty, PageHeader, TableWrap, TextField, td, th } from "@/components/ui";

export default function Audit() {
  const { audit } = useStore();
  const [q, setQ] = useState("");
  const list = audit.filter((a) => `${a.actor} ${a.action} ${a.target}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="Audit log" sub="Every price change, booking, sale and status change is recorded here." />
      <TextField label="Filter" placeholder="Actor, action or target" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.length === 0 ? <Empty>No entries match.</Empty> : (
        <TableWrap>
          <thead><tr><th className={th}>When</th><th className={th}>Who</th><th className={th}>Action</th><th className={th}>Target</th></tr></thead>
          <tbody>{list.map((a) => <tr key={a.id}><td className={td}>{a.at}</td><td className={td}>{a.actor}</td><td className={td}>{a.action}</td><td className={td}>{a.target}</td></tr>)}</tbody>
        </TableWrap>
      )}
    </>
  );
}
