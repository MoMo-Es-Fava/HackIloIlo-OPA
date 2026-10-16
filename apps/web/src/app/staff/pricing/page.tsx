"use client";

import { useCallback, useEffect, useState } from "react";
import type { CatalogAnalyticsDto } from "@irpc/types";
import { useStore } from "@/lib/store";
import { peso } from "@/lib/format";
import { api } from "@/lib/api";
import { Badge, Button, Card, PageHeader, SelectField, TextField } from "@/components/ui";
import { PriceBasis, PriceItem } from "@irpc/types";
import { IconChart } from "@/components/icons";
import RicePricesAndStock from "@/components/RicePricesAndStock";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { LineChart } from "@/components/LineChart";
import type { LineChartSeries } from "@/components/LineChart";

type PriceGroup = "palay" | "rice" | "services";
const GROUPS: { id: PriceGroup; label: string; items: PriceItem[] }[] = [
  { id: "palay", label: "Palay prices", items: [PriceItem.PALAY_FRESH, PriceItem.PALAY_DRY] },
  { id: "rice", label: "Rice prices", items: [PriceItem.RICE] },
  { id: "services", label: "Service fees", items: [PriceItem.DRYING_FEE, PriceItem.MILLING_FEE] },
];
const SERIES_COLORS = ["var(--color-paddy-d)", "var(--color-sky-d)", "#806319", "var(--color-clay)", "#70528f", "#364e69"];
const dateLabel = (date: string) => new Date(`${date}T00:00:00+08:00`).toLocaleDateString("en-PH", {
  timeZone: "Asia/Manila", month: "short", day: "numeric",
});

export default function Pricing() {
  const { palayPrices: prices, orderError, setPrices } = useStore();
  const isAdmin = useIsAdmin();
  const [analytics, setAnalytics] = useState<CatalogAnalyticsDto | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<PriceGroup>("palay");
  const [fresh, setFresh] = useState(prices.fresh?.toString() ?? "");
  const [dry, setDry] = useState(prices.dry?.toString() ?? "");
  const [basis, setBasis] = useState<PriceBasis>(prices.basis);
  const loadAnalytics = useCallback(async () => {
    try {
      setAnalytics(await api.getCatalogAnalytics(30));
      setAnalyticsError(null);
    } catch {
      setAnalyticsError("Price and stock trends are temporarily unavailable. Please try again later.");
    }
  }, []);
  useEffect(() => {
    if (isAdmin && api.useMock) {
      setAnalyticsError("Price and stock trends require a live database connection; they are unavailable in demo mode.");
    } else if (isAdmin) {
      void loadAnalytics();
    }
  }, [isAdmin, loadAnalytics]);

  const f = Number(fresh), d = Number(dry);
  const big = prices.fresh !== null && Math.abs(f - prices.fresh) > 2 || prices.dry !== null && Math.abs(d - prices.dry) > 2;
  const bad = !(f > 0) || !(d > 0) || d < f;
  const group = GROUPS.find((item) => item.id === selectedGroup)!;
  const priceSeries: LineChartSeries[] = (analytics?.prices ?? [])
    .filter((line) => group.items.includes(line.item))
    .map((line, index) => ({
      key: line.key,
      label: line.label,
      color: SERIES_COLORS[index % SERIES_COLORS.length],
      values: line.values.map((value) => value === null ? null : Number(value)),
      ...(index % 2 ? { dash: "7 5" } : {}),
    }));
  const stockSeries: LineChartSeries[] = (analytics?.stock ?? []).map((line, index) => ({
    key: line.key,
    label: line.label,
    color: SERIES_COLORS[index % SERIES_COLORS.length],
    values: line.values.map(Number),
    ...(index % 2 ? { dash: "7 5" } : {}),
  }));

  return (
    <>
      <PageHeader title="Pricing and stock" sub={`Palay buying price now: fresh ${peso(prices.fresh, 0)}, dry ${peso(prices.dry, 0)} per kg (${prices.basis}). Updated ${prices.updated}.`} icon={<IconChart className="h-6 w-6" />} />
      {isAdmin && <Card>
        <h2 className="text-lg font-bold tracking-tight">Palay buying prices this week</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <TextField label="Fresh (₱ per kg)" type="number" inputMode="decimal" step="0.5" value={fresh} onChange={(e) => setFresh(e.target.value)} />
          <TextField label="Dry (₱ per kg)" type="number" inputMode="decimal" step="0.5" value={dry} onChange={(e) => setDry(e.target.value)} error={d < f && dry !== "" ? "Dry price should not be below fresh" : undefined} />
          <SelectField label="Price basis" value={basis} onChange={(e) => setBasis(e.target.value as PriceBasis)}><option value={PriceBasis.MARKET}>Market</option><option value={PriceBasis.NFA}>NFA</option></SelectField>
        </div>
        {big && !bad && <p><Badge tone="warn">Check</Badge> This is more than ₱2 from the current price. Weekly changes are usually ₱1 to ₱2.</p>}
        <p className="text-sm text-sub">Publishing updates the prices farmers see. Offers already accepted keep their locked price.</p>
        <div><Button arrow disabled={bad} onClick={() => setPrices(f, d, basis)}>Publish prices</Button></div>
      </Card>}
      {orderError && <p role="alert" className="font-bold text-clay">{orderError}</p>}
      <RicePricesAndStock onAnalyticsRefresh={loadAnalytics} />
      {isAdmin && <Card className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Price and stock trends</h2>
            <p className="text-sm text-sub">Daily values from database price records and stock adjustments, for the last 30 days.</p>
          </div>
          <div className="flex gap-1 rounded-xl border border-line/80 bg-white p-1 shadow-card" role="group" aria-label="Price trend category">
            {GROUPS.map((item) => (
              <button key={item.id} type="button" aria-pressed={selectedGroup === item.id} onClick={() => setSelectedGroup(item.id)}
                className={`min-h-11 rounded-lg px-3 text-sm font-bold transition-colors ${selectedGroup === item.id ? "bg-paddy-d text-white" : "text-sub hover:bg-mist hover:text-ink"}`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {analyticsError && <p role="alert" className="text-clay">{analyticsError}</p>}
        {!analytics && !analyticsError && <p role="status" className="text-sm text-sub">Loading price and stock trends…</p>}
        {analytics && (
          <>
            <LineChart
              title={group.label}
              description="Prices are the latest effective database price for each day."
              points={analytics.dates.map((date) => ({ key: date, label: dateLabel(date) }))}
              series={priceSeries}
              formatValue={(value) => peso(value, 2)}
            />
            <div className="border-t border-line/80 pt-6">
              <LineChart
                title="Rice stock on hand"
                description="End-of-day stock reconstructed from recorded inventory adjustments; today shows the latest balance."
                points={analytics.dates.map((date) => ({ key: date, label: dateLabel(date) }))}
                series={stockSeries}
                formatValue={(value) => `${Math.round(value).toLocaleString("en-PH")} kg`}
              />
            </div>
          </>
        )}
      </Card>}
    </>
  );
}
