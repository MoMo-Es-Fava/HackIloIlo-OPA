"use client";

import { useEffect, useState } from "react";
import type { AnswerStatsDto, ReportDto, ReportPartyDto, ReportTownDto, StatementLinesDto } from "@irpc/types";
import { api, ApiError } from "@/lib/api";
import { fmt, peso, pesoAccounting } from "@/lib/format";
import { Badge, Button, Card, Empty, Notice, PageHeader, Stat, TableWrap, TextField, cn, td, th } from "@/components/ui";
import { IconChart, IconLeaf, IconBox, IconClock } from "@/components/icons";
import { LineChart } from "@/components/LineChart";

const MANILA = "Asia/Manila";
const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: MANILA });
const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00+08:00`).toLocaleDateString("en-PH", { timeZone: MANILA, month: "short", year: "numeric" });
/** "45 min", "3.5 h" or "2 days" — whichever reads naturally. */
const durationLabel = (hours: number) =>
  hours < 1 ? `${Math.round(hours * 60)} min` : hours < 48 ? `${hours.toFixed(1)} h` : `${(hours / 24).toFixed(1)} days`;
const dateTimeLabel = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", { timeZone: MANILA, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00+08:00`).toLocaleDateString("en-PH", { timeZone: MANILA, month: "short", day: "numeric", year: "numeric" });

// IRPC's Statement of Financial Performance, in its own order and wording.
const LINES: { key: keyof StatementLinesDto; label: string; kind: "item" | "subtotal" | "less" | "result" }[] = [
  { key: "rice", label: "Rice", kind: "item" },
  { key: "customMilling", label: "Custom milling", kind: "item" },
  { key: "customDrying", label: "Custom drying", kind: "item" },
  { key: "totalIncome", label: "Total income", kind: "subtotal" },
  { key: "rawMaterials", label: "Less: Raw materials (palay)", kind: "less" },
  { key: "grossProfit", label: "Gross profit", kind: "result" },
];

type Period = "month" | "year" | "custom";
type View = "farmers" | "buyers" | "towns";
const VIEWS: { id: View; label: string }[] = [
  { id: "farmers", label: "By farmer" },
  { id: "buyers", label: "By buyer" },
  { id: "towns", label: "By town" },
];

/** Quote for CSV, and stop spreadsheet formulas sneaking in through names. */
const cell = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function download(name: string, rows: (string | number)[][]) {
  const blob = new Blob([rows.map((r) => r.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Report() {
  const today = todayIso();
  const [period, setPeriod] = useState<Period>("year");
  const [from, setFrom] = useState(`${today.slice(0, 4)}-01-01`);
  const [to, setTo] = useState(today);
  const [view, setView] = useState<View>("farmers");
  const [report, setReport] = useState<ReportDto | null>(null);
  const [answers, setAnswers] = useState<AnswerStatsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(false);

  const rangeError = !from || !to ? "Choose both dates." : from > to ? "The start date must be on or before the end date." : null;

  useEffect(() => {
    if (rangeError) return;
    let current = true;
    setLoading(true);
    api.getReport(from, to)
      .then((r) => { if (current) { setReport(r); setError(null); } })
      .catch((e) => {
        if (!current) return;
        if (e instanceof ApiError && e.status === 403) setForbidden(true);
        else setError(e instanceof ApiError ? e.message : "Could not load the report. Please try again.");
      })
      .finally(() => { if (current) setLoading(false); });
    // Answer speed is a separate, optional call: the report still shows if it fails.
    api.getAnswerStats(from, to).then((a) => { if (current) setAnswers(a); }).catch(() => { if (current) setAnswers(null); });
    return () => { current = false; };
  }, [from, to, rangeError]);

  function choose(p: Period) {
    setPeriod(p);
    if (p === "month") { setFrom(`${today.slice(0, 7)}-01`); setTo(today); }
    if (p === "year") { setFrom(`${today.slice(0, 4)}-01-01`); setTo(today); }
  }

  if (forbidden) {
    return (
      <>
        <PageHeader title="Report" sub="IRPC's Statement of Financial Performance." icon={<IconChart className="h-6 w-6" />} />
        <Notice tone="info"><p className="font-bold">Only IRPC admins can see the report.</p><p className="text-sm text-sub">Ask an admin if you need these numbers.</p></Notice>
      </>
    );
  }

  const total = report?.total;
  const profit = total ? Number(total.grossProfit) : 0;
  const hasData = !!report && (Number(report.total.totalIncome) !== 0 || Number(report.total.rawMaterials) !== 0);
  const periodText = report ? `${dayLabel(report.from)} to ${dayLabel(report.to)}` : "";

  function downloadStatement() {
    if (!report) return;
    download(`irpc-statement-${report.from}-to-${report.to}.csv`, [
      ["Line", ...report.months.map((m) => monthLabel(m.month)), "Total"],
      ...LINES.map((l) => [l.label, ...report.months.map((m) => m[l.key]), report.total[l.key]]),
    ]);
  }
  function downloadList() {
    if (!report) return;
    const name = `irpc-${view}-${report.from}-to-${report.to}.csv`;
    if (view === "towns") {
      download(name, [["Town", "Palay bought (kg)", "Paid for palay (PHP)", "Income from town (PHP)"],
        ...report.towns.map((t) => [t.town ?? "Not set", t.palayKg, t.palayBought, t.income])]);
    } else {
      const list = view === "farmers" ? report.farmers : report.buyers;
      download(name, [["Name", "Town", "Orders", view === "farmers" ? "Palay (kg)" : "Rice (kg)", view === "farmers" ? "Paid to farmer (PHP)" : "Paid by buyer (PHP)"],
        ...list.map((p) => [p.name, p.town ?? "Not set", p.orders, p.kg, p.amount])]);
    }
  }

  return (
    <>
      <PageHeader
        title="Report"
        sub="IRPC's Statement of Financial Performance, from paid and completed orders."
        icon={<IconChart className="h-6 w-6" />}
        actions={<Button arrow disabled={!report} onClick={downloadStatement}>Download statement (CSV)</Button>}
      />

      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex gap-1 rounded-xl border border-line/80 bg-white p-1 shadow-card sm:w-fit" role="group" aria-label="Period">
            {([["month", "This month"], ["year", "This year"], ["custom", "Custom"]] as const).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={period === id} onClick={() => choose(id)}
                className={cn("min-h-11 flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-bold transition-colors sm:flex-none sm:px-4",
                  period === id ? "bg-paddy-d text-white shadow-sm" : "text-sub hover:bg-mist hover:text-ink")}>
                {label}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <TextField label="From" type="date" max={to || today} value={from} onChange={(e) => setFrom(e.target.value)} />
              <TextField label="To" type="date" min={from} max={today} value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          )}
        </div>
        <p className="text-sm text-sub" aria-live="polite">
          {rangeError ?? (loading ? "Loading…" : periodText ? `Showing ${periodText}.` : "")}
        </p>
      </Card>
      {error && <p role="alert" className="text-clay">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total income" value={total ? peso(total.totalIncome, 0) : "–"} hint="Rice, custom milling and custom drying" icon={<IconBox className="h-4 w-4" />} />
        <Stat label="Raw materials (palay)" value={total ? peso(total.rawMaterials, 0) : "–"} hint="Paid to farmers in cash" icon={<IconLeaf className="h-4 w-4" />} />
        <Stat label="Gross profit" value={total ? pesoAccounting(total.grossProfit) : "–"}
          hint={profit < 0 ? "In parentheses: a loss. More spent on palay than earned" : "Total income less raw materials"} loss={profit < 0} icon={<IconChart className="h-4 w-4" />} />
      </div>

      {answers && (
        <section className="flex flex-col gap-3">
          <PageHeader level={2} title="How fast IRPC answers farmers"
            sub="Palay offers that came in during this period. Farmers sell to traders when IRPC answers late, so aim for the same day." />
          {answers.offers === 0 ? <Empty>No palay offers came in during this period.</Empty> : (
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Answered same day" value={`${answers.sameDayPct}%`} hint={`${answers.answeredSameDay} of ${answers.offers} palay offers`} icon={<IconClock className="h-4 w-4" />} />
              <Stat label="Average time to answer" value={answers.averageHours === null ? "–" : durationLabel(Number(answers.averageHours))}
                hint={`${answers.answered} answered (accepted or rejected)`} icon={<IconClock className="h-4 w-4" />} />
              <Stat label="Still waiting" value={String(answers.waiting)} loss={answers.waiting > 0}
                hint={answers.oldestWaitingSince ? `Oldest since ${dateTimeLabel(answers.oldestWaitingSince)}` : "Every offer has an answer"} icon={<IconLeaf className="h-4 w-4" />} />
            </div>
          )}
        </section>
      )}

      {report && !hasData && <Empty>No paid or completed orders in this period. Try &quot;This year&quot; or a wider date range.</Empty>}

      {report && hasData && (
        <>
          {report.months.length > 1 && (
            <Card>
              <LineChart
                title="Financial performance by month"
                description="Income, cash paid for palay, and gross profit from paid or completed orders."
                points={report.months.map((month) => ({ key: month.month, label: monthLabel(month.month) }))}
                series={[
                  { key: "income", label: "Total income", color: "var(--color-paddy-d)", values: report.months.map((month) => Number(month.totalIncome)) },
                  { key: "rawMaterials", label: "Palay paid", color: "var(--color-sky-d)", values: report.months.map((month) => Number(month.rawMaterials)), dash: "7 5" },
                  { key: "grossProfit", label: "Gross profit / loss", color: "var(--color-clay)", values: report.months.map((month) => Number(month.grossProfit)) },
                ]}
                formatValue={(value) => pesoAccounting(value)}
              />
            </Card>
          )}

          <section className="flex flex-col gap-3">
            <PageHeader level={2} title="Statement of Financial Performance" sub={`${periodText}. Scroll sideways on a phone to see every month.`} />
            <TableWrap>
              <caption className="sr-only">Statement of Financial Performance by month</caption>
              <thead>
                <tr>
                  <th className={th} scope="col">Line</th>
                  {report.months.map((m) => <th key={m.month} className={cn(th, "text-right")} scope="col">{monthLabel(m.month)}</th>)}
                  <th className={cn(th, "text-right")} scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {LINES.map((l) => (
                  <tr key={l.key} className={cn(l.kind === "result" && "bg-mist/50", l.kind === "subtotal" && "bg-mist/25")}>
                    <th scope="row" className={cn(td, "text-left", l.kind === "item" ? "pl-8 font-normal" : "font-bold")}>{l.label}</th>
                    {[...report.months.map((m) => m[l.key]), report.total[l.key]].map((v, i, all) => (
                      <td key={i} className={cn(td, "tnum whitespace-nowrap text-right", (l.kind !== "item" || i === all.length - 1) && "font-bold",
                        l.kind === "result" && Number(v) < 0 && "text-clay")}>
                        {l.kind === "less" ? `(${peso(v, 0)})` : pesoAccounting(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </section>

          <section className="flex flex-col gap-3">
            <PageHeader level={2} title="Who IRPC bought from and sold to" sub="Same period. Largest amounts first."
              actions={<Button variant="ghost" onClick={downloadList}>Download this list (CSV)</Button>} />
            <div className="flex gap-1 rounded-xl border border-line/80 bg-white p-1 shadow-card sm:w-fit" role="group" aria-label="Group by">
              {VIEWS.map((v) => (
                <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)}
                  className={cn("min-h-11 flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-bold transition-colors sm:flex-none sm:px-4",
                    view === v.id ? "bg-paddy-d text-white shadow-sm" : "text-sub hover:bg-mist hover:text-ink")}>
                  {v.label}
                </button>
              ))}
            </div>
            {view === "towns" ? <TownTable rows={report.towns} /> : <PartyTable rows={view === "farmers" ? report.farmers : report.buyers} farmers={view === "farmers"} />}
          </section>
        </>
      )}
    </>
  );
}

function PartyTable({ rows, farmers }: { rows: ReportPartyDto[]; farmers: boolean }) {
  if (rows.length === 0) return <Empty>{farmers ? "No palay bought in this period." : "No rice sold in this period."}</Empty>;
  return (
    <TableWrap>
      <thead><tr>
        <th className={th} scope="col">{farmers ? "Farmer" : "Buyer"}</th><th className={th} scope="col">Town</th>
        <th className={cn(th, "text-right")} scope="col">Orders</th><th className={cn(th, "text-right")} scope="col">{farmers ? "Palay" : "Rice"}</th>
        <th className={cn(th, "text-right")} scope="col">{farmers ? "Paid to farmer" : "Paid by buyer"}</th>
      </tr></thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.customerId} className="transition-colors hover:bg-mist/50">
            <td className={cn(td, "font-bold")}>{p.name}</td>
            <td className={td}>{p.town ?? <span className="text-sub">Not set</span>}</td>
            <td className={cn(td, "tnum text-right")}>{p.orders}</td>
            <td className={cn(td, "tnum whitespace-nowrap text-right")}>{fmt(Number(p.kg))} kg</td>
            <td className={cn(td, "tnum whitespace-nowrap text-right font-bold")}>{peso(p.amount, 0)}</td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

function TownTable({ rows }: { rows: ReportTownDto[] }) {
  if (rows.length === 0) return <Empty>No paid orders in this period.</Empty>;
  return (
    <TableWrap>
      <thead><tr>
        <th className={th} scope="col">Town</th><th className={cn(th, "text-right")} scope="col">Palay bought</th>
        <th className={cn(th, "text-right")} scope="col">Paid for palay</th><th className={cn(th, "text-right")} scope="col">Income from town</th>
      </tr></thead>
      <tbody>
        {rows.map((t) => (
          <tr key={t.town ?? "none"} className="transition-colors hover:bg-mist/50">
            <td className={cn(td, "font-bold")}>{t.town ?? <span className="font-normal text-sub">Not set</span>}{t.town === "Pototan" && <> <Badge tone="info">Pilot</Badge></>}</td>
            <td className={cn(td, "tnum whitespace-nowrap text-right")}>{fmt(Number(t.palayKg))} kg</td>
            <td className={cn(td, "tnum whitespace-nowrap text-right")}>{peso(t.palayBought, 0)}</td>
            <td className={cn(td, "tnum whitespace-nowrap text-right")}>{peso(t.income, 0)}</td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}
