"use client";

import { useEffect, useState } from "react";
import type { FinanceTrendDto, OperationsTrendDto } from "@irpc/types";
import { LineChart } from "@/components/LineChart";
import { Card, Notice, PageHeader } from "@/components/ui";
import { IconChart } from "@/components/icons";
import { api, ApiError } from "@/lib/api";
import { pesoAccounting } from "@/lib/format";

const MANILA = "Asia/Manila";
const pointLabel = (date: string) => new Date(`${date}T00:00:00+08:00`).toLocaleDateString("en-PH", {
  timeZone: MANILA,
  month: "short",
  day: "numeric",
});

export default function StaffAnalytics() {
  const [operations, setOperations] = useState<OperationsTrendDto | null>(null);
  const [finance, setFinance] = useState<FinanceTrendDto | null>(null);
  const [operationsError, setOperationsError] = useState<string | null>(null);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [canSeeFinance, setCanSeeFinance] = useState(true);
  const [loading, setLoading] = useState(!api.useMock);

  useEffect(() => {
    if (api.useMock) return;
    let active = true;
    void Promise.allSettled([api.getOperationsTrend(14), api.getFinanceTrend(14)]).then(([ops, money]) => {
      if (!active) return;
      if (ops.status === "fulfilled") setOperations(ops.value);
      else setOperationsError(ops.reason instanceof ApiError ? ops.reason.message : "Could not load operations analytics.");
      if (money.status === "fulfilled") setFinance(money.value);
      else if (money.reason instanceof ApiError && money.reason.status === 403) setCanSeeFinance(false);
      else setFinanceError(money.reason instanceof ApiError ? money.reason.message : "Could not load financial analytics.");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const dates = (daily: { date: string }[]) => daily.map((point) => ({ key: point.date, label: pointLabel(point.date) }));

  return <div className="flex flex-col gap-5">
    <PageHeader title="Analytics" sub="Daily operating activity and financial trends from the last 14 days." icon={<IconChart className="h-6 w-6" />} />
    {api.useMock ? <Notice tone="info"><p>Analytics charts require a live database connection. You are currently viewing demo data.</p></Notice> : <>
      {operationsError && <Notice tone="warn"><p role="alert">{operationsError}</p></Notice>}
    <Card>
      <LineChart
        title="Daily operations"
        description="Requests created each day and requests answered over the last 14 days."
        points={dates(operations?.daily ?? [])}
        series={[
          { key: "palayOffers", label: "Palay offers", color: "var(--color-paddy-d)", values: (operations?.daily ?? []).map((point) => point.palayOffers) },
          { key: "riceOrders", label: "Rice orders", color: "var(--color-sky-d)", values: (operations?.daily ?? []).map((point) => point.riceOrders), dash: "7 5" },
          { key: "serviceRequests", label: "Service requests", color: "#806319", values: (operations?.daily ?? []).map((point) => point.serviceRequests), dash: "2 5" },
          { key: "answered", label: "Requests answered", color: "var(--color-clay)", values: (operations?.daily ?? []).map((point) => point.answered) },
        ]}
        formatValue={(value) => Math.round(value).toString()}
      />
      {loading && <p role="status" className="mt-3 text-sm text-sub">Loading operations analytics…</p>}
    </Card>
    <Card>
      <LineChart
        title="Processing milestones"
        description="Daily requests for customer weight confirmation and orders entering drying or ready for pickup."
        points={dates(operations?.daily ?? [])}
        series={[
          { key: "weightsToConfirm", label: "Weights to confirm", color: "var(--color-sky-d)", values: (operations?.daily ?? []).map((point) => point.weightsToConfirm) },
          { key: "inDrying", label: "Entered drying", color: "#70528f", values: (operations?.daily ?? []).map((point) => point.inDrying), dash: "7 5" },
          { key: "readyForPickup", label: "Ready for pickup", color: "var(--color-clay)", values: (operations?.daily ?? []).map((point) => point.readyForPickup), dash: "2 5" },
        ]}
        formatValue={(value) => Math.round(value).toString()}
      />
    </Card>
    {canSeeFinance && <Card>
      <LineChart
        title="Daily financial activity"
        description="Paid and completed orders by payment date over the last 14 days."
        points={dates(finance?.daily ?? [])}
        series={[
          { key: "soldRice", label: "Rice sales", color: "var(--color-paddy-d)", values: (finance?.daily ?? []).map((point) => Number(point.soldRice)) },
          { key: "serviceFees", label: "Service fees", color: "var(--color-sky-d)", values: (finance?.daily ?? []).map((point) => Number(point.serviceFees)), dash: "7 5" },
          { key: "boughtPalay", label: "Palay paid", color: "#806319", values: (finance?.daily ?? []).map((point) => Number(point.boughtPalay)), dash: "2 5" },
          { key: "grossProfit", label: "Gross profit / loss", color: "var(--color-clay)", values: (finance?.daily ?? []).map((point) => Number(point.grossProfit)) },
        ]}
        formatValue={(value) => pesoAccounting(value)}
      />
      {loading && <p role="status" className="mt-3 text-sm text-sub">Loading financial analytics…</p>}
      {financeError && <p role="alert" className="mt-3 text-sm text-clay">{financeError}</p>}
    </Card>}
    {!canSeeFinance && <p className="text-sm text-sub">Financial analytics are only available to admins.</p>}
    </>}
  </div>;
}
