"use client";

import { useCallback, useEffect, useState } from "react";
import { PriceBasis, PriceItem, type CurrentPrice, type RiceTypeDto } from "@irpc/types";
import { api, ApiError } from "@/lib/api";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { kgf, peso } from "@/lib/format";
import { Badge, Button, Card, Notice, SelectField, TableWrap, TextField, cn, td, th } from "@/components/ui";

const positive = (v: string) => v.trim() !== "" && Number(v) > 0;
const priceOf = (prices: CurrentPrice[], item: PriceItem, riceTypeId: number | null = null) =>
  prices.find((p) => p.item === item && (p.riceTypeId ?? null) === riceTypeId)?.pricePerKg ?? null;

/** Rice selling prices, drying and milling fees, and rice stock. Admins change them; staff can look. */
export default function RicePricesAndStock({ onAnalyticsRefresh }: { onAnalyticsRefresh?: () => Promise<void> }) {
  const [prices, setPrices] = useState<CurrentPrice[]>([]);
  const [rice, setRice] = useState<RiceTypeDto[]>([]);
  const isAdmin = useIsAdmin();
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([api.getPrices(), api.getRiceTypes()]);
      setPrices(p);
      setRice(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load prices and stock.");
    }
  }, []);
  const refreshAfterSave = useCallback(async () => {
    await load();
    await onAnalyticsRefresh?.();
  }, [load, onAnalyticsRefresh]);
  useEffect(() => { void load(); }, [load]);

  return (
    <>
      {error && <p role="alert" className="text-clay">{error}</p>}
      {isAdmin === false && (
        <Notice tone="info"><p className="font-bold">Only IRPC admins can change prices and stock.</p><p className="text-sm text-sub">You can still see the current numbers below.</p></Notice>
      )}
      <RatesCard prices={prices} rice={rice} canEdit={!!isAdmin} onSaved={refreshAfterSave} />
      <StockCard rice={rice} canEdit={!!isAdmin} onSaved={refreshAfterSave} />
    </>
  );
}

function RatesCard({ prices, rice, canEdit, onSaved }: { prices: CurrentPrice[]; rice: RiceTypeDto[]; canEdit: boolean; onSaved: () => Promise<void> }) {
  // Only the fields someone typed in are saved; blank means "keep the current price".
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const rows = [
    ...rice.map((r) => ({ key: `rice-${r.id}`, label: r.name, item: PriceItem.RICE, riceTypeId: r.id as number | null, hint: "Selling price to buyers" })),
    { key: "drying", label: "Drying fee", item: PriceItem.DRYING_FEE, riceTypeId: null, hint: "Per kg of wet palay" },
    { key: "milling", label: "Milling fee", item: PriceItem.MILLING_FEE, riceTypeId: null, hint: "Per kg of milled rice" },
  ];
  const changed = rows.filter((r) => (draft[r.key] ?? "").trim() !== "");
  const invalid = changed.some((r) => !positive(draft[r.key]));

  async function save() {
    setBusy(true);
    setMessage(null);
    const results = await Promise.allSettled(changed.map((r) =>
      api.createPrice({ item: r.item, riceTypeId: r.riceTypeId ?? undefined, pricePerKg: Number(draft[r.key]).toFixed(2), basis: PriceBasis.MARKET, notifyUsers: false })));
    const failed = results.filter((x) => x.status === "rejected") as PromiseRejectedResult[];
    setMessage(failed.length
      ? { ok: false, text: failed[0].reason instanceof ApiError ? failed[0].reason.message : "Some prices could not be saved. Check them and try again." }
      : { ok: true, text: `${changed.length} ${changed.length === 1 ? "price" : "prices"} saved. New orders use them; accepted orders keep their locked price.` });
    if (!failed.length) setDraft({});
    await onSaved();
    setBusy(false);
  }

  return (
    <Card>
      <div>
        <h2 className="text-lg font-bold tracking-tight">Rice prices and service fees</h2>
        <p className="text-sm text-sub">Type a new price only where it changes. Blank fields keep the current price.</p>
      </div>
      <TableWrap>
        <thead><tr>
          <th className={th} scope="col">Item</th>
          <th className={cn(th, "text-right")} scope="col">Current (₱ per kg)</th>
          {canEdit && <th className={th} scope="col">New price</th>}
        </tr></thead>
        <tbody>
          {rows.map((r) => {
            const current = priceOf(prices, r.item, r.riceTypeId);
            const value = draft[r.key] ?? "";
            return (
              <tr key={r.key}>
                <td className={td}><p className="font-bold">{r.label}</p><p className="text-sm text-sub">{r.hint}</p></td>
                <td className={cn(td, "tnum text-right")}>{current === null ? <Badge tone="warn">Not set</Badge> : peso(current)}</td>
                {canEdit && (
                  <td className={td}>
                    <input aria-label={`New price for ${r.label}`} type="number" inputMode="decimal" min={0.01} step="0.01" value={value}
                      onChange={(e) => setDraft({ ...draft, [r.key]: e.target.value })} placeholder={current ?? "0.00"}
                      className={cn("min-h-11 w-32 rounded-xl border bg-white px-3 tnum", value && !positive(value) ? "border-clay" : "border-line")} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
      {canEdit && (
        <>
          {invalid && <p role="alert" className="text-clay">Prices must be above ₱0.</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button arrow disabled={busy || changed.length === 0 || invalid} onClick={save}>
              {changed.length > 1 ? `Save ${changed.length} prices` : "Save price"}
            </Button>
            {message && <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-paddy-d" : "text-clay"}>{message.text}</p>}
          </div>
        </>
      )}
    </Card>
  );
}

function StockCard({ rice, canEdit, onSaved }: { rice: RiceTypeDto[]; canEdit: boolean; onSaved: () => Promise<void> }) {
  const [riceId, setRiceId] = useState("");
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [kg, setKg] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const chosen = rice.find((r) => String(r.id) === riceId);
  const tooMuch = direction === "remove" && !!chosen && Number(kg) > Number(chosen.stockKg);
  const ready = !!chosen && positive(kg) && reason.trim().length >= 3 && !tooMuch;

  async function save() {
    if (!chosen) return;
    setBusy(true);
    setMessage(null);
    try {
      const change = (direction === "add" ? 1 : -1) * Number(kg);
      const updated = await api.updateStock(chosen.id, change.toFixed(2), reason.trim());
      setMessage({ ok: true, text: `${updated.name} is now ${kgf(updated.stockKg)}.` });
      setKg("");
      setReason("");
      await onSaved();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof ApiError ? e.message : "Could not update stock. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div>
        <h2 className="text-lg font-bold tracking-tight">Rice stock</h2>
        <p className="text-sm text-sub">Available to sell. Accepting a rice order holds its kg; cancelling returns them.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {rice.map((r) => (
          <div key={r.id} className="rounded-xl border border-line/80 bg-mist/60 p-4">
            <p className="text-sm text-sub">{r.name}</p>
            <p className="tnum text-2xl font-bold tracking-tight">{kgf(r.stockKg)}</p>
          </div>
        ))}
      </div>
      {canEdit && rice.length > 0 && (
        <>
          <h3 className="font-bold">Add or remove stock</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SelectField label="Rice" value={riceId} onChange={(e) => setRiceId(e.target.value)}>
              <option value="">Choose rice</option>
              {rice.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </SelectField>
            <div className="flex flex-col gap-1.5">
              <span className="text-[15px] font-bold">Change</span>
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-line/80 bg-white p-1" role="group" aria-label="Add or remove">
                {(["add", "remove"] as const).map((d) => (
                  <button key={d} type="button" aria-pressed={direction === d} onClick={() => setDirection(d)}
                    className={cn("min-h-10 rounded-lg text-sm font-bold transition-colors", direction === d ? "bg-paddy-d text-white" : "text-sub hover:bg-mist")}>
                    {d === "add" ? "Add" : "Remove"}
                  </button>
                ))}
              </div>
            </div>
            <TextField label="Kg" type="number" inputMode="decimal" min={0.01} step="0.01" value={kg} onChange={(e) => setKg(e.target.value)}
              error={tooMuch ? `Only ${kgf(chosen!.stockKg)} in stock` : kg && !positive(kg) ? "Enter kg above 0" : undefined} />
            <TextField label="Reason" placeholder={direction === "add" ? "e.g. Milled from today's palay" : "e.g. Damaged sacks"} value={reason}
              onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button arrow disabled={busy || !ready} onClick={save}>{direction === "add" ? "Add to stock" : "Remove from stock"}</Button>
            {message && <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-paddy-d" : "text-clay"}>{message.text}</p>}
          </div>
        </>
      )}
    </Card>
  );
}
