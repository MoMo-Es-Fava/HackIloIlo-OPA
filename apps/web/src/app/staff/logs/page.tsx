"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type IrpcLogDto } from "@/lib/api";
import { dateLabel } from "@/lib/format";
import { Badge, Empty, Notice, PageHeader, TableWrap, TextField, td, th } from "@/components/ui";
import { IconClipboard } from "@/components/icons";

const tone = (category: IrpcLogDto["category"]) => category === "Inventory" ? "info" : category === "SMS" ? "warn" : category === "Batch" ? "ok" : "neutral";

export default function IrpcLogs() {
  const [logs, setLogs] = useState<IrpcLogDto[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { setLogs(await api.getAdminLogs()); setError(null); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not load IRPC logs."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const filtered = logs.filter((row) => `${row.actor} ${row.category} ${row.action} ${row.target} ${row.details ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  return <div className="flex flex-col gap-5">
    <PageHeader title="IRPC logs" sub="Recent order, batch, stock, price, and SMS activity from the database." icon={<IconClipboard className="h-6 w-6" />} />
    {error && <Notice tone="warn"><p role="alert">{error}</p></Notice>}
    <TextField label="Filter logs" placeholder="Actor, action, target, or detail" value={query} onChange={(e) => setQuery(e.target.value)} />
    {loading ? <p role="status">Loading logs…</p> : filtered.length === 0 ? <Empty>No log entries match.</Empty> : <TableWrap>
      <thead><tr><th className={th}>When</th><th className={th}>Category</th><th className={th}>Who</th><th className={th}>Action</th><th className={th}>Target</th><th className={th}>Details</th></tr></thead>
      <tbody>{filtered.map((row) => <tr key={row.id} className="transition-colors hover:bg-mist/50">
        <td className={td}><time dateTime={row.createdAt}>{dateLabel(row.createdAt)}</time><br /><span className="text-xs text-sub">{new Date(row.createdAt).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit" })}</span></td>
        <td className={td}><Badge tone={tone(row.category)}>{row.category}</Badge></td><td className={td}>{row.actor}</td><td className={td}>{row.action}</td><td className={td}>{row.target}</td><td className={td}>{row.details ?? "—"}</td>
      </tr>)}</tbody>
    </TableWrap>}
  </div>;
}
