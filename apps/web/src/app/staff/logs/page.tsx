"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type IrpcLogDto } from "@/lib/api";
import { dateLabel } from "@/lib/format";
import { Badge, Card, Empty, Notice, PageHeader, TableWrap, TextField, td, th } from "@/components/ui";
import { IconClipboard } from "@/components/icons";
import { LineChart } from "@/components/LineChart";
import type { LogTrendDto } from "@irpc/types";

const tone = (category: IrpcLogDto["category"]) => category === "Inventory" ? "info" : category === "SMS" ? "warn" : category === "Batch" ? "ok" : "neutral";

export default function IrpcLogs() {
  const [logs, setLogs] = useState<IrpcLogDto[]>([]);
  const [trend, setTrend] = useState<LogTrendDto | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { setLogs(await api.getAdminLogs()); setError(null); }
    catch { setError("IRPC logs are temporarily unavailable. Please try again later."); }
    finally { setLoading(false); }
  }, []);
  const loadTrend = useCallback(async () => {
    if (api.useMock) {
      setTrendError("Activity trends require a live database connection; they are unavailable in demo mode.");
      return;
    }
    try { setTrend(await api.getLogsTrend(30)); setTrendError(null); }
    catch { setTrendError("Activity trends are temporarily unavailable. Please try again later."); }
  }, []);
  useEffect(() => { void load(); void loadTrend(); }, [load, loadTrend]);
  const filtered = logs.filter((row) => `${row.actor} ${row.category} ${row.action} ${row.target} ${row.details ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  return <div className="flex flex-col gap-5">
    <PageHeader title="IRPC logs" sub="Recent order, batch, stock, price, and SMS activity from the database." icon={<IconClipboard className="h-6 w-6" />} />
    {error && <Notice tone="warn"><p role="alert">{error}</p></Notice>}
    <TextField label="Filter logs" placeholder="Actor, action, target, or detail" value={query} onChange={(e) => setQuery(e.target.value)} />
    <Card>
      {trend ? <LineChart
        title="IRPC activity"
        description="Daily database event counts for the last 30 days. Batch includes recorded damage events."
        points={(trend?.daily ?? []).map((point) => ({
          key: point.date,
          label: new Date(`${point.date}T00:00:00+08:00`).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" }),
        }))}
        series={[
          { key: "order", label: "Order events", color: "var(--color-paddy-d)", values: (trend?.daily ?? []).map((point) => point.order) },
          { key: "batch", label: "Batch events and damage", color: "var(--color-sky-d)", values: (trend?.daily ?? []).map((point) => point.batch), dash: "7 5" },
          { key: "inventory", label: "Stock adjustments", color: "var(--color-clay)", values: (trend?.daily ?? []).map((point) => point.inventory) },
          { key: "sms", label: "SMS activity", color: "#806319", values: (trend?.daily ?? []).map((point) => point.sms), dash: "2 5" },
          { key: "pricing", label: "Price changes", color: "#70528f", values: (trend?.daily ?? []).map((point) => point.pricing), dash: "9 4 2 4" },
        ]}
        formatValue={(value) => Math.round(value).toString()}
      /> : <p role={trendError ? "alert" : "status"} className="mt-3 rounded-xl bg-mist px-4 py-5 text-sm text-sub">{trendError ?? "Loading activity trends…"}</p>}
    </Card>
    {loading ? <p role="status">Loading logs…</p> : filtered.length === 0 ? <Empty>No log entries match.</Empty> : <TableWrap>
      <thead><tr><th className={th}>When</th><th className={th}>Category</th><th className={th}>Who</th><th className={th}>Action</th><th className={th}>Target</th><th className={th}>Details</th></tr></thead>
      <tbody>{filtered.map((row) => <tr key={row.id} className="transition-colors hover:bg-mist/50">
        <td className={td}><time dateTime={row.createdAt}>{dateLabel(row.createdAt)}</time><br /><span className="text-xs text-sub">{new Date(row.createdAt).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit" })}</span></td>
        <td className={td}><Badge tone={tone(row.category)}>{row.category}</Badge></td><td className={td}>{row.actor}</td><td className={td}>{row.action}</td><td className={td}>{row.target}</td><td className={td}>{row.details ?? "—"}</td>
      </tr>)}</tbody>
    </TableWrap>}
  </div>;
}
